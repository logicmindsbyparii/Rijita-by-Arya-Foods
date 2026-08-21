"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Leaf, PlayCircle } from "lucide-react";
import { getImageUrl } from "@/lib/utils";
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

const AUTOPLAY_MS = 7000;

export default function HeroSection({
  banners = [],
}: {
  banners?: Banner[];
  products?: any[];
  categories?: any[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const activeBanners =
    banners.length > 0
      ? banners.filter((b) => b.isActive !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      : [
        {
          _id: "default-1",
          title: "The Taste of",
          subtitle: "Heritage.",
          badge: "100% Pure Jain",
          description: "Authentic Kathiyawadi flavors, handcrafted daily in 100% groundnut oil with zero onion or garlic. A masterclass in purity.",
          image: NAMKEEN_IMAGES.heroNamkeenSpread,
          link: "/products"
        },
        {
          _id: "default-2",
          title: "Uncompromising",
          subtitle: "Purity.",
          badge: "Fresh Batches",
          description: "Experience the crisp, rich spice harmony of our classic Sev and Aloo Bhujia. Tradition packed in every bite.",
          image: NAMKEEN_IMAGES.bhujiaShop,
          link: "/products"
        }
      ];

  // Autoplay crossfade
  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % activeBanners.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [activeBanners.length, isPaused]);

  const banner = activeBanners[Math.min(activeIndex, activeBanners.length - 1)];

  return (
    <section
      className="relative w-full h-[100dvh] min-h-[700px] overflow-hidden flex items-center justify-center bg-brand-950 selection:bg-brand-500/30 selection:text-white group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {/* Background Media Crossfade */}
      <div className="absolute inset-0 w-full h-full z-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={`bg-${activeIndex}`}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: [0.25, 1, 0.5, 1] }}
            className="absolute inset-0 w-full h-full"
          >
            {banner.image && (
              <Image
                src={getImageUrl(banner.image)}
                alt={banner.title ? `${banner.title} - ${banner.subtitle || ''}` : "Hero Background"}
                fill
                priority
                className="object-cover object-center filter saturate-[1.1] contrast-[1.05]"
                sizes="100vw"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Cinematic Overlays */}
        {/* Dark radial gradient from center, plus a heavy gradient from bottom to ensure text readability */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,20,8,0.4)_100%)] z-10 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 z-10" />
        {/* Noise texture for premium film grain look */}
        <div className="absolute inset-0 z-10 opacity-[0.05] pointer-events-none mix-blend-overlay"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
        />
      </div>

      {/* Main Content - Centered */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 flex flex-col items-center justify-center text-center mt-8 sm:mt-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={`content-${activeIndex}`}
            initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -16, filter: "blur(8px)", position: "absolute" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center w-full max-w-4xl"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8 lg:mb-12">
              <Leaf size={14} className="text-brand-400" />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-white">
                {banner.badge || "Authentic Sattvik"}
              </span>
            </div>

            {/* Massive Heading */}
            <h1 className="text-[36px] min-[400px]:text-[44px] sm:text-[88px] lg:text-[120px] font-black tracking-[-0.04em] leading-[1] sm:leading-[0.9] text-white drop-shadow-2xl text-balance">
              <span className="block">{banner.title || "The Taste of"}</span>
              <span className="block font-serif italic font-medium text-gold-400 tracking-[-0.02em] mt-1 sm:mt-4">
                {banner.subtitle || "Heritage."}
              </span>
            </h1>

            {/* Description */}
            <p className="text-sm min-[400px]:text-base sm:text-xl lg:text-2xl text-white/80 max-w-2xl mt-4 sm:mt-8 font-medium leading-relaxed [text-wrap:balance]">
              {banner.description}
            </p>

            {/* CTAs */}
            <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 justify-center w-full max-w-xs sm:max-w-none px-4 sm:px-0 mx-auto">
              <Link
                href={banner.link || "/products"}
                className="group w-full sm:w-auto relative inline-flex items-center justify-center gap-4 px-6 py-4 bg-white text-brand-950 rounded-full font-bold text-base sm:text-lg hover:bg-brand-50 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10">Explore Our Shop</span>
                <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/about"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-4 bg-transparent text-white border border-white/30 rounded-full font-bold text-base sm:text-lg hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all duration-300"
              >
                <PlayCircle size={20} className="text-brand-400" />
                <span>Our Heritage</span>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Purity Stats - Glassmorphism Dock */}
      <div className="absolute bottom-6 sm:bottom-8 left-4 right-4 sm:left-8 sm:right-8 lg:left-16 lg:right-16 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6 p-3 px-4 sm:p-6 sm:px-12 sm:py-8 bg-brand-950/50 backdrop-blur-2xl rounded-[2rem] sm:rounded-3xl border border-white/10 shadow-[0_32px_64px_rgba(5,20,8,0.5)]">

          <div className="flex flex-1 items-center justify-between md:justify-start w-full md:w-auto gap-3 sm:gap-8 lg:gap-16 overflow-x-auto snap-x snap-mandatory no-scrollbar sm:mask-gradient-x px-1 sm:px-0">
            <div className="flex flex-col shrink-0 text-center md:text-left snap-start">
              <span className="text-xl min-[400px]:text-2xl sm:text-3xl lg:text-4xl font-serif text-white tracking-tight">0%</span>
              <span className="text-[8px] min-[400px]:text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] text-white/60 mt-1">Onion & Garlic</span>
            </div>
            <div className="w-px h-6 sm:h-12 bg-white/10 shrink-0" />
            <div className="flex flex-col shrink-0 text-center md:text-left snap-start">
              <span className="text-xl min-[400px]:text-2xl sm:text-3xl lg:text-4xl font-serif text-white tracking-tight">100%</span>
              <span className="text-[8px] min-[400px]:text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] text-white/60 mt-1">Groundnut Oil</span>
            </div>
            <div className="w-px h-6 sm:h-12 bg-white/10 shrink-0" />
            <div className="flex flex-col shrink-0 text-center md:text-left snap-start">
              <span className="text-xl min-[400px]:text-2xl sm:text-3xl lg:text-4xl font-serif text-white tracking-tight">24h</span>
              <span className="text-[8px] min-[400px]:text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] text-white/60 mt-1">Fresh Batches</span>
            </div>
          </div>

          {/* Carousel Indicators inside the dock */}
          {activeBanners.length > 1 && (
            <div className="flex items-center gap-3 shrink-0">
              {activeBanners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  className="group py-2 focus-visible:outline-none"
                  aria-label={`Go to slide ${idx + 1}`}
                >
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ease-out ${activeIndex === idx
                        ? "w-12 bg-brand-400"
                        : "w-4 bg-white/20 group-hover:bg-white/40 group-focus-visible:bg-brand-500"
                      }`}
                  />
                </button>
              ))}
            </div>
          )}

        </div>
      </div>

    </section>
  );
}
