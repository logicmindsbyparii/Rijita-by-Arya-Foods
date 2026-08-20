"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { contentApi } from "@/lib/api";
import {
  Sparkles,
  Tag,
  Gift,
  Clock,
  Percent,
  Star,
  ArrowRight,
  ShoppingBag,
  ChevronRight,
  Zap,
  Package,
  IndianRupee,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Coupon } from "@/types";

const offers = [
  {
    id: 1,
    category: "combo",
    title: "Festival Special Combo",
    description: "Celebrate the season with our curated festival gift box featuring 5 premium namkeen varieties.",
    originalPrice: 999,
    offerPrice: 749,
    discount: 25,
    badge: "Festival Special",
    badgeColor: "bg-gold-600 text-white",
    gradient: "from-gold-400 to-gold-600",
    icon: Gift,
    validUntil: "Dec 31, 2026",
    features: ["5 premium varieties", "Gift packaging", "Free delivery", "Jain-friendly"],
  },
  {
    id: 2,
    category: "discount",
    title: "Starter Pack",
    description: "Perfect for first-time customers. Try our 3 best-selling namkeens at an unbeatable price.",
    originalPrice: 599,
    offerPrice: 399,
    discount: 33,
    badge: "Best Value",
    badgeColor: "bg-brand-600 text-white",
    gradient: "from-brand-500 to-brand-700",
    icon: Star,
    validUntil: "Limited Time",
    features: ["3 best-sellers", "Trial sizes", "₹200 savings", "Free delivery"],
  },
  {
    id: 3,
    category: "discount",
    title: "Bulk Order Discount",
    description: "Stock up your pantry! Get flat 15% off on orders above ₹2,000. Perfect for families and events.",
    originalPrice: 2000,
    offerPrice: 1700,
    discount: 15,
    badge: "Bulk Deal",
    badgeColor: "bg-brand-700 text-white",
    gradient: "from-brand-600 to-brand-800",
    icon: Package,
    validUntil: "Ongoing",
    features: ["15% flat off", "No coupon needed", "All products", "Free delivery"],
  },
  {
    id: 4,
    category: "new",
    title: "New Arrival Launch",
    description: "Be the first to try our new range of baked snacks. Introductory 20% off on all new items.",
    originalPrice: 499,
    offerPrice: 399,
    discount: 20,
    badge: "New Launch",
    badgeColor: "bg-gold-600 text-white",
    gradient: "from-gold-500 to-gold-600",
    icon: Zap,
    validUntil: "While stocks last",
    features: ["New baked range", "20% off launch", "Limited stock", "Premium quality"],
  },
  {
    id: 5,
    category: "shipping",
    title: "Free Delivery",
    description: "Enjoy free delivery on all orders above ₹499. Freshness guaranteed, straight to your doorstep.",
    originalPrice: 499,
    offerPrice: 499,
    discount: 0,
    badge: "Free Shipping",
    badgeColor: "bg-brand-600 text-white",
    gradient: "from-brand-500 to-brand-700",
    icon: ShoppingBag,
    validUntil: "Always",
    features: ["No minimum", "Pan India", "Tracked delivery", "Fresh stock"],
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.5 },
};

const COUPON_PALETTE = [
  { badgeColor: "bg-gold-600 text-white", gradient: "from-gold-500 to-gold-600" },
  { badgeColor: "bg-brand-600 text-white", gradient: "from-brand-600 to-brand-700" },
  { badgeColor: "bg-brand-700 text-white", gradient: "from-brand-700 to-brand-800" },
  { badgeColor: "bg-gold-600 text-white", gradient: "from-gold-400 to-gold-600" },
  { badgeColor: "bg-gold-700 text-white", gradient: "from-gold-600 to-gold-700" },
];

/** Format an ISO date for the "Valid until" line. */
function formatValidUntil(iso?: string): string {
  if (!iso) return "Ongoing";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Ongoing";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Turn a live coupon into the same card shape the static offers use. */
function couponToOffer(coupon: Coupon, index: number) {
  const palette = COUPON_PALETTE[index % COUPON_PALETTE.length];
  const isPercent = coupon.type === "percentage";
  const label = isPercent ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`;
  const features = [
    `Use code ${coupon.code} at checkout`,
    coupon.minOrderAmount > 0 ? `Min. order ₹${coupon.minOrderAmount}` : "No minimum order",
    coupon.maxDiscount ? `Up to ₹${coupon.maxDiscount} off` : "No cap on savings",
    isPercent ? "Percentage discount" : "Flat amount off",
  ];

  return {
    id: coupon._id,
    category: "discount",
    title: coupon.code,
    description: coupon.description || `Get ${coupon.value}% off your order.`,
    originalPrice: 0,
    offerPrice: 0,
    discount: coupon.value,
    badge: label,
    badgeColor: palette.badgeColor,
    gradient: palette.gradient,
    icon: Percent,
    validUntil: formatValidUntil(coupon.expiresAt),
    features,
  };
}

export default function OffersPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [couponOffers, setCouponOffers] = useState<Array<ReturnType<typeof couponToOffer>>>([]);

  // Live coupons from the server — the page can only ever advertise codes that
  // actually work at checkout. Failure to load silently falls back to the
  // static offers rather than breaking the page.
  useEffect(() => {
    let cancelled = false;
    contentApi
      .getCoupons()
      .then((res) => {
        if (cancelled) return;
        const list = res?.data?.coupons ?? [];
        setCouponOffers(list.map((c: any, i: number) => couponToOffer(c, i)));
      })
      .catch(() => {
        if (!cancelled) setCouponOffers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = [
    { id: "all", label: "All Offers" },
    { id: "combo", label: "Combos" },
    { id: "discount", label: "Discounts" },
    { id: "new", label: "New Launches" },
    { id: "shipping", label: "Shipping" },
  ];

  const allOffers = [...offers, ...couponOffers];
  const filtered = selectedCategory === "all"
    ? allOffers
    : allOffers.filter((o) => o.category === selectedCategory);

  return (
    <div className="min-h-dvh pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-brand-600/20 bg-brand-600/10 rounded-full text-brand-700 text-sm font-medium mb-4">
            <Tag size={16} />
            Exclusive Offers
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-ink mb-4 tracking-tight">
            Deals &{" "}
            <span className="font-serif italic font-medium text-gold-600">Offers</span>
          </h1>
          <p className="text-ink-2 text-lg max-w-2xl mx-auto [text-wrap:pretty]">
            Real savings on 100% Jain snacks — festival combos, working coupon
            codes, and free delivery on every order.
          </p>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold transition-ui border",
                selectedCategory === cat.id
                  ? "bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-700/20"
                  : "bg-paper-2 border-rule text-ink-2 hover:border-brand-500 hover:text-brand-700"
              )}
            >
              {cat.label}
            </button>
          ))}
        </motion.div>

        {/* Offers Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((offer, i) => {
            const Icon = offer.icon;
            return (
              <motion.div
                key={offer.id}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="group overflow-hidden hover:shadow-xl transition-ui duration-300 relative h-full border-rule bg-paper-2">
                  <div className={cn("absolute inset-0 opacity-[0.04]", offer.gradient)} />
                  
                  {/* Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    <Badge className={cn("text-xs px-4 py-2", offer.badgeColor)}>
                      {offer.badge}
                    </Badge>
                  </div>

                  <CardContent className="p-6 relative">
                    {/* Icon */}
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br",
                      offer.gradient
                    )}>
                      <Icon size={26} className="text-white" />
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-bold mb-2 text-ink">{offer.title}</h3>
                    <p className="text-sm text-ink-3 mb-4">{offer.description}</p>

                    {/* Price */}
                    {offer.discount > 0 && (
                      <div className="flex items-baseline gap-2 mb-4">
                        {offer.offerPrice > 0 ? (
                          <span className="text-3xl font-black text-ink tabular-nums">
                            ₹{offer.offerPrice}
                          </span>
                        ) : (
                          <span className="font-serif italic text-gold-600 text-2xl font-medium">
                            Save {offer.discount}%
                          </span>
                        )}
                        {offer.originalPrice > offer.offerPrice && (
                          <span className="text-lg text-ink-3 line-through tabular-nums">
                            ₹{offer.originalPrice}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Features */}
                    <div className="space-y-2 mb-4">
                      {offer.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-xs text-ink-2">
                          <div className="w-2 h-2 rounded-full bg-gold-500" />
                          {feature}
                        </div>
                      ))}
                    </div>

                    {/* Validity */}
                    <div className="flex items-center gap-2 text-xs text-ink-3 mb-4">
                      <Clock size={12} />
                      Valid: {offer.validUntil}
                    </div>

                    {/* CTA */}
                    <Link
                      href="/products"
                      className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800 transition-colors group/link"
                    >
                      Shop Now
                      <ArrowRight size={14} className="group-hover/link:translate-x-0.5 transition-transform" />
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          {...fadeUp}
          className="mt-16 text-center bg-paper-2 border border-rule rounded-2xl p-8 md:p-12 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_120%,rgba(212,165,69,0.14),transparent_60%)] pointer-events-none" />
          <div className="relative">
            <h2 className="text-2xl md:text-4xl font-display font-black text-ink mb-4 [text-wrap:balance]">
              Be first to hear about new <span className="font-serif italic font-medium text-gold-600">drops & deals</span>
            </h2>
            <p className="text-ink-2 mb-8 max-w-lg mx-auto [text-wrap:pretty]">
              Subscribe to our newsletter for new products, seasonal discounts,
              and recipe ideas from our halwai kitchen.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!subscribeEmail.trim()) return;
                setSubscribing(true);
                try {
                  await contentApi.subscribe(subscribeEmail.trim());
                  toast.success("Subscribed successfully");
                  setSubscribeEmail("");
                  setSubscribed(true);
                } catch (err: any) {
                  toast.error(err?.message || "Failed to subscribe");
                } finally {
                  setSubscribing(false);
                }
              }}
              className="flex max-w-md mx-auto"
            >
              <input
                type="email"
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
                placeholder="Your email address"
                required
                className="flex-1 px-4 py-4 rounded-l-xl text-sm bg-white border border-rule border-r-0 focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:border-transparent transition-ui text-ink placeholder:text-ink-3"
              />
              <button
                type="submit"
                disabled={subscribing}
                className="px-6 py-4 bg-brand-600 text-white rounded-r-xl font-bold text-sm hover:bg-brand-700 transition-colors disabled:opacity-60"
              >
                {subscribing ? "Subscribing…" : subscribed ? "Subscribed" : "Subscribe"}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
