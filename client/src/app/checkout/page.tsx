"use client";

import { useState, useEffect } from "react";
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
import { orderApi, contentApi } from "@/lib/api";
import { INDIAN_STATES } from "@/lib/constants";
import {
  cn,
  formatPrice,
  getImageUrl,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Address } from "@/types";

interface AddressForm {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
}

const defaultAddress: AddressForm = {
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
};



export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart, cartReady } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [address, setAddress] = useState<AddressForm>(defaultAddress);
  const [useExistingAddress, setUseExistingAddress] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponId, setCouponId] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => contentApi.getSiteSettings(),
  });
  const settings = settingsData?.data?.settings;

  const FREE_SHIPPING_THRESHOLD = settings?.shipping?.freeShippingThreshold ?? 499;
  const DELIVERY_CHARGE = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : (settings?.shipping?.standardDeliveryCharge ?? 49);
  // Read GST rate from settings — never hardcode tax rates
  const GST_RATE = (settings?.gst?.rate ?? 5) / 100;
  const discountedSubtotal = Math.max(0, subtotal - couponDiscount);
  const gstAmount = Math.round(discountedSubtotal * GST_RATE);
  const total = discountedSubtotal + DELIVERY_CHARGE + gstAmount;

  useEffect(() => {
    if (cartReady && items.length === 0) {
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
      }));
      if (user.addresses && user.addresses.length > 0) {
        const defaultAddr = user.addresses.find((a) => a.isDefault) || user.addresses[0];
        if (defaultAddr) {
          const idx = user.addresses.findIndex((a) => a._id === defaultAddr._id);
          setUseExistingAddress(idx);
          setAddress({
            fullName: defaultAddr.fullName || user.name,
            phone: defaultAddr.phone || user.phone,
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!address.fullName.trim()) newErrors.fullName = "Name is required";
    if (!address.phone.trim()) newErrors.phone = "Phone is required";
    else if (!/^[6-9]\d{9}$/.test(address.phone.replace(/\s/g, "")))
      newErrors.phone = "Enter a valid 10-digit Indian phone number";
    if (!address.addressLine1.trim()) newErrors.addressLine1 = "Address is required";
    if (!address.city.trim()) newErrors.city = "City is required";
    if (!address.state.trim()) newErrors.state = "State is required";
    if (!address.pincode.trim()) newErrors.pincode = "Pincode is required";
    else if (!/^\d{6}$/.test(address.pincode))
      newErrors.pincode = "Enter a valid 6-digit pincode";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    setApplyingCoupon(true);
    try {
      const res = await contentApi.validateCoupon(couponCode, subtotal);
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
      toast.success(`Coupon applied! You save ${formatPrice(Math.round(discAmount))}`);
    } catch (err: any) {
      toast.error(err.message || "Invalid coupon code");
      setCouponDiscount(0);
      setCouponId(null);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) {
      toast.error("Please fill all required fields");
      return;
    }
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    
    setIsPlacing(true);
    try {
      const orderData = {
        items: items.map((item) => ({
          product: item.product._id,
          variant: item.variant._id,
          quantity: item.quantity,
        })),
        shippingAddress: {
          fullName: address.fullName,
          phone: address.phone,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 || undefined,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
        },
        couponCode: couponCode || undefined,
        couponId: couponId || undefined,
        notes: orderNotes || undefined,
        // No payment gateway is integrated yet — every order goes through manual UPI/WhatsApp
        // confirmation (see orders/[orderNumber]/page.tsx), never the "online" self-verify path.
        paymentMethod: "upi",
        paymentStatus: "pending",
      };

      const res = await orderApi.placeOrder(orderData);
      if (res?.data?.success || res?.success) {
        clearCart();
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
      <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16 flex justify-center items-center">
        <Loader2 size={32} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-600 transition-colors mb-4"
          >
            <ChevronLeft size={16} />
            Continue Shopping
          </Link>
          <h1 className="text-3xl font-display font-bold">Checkout</h1>
          <p className="text-muted-foreground mt-2">
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
                    <h2 className="text-lg font-semibold">Shipping Address</h2>
                  </div>

                  {user?.addresses && user.addresses.length > 0 && (
                    <div className="space-y-2 mb-6">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Saved Addresses
                      </p>
                      <div className="grid gap-2">
                        {user.addresses.map((savedAddr, i) => (
                          <button
                            key={savedAddr._id || i}
                            onClick={() => {
                              setUseExistingAddress(i);
                              setAddress({
                                fullName: savedAddr.fullName || user.name,
                                phone: savedAddr.phone || user.phone,
                                addressLine1: savedAddr.addressLine1,
                                addressLine2: savedAddr.addressLine2 || "",
                                city: savedAddr.city,
                                state: savedAddr.state,
                                pincode: savedAddr.pincode,
                              });
                              setErrors({});
                            }}
                            className={cn(
                              "text-left p-4 rounded-xl border-2 transition-ui",
                              useExistingAddress === i
                                ? "border-gold-500 bg-gold-50"
                                : "border-border hover:border-gold-300"
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
                                <p className="text-xs text-muted-foreground mt-0">
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
                          className="text-left p-4 rounded-xl border-2 border-dashed border-border hover:border-brand-300 text-sm text-muted-foreground hover:text-foreground transition-ui"
                        >
                          + Use a different address
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Full Name *
                        </label>
                        <Input
                          icon={<User size={14} />}
                          value={address.fullName}
                          onChange={(e) => {
                            setAddress((p) => ({ ...p, fullName: e.target.value }));
                            setErrors((p) => ({ ...p, fullName: "" }));
                          }}
                          placeholder="John Doe"
                          className={cn(errors.fullName && "border-red-500 focus-visible:ring-red-500/50")}
                        />
                        {errors.fullName && (
                          <p className="text-xs text-red-500 mt-2">{errors.fullName}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Phone Number *
                        </label>
                        <Input
                          icon={<Phone size={14} />}
                          value={address.phone}
                          onChange={(e) => {
                            setAddress((p) => ({ ...p, phone: e.target.value }));
                            setErrors((p) => ({ ...p, phone: "" }));
                          }}
                          placeholder="9876543210"
                          maxLength={10}
                          className={cn(errors.phone && "border-red-500 focus-visible:ring-red-500/50")}
                        />
                        {errors.phone && (
                          <p className="text-xs text-red-500 mt-2">{errors.phone}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Address Line 1 *
                      </label>
                      <Input
                        value={address.addressLine1}
                        onChange={(e) => {
                          setAddress((p) => ({ ...p, addressLine1: e.target.value }));
                          setErrors((p) => ({ ...p, addressLine1: "" }));
                        }}
                        placeholder="House no., Building, Street, Landmark"
                        className={cn(errors.addressLine1 && "border-red-500 focus-visible:ring-red-500/50")}
                      />
                      {errors.addressLine1 && (
                        <p className="text-xs text-red-500 mt-2">{errors.addressLine1}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Address Line 2 (optional)
                      </label>
                      <Input
                        value={address.addressLine2}
                        onChange={(e) =>
                          setAddress((p) => ({ ...p, addressLine2: e.target.value }))
                        }
                        placeholder="Apartment, Suite, Floor"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium mb-2">
                          City *
                        </label>
                        <Input
                          value={address.city}
                          onChange={(e) => {
                            setAddress((p) => ({ ...p, city: e.target.value }));
                            setErrors((p) => ({ ...p, city: "" }));
                          }}
                          placeholder="Mumbai"
                          className={cn(errors.city && "border-red-500 focus-visible:ring-red-500/50")}
                        />
                        {errors.city && (
                          <p className="text-xs text-red-500 mt-2">{errors.city}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          State *
                        </label>
                        <select
                          value={address.state}
                          onChange={(e) => {
                            setAddress((p) => ({ ...p, state: e.target.value }));
                            setErrors((p) => ({ ...p, state: "" }));
                          }}
                          className={cn(
                            "flex h-12 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-ui",
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
                          <p className="text-xs text-red-500 mt-2">{errors.state}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Pincode *
                        </label>
                        <Input
                          value={address.pincode}
                          onChange={(e) => {
                            setAddress((p) => ({ ...p, pincode: e.target.value }));
                            setErrors((p) => ({ ...p, pincode: "" }));
                          }}
                          placeholder="400001"
                          maxLength={6}
                          className={cn(errors.pincode && "border-red-500 focus-visible:ring-red-500/50")}
                        />
                        {errors.pincode && (
                          <p className="text-xs text-red-500 mt-2">{errors.pincode}</p>
                        )}
                      </div>
                    </div>
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
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Order Notes (optional)
                  </h3>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    rows={2}
                    placeholder="Any special instructions for your order..."
                    className="flex w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-ui resize-none"
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
                    <h2 className="text-lg font-semibold">Payment Method</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border-2 border-brand-500 bg-brand-50/50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
                          <CreditCard size={18} className="text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">UPI Payment</p>
                          <p className="text-xs text-muted-foreground">
                            Scan a QR code or pay via any UPI app after placing your order
                          </p>
                        </div>
                        <Check size={16} className="text-brand-600 ml-auto" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    After placing your order, you&apos;ll get a UPI QR code to pay — our team confirms payment once you send the screenshot on WhatsApp.
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
                    <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

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
                                <ShoppingBag size={24} className="text-brand-300" />
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
                            <p className="text-xs text-muted-foreground">
                              {item.variant.weight}
                            </p>
                          </div>
                          <span className="text-sm font-medium whitespace-nowrap tabular-nums">
                            {formatPrice(item.variant.sellingPrice * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Coupon */}
                    <div className="border-t border-border pt-4 mb-4">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Tag size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="Coupon code"
                            disabled={couponDiscount > 0}
                            className="w-full pl-8 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-ui disabled:opacity-50"
                          />
                        </div>
                        {couponDiscount > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCouponDiscount(0);
                              setCouponId(null);
                              setCouponCode("");
                            }}
                            className="shrink-0 gap-2 text-red-500 hover:text-red-600"
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
                            className="shrink-0"
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
                    <div className="space-y-2 text-sm border-t border-border pt-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground tabular-nums">Subtotal</span>
                        <span>{formatPrice(subtotal)}</span>
                      </div>
                      {couponDiscount > 0 && (
                        <div className="flex justify-between text-green-600 tabular-nums">
                          <span>Discount</span>
                          <span>-{formatPrice(couponDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery</span>
                        <span
                          className={cn(
                            DELIVERY_CHARGE === 0 ? "text-green-600 font-medium" : ""
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
                          <span className="text-muted-foreground tabular-nums">GST (5%)</span>
                          <span>{formatPrice(gstAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                        <span>Total</span>
                        <span className="text-brand-700 tabular-nums">{formatPrice(total)}</span>
                      </div>
                    </div>

                    {/* Place Order */}
                    <Button
                      onClick={handlePlaceOrder}
                      disabled={isPlacing || items.length === 0}
                      size="lg"
                      className="w-full mt-6 gap-2"
                    >
                      {isPlacing ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Placing Order...
                        </>
                      ) : (
                        <>
                          Place Order
                          <ArrowRight size={16} />
                        </>
                      )}
                    </Button>

                    {/* Trust Badges */}
                    <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Shield size={12} />
                        Secure
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Truck size={12} />
                        Fast Delivery
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
    </div>
  );
}
