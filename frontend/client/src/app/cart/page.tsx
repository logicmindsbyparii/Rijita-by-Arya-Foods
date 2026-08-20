"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Tag,
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Percent,
  Package,
  Truck,
  IndianRupee,
  X,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useCart, variantKey } from "@/lib/cart-context";
import { contentApi } from "@/lib/api";
import { formatPrice, getImageUrl } from "@/lib/utils";
import {
  AppliedCoupon,
  getDiscountAmount,
  readStoredCoupon,
  writeStoredCoupon,
  clearStoredCoupon,
} from "@/lib/coupons";

export default function CartPage() {
  const { items, itemCount, subtotal, removeItem, updateQuantity, clearCart, cartReady } = useCart();

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => contentApi.getSiteSettings(),
    staleTime: 5 * 60 * 1000,
  });
  const settings = settingsData?.data?.settings;
  // 0 (or negative) values mean "unset" — use the real defaults, matching the
  // server, so a corrupt settings doc can't silently make delivery free.
  const DELIVERY_THRESHOLD = settings?.shipping?.freeShippingThreshold > 0 ? settings.shipping.freeShippingThreshold : 499;
  const DELIVERY_CHARGE = settings?.shipping?.standardDeliveryCharge > 0 ? settings.shipping.standardDeliveryCharge : 49;
  // Same source as checkout + server — a changed GST rate must flow through everywhere
  const GST_RATE = (settings?.gst?.rate > 0 ? settings.gst.rate : 5) / 100;

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  // Restore a coupon applied earlier (drawer, previous visit, or a refresh).
  // Without this the cart showed no discount while checkout still applied the
  // persisted coupon, so the two pages quoted different totals.
  useEffect(() => {
    const stored = readStoredCoupon();
    if (stored) setAppliedCoupon(stored);
  }, []);

  const discount = appliedCoupon ? getDiscountAmount(subtotal, appliedCoupon) : 0;
  const discountedSubtotal = subtotal - discount;
  const deliveryCharge = subtotal >= DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
  const gstAmount = Math.round(discountedSubtotal * GST_RATE);
  const total = discountedSubtotal + deliveryCharge + gstAmount;

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await contentApi.validateCoupon(code, subtotal);
      const couponData = res?.data?.coupon || res?.data;
      if (!couponData || !couponData.code) throw new Error("Invalid coupon");
      const coupon: AppliedCoupon = {
        code: couponData.code,
        type: couponData.type,
        value: couponData.value,
        maxDiscount: couponData.maxDiscount,
        minOrderAmount: couponData.minOrderAmount ?? 0,
        description: couponData.description,
      };
      setAppliedCoupon(coupon);
      setCouponCode("");
      // Remember the applied coupon so it survives the cart → checkout hop
      // (checkout re-validates it against the server before applying).
      writeStoredCoupon(coupon);
      toast.success(`Coupon "${coupon.code}" applied!`);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "Invalid coupon code";
      setCouponError(msg);
      toast.error(msg);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
    clearStoredCoupon();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
  };

  if (!cartReady) {
    return (
      <div className="min-h-dvh pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-600/20 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-dvh pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="w-28 h-28 mx-auto mb-6 rounded-full bg-gradient-to-br from-brand-600/10 to-gold-500/15 flex items-center justify-center">
            <ShoppingBag size={52} className="text-brand-600" />
          </div>
          <h2 className="text-3xl font-display font-black text-ink mb-4">
            Your Cart is Empty
          </h2>
          <p className="text-ink-2 mb-8 leading-relaxed">
            Looks like you haven&apos;t added anything yet. Explore our premium
            collection of traditional snacks and find something you&apos;ll love!
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-ui hover:shadow-lg hover:shadow-brand-700/25 group"
          >
            <ArrowLeft size={18} />
            Continue Shopping
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold">
              Shopping Cart
            </h1>
            <p className="text-ink-2 mt-2">
              {itemCount} {itemCount === 1 ? "item" : "items"} in your cart
            </p>
          </div>
          <button
            onClick={() => {
              clearCart();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <Trash2 size={16} />
            Clear Cart
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              <AnimatePresence mode="popLayout">
                {items.map((item) => {
                  const variant = item.variant;
                  const lineTotal = variant.sellingPrice * item.quantity;
                  const discountPct = variant.mrp > variant.sellingPrice
                    ? Math.round(((variant.mrp - variant.sellingPrice) / variant.mrp) * 100)
                    : 0;

                  return (
                    <motion.div
                      key={`${item.product._id}-${variantKey(variant)}`}
                      layout
                      variants={itemVariants}
                      exit="exit"
                      className="group bg-paper-2 rounded-2xl border border-rule p-4 sm:p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-4 sm:gap-4">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gradient-to-br from-paper-3 to-gold-500/10 overflow-hidden flex-shrink-0 relative">
                          {item.product.images?.[0] ? (
                            <Image
                              src={getImageUrl(item.product.images[0])}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                              sizes="96px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={32} className="text-brand-500" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <Link
                                href={`/products/${item.product.slug}`}
                                className="font-medium hover:text-brand-600 transition-colors line-clamp-2"
                              >
                                {item.product.name}
                              </Link>
                              <p className="text-xs text-ink-2 mt-0">
                                {variant.weight?.trim() || `${variant.weightValue ?? ""}${variant.weightUnit ?? ""}`.trim()}
                              </p>
                            </div>
                            <button
                              onClick={() => removeItem(item.product._id, variantKey(variant))}
                              className="p-2 rounded-lg hover:bg-rose-50 text-ink-2 hover:text-rose-600 transition-ui"
                              aria-label="Remove item"
                            >
                              <X size={16} />
                            </button>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-lg font-black text-brand-600 tabular-nums">
                              {formatPrice(variant.sellingPrice)}
                            </span>
                            {variant.mrp > variant.sellingPrice && (
                              <>
                                <span className="text-sm text-ink-2 line-through tabular-nums">
                                  {formatPrice(variant.mrp)}
                                </span>
                                <span className="text-xs font-bold text-brand-700 bg-brand-600/10 px-2 py-0.5 rounded-md">
                                  {discountPct}% OFF
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center border rounded-xl overflow-hidden">
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.product._id,
                                    variantKey(variant),
                                    item.quantity - 1
                                  )
                                }
                                disabled={item.quantity <= 1}
                                className="p-2 hover:bg-paper-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Decrease quantity"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-10 text-center text-sm font-medium select-none tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.product._id,
                                    variantKey(variant),
                                    item.quantity + 1
                                  )
                                }
                                disabled={item.quantity >= variant.stock}
                                className="p-2 hover:bg-paper-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Increase quantity"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <span className="text-sm font-semibold tabular-nums">
                              {formatPrice(lineTotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>

            <div className="pt-4">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-sm text-ink-2 hover:text-brand-600 transition-colors"
              >
                <ArrowLeft size={16} />
                Continue Shopping
              </Link>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-28 space-y-6">
              <div className="bg-paper-2 rounded-2xl border border-rule p-4">
                <h3 className="text-sm font-display font-bold flex items-center gap-2 mb-4 text-ink">
                  <Tag size={16} className="text-gold-600" />
                  Have a coupon?
                </h3>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-gold-500/10 rounded-xl px-4 py-4 border border-gold-500/25">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-gold-600" />
                      <div>
                        <p className="text-sm font-bold text-gold-800">
                          {appliedCoupon.code}
                        </p>
                        <p className="text-xs text-gold-700 tabular-nums">
                          {appliedCoupon.type === "percentage"
                            ? `${appliedCoupon.value}% off`
                            : `${formatPrice(appliedCoupon.value)} off`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="p-2 hover:bg-gold-500/20 rounded-full transition-colors"
                      aria-label="Remove coupon"
                    >
                      <X size={14} className="text-gold-600" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          setCouponError("");
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                        placeholder="Enter coupon code"
                        className="w-full px-4 py-2 text-sm rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-ui"
                      />
                    </div>
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-ui"
                    >
                      {couponLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </span>
                      ) : (
                        "Apply"
                      )}
                    </button>
                  </div>
                )}
                {couponError && (
                  <p className="text-xs text-red-500 mt-2">{couponError}</p>
                )}
              </div>

              <div className="bg-paper-2 rounded-2xl border border-rule p-4 space-y-4">
                <h3 className="text-sm font-display font-bold text-ink">Order Summary</h3>

                <div className="space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-2 tabular-nums">Subtotal</span>
                    <span className="font-semibold tabular-nums">{formatPrice(subtotal)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex items-center justify-between text-gold-700">
                      <span className="flex items-center gap-2 font-medium">
                        <Percent size={14} />
                        Discount
                      </span>
                      <span className="tabular-nums">-{formatPrice(discount)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-ink-2">
                      <Truck size={14} />
                      Delivery
                    </span>
                    {deliveryCharge === 0 ? (
                      <span className="text-brand-600 font-bold tabular-nums">FREE</span>
                    ) : (
                      <span className="font-semibold tabular-nums">{formatPrice(deliveryCharge)}</span>
                    )}
                  </div>
                  {subtotal < DELIVERY_THRESHOLD && (
                    <p className="text-xs text-gold-800 bg-gold-500/10 rounded-lg px-3 py-2 border border-gold-500/25 tabular-nums">
                      Add {formatPrice(DELIVERY_THRESHOLD - subtotal)} more for FREE delivery
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-ink-2">
                      <IndianRupee size={14} />
                      GST ({settings?.gst?.rate ?? 5}%)
                    </span>
                    <span className="font-semibold tabular-nums">{formatPrice(gstAmount)}</span>
                  </div>

                  <div className="border-t border-rule pt-4 flex items-center justify-between font-bold text-base">
                    <span>Total</span>
                    <span className="text-brand-600 text-lg tabular-nums">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>

                <Link
                  href="/checkout"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-ui hover:shadow-lg hover:shadow-brand-700/25 group"
                >
                  <CreditCard size={18} />
                  Proceed to Checkout
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </Link>
              </div>

              <div className="bg-gradient-to-br from-brand-600/5 to-gold-500/10 rounded-2xl border border-rule p-4 text-center">
                <Package size={24} className="mx-auto mb-2 text-brand-600" />
                <p className="text-sm font-display font-bold text-ink">Secure Ordering</p>
                <p className="text-xs text-ink-2 mt-2">
                  Your order will be confirmed via WhatsApp
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
