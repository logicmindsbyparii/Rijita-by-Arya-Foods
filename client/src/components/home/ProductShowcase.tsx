"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import ProductCard from "@/components/products/ProductCard";
import { ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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

  if (!products || products.length === 0) return null;

  // Extract available unique categories for filter tabs
  const categoryFilters = [
    { id: "all", label: "All 100% Jain" },
    { id: "sev", label: "Sev & Bhujia" },
    { id: "mixture", label: "Mixtures" },
    { id: "mathri", label: "Mathri & Papdi" },
  ];

  const filteredProducts = products.filter((p) => {
    if (activeFilter === "all") return true;
    const catName = (typeof p.category === "object" ? p.category?.name : "").toLowerCase();
    const pName = p.name?.toLowerCase() || "";
    if (activeFilter === "sev") return catName.includes("sev") || pName.includes("sev") || pName.includes("bhujia");
    if (activeFilter === "mixture") return catName.includes("mixture") || pName.includes("mix") || pName.includes("chana");
    if (activeFilter === "mathri") return catName.includes("mathri") || pName.includes("mathri") || pName.includes("papdi");
    return true;
  });

  const displayProducts = filteredProducts.length > 0 ? filteredProducts : products;

  return (
    <section className="relative py-16 sm:py-24 md:py-36 bg-stone-50 text-stone-900 border-t border-stone-200/50 overflow-hidden">
      {/* Decorative ambient glows */}

      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          
          {/* Left Column (Sticky on Desktop, Clean Flow on Mobile) */}
          <div className={cn(
            "lg:col-span-5 lg:sticky lg:top-32 space-y-6 sm:space-y-10 z-20",
            variant === "arrivals" && "lg:order-2 lg:pl-8"
          )}>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-600/10 border border-brand-600/20 text-brand-600 text-xs font-extrabold uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-4 sm:mb-6 backdrop-blur-md shadow-xs">
                <ShieldCheck size={14} className="text-brand-600 shrink-0" />
                <span>100% Jain Purity Range</span>
              </div>

              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black text-stone-900 tracking-tighter leading-[1.05] [text-wrap:balance]">
                {title} <br className="hidden sm:inline" />
                <span className="text-gold-500 font-serif italic font-normal tracking-normal">{subtitle}</span>
              </h2>
              
              <p className="mt-3 sm:mt-6 text-stone-600 font-medium text-sm sm:text-lg max-w-md leading-relaxed">
                Scroll through our signature collection. Every batch is handcrafted with pristine ingredients and absolutely zero onion or garlic.
              </p>
            </motion.div>

            {/* Responsive Scrollable Filter Bar */}
            <motion.div
              className="flex flex-col gap-3 pt-3 sm:pt-4 border-t border-stone-200/80 max-w-full sm:max-w-sm"
            >
              <p className="text-xs font-black tracking-widest text-stone-400 uppercase flex items-center gap-2">
                <Sparkles size={13} /> Filter Collection
              </p>
              <div className="flex overflow-x-auto no-scrollbar sm:flex-wrap gap-2 pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
                {categoryFilters.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={cn(
                      "px-4 sm:px-6 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm whitespace-nowrap transition-ui duration-300 focus-ring active:scale-95 border shrink-0",
                      activeFilter === tab.id
                        ? "bg-brand-600 border-brand-600 text-white font-black shadow-md shadow-emerald-900/20"
                        : "bg-white border-stone-200 text-stone-600 font-bold hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Product Grid */}
          <div className={cn(
            "lg:col-span-7 relative",
            variant === "arrivals" && "lg:order-1"
          )}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              {displayProducts.map((product, i) => (
                <motion.div 
                  key={product._id}
                  className={cn(
                    "group",
                    i % 2 !== 0 ? "sm:mt-12" : ""
                  )}
                >
                  <ProductCard product={product} index={i} showAddToCart />
                </motion.div>
              ))}
            </div>
            
            {displayProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-stone-400">
                <ShieldCheck size={40} className="mb-3 opacity-50" />
                <p className="font-medium text-base">No products found in this category.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
