"use client";

import { useState } from "react";
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

const offers = [
  {
    id: 1,
    title: "Festival Special Combo",
    description: "Celebrate the season with our curated festival gift box featuring 5 premium namkeen varieties.",
    originalPrice: 999,
    offerPrice: 749,
    discount: 25,
    badge: "Festival Special",
    badgeColor: "bg-spice-gold text-white",
    gradient: "from-spice-gold to-amber-600",
    icon: Gift,
    validUntil: "Dec 31, 2026",
    features: ["5 premium varieties", "Gift packaging", "Free delivery", "Jain-friendly"],
  },
  {
    id: 2,
    title: "Starter Pack",
    description: "Perfect for first-time customers. Try our 3 best-selling namkeens at an unbeatable price.",
    originalPrice: 599,
    offerPrice: 399,
    discount: 33,
    badge: "Best Value",
    badgeColor: "bg-green-500 text-white",
    gradient: "from-green-500 to-emerald-600",
    icon: Star,
    validUntil: "Limited Time",
    features: ["3 best-sellers", "Trial sizes", "₹200 savings", "Free delivery"],
  },
  {
    id: 3,
    title: "Bulk Order Discount",
    description: "Stock up your pantry! Get flat 15% off on orders above ₹2,000. Perfect for families and events.",
    originalPrice: 2000,
    offerPrice: 1700,
    discount: 15,
    badge: "Bulk Deal",
    badgeColor: "bg-blue-500 text-white",
    gradient: "from-blue-500 to-indigo-600",
    icon: Package,
    validUntil: "Ongoing",
    features: ["15% flat off", "No coupon needed", "All products", "Free delivery"],
  },
  {
    id: 4,
    title: "New Arrival Launch",
    description: "Be the first to try our new range of baked snacks. Introductory 20% off on all new items.",
    originalPrice: 499,
    offerPrice: 399,
    discount: 20,
    badge: "New Launch",
    badgeColor: "bg-purple-500 text-white",
    gradient: "from-purple-500 to-pink-600",
    icon: Zap,
    validUntil: "While stocks last",
    features: ["New baked range", "20% off launch", "Limited stock", "Premium quality"],
  },
  {
    id: 5,
    title: "Free Delivery",
    description: "Enjoy free delivery on all orders above ₹499. Freshness guaranteed, straight to your doorstep.",
    originalPrice: 499,
    offerPrice: 499,
    discount: 0,
    badge: "Free Shipping",
    badgeColor: "bg-brand-500 text-white",
    gradient: "from-brand-500 to-orange-600",
    icon: ShoppingBag,
    validUntil: "Always",
    features: ["No minimum", "Pan India", "Tracked delivery", "Fresh stock"],
  },
  {
    id: 6,
    title: "Weekend Flash Sale",
    description: "Every weekend, enjoy extra 10% off on all our products. Use code WEEKEND10 at checkout.",
    originalPrice: 0,
    offerPrice: 0,
    discount: 10,
    badge: "Flash Sale",
    badgeColor: "bg-red-500 text-white",
    gradient: "from-red-500 to-rose-600",
    icon: Percent,
    validUntil: "Every Weekend",
    features: ["Extra 10% off", "Code: WEEKEND10", "All products", "Stackable"],
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.5 },
};

export default function OffersPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const categories = [
    { id: "all", label: "All Offers" },
    { id: "combo", label: "Combos" },
    { id: "discount", label: "Discounts" },
    { id: "new", label: "New Launches" },
    { id: "shipping", label: "Shipping" },
  ];

  const filtered = selectedCategory === "all"
    ? offers
    : offers.filter((o) => {
        if (selectedCategory === "combo") return o.id === 1;
        if (selectedCategory === "discount") return [2, 3, 6].includes(o.id);
        if (selectedCategory === "new") return o.id === 4;
        if (selectedCategory === "shipping") return o.id === 5;
        return true;
      });

  return (
    <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-100 rounded-full text-brand-700 text-sm font-medium mb-4">
            <Tag size={16} />
            Exclusive Offers
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Deals &{" "}
            <span className="text-brand-600">Offers</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Unlock amazing savings on your favorite snacks. From combo deals to
            free delivery, there&apos;s something for everyone.
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
                "px-4 py-2 rounded-xl text-sm font-medium transition-ui",
                selectedCategory === cat.id
                  ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                  : "bg-muted text-muted-foreground hover:bg-brand-50 hover:text-brand-600"
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
                <Card className="group overflow-hidden hover:shadow-xl transition-ui duration-300 relative h-full">
                  <div className={cn("absolute inset-0 opacity-[0.03]", offer.gradient)} />
                  
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
                    <h3 className="text-lg font-display font-bold mb-2">{offer.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{offer.description}</p>

                    {/* Price */}
                    {offer.discount > 0 && (
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-3xl font-bold text-brand-600">
                          {offer.offerPrice > 0 ? `₹${offer.offerPrice}` : "—"}
                        </span>
                        {offer.originalPrice > offer.offerPrice && (
                          <>
                            <span className="text-lg text-muted-foreground line-through">
                              ₹{offer.originalPrice}
                            </span>
                            <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                              {offer.discount}% OFF
                            </Badge>
                          </>
                        )}
                      </div>
                    )}

                    {/* Features */}
                    <div className="space-y-2 mb-4">
                      {offer.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-2 h-2 rounded-full bg-brand-500" />
                          {feature}
                        </div>
                      ))}
                    </div>

                    {/* Validity */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      <Clock size={12} />
                      Valid: {offer.validUntil}
                    </div>

                    {/* CTA */}
                    <Link
                      href="/products"
                      className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors group/link"
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
          className="mt-16 text-center bg-gradient-to-r from-brand-500 to-spice-gold rounded-2xl p-8 md:p-12"
        >
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
            Don&apos;t Miss Out on Great Deals!
          </h2>
          <p className="text-white/80 mb-6 max-w-lg mx-auto">
            Subscribe to our newsletter and be the first to know about new offers,
            seasonal discounts, and product launches.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!subscribeEmail.trim()) return;
              setSubscribing(true);
              try {
                await contentApi.subscribe(subscribeEmail.trim());
                toast.success("Subscribed successfully!");
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
              className="flex-1 px-4 py-4 rounded-l-xl text-sm focus:outline-none"
            />
            <button
              type="submit"
              disabled={subscribing}
              className="px-6 py-4 bg-luxury-900 text-white rounded-r-xl font-medium text-sm hover:bg-luxury-800 transition-colors disabled:opacity-60"
            >
              {subscribing ? "Subscribing..." : subscribed ? "Subscribed!" : "Subscribe"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
