"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Star, ShieldCheck, Leaf, Heart, Sparkles } from "lucide-react";
import Image from "next/image";
import { getCategoryFallbackImage } from "@/lib/namkeen-images";
import { getImageUrl, getPrimaryVariant, calculateDiscount } from "@/lib/utils";

export default function FeaturedProductSpotlight({ product }: { product: any }) {
  if (!product) return null;

  const spotlightVariant = getPrimaryVariant(product.variants);
  const discount = spotlightVariant
    ? calculateDiscount(
        Number(spotlightVariant.mrp ?? 0),
        Number(spotlightVariant.sellingPrice ?? 0),
      )
    : 0;

  return (
    <section className="py-20 sm:py-36 bg-paper-2 text-ink relative overflow-hidden">

      {/* Fine grain overlay for texture */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Ambient gradient glow behind the image side */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">

          {/* ── Text Content ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-7"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-brand-50 border border-brand-200/60">
              <Star size={13} className="fill-gold-500 text-gold-500" />
              <span className="text-brand-800 text-[11px] font-extrabold uppercase tracking-[0.14em]">
                Editor&apos;s Pick
              </span>
            </div>

            {/* Product Name */}
            <h2 className="text-[2.25rem] sm:text-6xl lg:text-[4.5rem] font-display font-black text-ink tracking-[-0.03em] leading-[1.05] sm:leading-[1.02] [text-wrap:balance]">
              {product.name}
            </h2>

            {/* Description Block — styled as a quote-like accent */}
            <div className="relative pl-5 border-l-2 border-brand-500/40">
              <p className="text-base sm:text-lg lg:text-xl text-ink-2 font-medium max-w-lg leading-relaxed [text-wrap:pretty]">
                {product.description ||
                  "Experience the authentic taste of 100% Jain purity. Handcrafted in small batches with premium ingredients, zero onion, and zero garlic."}
              </p>
            </div>

            {/* Price + Discount Block */}
            {spotlightVariant && (
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="flex items-end gap-2.5">
                  <span className="text-4xl sm:text-5xl font-display font-black text-ink tracking-[-0.02em]">
                    ₹{Number(spotlightVariant.sellingPrice ?? 0).toLocaleString("en-IN")}
                  </span>
                  {spotlightVariant.weight && (
                    <span className="text-ink-3 mb-2 font-semibold text-sm tracking-wide">
                      / {spotlightVariant.weight}
                    </span>
                  )}
                </div>
                {Number(spotlightVariant.mrp ?? 0) >
                  Number(spotlightVariant.sellingPrice ?? 0) && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-ink-faint font-medium text-sm line-through decoration-brand-500/30">
                      ₹{Number(spotlightVariant.mrp ?? 0).toLocaleString("en-IN")}
                    </span>
                    {discount > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-spice-green/10 text-spice-green text-xs font-extrabold tracking-wide">
                        {discount}% OFF
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* CTA Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row flex-wrap items-center gap-4">
              <Link
                href={`/products/${product.slug || product._id}`}
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-10 py-4 sm:py-[1.125rem] bg-brand-700 text-white font-extrabold rounded-2xl hover:bg-brand-800 transition-all duration-300 focus-ring shadow-[0_20px_50px_-12px_rgba(20,82,24,0.35)] hover:shadow-[0_24px_60px_-12px_rgba(20,82,24,0.5)] hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0"
              >
                <span>Shop Now</span>
                <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform duration-300" />
              </Link>
              <Link
                href="/products"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-4 py-4 text-ink-3 font-bold hover:text-brand-700 transition-colors duration-300"
              >
                View all products
                <ArrowRight size={15} className="group-hover:translate-x-1.5 transition-transform duration-300" />
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 pt-6 border-t border-ink-faint">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-brand-50/80 border border-brand-100">
                <div className="w-7 h-7 rounded-lg bg-white border border-brand-200/50 flex items-center justify-center shadow-sm">
                  <Leaf size={13} className="text-brand-600" />
                </div>
                <span className="text-brand-800 text-[11px] uppercase tracking-[0.1em] font-extrabold">
                  100% Jain Safe
                </span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-brand-50/80 border border-brand-100">
                <div className="w-7 h-7 rounded-lg bg-white border border-brand-200/50 flex items-center justify-center shadow-sm">
                  <Heart size={13} className="text-brand-600" />
                </div>
                <span className="text-brand-800 text-[11px] uppercase tracking-[0.1em] font-extrabold">
                  No Preservatives
                </span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-brand-50/80 border border-brand-100">
                <div className="w-7 h-7 rounded-lg bg-white border border-brand-200/50 flex items-center justify-center shadow-sm">
                  <Sparkles size={13} className="text-gold-600" />
                </div>
                <span className="text-brand-800 text-[11px] uppercase tracking-[0.1em] font-extrabold">
                  Small Batch
                </span>
              </div>
            </div>
          </motion.div>

          {/* ── Product Image ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, rotate: 2 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 relative lg:h-[650px] flex items-center justify-center lg:justify-end"
          >
            {/* Floating effect container */}
            <motion.div
              animate={{ y: [0, -16, 0] }}
              transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
              className="relative w-full max-w-lg aspect-square sm:aspect-[4/5] z-10"
            >
              {/* Asymmetric offset block behind image */}
              <div className="absolute top-10 -left-6 sm:-left-8 w-full h-full bg-paper rounded-[2.5rem] border border-ink-soft/60 shadow-sm pointer-events-none" />

              {/* Image frame */}
              <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden border border-ink-faint shadow-[0_40px_80px_-20px_rgba(5,20,8,0.12),0_0_0_1px_rgba(0,0,0,0.03)] bg-white">
                {product.images && product.images.length > 0 ? (
                  <Image
                    src={getImageUrl(product.images[0])}
                    alt={product.name}
                    fill
                    className="object-cover object-center scale-[1.03] hover:scale-100 transition-transform duration-1000 ease-out"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                ) : (
                  <Image
                    src={getCategoryFallbackImage(product.category?.name || product.name)}
                    alt={product.name}
                    fill
                    className="object-cover object-center scale-[1.03] hover:scale-100 transition-transform duration-1000 ease-out"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                )}
                {/* Subtle brand tint overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-900/8 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Floating accent glow */}
              <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-brand-500/[0.06] blur-xl pointer-events-none" />
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
