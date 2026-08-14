"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Sparkles, Leaf, Award, Flame } from "lucide-react";
import { getImageUrl, handleImageError } from "@/lib/utils";
import { NAMKEEN_IMAGES } from "@/lib/namkeen-images";

interface Banner {
  _id: string;
  title?: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  image?: string;
  link?: string;
  isActive?: boolean;
  order?: number;
}

interface HeroCategory {
  _id: string;
  name: string;
  slug: string;
}

const AUTOPLAY_MS = 6500;

export default function HeroSection({
  banners = [],
  categories = [],
}: {
  banners?: Banner[];
  products?: any[];
  categories?: HeroCategory[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  const activeBanners =
    banners.length > 0
      ? banners.filter((b) => b.isActive !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      : [
        {
          _id: "default-1",
          title: "Shop 100% Pure Jain Namkeen.",
          subtitle: "Zero Onion. Zero Garlic.",
          badge: "Authentic Sattvik Tradition",
          description: "Classic Sev, Aloo Bhujia, Gujarati Gathiya and more — handcrafted in small batches with 100% pure groundnut oil, real hing and sendha namak.",
          image: NAMKEEN_IMAGES.heroNamkeenSpread,
          link: "/products"
        },
        {
          _id: "default-2",
          title: "Heritage Halwai Crunch.",
          subtitle: "Fresh Small Batches Daily.",
          badge: "Gujarati Halwai Masterclass",
          description: "Prepared daily following strict Jain purity standards. Experience the crisp, rich spice harmony of every single bite.",
          image: NAMKEEN_IMAGES.bhujiaShop,
          link: "/products"
        }
      ];

  // Autoplay crossfade
  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % activeBanners.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  const banner = activeBanners[Math.min(activeIndex, activeBanners.length - 1)];

  const goTo = (dir: 1 | -1) => {
    setActiveIndex((i) => (i + dir + activeBanners.length) % activeBanners.length);
  };

  return (
    <section className="relative w-full bg-paper overflow-hidden text-stone-900 flex items-center min-h-[90dvh] sm:min-h-[100dvh] pt-36 sm:pt-44 md:pt-48 lg:pt-52 pb-16">

      {/* Ambient Background Radial Wash & Noise */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#1c19170a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none z-10" />

      {/* Background Crossfade Slider Layer */}
      <div className="absolute inset-0 w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={banner._id || activeIndex}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 flex justify-end"
          >
            <div className="relative w-full lg:w-[65%] h-full opacity-35 sm:opacity-55 lg:opacity-85">
              {banner.image && (
                <Image
                  src={getImageUrl(banner.image)}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 65vw"
                  priority
                  fetchPriority="high"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== NAMKEEN_IMAGES.heroNamkeenSpread) {
                      target.src = NAMKEEN_IMAGES.heroNamkeenSpread;
                    } else {
                      handleImageError(e);
                    }
                  }}
                  className="object-cover filter contrast-[1.05] saturate-[1.1]"
                  style={{ objectPosition: 'center right' }}
                />
              )}
              {/* Complex Multi-stop Scrim Gradients for crisp editorial background integration */}
              <div className="absolute inset-0 bg-gradient-to-r from-paper via-paper-90 lg:via-paper-75 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-paper via-transparent to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-paper via-transparent to-transparent" />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Main Content Layout - Wide Editorial Container (max-w-5xl lg:max-w-6xl) */}
      <div className="relative z-20 max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center h-full">
        <div className="w-full space-y-6 sm:space-y-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={`hero-text-${activeIndex}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6 sm:space-y-8"
            >
              {/* Purity Badge Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-brand-600/10 border border-brand-600/20 text-brand-600 text-xs font-extrabold uppercase tracking-[0.18em] backdrop-blur-md shadow-xs">
                <Leaf size={14} className="text-brand-600 animate-pulse shrink-0" />
                <span>{banner.badge || "100% Pure Jain • Zero Garlic • Zero Onion"}</span>
              </div>

              {/* Ultra-Wide Display Title — CMS-driven, gold serif accent subtitle */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black text-stone-900 tracking-tighter leading-[1.05] sm:leading-[0.98] [text-wrap:balance] max-w-5xl">
                {banner.title || "Shop 100% Pure Jain Namkeen."}
                {banner.subtitle && (
                  <span className="block mt-2 sm:mt-3 text-gold-500 font-serif italic font-normal tracking-normal text-2xl sm:text-4xl md:text-5xl lg:text-6xl [text-wrap:balance]">
                    {banner.subtitle}
                  </span>
                )}
              </h1>

              {/* Description */}
              <p className="text-stone-600 text-base sm:text-xl lg:text-2xl max-w-2xl font-medium leading-relaxed [text-wrap:pretty]">
                {banner.description || "Handcrafted with pure groundnut oil, real hing, and authentic spices. Prepared daily in small artisanal batches for pristine sattvik purity."}
              </p>

              {/* High Contrast Action CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
                <Link
                  href={banner.link || "/products"}
                  className="group relative inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-base sm:text-lg transition-ui duration-300 shadow-xl shadow-emerald-900/20 hover:shadow-emerald-900/40 active:scale-[0.98] focus-ring overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
                  <span className="relative flex items-center gap-2">
                    <span>Explore Collection</span>
                    <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform duration-300 text-amber-300" />
                  </span>
                </Link>

                <Link
                  href="/categories"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white/90 hover:bg-white text-stone-800 font-bold text-base sm:text-lg border border-stone-300/60 hover:border-brand-600 transition-ui shadow-sm hover:shadow-md backdrop-blur-md active:scale-[0.98] focus-ring"
                >
                  <ShieldCheck size={20} className="text-brand-600" />
                  <span>Purity Guarantee</span>
                </Link>
              </div>

              {/* Purity Micro-Stats Bar */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-6 border-t border-stone-200/60 max-w-3xl">
                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 sm:gap-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-600/10 text-brand-600 flex items-center justify-center shrink-0 border border-brand-600/20">
                    <Leaf size={16} />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-extrabold text-stone-900 leading-none mb-1">100% Sattvik</p>
                    <p className="text-xs text-stone-500 font-medium">Zero Garlic / Onion</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 sm:gap-4 border-x border-stone-200/60 px-2 sm:px-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 border border-amber-500/10">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-extrabold text-stone-900 leading-none mb-1">Groundnut Oil</p>
                    <p className="text-xs text-stone-500 font-medium">0% Palm Oil</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 sm:gap-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-600/10 text-brand-600 flex items-center justify-center shrink-0 border border-brand-600/10">
                    <Award size={16} />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-extrabold text-stone-900 leading-none mb-1">Small Batches</p>
                    <p className="text-xs text-stone-500 font-medium">Fresh Daily</p>
                  </div>
                </div>
              </div>

              {/* Quick Shop Category Chips */}
              {categories && categories.length > 0 && (
                <div className="pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-stone-400 mr-1 flex items-center gap-1">
                      <Flame size={12} className="text-amber-500" />
                      Popular:
                    </span>
                    {categories.slice(0, 4).map((cat) => (
                      <Link
                        key={cat._id}
                        href={`/products?category=${cat.slug}`}
                        className="inline-flex items-center px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/80 backdrop-blur-md border border-stone-200/80 text-xs font-bold text-stone-700 hover:text-brand-600 hover:border-brand-600 hover:bg-white transition-ui duration-200 active:scale-95 focus-ring shadow-2xs"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Autoplay Banner Navigation Control Bar */}
      {activeBanners.length > 1 && (
        <div className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 lg:right-12 z-30 flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white/90 backdrop-blur-xl border border-stone-200 shadow-lg">
          <span className="text-xs sm:text-sm font-black text-brand-600 px-2.5 sm:px-4 py-1 sm:py-2 bg-emerald-50 rounded-lg sm:rounded-xl">
            0{activeIndex + 1} / 0{activeBanners.length}
          </span>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => goTo(-1)}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-stone-100 hover:bg-brand-600 hover:text-white flex items-center justify-center text-stone-700 active:scale-95 transition-ui focus-ring shadow-2xs"
              aria-label="Previous Banner"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => goTo(1)}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-stone-100 hover:bg-brand-600 hover:text-white flex items-center justify-center text-stone-700 active:scale-95 transition-ui focus-ring shadow-2xs"
              aria-label="Next Banner"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {activeBanners.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 z-30 h-1.5 sm:h-2 bg-stone-200/40">
          <motion.div
            key={`hero-prog-${activeIndex}`}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: AUTOPLAY_MS / 1000, ease: "linear" }}
            className="h-full bg-brand-600 shadow-[0_0_12px_rgba(27,110,42,0.7)]"
          />
        </div>
      )}

    </section>
  );
}
