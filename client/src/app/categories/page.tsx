"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  Layers,
  ArrowRight,
} from "lucide-react";
import { categoryApi } from "@/lib/api";
import { Category } from "@/types";
import { cn, getImageUrl } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.getCategories(),
  });

  const categories: Category[] = useMemo(() => {
    return data?.data?.categories || [];
  }, [data]);

  const [activeIndex, setActiveIndex] = useState(0);

  if (isLoading) {
    return (
      <main className="min-h-screen pt-32 pb-24 bg-paper w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <Skeleton className="h-20 w-3/4 mb-12 rounded-3xl" />
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-4/5 rounded-2xl" />
              <Skeleton className="h-16 w-5/6 rounded-2xl" />
            </div>
            <Skeleton className="h-[60vh] w-full rounded-[3rem]" />
          </div>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="min-h-screen pt-32 pb-24 bg-paper w-full flex flex-col items-center justify-center">
        <div className="text-center p-8">
          <Package size={48} className="text-rose-500 mx-auto mb-6" />
          <h2 className="text-3xl font-display font-black text-ink mb-4">Failed to load collections</h2>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-brand-600 text-white rounded-full font-bold hover:bg-brand-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (categories.length === 0) {
    return (
      <main className="min-h-screen pt-32 pb-24 bg-paper w-full flex flex-col items-center justify-center">
        <div className="text-center p-8">
          <Layers size={48} className="text-gold-500 mx-auto mb-6" />
          <h2 className="text-3xl font-display font-black text-ink mb-4">No collections found</h2>
        </div>
      </main>
    );
  }

  const activeCategory = categories[activeIndex] || categories[0];

  return (
    <main className="w-full min-h-screen bg-paper selection:bg-gold-500/30 selection:text-ink relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-brand-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full bg-gold-500/5 blur-[140px]" />
      </div>

      <div className="pt-32 sm:pt-40 lg:pt-48 pb-24 relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8">
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 md:mb-24"
        >
          <div className="inline-flex items-center gap-3 px-4 py-2 border border-brand-500/20 rounded-full bg-brand-500/5 backdrop-blur-md mb-6">
            <Layers size={14} className="text-brand-600 animate-pulse" />
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">
              Curated Selection
            </span>
          </div>
          
          <h1 className="text-5xl sm:text-7xl lg:text-[6rem] font-display font-black text-brand-950 tracking-[-0.03em] leading-[1.05] max-w-4xl">
            Sattvik <span className="text-gold-600 font-serif italic font-medium">Masterpieces.</span>
          </h1>
        </motion.div>

        {/* Desktop Split Layout */}
        <div className="hidden md:grid md:grid-cols-12 gap-8 lg:gap-16 relative">
          
          {/* Left: Typography List */}
          <div className="col-span-12 md:col-span-6 lg:col-span-5 flex flex-col justify-center gap-8 py-10 relative z-20">
            {categories.map((category, idx) => {
              const isActive = idx === activeIndex;
              return (
                <div
                  key={category._id}
                  className="group relative cursor-pointer"
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <Link href={`/products?category=${category.slug}`} className="block">
                    <motion.div
                      animate={{
                        x: isActive ? 20 : 0,
                        opacity: isActive ? 1 : 0.4,
                      }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="relative"
                    >
                      <h2 className="text-4xl lg:text-5xl xl:text-6xl font-display font-black tracking-tight text-ink">
                        {category.name}
                      </h2>
                      
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <p className="text-ink-2 font-medium max-w-sm mb-4">
                              {category.description || `Explore our authentic ${category.name} collection.`}
                            </p>
                            <div className="inline-flex items-center gap-2 text-brand-700 font-bold uppercase tracking-wider text-xs">
                              <span>View Collection</span>
                              <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform duration-300" />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Right: Sticky Image Reveal */}
          <div className="col-span-12 md:col-span-6 lg:col-span-7">
            <div className="sticky top-32 w-full h-[calc(100vh-12rem)] min-h-[500px] max-h-[800px] rounded-[3rem] overflow-hidden shadow-2xl bg-brand-950 border border-brand-900/30">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCategory._id}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0"
                >
                  {activeCategory.image ? (
                    <Image
                      src={getImageUrl(activeCategory.image)}
                      alt={activeCategory.name}
                      fill
                      className="object-cover saturate-[1.1] contrast-[1.05]"
                      sizes="(max-width: 1024px) 50vw, 60vw"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-900 to-brand-950 flex items-center justify-center">
                      <span className="text-9xl opacity-10">📦</span>
                    </div>
                  )}
                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Floating count badge inside image */}
                  <div className="absolute bottom-8 right-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-6 py-4 flex items-center gap-3">
                    <span className="text-white text-3xl font-display font-bold">
                      {activeCategory.productCount || 0}
                    </span>
                    <span className="text-white/80 text-xs font-bold uppercase tracking-widest leading-tight">
                      Unique<br/>Products
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile Layout: Stacked Premium Cards */}
        <div className="md:hidden flex flex-col gap-8">
          {categories.map((category) => (
            <Link key={category._id} href={`/products?category=${category.slug}`} className="block group">
              <div className="relative w-full aspect-[4/5] sm:aspect-square rounded-[2rem] overflow-hidden bg-brand-950 shadow-xl border border-rule/50">
                {category.image ? (
                  <Image
                    src={getImageUrl(category.image)}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="100vw"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-brand-900 to-brand-950 flex items-center justify-center">
                    <span className="text-8xl opacity-10">📦</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
                
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col justify-end">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-[10px] font-bold uppercase tracking-wider text-white mb-4 w-fit">
                    {category.productCount || 0} Products
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-white mb-2">
                    {category.name}
                  </h2>
                  <p className="text-white/80 text-sm font-medium line-clamp-2 mb-6">
                    {category.description || `Explore our authentic ${category.name} collection.`}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gold-400 font-bold uppercase tracking-wider text-xs">
                      Shop Now
                    </span>
                    <div className="w-10 h-10 rounded-full bg-gold-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ArrowRight size={18} className="text-brand-950" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </main>
  );
}
