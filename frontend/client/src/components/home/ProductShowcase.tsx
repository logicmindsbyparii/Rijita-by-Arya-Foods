"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ProductCard from "@/components/products/ProductCard";
import { ShieldCheck, Sparkles, Leaf, Ban, Flame, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DESC = {
  featured:
    "Scroll through our signature collection. Every batch is handcrafted with pristine ingredients and absolutely zero onion or garlic.",
  arrivals:
    "Hot off the kadai — our newest 100% Jain creations, fried in small batches and packed fresh while the crunch is at its best.",
} as const;

const TRUST_ITEMS = [
  { icon: Leaf, label: "100% Sattvik" },
  { icon: Ban, label: "Zero Onion · Zero Garlic" },
  { icon: Flame, label: "Pure Groundnut Oil" },
];

export default function ProductShowcase({
  title,
  subtitle,
  products = [],
  variant = "featured",
}: {
  title: string;
  subtitle: string;
  products: any[];
  variant?: "featured" | "arrivals";
}) {
  const [activeFilter, setActiveFilter] = useState("all");
  const isArrivals = variant === "arrivals";

  if (!products || products.length === 0) {
    return <ProductShowcaseEmpty title={title} subtitle={subtitle} variant={variant} />;
  }

  const categoryFilters = (() => {
    const seen = new Map<string, { id: string; label: string }>();
    for (const p of products) {
      const catName = (typeof p.category === "object" ? p.category?.name : "") || "";
      if (!catName || seen.has(catName)) continue;
      seen.set(catName, {
        id: catName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        label: catName,
      });
    }
    return [{ id: "all", label: "All" }, ...seen.values()];
  })();

  const counts = (() => {
    const map = new Map<string, number>();
    map.set("all", products.length);
    for (const p of products) {
      const catName = (typeof p.category === "object" ? p.category?.name : "") || "";
      const id = catName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (id) map.set(id, (map.get(id) || 0) + 1);
    }
    return map;
  })();

  const active = categoryFilters.find((f) => f.id === activeFilter) ? activeFilter : "all";
  const filteredProducts = products.filter((p) => {
    if (active === "all") return true;
    const catName = ((typeof p.category === "object" ? p.category?.name : "") || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    return catName === active;
  });

  const displayProducts = active === "all" ? products : filteredProducts;
  const showingAll = active === "all";

  return (
    <section className="relative pt-32 pb-48 bg-paper text-ink overflow-visible selection:bg-gold-500/30">
      {/* Editorial background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#05140806_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-500/5 blur-[120px] rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2" />

      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header - Editorial & Asymmetrical */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-16 mb-24">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-5xl"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2.5 border border-brand-500/20 rounded-full bg-brand-500/5 backdrop-blur-md mb-10">
              {isArrivals ? (
                <Sparkles size={16} className="text-brand-600" />
              ) : (
                <ShieldCheck size={16} className="text-brand-600" />
              )}
              <span className="text-brand-700 text-xs font-black uppercase tracking-[0.2em]">
                {isArrivals ? "Fresh from the Kitchen" : "100% Jain Purity Range"}
              </span>
            </div>

            <h2 className="text-6xl md:text-8xl lg:text-[7.5rem] font-display font-black text-ink tracking-tight leading-[0.95] [text-wrap:balance]">
              {title}{" "}
              <span className="text-gold-600 font-serif italic font-medium block mt-2 opacity-90">
                {subtitle}
              </span>
            </h2>

            <div className="mt-12 flex flex-col sm:flex-row sm:items-center gap-8">
              <p className="text-ink-2 text-lg sm:text-xl font-medium leading-relaxed max-w-xl">
                {DESC[variant]}
              </p>
              
              <div className="hidden sm:block w-px h-16 bg-ink-faint shrink-0" />
              
              <div className="flex flex-col gap-3 text-xs font-bold uppercase tracking-widest text-ink-3">
                {TRUST_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <span key={item.label} className="inline-flex items-center gap-2">
                      <Icon size={14} className="text-brand-600" />
                      {item.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="shrink-0 flex items-center gap-8"
          >
            <div className="text-right">
              <span className="text-7xl lg:text-8xl font-display font-black text-brand-700 tabular-nums leading-none tracking-tighter">
                {products.length}
              </span>
              <span className="block mt-2 text-xs font-bold uppercase tracking-widest text-ink-3">
                {isArrivals ? "just landed" : "signature picks"}
              </span>
            </div>
            <Link href="/products" className="group relative flex items-center justify-center w-24 h-24 rounded-full bg-brand-700 text-white overflow-hidden shadow-2xl shadow-brand-900/20 hover:scale-105 transition-all duration-500 focus-ring">
              <div className="absolute inset-0 bg-brand-800 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[0.16,1,0.3,1]" />
              <ArrowRight size={32} className="relative z-10 group-hover:rotate-45 transition-transform duration-500" />
            </Link>
          </motion.div>
        </div>

        {/* Filter Bar - Floating Glassmorphism */}
        <div className="sticky top-24 z-30 flex justify-center mb-16 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto flex overflow-x-auto no-scrollbar items-center gap-2 p-2 bg-white/80 backdrop-blur-xl border border-white/40 rounded-full shadow-[0_16px_40px_-12px_rgba(5,20,8,0.1)]"
          >
            {categoryFilters.map((tab) => {
              const isActive = active === tab.id;
              const count = counts.get(tab.id) || 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "relative px-6 py-3.5 text-sm whitespace-nowrap rounded-full focus-ring group shrink-0 transition-colors duration-300",
                    isActive ? "text-white font-black" : "text-ink-2 font-bold hover:text-ink hover:bg-brand-50"
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId={`filter-${variant}`}
                      className="absolute inset-0 bg-brand-700 rounded-full shadow-md"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2.5">
                    {tab.id === "all" && (
                      <Sparkles size={16} className={isActive ? "text-gold-300" : "text-ink-3"} />
                    )}
                    {tab.label}
                    <span
                      className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded-full tabular-nums transition-colors duration-300",
                        isActive ? "bg-white/20 text-gold-100" : "bg-ink-faint text-ink-3"
                      )}
                    >
                      {count}
                    </span>
                  </span>
                </button>
              );
            })}
          </motion.div>
        </div>

        {/* Staggered Masonry-ish Grid */}
        <motion.div layout className="relative min-h-[600px] z-10">
          <AnimatePresence mode="popLayout">
            {displayProducts.length > 0 ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16"
              >
                {displayProducts.map((product, i) => {
                  // Create a staggering effect for desktop grids
                  const staggerClasses = [
                    "xl:translate-y-0",
                    "xl:translate-y-16",
                    "xl:translate-y-32",
                    "xl:translate-y-8"
                  ][i % 4];

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 60 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      transition={{ duration: 0.8, delay: (i % 4) * 0.1, ease: [0.16, 1, 0.3, 1] }}
                      key={product._id}
                      className={cn("h-full", staggerClasses)}
                    >
                      <ProductCard product={product} index={i} showAddToCart />
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-ink-soft rounded-[3rem] bg-paper-2"
              >
                <div className="w-20 h-20 rounded-3xl bg-white border border-ink-soft flex items-center justify-center mb-6 shadow-sm">
                  <Ban size={32} className="text-ink-3" />
                </div>
                <p className="font-display font-black text-3xl text-ink tracking-tight">No products found.</p>
                <p className="text-lg font-medium text-ink-3 mt-3 max-w-md">
                  {active !== "all"
                    ? "Every other collection is still ready for you."
                    : "Check back soon — new batches land regularly."}
                </p>
                {active !== "all" && (
                  <button
                    onClick={() => setActiveFilter("all")}
                    className="mt-8 inline-flex items-center gap-3 px-8 py-4 rounded-full bg-brand-700 text-white text-sm font-extrabold uppercase tracking-widest hover:bg-brand-800 transition-all duration-300 shadow-xl shadow-brand-900/15 focus-ring active:scale-[0.98]"
                  >
                    View all {products.length} products
                    <ArrowRight size={16} />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer CTA */}
        {!showingAll && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-48 flex flex-col items-center border-t border-ink-faint pt-16"
          >
            <div className="flex flex-col items-center gap-4">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-ink-3">
                Showing {displayProducts.length} of {products.length}
              </span>
              <button
                onClick={() => setActiveFilter("all")}
                className="inline-flex items-center gap-2 text-brand-700 hover:text-brand-800 font-bold transition-colors focus-ring"
              >
                Clear Filters
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}

function ProductShowcaseEmpty({
  title,
  subtitle,
  variant,
}: {
  title: string;
  subtitle: string;
  variant: "featured" | "arrivals";
}) {
  const isArrivals = variant === "arrivals";

  return (
    <section className="relative py-32 sm:py-48 bg-paper text-ink overflow-hidden border-t border-ink-faint">
      <div className="absolute inset-0 bg-[radial-gradient(#05140808_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-brand-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 mb-20">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2.5 border border-brand-500/20 rounded-full bg-brand-500/5 backdrop-blur-md mb-8">
              {isArrivals ? (
                <Sparkles size={16} className="text-brand-600" />
              ) : (
                <ShieldCheck size={16} className="text-brand-600" />
              )}
              <span className="text-brand-700 text-xs font-black uppercase tracking-[0.2em]">
                {isArrivals ? "Fresh from the Kitchen" : "100% Jain Purity Range"}
              </span>
            </div>

            <h2 className="text-6xl md:text-8xl lg:text-[7.5rem] font-display font-black text-ink tracking-tight leading-[0.95] [text-wrap:balance]">
              {title}{" "}
              <span className="text-gold-600 font-serif italic font-medium block mt-2 opacity-90">
                {subtitle}
              </span>
            </h2>

            <p className="mt-8 text-ink-2 text-xl font-medium leading-relaxed max-w-2xl">
              {DESC[variant]}
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[3rem] border border-dashed border-brand-500/30 bg-paper-2 flex flex-col items-center justify-center px-6 py-32 text-center"
        >
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            className="relative w-24 h-24 rounded-full bg-white border border-brand-200 shadow-xl shadow-brand-900/5 flex items-center justify-center mb-8"
          >
            {isArrivals ? (
              <Sparkles size={36} className="text-brand-600" />
            ) : (
              <ShieldCheck size={36} className="text-brand-600" />
            )}
          </motion.div>

          <h3 className="relative text-4xl sm:text-5xl font-display font-black text-ink tracking-tight [text-wrap:balance]">
            {isArrivals ? "New batches are on the way." : "The next batch is in the kitchen."}
          </h3>

          <p className="relative mt-6 text-ink-2 text-lg sm:text-xl font-medium max-w-xl leading-relaxed [text-wrap:pretty]">
            {isArrivals
              ? "Freshly fried 100% Jain namkeen lands here as soon as it leaves the kadai — pure groundnut oil, zero onion, zero garlic."
              : "Our signature 100% Jain namkeen is being handcrafted in small batches. Check back shortly — or explore the journal while you wait."}
          </p>

          <div className="relative mt-12 flex flex-wrap items-center justify-center gap-6">
            <Link
              href="/blog"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-brand-700 text-white text-sm font-extrabold uppercase tracking-widest hover:bg-brand-800 transition-colors focus-ring shadow-xl shadow-brand-900/15 active:scale-[0.98]"
            >
              Read the Journal
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/categories"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-full border border-ink-soft bg-white text-ink-2 text-sm font-extrabold uppercase tracking-widest hover:text-brand-700 hover:border-brand-300 transition-colors focus-ring active:scale-[0.98]"
            >
              Explore Collections
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
