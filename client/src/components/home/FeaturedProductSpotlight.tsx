"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Star, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { getCategoryFallbackImage } from "@/lib/namkeen-images";
import { getImageUrl, getPrimaryVariant } from "@/lib/utils";

export default function FeaturedProductSpotlight({ product }: { product: any }) {
  if (!product) return null;

  const spotlightVariant = getPrimaryVariant(product.variants);

  return (
    <section className="py-24 sm:py-36 bg-paper-2 text-ink relative overflow-hidden">

      {/* Fine grain overlay for texture */}
      <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-8"
          >
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-brand-50 border border-brand-200/60">
              <Star size={13} className="fill-gold-500 text-gold-500" />
              <span className="text-brand-800 text-[11px] font-extrabold uppercase tracking-[0.14em]">
                Editor&apos;s Pick
              </span>
            </div>

            <h2 className="text-5xl sm:text-6xl lg:text-[5rem] font-display font-black text-ink tracking-[-0.02em] leading-[1.06] sm:leading-[1.02] [text-wrap:balance]">
              {product.name}
            </h2>

            <p className="text-lg sm:text-xl text-ink-2 font-medium max-w-lg leading-relaxed [text-wrap:pretty]">
              {product.description || "Experience the authentic taste of 100% Jain purity. Handcrafted in small batches with premium ingredients, zero onion, and zero garlic."}
            </p>

            {spotlightVariant && (
              <div className="flex items-end gap-3 pt-4 border-t border-ink-faint max-w-sm">
                <span className="text-4xl font-display font-black text-ink">
                  ₹{Number(spotlightVariant.sellingPrice ?? 0).toLocaleString("en-IN")}
                </span>
                {spotlightVariant.weight && (
                  <span className="text-ink-3 mb-1.5 font-bold text-sm tracking-wide">
                    / {spotlightVariant.weight}
                  </span>
                )}
                {Number(spotlightVariant.mrp ?? 0) > Number(spotlightVariant.sellingPrice ?? 0) && (
                  <span className="text-ink-faint mb-1.5 font-medium text-sm line-through decoration-brand-500/30">
                    ₹{Number(spotlightVariant.mrp ?? 0).toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            )}

            <div className="pt-6 flex flex-wrap items-center gap-5">
              <Link
                href={`/products/${product.slug || product._id}`}
                className="group inline-flex items-center justify-center gap-2 px-10 py-5 bg-brand-700 text-white font-extrabold rounded-2xl hover:bg-brand-800 transition-colors focus-ring shadow-[0_20px_50px_-12px_rgba(20,82,24,0.4)] hover:shadow-[0_24px_60px_-12px_rgba(20,82,24,0.5)] active:scale-[0.98]"
              >
                <span>Shop Now</span>
                <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" />
              </Link>
              <Link
                href="/products"
                className="group inline-flex items-center gap-2.5 px-2 py-4 text-ink-2 font-bold hover:text-brand-700 transition-colors"
              >
                View all products
                <ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform" />
              </Link>
            </div>

            <div className="flex items-center gap-6 sm:gap-8 pt-7 border-t border-ink-faint">
              <div className="flex items-center gap-2.5 text-ink-3 text-[11px] uppercase tracking-[0.12em] font-bold">
                <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200/50 flex items-center justify-center">
                  <ShieldCheck size={14} className="text-brand-600" />
                </div>
                100% Jain Safe
              </div>
              <div className="flex items-center gap-2.5 text-ink-3 text-[11px] uppercase tracking-[0.12em] font-bold">
                <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200/50 flex items-center justify-center">
                  <ShieldCheck size={14} className="text-brand-600" />
                </div>
                No Preservatives
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, rotate: 2 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 relative lg:h-[650px] flex items-center justify-center lg:justify-end"
          >
            {/* Floating effect container */}
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
              className="relative w-full max-w-lg aspect-[4/5] z-10"
            >
              {/* Asymmetric offset block behind image */}
              <div className="absolute top-12 -left-8 w-full h-full bg-paper rounded-[2.5rem] border border-ink-soft shadow-sm pointer-events-none" />

              <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden border border-ink-faint shadow-[0_40px_80px_-20px_rgba(5,20,8,0.15)] bg-white">
                {product.images && product.images.length > 0 ? (
                  <Image
                    src={getImageUrl(product.images[0])}
                    alt={product.name}
                    fill
                    className="object-cover object-center scale-105 hover:scale-100 transition-transform duration-1000 ease-out"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                ) : (
                  <Image
                    src={getCategoryFallbackImage(product.category?.name || product.name)}
                    alt={product.name}
                    fill
                    className="object-cover object-center scale-105 hover:scale-100 transition-transform duration-1000 ease-out"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                )}
                <div className="absolute inset-0 bg-brand-900/5 mix-blend-multiply pointer-events-none" />
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
