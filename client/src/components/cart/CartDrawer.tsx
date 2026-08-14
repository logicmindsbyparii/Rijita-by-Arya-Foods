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
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { formatPrice, getImageUrl } from "@/lib/utils";
import { INDIAN_STATES } from "@/lib/constants";
import { orderApi, contentApi } from "@/lib/api";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, itemCount, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [orderUrl, setOrderUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [useExistingAddress, setUseExistingAddress] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponId, setCouponId] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
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
  const settings = settingsData?.data?.settings;
  const whatsappNumber = settings?.whatsapp?.number || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210";
  const freeShippingThreshold = settings?.shipping?.freeShippingThreshold ?? 499;
  const standardDeliveryCharge = settings?.shipping?.standardDeliveryCharge ?? 49;
  const gstRate = settings?.gst?.rate ?? 5;
  const deliveryCharge = subtotal >= freeShippingThreshold ? 0 : standardDeliveryCharge;
  const discountedSubtotal = Math.max(0, subtotal - couponDiscount);
  const gstAmount = Math.round(discountedSubtotal * (gstRate / 100));
  const total = discountedSubtotal + deliveryCharge + gstAmount;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

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
      const discAmount = couponData.type === 'percentage'
        ? Math.min(subtotal * (couponData.value / 100), couponData.maxDiscount || Infinity)
        : Math.min(couponData.value, subtotal);
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

  const removeCouponCode = () => {
    setCouponDiscount(0);
    setCouponId(null);
    setCouponCode("");
  };

  const generateWhatsAppMessage = useCallback(() => {
    const lines = items.map(
      (item, i) =>
        `${i + 1}. ${item.product.name} - ${item.variant.weightValue}${item.variant.weightUnit} x ${item.quantity} = ₹${item.variant.sellingPrice * item.quantity}`
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
      couponCode ? `Coupon: ${couponCode}` : null,
      checkout.notes ? `\n*Notes:* ${checkout.notes}` : "",
    ].filter(Boolean).join("\n");
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  }, [items, subtotal, deliveryCharge, total, checkout, user, couponDiscount, couponCode, gstAmount, whatsappNumber]);

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
        couponCode: couponCode || undefined,
        notes: checkout.notes.trim() || undefined,
      };

      const res = await orderApi.placeOrder(payload);
      const data = res?.data || res;
      const order = data?.order;
      const waLink = data?.whatsappUrl || generateWhatsAppMessage();

      setOrderUrl(waLink);
      setOrderDone(true);

      if (order) {
        toast.success(`Order #${order.orderNumber} placed!`, { duration: 5000 });
      }
    } catch (err: any) {
      setOrderUrl(generateWhatsAppMessage());
      setOrderDone(true);
      toast.success("Demo order created! Send details on WhatsApp to confirm.", { duration: 5000 });
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
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 flex justify-end" ref={drawerRef}>
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="w-full sm:max-w-md bg-white shadow-2xl flex flex-col h-full sm:h-[calc(100%-2rem)] m-0 sm:m-4 rounded-none sm:rounded-3xl overflow-hidden border-0 sm:border border-border/50"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b shrink-0 bg-gradient-to-r from-brand-50 to-amber-50">
                <div className="flex items-center gap-2">
                  {(showCheckout || orderDone) && (
                    <motion.button
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => { setShowCheckout(false); setOrderDone(false); setErrors({}); }}
                      className="p-2 hover:bg-white/60 rounded-lg transition-colors"
                      aria-label="Go back"
                    >
                      <ArrowLeft className="h-4 w-4 text-brand-700" />
                    </motion.button>
                  )}
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <ShoppingBag className="h-4 w-4 text-amber-600" />
                  </div>
                  <h2 className="text-lg font-display font-bold text-brand-900">
                    {orderDone ? "Order Placed!" : showCheckout ? "Checkout" : `Cart (${itemCount})`}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/60 transition-colors text-stone-400 hover:text-stone-600"
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
                    className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center"
                  >
                    <BadgeCheck className="h-12 w-12 text-green-600" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="text-xl font-bold text-brand-900">Order Submitted!</p>
                    <p className="text-sm text-stone-500 mt-2 max-w-xs">
                      Send your order details on WhatsApp to confirm and make payment.
                    </p>
                  </motion.div>
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    onClick={openWhatsApp}
                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-ui shadow-lg shadow-green-600/25 active:scale-[0.98]"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Send on WhatsApp
                  </motion.button>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-xs text-stone-400 flex items-center gap-2"
                  >
                    <Check size={12} /> Cart will be cleared after sending
                  </motion.p>
                </motion.div>
              ) : showCheckout ? (
                /* Checkout Form */
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-stone-500 mb-2 block">Full Name *</label>
                      <div className="relative">
                        <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          value={checkout.fullName}
                          onChange={(e) => updateField("fullName", e.target.value)}
                          className={`w-full pl-8 pr-4 py-2 rounded-xl border-2 text-sm transition-ui bg-stone-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 ${errors.fullName ? "border-red-300 focus:ring-red-400" : "border-stone-200"}`}
                          placeholder="Your full name"
                        />
                      </div>
                      {errors.fullName && <p className="text-xs text-red-500 mt-2">{errors.fullName}</p>}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-stone-500 mb-2 block">Phone *</label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={checkout.phone}
                          onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                          className={`w-full pl-8 pr-4 py-2 rounded-xl border-2 text-sm transition-ui bg-stone-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 ${errors.phone ? "border-red-300 focus:ring-red-400" : "border-stone-200"}`}
                          placeholder="10-digit phone number"
                        />
                      </div>
                      {errors.phone && <p className="text-xs text-red-500 mt-2">{errors.phone}</p>}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-stone-500 mb-2 block">Address *</label>
                      <div className="relative">
                        <MapPin size={14} className="absolute left-4 top-4 text-stone-400" />
                        <input
                          type="text"
                          value={checkout.addressLine1}
                          onChange={(e) => updateField("addressLine1", e.target.value)}
                          className={`w-full pl-8 pr-4 py-2 rounded-xl border-2 text-sm transition-ui bg-stone-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 ${errors.addressLine1 ? "border-red-300 focus:ring-red-400" : "border-stone-200"}`}
                          placeholder="House, street, area"
                        />
                      </div>
                      {errors.addressLine1 && <p className="text-xs text-red-500 mt-2">{errors.addressLine1}</p>}
                    </div>

                    <input
                      type="text"
                      value={checkout.addressLine2}
                      onChange={(e) => updateField("addressLine2", e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border-2 border-stone-200 text-sm transition-ui bg-stone-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="Landmark (optional)"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-stone-500 mb-2 block">City *</label>
                        <input
                          type="text"
                          value={checkout.city}
                          onChange={(e) => updateField("city", e.target.value)}
                          className={`w-full px-4 py-2 rounded-xl border-2 text-sm transition-ui bg-stone-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 ${errors.city ? "border-red-300 focus:ring-red-400" : "border-stone-200"}`}
                          placeholder="City"
                        />
                        {errors.city && <p className="text-xs text-red-500 mt-2">{errors.city}</p>}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-stone-500 mb-2 block">State *</label>
                        <select
                          value={checkout.state}
                          onChange={(e) => updateField("state", e.target.value)}
                          className={`w-full px-4 py-2 rounded-xl border-2 text-sm transition-ui bg-stone-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 ${errors.state ? "border-red-300 focus:ring-red-400" : "border-stone-200"}`}
                        >
                          <option value="">Select</option>
                          {INDIAN_STATES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {errors.state && <p className="text-xs text-red-500 mt-2">{errors.state}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-stone-500 mb-2 block">Pincode *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={checkout.pincode}
                        onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className={`w-full px-4 py-2 rounded-xl border-2 text-sm transition-ui bg-stone-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 ${errors.pincode ? "border-red-300 focus:ring-red-400" : "border-stone-200"}`}
                        placeholder="6-digit pincode"
                      />
                      {errors.pincode && <p className="text-xs text-red-500 mt-2">{errors.pincode}</p>}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-stone-500 mb-2 block">Order Notes</label>
                      <textarea
                        value={checkout.notes}
                        onChange={(e) => updateField("notes", e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border-2 border-stone-200 text-sm transition-ui bg-stone-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                        rows={2}
                        placeholder="Special instructions..."
                      />
                    </div>
                  </div>

                  {/* Coupon Section */}
                  <div className="bg-white rounded-xl p-4 border border-stone-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-amber-600" />
                      <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Coupon</span>
                    </div>
                    {couponDiscount > 0 ? (
                      <div className="flex items-center justify-between bg-green-50 rounded-lg px-4 py-2 border border-green-200">
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-green-600" />
                          <div>
                            <p className="text-xs font-semibold text-green-700">{couponCode}</p>
                            <p className="text-xs text-green-600 tabular-nums">-{formatPrice(couponDiscount)} discount</p>
                          </div>
                        </div>
                        <button onClick={removeCouponCode} className="p-2 hover:bg-green-100 rounded-full transition-colors" aria-label="Remove coupon">
                          <X size={12} className="text-green-600" />
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
                            className="flex-1 px-4 py-2 text-xs rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-ui uppercase font-mono"
                          />
                          <button
                            onClick={applyCouponCode}
                            disabled={applyingCoupon || !couponCode.trim()}
                            className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-brand-950 rounded-lg transition-ui"
                          >
                            {applyingCoupon ? <Loader2 size={12} className="animate-spin" /> : "Apply"}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <span className="text-xs font-semibold text-stone-400">Suggested:</span>
                          {["JAIN10", "WELCOME10"].map((code) => (
                            <button
                              key={code}
                              type="button"
                              onClick={() => { setCouponCode(code); }}
                              className="text-xs font-bold text-amber-800 bg-amber-100/80 border border-amber-300 px-2 py-0 rounded-md hover:bg-amber-200 transition-colors"
                            >
                              {code}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-brand-50/50 rounded-xl p-4 space-y-2 text-sm border border-brand-100">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Items</span>
                      <span className="text-stone-700 font-medium">{itemCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Subtotal</span>
                      <span className="font-semibold text-brand-700 tabular-nums">{formatPrice(subtotal)}</span>
                    </div>
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-green-600 tabular-nums">
                        <span>Discount</span>
                        <span>-{formatPrice(couponDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-500 flex items-center gap-2">
                        <Truck size={10} /> Delivery
                      </span>
                      <span className={deliveryCharge === 0 ? "text-green-600 font-medium" : "text-stone-500"}>
                        {deliveryCharge === 0 ? "FREE" : formatPrice(deliveryCharge)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-500 flex items-center gap-2">
                        <IndianRupee size={10} /> GST ({gstRate}%)
                      </span>
                      <span className="text-stone-500 tabular-nums">{formatPrice(gstAmount)}</span>
                    </div>
                    <div className="border-t border-brand-100 pt-2 mt-2 flex justify-between font-semibold">
                      <span>Total</span>
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
                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-brand-100 to-amber-100 flex items-center justify-center">
                          <ShoppingBag className="h-12 w-12 text-brand-400" />
                        </div>
                        <div>
                          <p className="text-xl font-display font-bold text-brand-900">Your Cart is Empty</p>
                          <p className="text-sm text-stone-500 mt-2">
                            Add some delicious traditional snacks to get started!
                          </p>
                        </div>
                        <Link
                          href="/products"
                          onClick={onClose}
                          className="px-6 py-4 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-ui shadow-lg shadow-amber-500/20 active:scale-[0.98]"
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
                              key={`${item.product._id}-${item.variant._id}`}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                              className="flex gap-4 p-4 rounded-xl bg-stone-50/50 border border-stone-200/60 hover:border-amber-200 transition-ui"
                            >
                              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-brand-50 flex-shrink-0">
                                {item.product.images?.[0] ? (
                                  <Image
                                    src={getImageUrl(item.product.images[0])}
                                    alt={item.product.name}
                                    fill
                                    className="object-cover"
                                    sizes="64px"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center"><Package size={28} className="text-stone-300" /></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate text-stone-800">
                                      {item.product.name}
                                    </p>
                                    <p className="text-xs text-stone-500 mt-0 tabular-nums">
                                      {item.variant.weightValue}{item.variant.weightUnit} - {formatPrice(item.variant.sellingPrice)}/pc
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => removeItem(item.product._id, item.variant._id ?? "")}
                                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-ui flex-shrink-0"
                                    aria-label="Remove item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center border border-stone-200 rounded-lg bg-white overflow-hidden">
                                    <button
                                      onClick={() => updateQuantity(item.product._id, item.variant._id ?? "", item.quantity - 1)}
                                      className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-stone-50 transition-colors text-stone-500 disabled:opacity-30 disabled:cursor-not-allowed"
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
                                      className="inline-block px-2 text-sm font-semibold min-w-[24px] text-center text-stone-700 tabular-nums"
                                    >
                                      {item.quantity}
                                    </motion.span>
                                    <button
                                      onClick={() => updateQuantity(item.product._id, item.variant._id ?? "", item.quantity + 1)}
                                      className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-stone-50 transition-colors text-stone-500 disabled:opacity-30 disabled:cursor-not-allowed"
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
                    <div className="border-t border-stone-200 p-4 space-y-4 shrink-0 bg-gradient-to-t from-white via-white to-transparent">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-stone-500">Subtotal ({itemCount} items)</span>
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
                      {subtotal < 499 && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-4 py-2 border border-amber-200/50"
                        >
                          <Truck size={12} className="shrink-0 tabular-nums" />
                          Add {formatPrice(499 - subtotal)} more for <strong>FREE delivery</strong>!
                        </motion.div>
                      )}
                      <button
                        onClick={() => setShowCheckout(true)}
                        className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-ui shadow-lg shadow-emerald-900/20 active:scale-[0.98] click-ripple"
                      >
                        Proceed to Checkout
                      </button>
                      <button
                        onClick={() => {
                          clearCart();
                        }}
                        className="w-full py-2 text-xs text-stone-400 hover:text-red-500 transition-colors"
                      >
                        Clear Cart
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Checkout Footer */}
              {showCheckout && !orderDone && (
                <div className="border-t border-stone-200 p-4 space-y-4 shrink-0 bg-gradient-to-t from-white to-transparent">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-600">Total</span>
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
                    className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-ui shadow-lg shadow-green-600/25 active:scale-[0.98] disabled:active:scale-100"
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
                  <p className="text-xs text-center text-stone-400">
                    By placing this order, you agree to our Terms & Conditions
                  </p>
                  <Link
                    href="/orders/demo"
                    className="block text-center text-xs text-stone-400 hover:text-amber-600 underline underline-offset-2 transition-colors"
                  >
                    🧪 Try Demo Order (no API required)
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
