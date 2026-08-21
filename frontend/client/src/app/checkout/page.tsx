"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  Phone,
  User,
  Mail,
  ChevronLeft,
  Truck,
  Shield,
  MessageSquare,
  Loader2,
  Tag,
  X,
  Check,
  AlertTriangle,
  ShoppingBag,
  CreditCard,
  Banknote,
  ArrowRight,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { orderApi, contentApi, shippingApi } from "@/lib/api";
import { INDIAN_STATES } from "@/lib/constants";
import { readStoredCoupon, writeStoredCoupon, clearStoredCoupon } from "@/lib/coupons";
import {
  cn,
  formatPrice,
  getImageUrl,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Address, ServiceabilityResult } from "@/types";

interface AddressForm {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
}

const defaultAddress: AddressForm = {
  fullName: "",
  phone: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
};



// Validation-error focus order, in the visual order of the address form.
// `key` is the `errors` key; `id` is the DOM id, which is not always the same
// (errors.addressLine1 -> #checkout-address1).
const FIELD_ORDER: { key: string; id: string }[] = [
  { key: "fullName", id: "checkout-fullName" },
  { key: "phone", id: "checkout-phone" },
  { key: "email", id: "checkout-email" },
  { key: "addressLine1", id: "checkout-address1" },
  { key: "city", id: "checkout-city" },
  { key: "state", id: "checkout-state" },
  { key: "pincode", id: "checkout-pincode" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart, cartReady } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [address, setAddress] = useState<AddressForm>(defaultAddress);
  const [useExistingAddress, setUseExistingAddress] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState("");
  // The code the server actually accepted, kept apart from the `couponCode`
  // input text. They diverge the moment a code fails validation: the input
  // keeps what the user typed (so they can correct it), but sending that
  // rejected code with the order makes the server 400 the whole order — a
  // mistyped coupon used to block checkout entirely.
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponId, setCouponId] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  // Set right before clearCart() on a successful order so the empty-cart
  // redirect below doesn't race (and override) the success navigation to the
  // order confirmation page.
  const orderPlacedRef = useRef(false);
  // COD is offered at checkout (server auto-ships COD orders and never
  // auto-cancels them) — only UPI goes through the QR + WhatsApp screenshot flow.
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cod">("upi");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serviceability, setServiceability] = useState<ServiceabilityResult | null>(null);
  const [checkingPincode, setCheckingPincode] = useState(false);

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => contentApi.getSiteSettings(),
  });
  const settings = settingsData?.data?.settings;

  // 0 (or negative) values mean "unset" — use the real defaults, matching the
  // server, so a corrupt settings doc can't silently make delivery free.
  const FREE_SHIPPING_THRESHOLD = settings?.shipping?.freeShippingThreshold > 0 ? settings.shipping.freeShippingThreshold : 499;
  const DELIVERY_CHARGE = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : (settings?.shipping?.standardDeliveryCharge > 0 ? settings.shipping.standardDeliveryCharge : 49);
  // Read GST rate from settings — never hardcode tax rates
  const GST_RATE = (settings?.gst?.rate > 0 ? settings.gst.rate : 5) / 100;
  const discountedSubtotal = Math.max(0, subtotal - couponDiscount);
  const gstAmount = Math.round(discountedSubtotal * GST_RATE);
  const total = discountedSubtotal + DELIVERY_CHARGE + gstAmount;

  useEffect(() => {
    if (cartReady && items.length === 0 && !orderPlacedRef.current) {
      toast.error("Your cart is empty. Add some products first!");
      router.push("/products");
    }
  }, [cartReady, items, router]);

  useEffect(() => {
    if (user) {
      setAddress((prev) => ({
        ...prev,
        fullName: user.name || prev.fullName,
        phone: user.phone || prev.phone,
        email: user.email || prev.email,
      }));
      if (user.addresses && user.addresses.length > 0) {
        const defaultAddr = user.addresses.find((a) => a.isDefault) || user.addresses[0];
        if (defaultAddr) {
          const idx = user.addresses.findIndex((a) => a._id === defaultAddr._id);
          setUseExistingAddress(idx);
          setAddress({
            fullName: defaultAddr.fullName || user.name,
            phone: defaultAddr.phone || user.phone,
            email: user.email || "",
            addressLine1: defaultAddr.addressLine1,
            addressLine2: defaultAddr.addressLine2 || "",
            city: defaultAddr.city,
            state: defaultAddr.state,
            pincode: defaultAddr.pincode,
          });
        }
      }
    }
  }, [user]);

  // Live Shiprocket pincode check. A failure here (gateway down, not configured)
  // leaves `serviceability` null, which never blocks checkout — only an explicit
  // "not serviceable" answer does.
  useEffect(() => {
    const pincode = address.pincode.trim();
    if (!/^\d{6}$/.test(pincode) || items.length === 0) {
      setServiceability(null);
      setCheckingPincode(false);
      return;
    }

    let cancelled = false;
    setCheckingPincode(true);

    const timer = setTimeout(async () => {
      try {
        const res = await shippingApi.checkServiceability({
          deliveryPincode: pincode,
          items: items.map((item) => ({
            product: item.product._id,
            variant: item.variant._id,
            // Some catalogue variants have no _id, so SKU is the reliable match
            sku: item.variant.sku,
            quantity: item.quantity,
          })),
          declaredValue: total,
        });
        if (!cancelled) setServiceability(res?.data ?? null);
      } catch {
        if (!cancelled) setServiceability(null);
      } finally {
        if (!cancelled) setCheckingPincode(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `total` is intentionally excluded — it changes with coupons and would
    // re-run the lookup for the same destination.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address.pincode, items]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!address.fullName.trim()) newErrors.fullName = "Name is required";
    if (!address.phone.trim()) newErrors.phone = "Phone is required";
    else if (!/^[6-9]\d{9}$/.test(address.phone.replace(/\s/g, "")))
      newErrors.phone = "Enter a valid 10-digit Indian phone number";
    if (address.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email.trim()))
      newErrors.email = "Enter a valid email address";
    if (!address.addressLine1.trim()) newErrors.addressLine1 = "Address is required";
    if (!address.city.trim()) newErrors.city = "City is required";
    if (!address.state.trim()) newErrors.state = "State is required";
    if (!address.pincode.trim()) newErrors.pincode = "Pincode is required";
    else if (!/^\d{6}$/.test(address.pincode))
      newErrors.pincode = "Enter a valid 6-digit pincode";

    setErrors(newErrors);

    // Move the user to the problem. The address form sits above the fold on a
    // long checkout page, so without this the only feedback for an invalid
    // field is a toast — the offending input is often scrolled out of sight,
    // and keyboard/screen-reader users are left on the submit button.
    const firstInvalid = FIELD_ORDER.find((field) => newErrors[field.key]);
    if (firstInvalid) {
      // setTimeout rather than requestAnimationFrame: rAF is suspended while the
      // page is hidden, so a submit in a backgrounded tab would silently skip
      // the focus move. The delay just lets the error re-render land first.
      setTimeout(() => {
        const el = document.getElementById(firstInvalid.id);
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
        el?.focus({ preventScroll: true });
      }, 0);
    }

    return Object.keys(newErrors).length === 0;
  };

  // Apply a coupon by code. `silent` suppresses toasts — used when hydrating a
  // coupon remembered from the cart page, so an expired code fails quietly
  // instead of spamming the user on arrival.
  // Subtotal the applied discount was last computed against, so the
  // re-validation effect below can tell a real cart change from a re-render.
  const validatedAtSubtotal = useRef<number | null>(null);

  const applyCoupon = useCallback(
    async (code: string, opts?: { silent?: boolean; silentSuccess?: boolean }) => {
      const clean = code.trim().toUpperCase();
      if (!clean) {
        if (!opts?.silent) toast.error("Please enter a coupon code");
        return;
      }
      setApplyingCoupon(true);
      try {
        const res = await contentApi.validateCoupon(clean, subtotal);
        // Use the server-computed discount directly to avoid client/server rounding divergence
        const serverDiscount = res?.data?.discount;
        const couponData = res?.data?.coupon || res?.data;
        if (!couponData || !couponData.code) throw new Error('Invalid coupon');
        const discAmount = typeof serverDiscount === 'number' ? serverDiscount : (
          couponData.type === 'percentage'
            ? Math.min(subtotal * (couponData.value / 100), couponData.maxDiscount || Infinity)
            : Math.min(couponData.value, subtotal)
        );
        setCouponDiscount(Math.round(discAmount));
        setCouponId(couponData._id || null);
        setCouponCode(couponData.code);
        setAppliedCoupon(couponData.code);
        validatedAtSubtotal.current = subtotal;
        // Remember it so a refresh or the cart → checkout hop keeps the discount
        writeStoredCoupon({
          code: couponData.code,
          type: couponData.type,
          value: couponData.value,
          maxDiscount: couponData.maxDiscount,
          minOrderAmount: couponData.minOrderAmount ?? 0,
        });
        if (!opts?.silent && !opts?.silentSuccess) {
          toast.success(`Coupon applied! You save ${formatPrice(Math.round(discAmount))}`);
        }
      } catch (err: any) {
        clearStoredCoupon();
        setCouponDiscount(0);
        setCouponId(null);
        setAppliedCoupon(null);
        validatedAtSubtotal.current = null;
        if (!opts?.silent) toast.error(err.message || "Invalid coupon code");
      } finally {
        setApplyingCoupon(false);
      }
    },
    [subtotal]
  );

  const handleApplyCoupon = () => applyCoupon(couponCode);

  // Re-apply a coupon that was applied on the cart page (or a previous checkout
  // visit) — only once the cart has actually loaded, so the min-order check runs
  // against the real subtotal.
  const couponHydrated = useRef(false);
  useEffect(() => {
    if (!cartReady || items.length === 0 || couponHydrated.current) return;
    couponHydrated.current = true;
    const saved = readStoredCoupon();
    if (saved?.code) applyCoupon(saved.code, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartReady, items.length]);

  // Re-check an applied coupon whenever the cart total moves. The cart stays
  // editable while this page is open — the header's cart drawer has quantity and
  // remove controls — but the discount was calculated once, against the subtotal
  // as it stood when the code was applied. Removing items therefore left a stale
  // discount on screen (₹100 off a ₹200 order), and if the smaller subtotal no
  // longer met the coupon's minOrderAmount the server rejected the *whole order*
  // at Place Order, with nothing on the page explaining why. Re-validating keeps
  // the displayed total honest and surfaces the failure at the coupon field.
  useEffect(() => {
    if (!appliedCoupon || !cartReady || items.length === 0) return;
    if (validatedAtSubtotal.current === subtotal) return;

    const timer = setTimeout(() => {
      applyCoupon(appliedCoupon, { silentSuccess: true });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, appliedCoupon, cartReady, items.length]);

  const handlePlaceOrder = async () => {
    if (!validateForm()) {
      toast.error("Please fill all required fields");
      return;
    }
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    if (serviceability && !serviceability.serviceable) {
      toast.error("We can't deliver to this pincode yet. Please try a different address.");
      return;
    }

    setIsPlacing(true);
    try {
      const orderData = {
        items: items.map((item) => ({
          product: item.product._id,
          variant: item.variant._id,
          // Some catalogue variants have no _id, so SKU is the reliable match
          // (mirrors the pincode serviceability payload)
          sku: item.variant.sku,
          quantity: item.quantity,
        })),
        shippingAddress: {
          fullName: address.fullName,
          phone: address.phone,
          // Shiprocket requires a billing email on every shipment
          email: address.email.trim() || undefined,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 || undefined,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
        },
        // Only a server-validated code — never the raw input text
        couponCode: appliedCoupon || undefined,
        couponId: couponId || undefined,
        notes: orderNotes || undefined,
        // No payment gateway is integrated yet — UPI orders go through the manual
        // QR + WhatsApp screenshot flow (see orders/[orderNumber]/page.tsx); COD
        // orders are paid at the door and auto-shipped by the server.
        paymentMethod,
        paymentStatus: "pending",
      };

      const res = await orderApi.placeOrder(orderData);
      if (res?.data?.success || res?.success) {
        orderPlacedRef.current = true;
        clearCart();
        // The coupon was consumed by this order — don't re-apply it next time
        clearStoredCoupon();
        toast.success("Order placed successfully!");
        const orderNum = res?.data?.order?.orderNumber || res?.order?.orderNumber;
        router.push(`/orders/${orderNum}`);
      } else {
        throw new Error(res.message || "Failed to place order");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setIsPlacing(false);
    }
  };

  if (!cartReady) {
    return (
      <div className="min-h-dvh pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16 flex justify-center items-center">
        <Loader2 size={32} className="animate-spin text-brand-600" />
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-dvh pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-32 lg:pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm text-ink-2 hover:text-brand-600 transition-colors mb-4"
          >
            <ChevronLeft size={16} />
            Continue Shopping
          </Link>
          <h1 className="text-3xl font-display font-black text-ink">
            Checkout
          </h1>
          <p className="text-ink-2 mt-2">
            Review your order and complete checkout
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left: Address & Payment */}
          <div className="lg:col-span-3 space-y-6">
            {/* Shipping Address */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-2 bg-gold-50 rounded-xl">
                      <MapPin size={18} className="text-gold-600" />
                    </div>
                    <h2 className="text-lg font-display font-bold text-ink">Shipping Address</h2>
                  </div>

                  {user?.addresses && user.addresses.length > 0 && (
                    <div className="space-y-2 mb-6">
                      <p className="text-xs font-semibold text-ink-2 uppercase tracking-wider">
                        Saved Addresses
                      </p>
                      <div className="grid gap-2">
                        {user.addresses.map((savedAddr, i) => (
                          <button
                            key={savedAddr._id || i}
                            onClick={() => {
                              setUseExistingAddress(i);
                              setAddress((prev) => ({
                                fullName: savedAddr.fullName || user.name,
                                phone: savedAddr.phone || user.phone,
                                email: prev.email || user.email || "",
                                addressLine1: savedAddr.addressLine1,
                                addressLine2: savedAddr.addressLine2 || "",
                                city: savedAddr.city,
                                state: savedAddr.state,
                                pincode: savedAddr.pincode,
                              }));
                              setErrors({});
                            }}
                            className={cn(
                              "text-left p-4 rounded-xl border-2 transition-ui",
                              useExistingAddress === i
                                ? "border-gold-500 bg-gold-50"
                                : "border-rule hover:border-gold-400"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">
                                  {savedAddr.label || `Address ${i + 1}`}
                                  {savedAddr.isDefault && (
                                    <Badge variant="success" className="ml-2 text-xs">
                                      Default
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-xs text-ink-2 mt-0">
                                  {savedAddr.addressLine1}, {savedAddr.city} - {savedAddr.pincode}
                                </p>
                              </div>
                              {useExistingAddress === i && (
                                  <Check size={16} className="text-gold-500" />
                                )}
                            </div>
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            setUseExistingAddress(null);
                            setAddress(defaultAddress);
                          }}
                          className="text-left p-4 rounded-xl border-2 border-dashed border-rule hover:border-brand-600 text-sm text-ink-2 hover:text-ink transition-ui"
                        >
                          + Use a different address
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="checkout-fullName" className="block text-sm font-medium mb-2">
                          Full Name *
                        </label>
                        <Input
                          id="checkout-fullName"
                          icon={<User size={14} />}
                          value={address.fullName}
                          onChange={(e) => {
                            setAddress((p) => ({ ...p, fullName: e.target.value }));
                            setErrors((p) => ({ ...p, fullName: "" }));
                          }}
                          placeholder="John Doe"
                          error={errors.fullName}
                          className={cn(errors.fullName && "border-red-500 focus-visible:ring-red-500/50")}
                        />
                      </div>
                      <div>
                        <label htmlFor="checkout-phone" className="block text-sm font-medium mb-2">
                          Phone Number *
                        </label>
                        <Input
                          id="checkout-phone"
                          type="tel"
                          inputMode="numeric"
                          icon={<Phone size={14} />}
                          value={address.phone}
                          onChange={(e) => {
                            setAddress((p) => ({ ...p, phone: e.target.value }));
                            setErrors((p) => ({ ...p, phone: "" }));
                          }}
                          placeholder="9876543210"
                          maxLength={10}
                          error={errors.phone}
                          className={cn(errors.phone && "border-red-500 focus-visible:ring-red-500/50")}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="checkout-email" className="block text-sm font-medium mb-2">
                        Email (optional)
                      </label>
                      <Input
                        id="checkout-email"
                        type="email"
                        icon={<Mail size={14} />}
                        value={address.email}
                        onChange={(e) => {
                          setAddress((p) => ({ ...p, email: e.target.value }));
                          setErrors((p) => ({ ...p, email: "" }));
                        }}
                        placeholder="you@example.com"
                        error={errors.email}
                        helperText="We'll send courier tracking updates here"
                        className={cn(errors.email && "border-red-500 focus-visible:ring-red-500/50")}
                      />
                    </div>

                    <div>
                      <label htmlFor="checkout-address1" className="block text-sm font-medium mb-2">
                        Address Line 1 *
                      </label>
                      <Input
                        id="checkout-address1"
                        value={address.addressLine1}
                        onChange={(e) => {
                          setAddress((p) => ({ ...p, addressLine1: e.target.value }));
                          setErrors((p) => ({ ...p, addressLine1: "" }));
                        }}
                        placeholder="House no., Building, Street, Landmark"
                        error={errors.addressLine1}
                        className={cn(errors.addressLine1 && "border-red-500 focus-visible:ring-red-500/50")}
                      />
                    </div>

                    <div>
                      <label htmlFor="checkout-address2" className="block text-sm font-medium mb-2">
                        Address Line 2 (optional)
                      </label>
                      <Input
                        id="checkout-address2"
                        value={address.addressLine2}
                        onChange={(e) =>
                          setAddress((p) => ({ ...p, addressLine2: e.target.value }))
                        }
                        placeholder="Apartment, Suite, Floor"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label htmlFor="checkout-city" className="block text-sm font-medium mb-2">
                          City *
                        </label>
                        <Input
                          id="checkout-city"
                          value={address.city}
                          onChange={(e) => {
                            setAddress((p) => ({ ...p, city: e.target.value }));
                            setErrors((p) => ({ ...p, city: "" }));
                          }}
                          placeholder="Mumbai"
                          error={errors.city}
                          className={cn(errors.city && "border-red-500 focus-visible:ring-red-500/50")}
                        />
                      </div>
                      <div>
                        <label htmlFor="checkout-state" className="block text-sm font-medium mb-2">
                          State *
                        </label>
                        <select
                          id="checkout-state"
                          value={address.state}
                          onChange={(e) => {
                            setAddress((p) => ({ ...p, state: e.target.value }));
                            setErrors((p) => ({ ...p, state: "" }));
                          }}
                          aria-invalid={!!errors.state}
                          aria-describedby={errors.state ? "checkout-state-error" : undefined}
                          className={cn(
                            "flex h-12 w-full rounded-xl border border-rule bg-paper px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] transition-ui",
                            errors.state && "border-red-500 focus-visible:ring-red-500/50"
                          )}
                        >
                          <option value="">Select State</option>
                          {INDIAN_STATES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        {errors.state && (
                          <p id="checkout-state-error" role="alert" className="text-xs text-red-500 mt-2">{errors.state}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="checkout-pincode" className="block text-sm font-medium mb-2">
                          Pincode *
                        </label>
                        <Input
                          id="checkout-pincode"
                          inputMode="numeric"
                          value={address.pincode}
                          onChange={(e) => {
                            setAddress((p) => ({ ...p, pincode: e.target.value }));
                            setErrors((p) => ({ ...p, pincode: "" }));
                          }}
                          placeholder="400001"
                          maxLength={6}
                          error={errors.pincode}
                          className={cn(errors.pincode && "border-red-500 focus-visible:ring-red-500/50")}
                        />
                      </div>
                    </div>

                    {/* Courier serviceability — silent unless we have a real answer */}
                    {checkingPincode && (
                      <div className="flex items-center gap-2 text-xs text-ink-2 px-4 py-2 rounded-lg bg-paper-3/40">
                        <Loader2 size={14} className="animate-spin" />
                        Checking delivery availability for {address.pincode}...
                      </div>
                    )}

                    {!checkingPincode && serviceability?.serviceable && (
                      <div className="flex items-start gap-4 px-4 py-2 rounded-lg bg-gold-500/10 border border-gold-500/25">
                        <Truck size={16} className="text-gold-600 mt-2 shrink-0" />
                        <div className="text-xs">
                          <p className="font-semibold text-gold-800">
                            Delivers to {serviceability.pincode}
                            {serviceability.recommended?.estimatedDays
                              ? ` in ${serviceability.recommended.estimatedDays} day${
                                  Number(serviceability.recommended.estimatedDays) === 1 ? "" : "s"
                                }`
                              : ""}
                          </p>
                          <p className="text-gold-700/80 mt-0">
                            {serviceability.recommended?.name
                              ? `via ${serviceability.recommended.name}`
                              : `${serviceability.couriers.length} courier partners available`}
                          </p>
                        </div>
                      </div>
                    )}

                    {!checkingPincode && serviceability && !serviceability.serviceable && (
                      <div className="flex items-start gap-4 px-4 py-2 rounded-lg bg-red-50 border border-red-200">
                        <AlertTriangle size={16} className="text-red-500 mt-2 shrink-0" />
                        <div className="text-xs">
                          <p className="font-medium text-red-800">
                            No courier serves {serviceability.pincode} yet
                          </p>
                          <p className="text-red-700/80 mt-0">
                            Please try a different delivery address, or reach out on WhatsApp and
                            we&apos;ll arrange something.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Order Notes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold text-ink-2 uppercase tracking-wider mb-4">
                    Order Notes (optional)
                  </h3>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    rows={2}
                    placeholder="Any special instructions for your order..."
                    className="flex w-full rounded-xl border border-rule bg-paper px-4 py-3 sm:py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] transition-ui resize-none"
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Payment Method */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-2 bg-gold-50 rounded-xl">
                      <CreditCard size={18} className="text-gold-600" />
                    </div>
                    <h2 className="text-lg font-display font-bold text-ink">Payment Method</h2>
                  </div>
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("upi")}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border-2 transition-ui",
                        paymentMethod === "upi"
                          ? "border-brand-600 bg-brand-600/5"
                          : "border-rule hover:border-brand-600"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", paymentMethod === "upi" ? "bg-brand-600" : "bg-paper-3")}>
                          <CreditCard size={18} className={paymentMethod === "upi" ? "text-white" : "text-ink-2"} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">UPI Payment</p>
                          <p className="text-xs text-ink-2">
                            Scan a QR code or pay via any UPI app after placing your order
                          </p>
                        </div>
                        {paymentMethod === "upi" && <Check size={16} className="text-brand-600" />}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cod")}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border-2 transition-ui",
                        paymentMethod === "cod"
                          ? "border-brand-600 bg-brand-600/5"
                          : "border-rule hover:border-brand-600"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", paymentMethod === "cod" ? "bg-brand-600" : "bg-paper-3")}>
                          <Banknote size={18} className={paymentMethod === "cod" ? "text-white" : "text-ink-2"} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Cash on Delivery</p>
                          <p className="text-xs text-ink-2">
                            Pay in cash when your order arrives at your doorstep
                          </p>
                        </div>
                        {paymentMethod === "cod" && <Check size={16} className="text-brand-600" />}
                      </div>
                    </button>
                  </div>
                  <p className="text-xs text-ink-2 mt-4">
                    {paymentMethod === "cod"
                      ? "Pay the order total in cash at your doorstep when the order is delivered. No advance payment needed."
                      : "After placing your order, you'll get a UPI QR code to pay — our team confirms payment once you send the screenshot on WhatsApp."}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-2">
            <div className="sticky top-28">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-lg font-display font-bold text-ink mb-4">Order Summary</h2>

                    {/* Items */}
                    <div className="space-y-4 max-h-64 overflow-y-auto mb-4">
                      {items.map((item, i) => (
                        <div key={i} className="flex gap-4">
                          <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-muted shrink-0">
                            {item.product.images?.[0] ? (
                              <Image
                                src={getImageUrl(item.product.images[0])}
                                alt={item.product.name}
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <ShoppingBag size={24} className="text-brand-500" />
                              </div>
                            )}
                            <div className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-gold-500 text-white text-xs font-bold flex items-center justify-center tabular-nums">
                              {item.quantity}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.product.name}
                            </p>
                            <p className="text-xs text-ink-2">
                              {item.variant.weight?.trim() || `${item.variant.weightValue ?? ""}${item.variant.weightUnit ?? ""}`.trim()}
                            </p>
                          </div>
                          <span className="text-sm font-medium whitespace-nowrap tabular-nums">
                            {formatPrice(item.variant.sellingPrice * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Coupon */}
                    <div className="border-t border-rule pt-4 mb-4">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Tag size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-2" />
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="Coupon code"
                            disabled={!!appliedCoupon}
                            className="w-full pl-8 pr-4 h-12 rounded-xl border border-rule bg-paper text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] transition-ui disabled:opacity-50"
                          />
                        </div>
                        {appliedCoupon ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCouponDiscount(0);
                              setCouponId(null);
                              setCouponCode("");
                              setAppliedCoupon(null);
                              clearStoredCoupon();
                            }}
                            className="shrink-0 gap-2 h-12 px-4 text-gold-700 hover:text-gold-800"
                          >
                            <X size={14} />
                            Remove
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleApplyCoupon}
                            disabled={applyingCoupon || !couponCode.trim()}
                            className="shrink-0 h-12 px-6"
                          >
                            {applyingCoupon ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              "Apply"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    <div className="space-y-2 text-sm border-t border-rule pt-4">
                      <div className="flex justify-between">
                        <span className="text-ink-2 tabular-nums">Subtotal</span>
                        <span>{formatPrice(subtotal)}</span>
                      </div>
                      {couponDiscount > 0 && (
                        <div className="flex justify-between text-gold-700 tabular-nums">
                          <span>Discount</span>
                          <span>-{formatPrice(couponDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-ink-2">Delivery</span>
                        <span
                          className={cn(
                            DELIVERY_CHARGE === 0 ? "text-brand-600 font-bold" : ""
                          )}
                        >
                          {DELIVERY_CHARGE === 0 ? "FREE" : formatPrice(DELIVERY_CHARGE)}
                        </span>
                      </div>
                      {DELIVERY_CHARGE > 0 && (
                        <p className="text-xs text-gold-600 bg-gold-50 px-4 py-2 rounded-lg tabular-nums">
                          Add {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} more for free delivery
                        </p>
                      )}
                      {gstAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-ink-2 tabular-nums">GST ({settings?.gst?.rate > 0 ? settings.gst.rate : 5}%)</span>
                          <span>{formatPrice(gstAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-base pt-2 border-t border-rule">
                        <span>Total</span>
                        <span className="text-brand-700 tabular-nums">{formatPrice(total)}</span>
                      </div>
                    </div>

                    {/* Place Order */}
                    <Button
                      onClick={handlePlaceOrder}
                      disabled={isPlacing || items.length === 0 || serviceability?.serviceable === false}
                      size="lg"
                      className="hidden lg:flex w-full mt-6 gap-2"
                    >
                      {isPlacing ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Placing Order...
                        </>
                      ) : serviceability?.serviceable === false ? (
                        "Pincode Not Serviceable"
                      ) : (
                        <>
                          Place Order
                          <ArrowRight size={16} />
                        </>
                      )}
                    </Button>

                    {/* Trust Badges */}
                    <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-rule">
                      <div className="flex items-center gap-2 text-xs text-ink-2">
                        <Shield size={12} />
                        Secure
                      </div>
                      <div className="flex items-center gap-2 text-xs text-ink-2">
                        <Truck size={12} />
                        Fast Delivery
                      </div>
                      <div className="flex items-center gap-2 text-xs text-ink-2">
                        <Banknote size={12} />
                        COD Available
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-paper border-t border-rule p-4 lg:hidden pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <span className="text-xs text-ink-2 font-medium">Total to pay</span>
            <span className="font-bold text-brand-700 text-lg tabular-nums">{formatPrice(total)}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-ink-2 block">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
            <span className="text-xs text-gold-600 font-medium">
              {paymentMethod === "cod" ? "Pay on Delivery" : "UPI Payment"}
            </span>
          </div>
        </div>
        <Button
          onClick={handlePlaceOrder}
          disabled={isPlacing || items.length === 0 || serviceability?.serviceable === false}
          size="lg"
          className="w-full gap-2 py-6 text-base rounded-xl shadow-lg shadow-brand-900/20"
        >
          {isPlacing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Placing Order...
            </>
          ) : serviceability?.serviceable === false ? (
            "Pincode Not Serviceable"
          ) : (
            <>
              Place Order
              <ArrowRight size={18} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
