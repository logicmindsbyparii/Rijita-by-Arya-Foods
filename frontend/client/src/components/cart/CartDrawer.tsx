"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowLeft,
  Loader2,
  Check,
  MessageCircle,
  Truck,
  BadgeCheck,
  Package,
  MapPin,
  User,
  Phone,
  Tag,
  IndianRupee,
} from "lucide-react";
import toast from "react-hot-toast";
import { useCart, variantKey } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { formatPrice, getImageUrl, applyWhatsAppTemplate } from "@/lib/utils";
import { INDIAN_STATES } from "@/lib/constants";
import {
  AppliedCoupon,
  getDiscountAmount,
  readStoredCoupon,
  writeStoredCoupon,
  clearStoredCoupon,
} from "@/lib/coupons";
import { orderApi, contentApi } from "@/lib/api";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, itemCount, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [orderUrl, setOrderUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [useExistingAddress, setUseExistingAddress] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState("");
  // Stores the coupon *definition*, not a frozen rupee amount, so the discount
  // is recomputed from the live subtotal — same approach as the cart page.
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponId, setCouponId] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [checkout, setCheckout] = useState({
    fullName: user?.name || "",
    phone: user?.phone || "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    notes: "",
  });

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => contentApi.getSiteSettings(),
    staleTime: 5 * 60 * 1000,
  });
  // Suggested coupons come from the live catalogue — a hardcoded code (e.g.
  // "JAIN10") that doesn't exist would make the chip a guaranteed "invalid
  // coupon" dead end for customers.
  const { data: couponsData } = useQuery({
    queryKey: ["coupons"],
    queryFn: () => contentApi.getCoupons(),
    staleTime: 5 * 60 * 1000,
  });
  const suggestedCoupons = (couponsData?.data?.coupons ?? []).slice(0, 3);
  const settings = settingsData?.data?.settings;
  const whatsappNumber = settings?.whatsapp?.number || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210";
  // 0 (or negative) values mean "unset" — use the real defaults, matching the
  // server, so a corrupt settings doc can't silently make delivery free.
  const freeShippingThreshold = settings?.shipping?.freeShippingThreshold > 0 ? settings.shipping.freeShippingThreshold : 499;
  const standardDeliveryCharge = settings?.shipping?.standardDeliveryCharge > 0 ? settings.shipping.standardDeliveryCharge : 49;
  const gstRate = settings?.gst?.rate > 0 ? settings.gst.rate : 5;
  const deliveryCharge = subtotal >= freeShippingThreshold ? 0 : standardDeliveryCharge;
  // Derived every render from the current subtotal, so editing the cart keeps
  // the displayed discount honest (and drops it below minOrderAmount).
  const couponDiscount = appliedCoupon ? getDiscountAmount(subtotal, appliedCoupon) : 0;
  const discountedSubtotal = Math.max(0, subtotal - couponDiscount);
  const gstAmount = Math.round(discountedSubtotal * (gstRate / 100));
  const total = discountedSubtotal + deliveryCharge + gstAmount;

  // The parent passes a fresh inline arrow for onClose on every render, so the
  // modal effect below must not depend on its identity — otherwise it tears
  // down and re-runs on each Header render, re-capturing the "previously
  // focused" element and yanking focus back to the top of the drawer while the
  // customer is typing.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Modal behaviour: Escape to close, focus moved into the panel on open and
  // restored on close, and Tab cycled within the panel. Without the trap,
  // tabbing walked straight out of the drawer into the page behind it while the
  // overlay still covered everything — the links were unreachable by mouse but
  // still focusable by keyboard.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const FOCUSABLE =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    // Defer: the panel animates in, and focusing before paint fights the
    // framer-motion mount.
    const focusTimer = setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target = panel.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? panel).focus();
    }, 50);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (user) {
      const defaultAddr = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];
      setCheckout((c) => ({
        ...c,
        fullName: c.fullName || user.name || "",
        phone: c.phone || user.phone || "",
        addressLine1: c.addressLine1 || defaultAddr?.addressLine1 || "",
        addressLine2: c.addressLine2 || defaultAddr?.addressLine2 || "",
        city: c.city || defaultAddr?.city || "",
        state: c.state || defaultAddr?.state || "",
        pincode: c.pincode || defaultAddr?.pincode || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    if (!open) {
      setShowCheckout(false);
      setOrderDone(false);
      setConfirmingClear(false);
      setErrors({});
      return;
    }
    // Pick up a coupon applied on the cart page or a previous drawer session, so
    // the drawer quotes the same total the cart and checkout pages do.
    const stored = readStoredCoupon();
    if (stored) {
      setAppliedCoupon(stored);
      setCouponCode(stored.code);
    }
  }, [open]);

  const applyCouponCode = async () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    setApplyingCoupon(true);
    try {
      const res = await contentApi.validateCoupon(couponCode, subtotal);
      const couponData = res?.data?.coupon || res?.data;
      if (!couponData || !couponData.code) throw new Error('Invalid coupon');
      const coupon: AppliedCoupon = {
        code: couponData.code,
        type: couponData.type,
        value: couponData.value,
        maxDiscount: couponData.maxDiscount,
        minOrderAmount: couponData.minOrderAmount ?? 0,
        description: couponData.description,
      };
      setAppliedCoupon(coupon);
      setCouponCode(coupon.code);
      setCouponId(couponData._id || null);
      // Share the coupon with the cart page and checkout, like they share it
      // with each other — otherwise a coupon applied here vanished the moment
      // the customer moved on to the full checkout page.
      writeStoredCoupon(coupon);
      toast.success(`Coupon applied! You save ${formatPrice(getDiscountAmount(subtotal, coupon))}`);
    } catch (err: any) {
      toast.error(err.message || "Invalid coupon code");
      setAppliedCoupon(null);
      setCouponId(null);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCouponCode = () => {
    setAppliedCoupon(null);
    setCouponId(null);
    setCouponCode("");
    clearStoredCoupon();
  };

  const generateWhatsAppMessage = useCallback(() => {
    const lines = items.map(
      (item, i) =>
        `${i + 1}. ${item.product.name} - ${item.variant.weight?.trim() || `${item.variant.weightValue ?? ""}${item.variant.weightUnit ?? ""}`.trim()} x ${item.quantity} = ₹${item.variant.sellingPrice * item.quantity}`
    );
    const message = [
      `*New Order - RIJITA by Arya Foods*`,
      ``,
      `*Items:*`,
      ...lines,
      ``,
      `*Subtotal:* ₹${subtotal}`,
      couponDiscount > 0 ? `*Discount:* -₹${couponDiscount}` : null,
      `*Delivery:* ${deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}`,
      `*GST:* ₹${gstAmount}`,
      `*Total:* ₹${total}`,
      ``,
      `*Delivery Details:*`,
      `Name: ${checkout.fullName || user?.name || ""}`,
      `Phone: ${checkout.phone || user?.phone || ""}`,
      `Address: ${checkout.addressLine1}${checkout.addressLine2 ? ", " + checkout.addressLine2 : ""}`,
      `City: ${checkout.city}, ${checkout.state}`,
      `Pincode: ${checkout.pincode}`,
      appliedCoupon ? `Coupon: ${appliedCoupon.code}` : null,
      checkout.notes ? `\n*Notes:* ${checkout.notes}` : "",
    ].filter(Boolean).join("\n");
    const withTemplate = applyWhatsAppTemplate(message, settings?.whatsapp?.messageTemplate);
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(withTemplate)}`;
  }, [items, subtotal, deliveryCharge, total, checkout, user, couponDiscount, appliedCoupon, gstAmount, whatsappNumber, settings]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!checkout.fullName.trim()) newErrors.fullName = "Name is required";
    if (!checkout.phone.trim()) newErrors.phone = "Phone is required";
    else if (!/^[6-9]\d{9}$/.test(checkout.phone.replace(/\s/g, "")))
      newErrors.phone = "Enter a valid 10-digit number";
    if (!checkout.addressLine1.trim()) newErrors.addressLine1 = "Address is required";
    if (!checkout.city.trim()) newErrors.city = "City is required";
    if (!checkout.state.trim()) newErrors.state = "State is required";
    if (!checkout.pincode.trim()) newErrors.pincode = "Pincode is required";
    else if (!/^\d{6}$/.test(checkout.pincode)) newErrors.pincode = "Enter a valid 6-digit pincode";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setOrdering(true);
    try {
      const payload = {
        items: items.map((item) => ({
          product: item.product._id,
          variant: item.variant._id,
          // Variants have no _id in this catalogue — SKU is the reliable match
          sku: item.variant.sku,
          quantity: item.quantity,
        })),
        shippingAddress: {
          fullName: checkout.fullName.trim(),
          phone: checkout.phone.trim(),
          addressLine1: checkout.addressLine1.trim(),
          addressLine2: checkout.addressLine2.trim() || undefined,
          city: checkout.city.trim(),
          state: checkout.state.trim(),
          pincode: checkout.pincode.trim(),
        },
        // The server-validated code, never the raw input text — sending a code
        // the user mistyped makes the server reject the entire order.
        couponCode: appliedCoupon?.code || undefined,
        notes: checkout.notes.trim() || undefined,
      };

      const res = await orderApi.placeOrder(payload);
      const data = res?.data || res;
      const order = data?.order;
      const waLink = data?.whatsappUrl || generateWhatsAppMessage();

      setOrderUrl(waLink);
      setOrderDone(true);

      if (order) {
        // The order exists on the server now. The WhatsApp link is already
        // built from `waLink`, so the cart has done its job — clearing it here
        // (rather than only inside openWhatsApp) stops a customer who closes
        // the drawer without sending the message from re-submitting the same
        // cart as a second order.
        clearCart();
        // This order consumed the coupon — don't re-offer it on the next cart.
        clearStoredCoupon();
        setAppliedCoupon(null);
        setCouponCode("");
        toast.success(`Order #${order.orderNumber} placed!`, { duration: 5000 });
      }
    } catch (err: any) {
      // A real server rejection (out of stock, invalid coupon, validation)
      // means NO order was created — surface the error instead of pretending
      // the order went through. Only a network failure falls back to the
      // WhatsApp message path, since the order may not have reached us.
      if (err?.status) {
        toast.error(err.message || "Failed to place order");
        setOrderDone(false);
      } else {
        setOrderUrl(generateWhatsAppMessage());
        setOrderDone(true);
        toast.success("Couldn't reach the server — send your order on WhatsApp and we'll create it for you.", { duration: 5000 });
      }
    } finally {
      setOrdering(false);
    }
  };

  const openWhatsApp = () => {
    window.open(orderUrl, "_blank");
    clearCart();
    setShowCheckout(false);
    setOrderDone(false);
    onClose();
  };

  const updateField = (field: string, value: string) => {
    setCheckout((c) => ({ ...c, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 z-[var(--z-modal)] bg-brand-950/50 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[var(--z-modal)] flex justify-end" ref={drawerRef}>
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="cart-drawer-title"
              tabIndex={-1}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="w-full sm:max-w-md bg-paper-2 shadow-2xl flex flex-col h-full sm:h-[calc(100%-7rem)] m-0 sm:m-4 sm:mt-24 rounded-none sm:rounded-3xl overflow-hidden border-0 sm:border border-rule/60 focus:outline-none"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b shrink-0 bg-paper-3">
                <div className="flex items-center gap-2">
                  {(showCheckout || orderDone) && (
                    <motion.button
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => { setShowCheckout(false); setOrderDone(false); setErrors({}); }}
                      className="p-2 hover:bg-paper-2 rounded-lg transition-colors"
                      aria-label="Go back"
                    >
                      <ArrowLeft className="h-4 w-4 text-brand-700" />
                    </motion.button>
                  )}
                  <div className="p-2 rounded-lg bg-gold-500/15">
                    <ShoppingBag className="h-4 w-4 text-gold-700" />
                  </div>
                  <h2 id="cart-drawer-title" className="text-lg font-display font-bold text-ink">
                    {orderDone ? "Order Placed!" : showCheckout ? "Checkout" : `Cart (${itemCount})`}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/60 transition-colors text-ink-3 hover:text-ink-2"
                  aria-label="Close cart"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Order Success */}
              {orderDone ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-24 h-24 rounded-full bg-brand-600/10 flex items-center justify-center"
                  >
                    <BadgeCheck className="h-12 w-12 text-brand-700" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="text-xl font-bold text-ink">Order submitted</p>
                    <p className="text-sm text-ink-2 mt-2 max-w-xs">
                      Send your order details on WhatsApp to confirm and make payment.
                    </p>
                  </motion.div>
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    onClick={openWhatsApp}
                    className="w-full py-4 bg-whatsapp hover:bg-whatsapp-600 hover:-translate-y-0.5 hover:shadow-xl text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-ui shadow-lg shadow-whatsapp/25 active:scale-[0.98]"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Send on WhatsApp
                  </motion.button>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-xs text-ink-3 flex items-center gap-2"
                  >
                    <Check size={12} /> Cart will be cleared after sending
                  </motion.p>
                </motion.div>
              ) : showCheckout ? (
                /* Checkout Form */
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-ink-2 mb-2 block">Full Name *</label>
                      <div className="relative">
                        <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
                        <input
                          type="text"
                          value={checkout.fullName}
                          onChange={(e) => updateField("fullName", e.target.value)}
                          className={`w-full pl-8 pr-4 py-3 sm:py-2.5 rounded-xl border-2 text-sm transition-ui bg-paper focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--color-focus)] focus:border-brand-600 ${errors.fullName ? "border-rose-300 focus:ring-rose-400" : "border-rule"}`}
                          placeholder="Your full name"
                        />
                      </div>
                      {errors.fullName && <p className="text-xs text-rose-500 mt-2">{errors.fullName}</p>}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-ink-2 mb-2 block">Phone *</label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={checkout.phone}
                          onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                          className={`w-full pl-8 pr-4 py-3 sm:py-2.5 rounded-xl border-2 text-sm transition-ui bg-paper focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--color-focus)] focus:border-brand-600 ${errors.phone ? "border-rose-300 focus:ring-rose-400" : "border-rule"}`}
                          placeholder="10-digit phone number"
                        />
                      </div>
                      {errors.phone && <p className="text-xs text-rose-500 mt-2">{errors.phone}</p>}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-ink-2 mb-2 block">Address *</label>
                      <div className="relative">
                        <MapPin size={14} className="absolute left-4 top-4 text-ink-3" />
                        <input
                          type="text"
                          value={checkout.addressLine1}
                          onChange={(e) => updateField("addressLine1", e.target.value)}
                          className={`w-full pl-8 pr-4 py-3 sm:py-2.5 rounded-xl border-2 text-sm transition-ui bg-paper focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--color-focus)] focus:border-brand-600 ${errors.addressLine1 ? "border-rose-300 focus:ring-rose-400" : "border-rule"}`}
                          placeholder="House, street, area"
                        />
                      </div>
                      {errors.addressLine1 && <p className="text-xs text-rose-500 mt-2">{errors.addressLine1}</p>}
                    </div>

                    <input
                      type="text"
                      value={checkout.addressLine2}
                      onChange={(e) => updateField("addressLine2", e.target.value)}
                      className="w-full px-4 py-3 sm:py-2.5 rounded-xl border-2 border-rule text-sm transition-ui bg-paper focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--color-focus)] focus:border-brand-600"
                      placeholder="Landmark (optional)"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-ink-2 mb-2 block">City *</label>
                        <input
                          type="text"
                          value={checkout.city}
                          onChange={(e) => updateField("city", e.target.value)}
                          className={`w-full px-4 py-3 sm:py-2.5 rounded-xl border-2 text-sm transition-ui bg-paper focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--color-focus)] focus:border-brand-600 ${errors.city ? "border-rose-300 focus:ring-rose-400" : "border-rule"}`}
                          placeholder="City"
                        />
                        {errors.city && <p className="text-xs text-rose-500 mt-2">{errors.city}</p>}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-ink-2 mb-2 block">State *</label>
                        <select
                          value={checkout.state}
                          onChange={(e) => updateField("state", e.target.value)}
                          className={`w-full px-4 py-3 sm:py-2.5 rounded-xl border-2 text-sm transition-ui bg-paper focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--color-focus)] focus:border-brand-600 ${errors.state ? "border-rose-300 focus:ring-rose-400" : "border-rule"}`}
                        >
                          <option value="">Select</option>
                          {INDIAN_STATES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {errors.state && <p className="text-xs text-rose-500 mt-2">{errors.state}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-ink-2 mb-2 block">Pincode *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={checkout.pincode}
                        onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className={`w-full px-4 py-3 sm:py-2.5 rounded-xl border-2 text-sm transition-ui bg-paper focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--color-focus)] focus:border-brand-600 ${errors.pincode ? "border-rose-300 focus:ring-rose-400" : "border-rule"}`}
                        placeholder="6-digit pincode"
                      />
                      {errors.pincode && <p className="text-xs text-rose-500 mt-2">{errors.pincode}</p>}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-ink-2 mb-2 block">Order Notes</label>
                      <textarea
                        value={checkout.notes}
                        onChange={(e) => updateField("notes", e.target.value)}
                        className="w-full px-4 py-3 sm:py-2.5 rounded-xl border-2 border-rule text-sm transition-ui bg-paper focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--color-focus)] focus:border-brand-600 resize-none"
                        rows={2}
                        placeholder="Special instructions..."
                      />
                    </div>
                  </div>

                  {/* Coupon Section */}
                  <div className="bg-paper rounded-xl p-4 border border-rule space-y-2">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-gold-600" />
                      <span className="text-xs font-semibold text-ink uppercase tracking-wider">Coupon</span>
                    </div>
                    {couponDiscount > 0 ? (
                      <div className="flex items-center justify-between bg-brand-600/10 rounded-lg px-4 py-2 border border-brand-600/20">
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-brand-700" />
                          <div>
                            <p className="text-xs font-semibold text-brand-800">{couponCode}</p>
                            <p className="text-xs text-brand-700 tabular-nums">-{formatPrice(couponDiscount)} discount</p>
                          </div>
                        </div>
                        <button onClick={removeCouponCode} className="p-2 hover:bg-brand-600/10 rounded-full transition-colors" aria-label="Remove coupon">
                          <X size={12} className="text-brand-700" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="Enter code"
                            className="flex-1 px-4 py-2 text-xs rounded-lg border border-rule bg-paper focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-ui uppercase font-mono"
                          />
                          <button
                            onClick={applyCouponCode}
                            disabled={applyingCoupon || !couponCode.trim()}
                            className="px-4 py-2 text-xs font-bold bg-gold-500 hover:bg-gold-600 disabled:bg-gold-300 text-brand-950 rounded-lg transition-ui"
                          >
                            {applyingCoupon ? <Loader2 size={12} className="animate-spin" /> : "Apply"}
                          </button>
                        </div>
                        {suggestedCoupons.length > 0 && (
                          <div className="flex items-center gap-2 pt-2">
                            <span className="text-xs font-semibold text-ink-3">Suggested:</span>
                            {suggestedCoupons.map((c: any) => (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => { setCouponCode(c.code); }}
                                className="text-xs font-bold text-gold-800 bg-gold-500/15 border border-gold-500/30 px-2 py-0 rounded-md hover:bg-gold-500/25 transition-colors"
                              >
                                {c.code}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-brand-600/5 rounded-xl p-4 space-y-2 text-sm border border-brand-600/15">
                    <div className="flex justify-between">
                      <span className="text-ink-2">Items</span>
                      <span className="text-ink font-medium">{itemCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-2">Subtotal</span>
                      <span className="font-semibold text-brand-700 tabular-nums">{formatPrice(subtotal)}</span>
                    </div>
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-brand-700 tabular-nums">
                        <span>Discount</span>
                        <span>-{formatPrice(couponDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-ink-2 flex items-center gap-2">
                        <Truck size={10} /> Delivery
                      </span>
                      <span className={deliveryCharge === 0 ? "text-brand-700 font-medium" : "text-ink-2"}>
                        {deliveryCharge === 0 ? "FREE" : formatPrice(deliveryCharge)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-ink-2 flex items-center gap-2">
                        <IndianRupee size={10} /> GST ({gstRate}%)
                      </span>
                      <span className="text-ink-2 tabular-nums">{formatPrice(gstAmount)}</span>
                    </div>
                    <div className="border-t border-brand-600/15 pt-2 mt-2 flex justify-between font-semibold">
                      <span className="text-ink">Total</span>
                      <span className="text-brand-700 tabular-nums">{formatPrice(total)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Cart Items */
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {items.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center"
                      >
                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-brand-600/10 to-gold-500/15 flex items-center justify-center">
                          <ShoppingBag className="h-12 w-12 text-brand-600" />
                        </div>
                        <div>
                          <p className="text-xl font-display font-bold text-ink">Your Cart is Empty</p>
                          <p className="text-sm text-ink-2 mt-2">
                            Add some delicious traditional snacks to get started!
                          </p>
                        </div>
                        <Link
                          href="/products"
                          onClick={onClose}
                          className="px-6 py-4 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-ui shadow-lg shadow-brand-700/20 active:scale-[0.98]"
                        >
                          Browse Products
                        </Link>
                      </motion.div>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {items.map((item) => {
                          const itemTotal = item.variant.sellingPrice * item.quantity;
                          return (
                            <motion.div
                              key={`${item.product._id}-${variantKey(item.variant)}`}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                              className="group relative flex gap-4 p-4 rounded-xl bg-paper border border-rule/60 hover:border-gold-400/40 transition-ui hover:-translate-y-1 hover:shadow-lg overflow-hidden"
                            >
                              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-brand-50 flex-shrink-0">
                                {item.product.images?.[0] ? (
                                  <Image
                                    src={getImageUrl(item.product.images[0])}
                                    alt={item.product.name}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                    sizes="64px"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center"><Package size={28} className="text-ink-3" /></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate text-ink">
                                      {item.product.name}
                                    </p>
                                    <p className="text-xs text-ink-2 mt-0 tabular-nums">
                                      {item.variant.weight?.trim() || `${item.variant.weightValue ?? ""}${item.variant.weightUnit ?? ""}`.trim()}{" "}
                                      - {formatPrice(item.variant.sellingPrice)}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => removeItem(item.product._id, variantKey(item.variant))}
                                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink-3 hover:text-rose-500 hover:bg-red-50 rounded-lg transition-ui flex-shrink-0"
                                    aria-label="Remove item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center border border-rule rounded-lg bg-white overflow-hidden">
                                    <button
                                      onClick={() => updateQuantity(item.product._id, variantKey(item.variant), item.quantity - 1)}
                                      className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-paper-3 transition-colors text-ink-2 disabled:opacity-30 disabled:cursor-not-allowed"
                                      disabled={item.quantity <= 1}
                                      aria-label="Decrease quantity"
                                    >
                                      <Minus className="h-4 w-4 tabular-nums" />
                                    </button>
                                    <motion.span
                                      key={item.quantity}
                                      initial={{ scale: 0.8, opacity: 0.5 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                      className="inline-block px-2 text-sm font-semibold min-w-[24px] text-center text-ink tabular-nums"
                                    >
                                      {item.quantity}
                                    </motion.span>
                                    <button
                                      onClick={() => updateQuantity(item.product._id, variantKey(item.variant), item.quantity + 1)}
                                      className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-paper-3 transition-colors text-ink-2 disabled:opacity-30 disabled:cursor-not-allowed"
                                      disabled={item.quantity >= item.variant.stock}
                                      aria-label="Increase quantity"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  </div>
                                  <motion.p
                                    key={itemTotal}
                                    initial={{ scale: 0.95, opacity: 0.8 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.15 }}
                                    className="text-sm font-bold text-brand-700 tabular-nums"
                                  >
                                    {formatPrice(itemTotal)}
                                  </motion.p>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                  </div>

                  {items.length > 0 && (
                    <div className="border-t border-rule p-4 space-y-4 shrink-0 bg-gradient-to-t from-paper-2 via-paper-2 to-transparent">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-ink-2">Subtotal ({itemCount} items)</span>
                        <motion.span
                          key={subtotal}
                          initial={{ scale: 0.95, opacity: 0.8 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.15 }}
                          className="font-bold text-brand-800 text-lg tabular-nums"
                        >
                          {formatPrice(subtotal)}
                        </motion.span>
                      </div>
                      {subtotal < freeShippingThreshold && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 text-xs text-gold-800 bg-gold-500/10 rounded-lg px-4 py-2 border border-gold-500/25"
                        >
                          <Truck size={12} className="shrink-0 tabular-nums" />
                          Add {formatPrice(freeShippingThreshold - subtotal)} more for <strong>FREE delivery</strong>!
                        </motion.div>
                      )}
                      <button
                        onClick={() => setShowCheckout(true)}
                        className="w-full py-4 bg-brand-600 hover:bg-brand-700 hover:-translate-y-0.5 hover:shadow-xl text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-ui shadow-lg shadow-brand-700/20 active:scale-[0.98] click-ripple"
                      >
                        Proceed to Checkout
                      </button>
                      <button
                        onClick={() => {
                          // Destructive and irreversible — a stray tap next to
                          // "Proceed to Checkout" used to wipe the whole cart
                          // with no way back.
                          if (confirmingClear) {
                            clearCart();
                            setConfirmingClear(false);
                          } else {
                            setConfirmingClear(true);
                          }
                        }}
                        onBlur={() => setConfirmingClear(false)}
                        className={`w-full py-2 text-xs transition-colors ${
                          confirmingClear
                            ? "text-red-600 font-semibold"
                            : "text-ink-3 hover:text-rose-500"
                        }`}
                      >
                        {confirmingClear ? "Tap again to confirm" : "Clear Cart"}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Checkout Footer */}
              {showCheckout && !orderDone && (
                <div className="border-t border-rule p-4 space-y-4 shrink-0 bg-gradient-to-t from-paper-2 to-transparent">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-2">Total</span>
                    <motion.span
                      key={total}
                      initial={{ scale: 0.95, opacity: 0.8 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="font-bold text-brand-800 text-lg tabular-nums"
                    >
                      {formatPrice(total)}
                    </motion.span>
                  </div>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={ordering}
                    className="w-full py-4 bg-whatsapp hover:bg-whatsapp-600 hover:-translate-y-0.5 hover:shadow-xl disabled:bg-whatsapp-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-ui shadow-lg shadow-whatsapp/25 active:scale-[0.98] disabled:active:scale-100"
                  >
                    {ordering ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Placing Order...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-4 w-4" />
                        Order via WhatsApp
                      </>
                    )}
                  </button>
                  <p className="text-xs text-center text-ink-3">
                    By placing this order, you agree to our Terms & Conditions
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
