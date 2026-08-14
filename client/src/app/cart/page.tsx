"use client";

import { useState } from "react";
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
import { useCart } from "@/lib/cart-context";
import { contentApi } from "@/lib/api";
import { formatPrice, getImageUrl } from "@/lib/utils";

interface AppliedCoupon {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  maxDiscount?: number;
  minOrderAmount: number;
  description?: string;
}

const GST_RATE = 0.05;

function getDiscountAmount(subtotal: number, coupon: AppliedCoupon): number {
  if (subtotal < coupon.minOrderAmount) return 0;
  let discount = coupon.type === "percentage"
    ? (coupon.value / 100) * subtotal
    : coupon.value;
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  return Math.round(discount);
}

export default function CartPage() {
  const { items, itemCount, subtotal, removeItem, updateQuantity, clearCart, cartReady } = useCart();

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => contentApi.getSiteSettings(),
    staleTime: 5 * 60 * 1000,
  });
  const settings = settingsData?.data?.settings;
  const DELIVERY_THRESHOLD = settings?.shipping?.freeShippingThreshold ?? 499;
  const DELIVERY_CHARGE = settings?.shipping?.standardDeliveryCharge ?? 49;

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

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
      setAppliedCoupon({
        code: couponData.code,
        type: couponData.type,
        value: couponData.value,
        maxDiscount: couponData.maxDiscount,
        minOrderAmount: couponData.minOrderAmount,
        description: couponData.description,
      });
      setCouponCode("");
      toast.success(`Coupon "${code}" applied!`);
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
      <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="w-28 h-28 mx-auto mb-6 rounded-full bg-gradient-to-br from-brand-100 to-amber-100 flex items-center justify-center">
            <ShoppingBag size={52} className="text-brand-400" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-4">
            Your Cart is Empty
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Looks like you haven&apos;t added anything yet. Explore our premium
            collection of traditional snacks and find something you&apos;ll love!
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-ui hover:shadow-lg hover:shadow-brand-500/25 group"
          >
            <ArrowLeft size={18} />
            Continue Shopping
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold">
              Shopping Cart
            </h1>
            <p className="text-muted-foreground mt-2">
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
                      key={`${item.product._id}-${variant._id}`}
                      layout
                      variants={itemVariants}
                      exit="exit"
                      className="group bg-white rounded-2xl border p-4 sm:p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-4 sm:gap-4">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gradient-to-br from-brand-50 to-amber-50 overflow-hidden flex-shrink-0 relative">
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
                              <Package size={32} className="text-brand-300" />
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
                              <p className="text-xs text-muted-foreground mt-0">
                                {variant.weight}
                              </p>
                            </div>
                            <button
                              onClick={() => removeItem(item.product._id, variant._id!)}
                              className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-ui"
                              aria-label="Remove item"
                            >
                              <X size={16} />
                            </button>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-lg font-bold text-brand-600 tabular-nums">
                              {formatPrice(variant.sellingPrice)}
                            </span>
                            {variant.mrp > variant.sellingPrice && (
                              <>
                                <span className="text-sm text-muted-foreground line-through tabular-nums">
                                  {formatPrice(variant.mrp)}
                                </span>
                                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0 rounded">
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
                                    variant._id!,
                                    item.quantity - 1
                                  )
                                }
                                disabled={item.quantity <= 1}
                                className="p-2 hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                                    variant._id!,
                                    item.quantity + 1
                                  )
                                }
                                disabled={item.quantity >= variant.stock}
                                className="p-2 hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-600 transition-colors"
              >
                <ArrowLeft size={16} />
                Continue Shopping
              </Link>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-28 space-y-6">
              <div className="bg-white rounded-2xl border p-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                  <Tag size={16} className="text-brand-500" />
                  Have a coupon?
                </h3>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-4 border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-700">
                          {appliedCoupon.code}
                        </p>
                        <p className="text-xs text-green-600 tabular-nums">
                          {appliedCoupon.type === "percentage"
                            ? `${appliedCoupon.value}% off`
                            : `${formatPrice(appliedCoupon.value)} off`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="p-2 hover:bg-green-100 rounded-full transition-colors"
                      aria-label="Remove coupon"
                    >
                      <X size={14} className="text-green-600" />
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
                        className="w-full px-4 py-2 text-sm rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-ui"
                      />
                    </div>
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white text-sm font-medium rounded-xl transition-ui"
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

              <div className="bg-white rounded-2xl border p-4 space-y-4">
                <h3 className="text-sm font-semibold">Order Summary</h3>

                <div className="space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground tabular-nums">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex items-center justify-between text-green-600">
                      <span className="flex items-center gap-2">
                        <Percent size={14} />
                        Discount
                      </span>
                      <span>-{formatPrice(discount)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Truck size={14} />
                      Delivery
                    </span>
                    {deliveryCharge === 0 ? (
                      <span className="text-green-600 font-medium tabular-nums">FREE</span>
                    ) : (
                      <span>{formatPrice(deliveryCharge)}</span>
                    )}
                  </div>
                  {subtotal < DELIVERY_THRESHOLD && (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      Add {formatPrice(DELIVERY_THRESHOLD - subtotal)} more for
                      free delivery
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <IndianRupee size={14} />
                      GST (5%)
                    </span>
                    <span>{formatPrice(gstAmount)}</span>
                  </div>

                  <div className="border-t pt-4 flex items-center justify-between font-semibold text-base">
                    <span>Total</span>
                    <span className="text-brand-600 text-lg tabular-nums">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>

                <Link
                  href="/checkout"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-ui hover:shadow-lg hover:shadow-brand-500/25 group"
                >
                  <CreditCard size={18} />
                  Proceed to Checkout
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </Link>
              </div>

              <div className="bg-gradient-to-br from-brand-50 to-amber-50 rounded-2xl border p-4 text-center">
                <Package size={24} className="mx-auto mb-2 text-brand-500" />
                <p className="text-sm font-medium">Secure Ordering</p>
                <p className="text-xs text-muted-foreground mt-2">
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
