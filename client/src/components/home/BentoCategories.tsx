"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Leaf, ShieldCheck, Flame } from "lucide-react";
import { getImageUrl, handleImageError } from "@/lib/utils";
import { getCategoryFallbackImage } from "@/lib/namkeen-images";

interface Category {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  productCount?: number;
  description?: string;
}

export default function BentoCategories({ categories = [] }: { categories: Category[] }) {
  if (!categories || categories.length === 0) return null;
  return <BentoCategoriesContent categories={categories} />;
}

function BentoCategoriesContent({ categories }: { categories: Category[] }) {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  const featured = categories[0];
  const secondary = categories.slice(1, 4);

  const categoryImage = (cat: Category) => {
    const url = cat?.image ? getImageUrl(cat.image) : getCategoryFallbackImage(cat?.name || "");
    const fallback = getCategoryFallbackImage(cat?.name || "");
    return {
      url,
      onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
        const target = e.currentTarget;
        if (target.src !== fallback) target.src = fallback;
        else handleImageError(e);
      },
    };
  };

  const featuredImg = categoryImage(featured);

  return (
    <section ref={containerRef} className="py-16 sm:py-24 md:py-36 bg-[#FAF9F5] text-stone-900 border-t border-stone-200/80 relative overflow-hidden">
      
      {/* Background Noise */}
      <motion.div 
        style={{ y: yBg }}
        className="absolute -inset-[20%] bg-[radial-gradient(#0000000a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" 
      />


      <div className="max-w-7xl mx-auto px-4 sm:px-8 w-full relative z-10">

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-16 gap-6 sm:gap-8">
          <div className="max-w-3xl">
            <motion.h2
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-3xl sm:text-5xl lg:text-7xl font-display font-black text-stone-900 tracking-tighter leading-[1.05] sm:leading-[0.95]"
            >
              Explore Our <span className="text-gold-500 font-serif italic font-normal tracking-normal">Handcrafted</span>
              <br />
              Sattvik Range.
            </motion.h2>
          </div>

          <motion.div
          >
            <Link
              href="/products"
              className="inline-flex items-center gap-3 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs sm:text-sm tracking-wide transition-transform shadow-xl shadow-emerald-900/20 active:scale-95 group overflow-hidden relative"
            >
              <span className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out" />
              <span className="relative">Browse All Categories</span>
              <ArrowRight size={16} className="relative group-hover:translate-x-2 transition-transform duration-300 text-amber-300" />
            </Link>
          </motion.div>
        </div>

        {/* RESPONSIVE GAPLESS BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 auto-rows-[240px] sm:auto-rows-[280px] lg:auto-rows-[340px] gap-3 lg:gap-4 grid-flow-dense">

          {/* Card 1: 2x2 (Featured) */}
          {featured && (
            <motion.div
              className="md:col-span-2 md:row-span-2 group"
            >
              <Link
                href={`/products?category=${featured.slug}`}
                className="relative block w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden bg-brand-600 border border-emerald-700/30 shadow-2xl shadow-emerald-950/20 focus-ring group"
              >
                <Image
                  src={featuredImg.url}
                  alt={featured.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-1000 ease-out opacity-90 group-hover:opacity-100"
                  onError={featuredImg.onError}
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-900 via-brand-600/40 to-transparent pointer-events-none" />

                <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10 lg:p-12 z-20 flex flex-col justify-end h-full">
                  <div className="overflow-hidden mb-2">
                    <p className="text-xs font-extrabold text-amber-300 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Flame size={12} className="text-amber-400" />
                      Signature Collection
                    </p>
                  </div>
                  <h3 className="text-3xl sm:text-5xl font-display font-black text-white leading-none mb-3 sm:mb-4 drop-shadow-md">
                    {featured.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm text-emerald-100 font-medium max-w-xs leading-relaxed">
                      Handcrafted with 100% groundnut oil. Zero onion, zero garlic.
                    </p>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white text-brand-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-md ml-2">
                      <ArrowRight size={18} />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}

          {/* Card 2: 1x1 Square */}
          {secondary[0] && (
            <motion.div
              className="col-span-1 row-span-1 group"
            >
              <Link
                href={`/products?category=${secondary[0].slug}`}
                className="relative block w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden bg-stone-100 border border-stone-200 focus-ring shadow-sm"
              >
                <Image
                  src={categoryImage(secondary[0]).url}
                  alt={secondary[0].name}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                  onError={categoryImage(secondary[0]).onError}
                />
                <div className="absolute inset-0 bg-brand-900/20 group-hover:bg-transparent transition-colors duration-500" />
                <div className="absolute bottom-0 left-0 w-full p-4 sm:p-6 bg-gradient-to-t from-brand-900/90 to-transparent">
                  <h3 className="text-xl sm:text-2xl font-display font-bold text-white group-hover:text-amber-300 transition-colors">
                    {secondary[0].name}
                  </h3>
                </div>
              </Link>
            </motion.div>
          )}

          {/* Card 3: 1x1 Typographic Tile — solid brand green with gold serif accent */}
          {secondary[1] && (
            <motion.div
              className="col-span-1 row-span-1 group"
            >
              <Link
                href={`/products?category=${secondary[1].slug}`}
                className="relative block w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden bg-brand-800 border border-gold-500/25 focus-ring flex flex-col justify-end p-5 sm:p-7 group"
              >
                {/* Gold dot texture + ambient glow */}
                <div className="absolute inset-0 bg-[radial-gradient(#D4A54514_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                <div className="relative z-10">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-gold-500 mb-2">
                    {secondary[1].productCount ? `${secondary[1].productCount} Variants` : "Explore Collection"}
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-display font-black text-white leading-none mb-1 [text-wrap:balance]">
                    {secondary[1].name}
                  </h3>
                </div>

                <div className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full bg-gold-500 text-brand-800 flex items-center justify-center group-hover:scale-110 group-hover:rotate-45 transition-transform duration-300 shadow-md">
                  <ArrowRight size={16} />
                </div>
              </Link>
            </motion.div>
          )}

          {/* Card 4: 2x1 Wide */}
          {secondary[2] && (
            <motion.div
              className="md:col-span-2 row-span-1 group"
            >
              <Link
                href={`/products?category=${secondary[2].slug}`}
                className="relative block w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden bg-brand-600 border border-emerald-700/30 focus-ring"
              >
                <Image
                  src={categoryImage(secondary[2]).url}
                  alt={secondary[2].name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-1000 ease-out opacity-85 group-hover:opacity-100"
                  onError={categoryImage(secondary[2]).onError}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-brand-900 via-brand-600/60 to-transparent pointer-events-none" />
                
                <div className="absolute top-1/2 -translate-y-1/2 left-6 sm:left-12 z-20">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-600/90 border border-emerald-400/40 text-emerald-100 text-xs font-extrabold uppercase tracking-widest mb-2 backdrop-blur-md shadow-xs">
                    <ShieldCheck size={12} className="text-amber-300" />
                    <span>No Palm Oil</span>
                  </div>
                  <h3 className="text-2xl sm:text-4xl font-display font-bold text-white group-hover:text-amber-300 transition-colors duration-500 leading-none drop-shadow-md">
                    {secondary[2].name}
                  </h3>
                </div>
              </Link>
            </motion.div>
          )}

        </div>
      </div>
    </section>
  );
}
