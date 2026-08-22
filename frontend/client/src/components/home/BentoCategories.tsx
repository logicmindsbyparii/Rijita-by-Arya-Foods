"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useCallback } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useMotionTemplate,
} from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { getImageUrl, handleImageError } from "@/lib/utils";
import { getCategoryFallbackImage } from "@/lib/namkeen-images";

interface Category {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  productCount?: number;
}

/* ── Magnetic Cursor Glow ──────────────────────────────────────── */
function useMagneticGlow() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const glowX = useSpring(mouseX, { stiffness: 150, damping: 15, mass: 0.1 });
  const glowY = useSpring(mouseY, { stiffness: 150, damping: 15, mass: 0.1 });
  const background = useMotionTemplate`radial-gradient(600px circle at ${glowX}px ${glowY}px, rgba(212,165,69,0.12), transparent 40%)`;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY]
  );

  return { background, handleMouseMove };
}

/* ── Floating Particles ────────────────────────────────────────── */
function FloatingParticles() {
  const particles = [
    { x: "10%", y: "20%", size: 3, delay: 0, duration: 18 },
    { x: "25%", y: "70%", size: 2, delay: 2, duration: 22 },
    { x: "45%", y: "15%", size: 4, delay: 4, duration: 16 },
    { x: "65%", y: "60%", size: 2.5, delay: 1, duration: 20 },
    { x: "80%", y: "35%", size: 3, delay: 3, duration: 19 },
    { x: "15%", y: "85%", size: 2, delay: 5, duration: 21 },
    { x: "55%", y: "45%", size: 3.5, delay: 2.5, duration: 17 },
    { x: "90%", y: "75%", size: 2, delay: 1.5, duration: 23 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-gold-400/20"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0, 20, 0],
            x: [0, 15, -10, 5, 0],
            opacity: [0, 0.6, 0.3, 0.7, 0],
            scale: [0.8, 1.2, 0.9, 1.1, 0.8],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ── Spotlight Border Effect ───────────────────────────────────── */
function SpotlightBorder() {
  const mouseX = useMotionValue(-400);
  const mouseY = useMotionValue(-400);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY]
  );

  const handleMouseLeave = useCallback(() => {
    mouseX.set(-400);
    mouseY.set(-400);
  }, [mouseX, mouseY]);

  const background = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, rgba(212,165,69,0.3), transparent 40%)`;

  return {
    spotlightBackground: background,
    spotlightHandlers: { onMouseMove: handleMouseMove, onMouseLeave: handleMouseLeave },
  };
}

export default function BentoCategories({
  categories = [],
}: {
  categories: Category[];
}) {
  const active = (categories || []).filter(
    (c) => (c.productCount ?? 0) > 0
  );
  if (active.length === 0) return null;
  return <BentoCategoriesContent categories={active} />;
}

function BentoCategoriesContent({ categories }: { categories: Category[] }) {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Parallax transforms for each card
  const yFeatured = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);
  const ySecondary0 = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  const ySecondary1 = useTransform(scrollYProgress, [0, 1], ["-14%", "14%"]);
  const ySecondary2 = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  // Heading parallax
  const headingY = useTransform(scrollYProgress, [0, 0.5], [60, 0]);
  const headingOpacity = useTransform(scrollYProgress, [0, 0.25], [0, 1]);

  const featured = categories[0];
  const secondary = categories.slice(1, 4);

  const categoryImage = (cat: Category) => {
    const fallback = getCategoryFallbackImage(cat?.name || "");
    return {
      url: cat?.image ? getImageUrl(cat.image) : fallback,
      onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
        const target = e.currentTarget;
        if (target.src !== fallback) target.src = fallback;
        else handleImageError(e);
      },
    };
  };

  const totalCount = categories.length;

  const getFeaturedSpan = () => {
    if (totalCount === 1)
      return "col-span-2 lg:col-span-12 lg:row-span-2 min-h-[320px] sm:min-h-[500px]";
    if (totalCount === 2)
      return "col-span-2 lg:col-span-8 lg:row-span-2 min-h-[320px] sm:min-h-[580px]";
    return "col-span-2 lg:col-span-8 lg:row-span-2 min-h-[280px] sm:min-h-[580px] lg:h-auto";
  };

  const getSecondary0Span = () => {
    if (totalCount === 2)
      return "col-span-2 lg:col-span-4 lg:row-span-2 min-h-[240px] sm:min-h-[580px]";
    return "col-span-1 lg:col-span-4 lg:row-span-1 min-h-[180px] sm:h-[276px]";
  };

  // ── Container stagger ────────────────────────────────────────────
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 },
    },
  };

  // ── Clip-path wipe entrance ──────────────────────────────────────
  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 60,
      clipPath: "inset(100% 0% 0% 0%)",
    },
    show: {
      opacity: 1,
      y: 0,
      clipPath: "inset(0% 0% 0% 0%)",
      transition: {
        duration: 0.9,
        ease: [0.16, 1, 0.3, 1],
        clipPath: { duration: 1.1, ease: [0.16, 1, 0.3, 1] },
      },
    },
  };

  // ── Text reveal variant ──────────────────────────────────────────
  const textReveal = {
    hidden: { opacity: 0, y: 30, filter: "blur(6px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section
      ref={containerRef}
      className="py-24 md:py-48 bg-paper text-ink border-t border-ink-faint relative overflow-hidden"
    >
      {/* ── Background layers ────────────────────────────────────── */}
      <div className="absolute inset-0 bg-[radial-gradient(#05140808_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-brand-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-gold-500/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />
      <FloatingParticles />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 w-full relative z-10">
        {/* ── Section Header ─────────────────────────────────────── */}
        <motion.div
          style={{ y: headingY, opacity: headingOpacity }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-16 sm:mb-24 gap-8 sm:gap-12"
        >
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-3 px-4 py-2 border border-brand-500/20 rounded-full bg-brand-500/5 backdrop-blur-md mb-8 relative overflow-hidden">
                {/* Shimmer sweep on badge */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatDelay: 4,
                    ease: "easeInOut",
                  }}
                />
                <Sparkles
                  size={14}
                  className="text-brand-600 relative z-10"
                />
                <span className="text-brand-700 text-xs font-bold uppercase tracking-widest relative z-10">
                  Collections
                </span>
              </div>

              {/* Heading with word-by-word stagger */}
              <div className="overflow-hidden">
                <motion.h2
                  className="text-[40px] sm:text-5xl md:text-7xl lg:text-[6rem] font-display font-black text-brand-950 tracking-[-0.03em] leading-[1.02] [text-wrap:balance]"
                  initial={{ y: "110%" }}
                  whileInView={{ y: "0%" }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{
                    duration: 1,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  Discover our{" "}
                  <span className="text-gold-600 font-serif italic font-medium block mt-2">
                    Sattvik Range.
                  </span>
                </motion.h2>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              href="/products"
              className="inline-flex items-center gap-3 sm:gap-4 group focus-ring rounded-full"
            >
              <span className="text-base sm:text-xl font-bold uppercase tracking-widest text-ink-2 group-hover:text-brand-700 transition-colors duration-300">
                View Catalog
              </span>
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-brand-700 text-white flex items-center justify-center group-hover:scale-110 group-hover:bg-gold-500 group-hover:text-brand-950 transition-all duration-500 shadow-xl shadow-brand-900/10">
                <ArrowRight
                  size={20}
                  className="sm:w-6 sm:h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-500"
                />
              </div>
            </Link>
          </motion.div>
        </motion.div>

        {/* ── Bento Grid ─────────────────────────────────────────── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-8 grid-flow-dense auto-rows-auto"
        >
          {/* ─── Card 1: Hero Featured ────────────────────────────── */}
          {featured && (
            <BentoCard
              variants={cardVariants}
              span={getFeaturedSpan()}
              parallaxY={yFeatured}
              image={categoryImage(featured)}
              alt={featured.name}
              sizes="(max-width: 1024px) 100vw, 65vw"
              badge={`${featured.productCount || 0} Items`}
              title={featured.name}
              subtitle="Explore Collection"
              slug={featured.slug}
              accentColor="gold"
              priority
            />
          )}

          {/* ─── Card 2: Secondary 0 ──────────────────────────────── */}
          {secondary[0] && (
            <BentoCard
              variants={cardVariants}
              span={getSecondary0Span()}
              parallaxY={ySecondary0}
              image={categoryImage(secondary[0])}
              alt={secondary[0].name}
              sizes="(max-width: 1024px) 100vw, 35vw"
              badge={`${secondary[0].productCount || 0} Items`}
              title={secondary[0].name}
              subtitle="View Details"
              slug={secondary[0].slug}
              accentColor="brand"
              isHalfWidthMobile={totalCount > 2}
            />
          )}

          {/* ─── Card 3: Secondary 1 ──────────────────────────────── */}
          {secondary[1] && (
            <BentoCard
              variants={cardVariants}
              span="col-span-1 lg:col-span-4 lg:row-span-1 min-h-[180px] sm:h-[276px]"
              parallaxY={ySecondary1}
              image={categoryImage(secondary[1])}
              alt={secondary[1].name}
              sizes="(max-width: 1024px) 100vw, 35vw"
              badge={`${secondary[1].productCount || 0} Items`}
              title={secondary[1].name}
              subtitle=""
              slug={secondary[1].slug}
              accentColor="brand"
              isHalfWidthMobile
            />
          )}

          {/* ─── Card 4: Full-width Accent ────────────────────────── */}
          {secondary[2] && (
            <BentoCard
              variants={cardVariants}
              span="col-span-2 lg:col-span-12 lg:row-span-1 min-h-[160px] sm:h-[240px]"
              parallaxY={ySecondary2}
              image={categoryImage(secondary[2])}
              alt={secondary[2].name}
              sizes="100vw"
              badge={`${secondary[2].productCount || 0} Items`}
              title={secondary[2].name}
              subtitle=""
              slug={secondary[2].slug}
              accentColor="brand"
              isFullWidth
            />
          )}
        </motion.div>
      </div>
    </section>
  );
}

/* ── Reusable Bento Card ──────────────────────────────────────── */
interface BentoCardProps {
  variants: any;
  span: string;
  parallaxY: any;
  image: { url: string; onError: (e: any) => void };
  alt: string;
  sizes: string;
  badge: string;
  title: string;
  subtitle: string;
  slug: string;
  accentColor: "gold" | "brand";
  priority?: boolean;
  isFullWidth?: boolean;
  isHalfWidthMobile?: boolean;
}

function BentoCard({
  variants,
  span,
  parallaxY,
  image,
  alt,
  sizes,
  badge,
  title,
  subtitle,
  slug,
  accentColor,
  priority,
  isFullWidth,
  isHalfWidthMobile,
}: BentoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Magnetic glow
  const { background: glowBg, handleMouseMove: glowMove } = useMagneticGlow();

  // Spotlight border
  const mouseX = useMotionValue(-400);
  const mouseY = useMotionValue(-400);
  const spotlightBg = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, rgba(212,165,69,0.35), transparent 40%)`;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      glowMove(e);
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [glowMove, mouseX, mouseY]
  );

  const handleMouseLeave = useCallback(() => {
    mouseX.set(-400);
    mouseY.set(-400);
    setIsHovered(false);
  }, [mouseX, mouseY]);

  const hoverBorder =
    accentColor === "gold"
      ? "hover:border-gold-500/30"
      : "hover:border-brand-500/30";

  const titleSize = isFullWidth
    ? "text-3xl sm:text-5xl"
    : span.includes("row-span-2") || span.includes("h-[580px]")
      ? "text-3xl sm:text-6xl md:text-8xl"
      : isHalfWidthMobile
        ? "text-xl sm:text-4xl"
        : "text-2xl sm:text-4xl";

  return (
    <motion.div
      ref={cardRef}
      variants={variants}
      className={`${span} group relative rounded-[2rem] overflow-hidden border border-ink-faint ${hoverBorder} transition-colors duration-700 bg-brand-950`}
      style={{
        boxShadow: isHovered
          ? "0 30px 60px -15px rgba(5,20,8,0.2)"
          : "0 20px 50px -15px rgba(5,20,8,0.12)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Spotlight border overlay */}
      <motion.div
        className="absolute inset-0 z-30 rounded-[2rem] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: spotlightBg,
          maskImage:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
          padding: "1px",
        }}
      />

      <Link
        href={`/products?category=${slug}`}
        className="relative block w-full h-full min-h-full focus-ring"
      >
        {/* ── Image with parallax ─────────────────────────────────── */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            style={{ y: parallaxY }}
            className="absolute inset-0 scale-[1.3] pointer-events-none"
          >
            <Image
              src={image.url}
              alt={alt}
              fill
              sizes={sizes}
              className={`object-cover transition-all duration-1200 ease-expo-out ${
                isHovered
                  ? "opacity-100 scale-[1.04]"
                  : "opacity-80 scale-100"
              }`}
              onError={image.onError}
              priority={priority}
            />
          </motion.div>
        </div>

        {/* ── Gradient overlays ──────────────────────────────────── */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${
            isFullWidth
              ? "bg-gradient-to-r from-brand-950/90 via-brand-950/40 to-transparent"
              : "bg-gradient-to-t from-brand-950/90 via-brand-950/20 to-transparent"
          }`}
        />
        <div
          className={`absolute inset-0 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none ${
            accentColor === "gold" ? "bg-gold-500/15" : "bg-brand-800/30"
          }`}
        />

        {/* ── Cursor-reactive glow ────────────────────────────────── */}
        <motion.div
          className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: glowBg }}
        />

        {/* ── Content ────────────────────────────────────────────── */}
        <div
          className={`absolute inset-0 z-20 flex flex-col justify-between ${
            isFullWidth ? "p-8 md:p-12" : isHalfWidthMobile ? "p-5 sm:p-8" : "p-6 sm:p-8"
          }`}
        >
          {/* Top row: badge + arrow */}
          <div className="flex justify-between items-start gap-1 sm:gap-2">
            <span
              className={`font-bold uppercase tracking-[0.2em] ${
                isFullWidth ? "text-xs" : isHalfWidthMobile ? "text-[8px] sm:text-[10px] md:text-xs px-2.5 py-1.5 sm:px-4 sm:py-2" : "text-[9px] sm:text-xs px-3 py-1.5 sm:px-4 sm:py-2"
              } border backdrop-blur-md transition-all duration-500 ${
                accentColor === "gold"
                  ? "text-white border-white/20 bg-white/10 group-hover:bg-gold-500/20 group-hover:border-gold-400/50 group-hover:text-gold-300"
                  : "text-brand-300 border-brand-500/30 bg-brand-950/60 group-hover:text-gold-300 group-hover:border-gold-500/40"
              } rounded-full`}
            >
              {badge}
            </span>

            {/* Animated arrow circle */}
            <motion.div
              className={`${
                isFullWidth ? "w-12 h-12 sm:w-14 sm:h-14" : isHalfWidthMobile ? "w-7 h-7 sm:w-12 sm:h-12" : "w-8 h-8 sm:w-12 sm:h-12"
              } shrink-0 rounded-full flex items-center justify-center shadow-md overflow-hidden transition-all duration-500 ${
                accentColor === "gold"
                  ? "bg-white text-brand-950 group-hover:bg-gold-400"
                  : "bg-white/90 text-brand-950 group-hover:bg-white"
              }`}
              animate={
                isHovered ? { rotate: 0, scale: 1.1 } : { rotate: -45, scale: 1 }
              }
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <ArrowRight
                size={isFullWidth ? 24 : isHalfWidthMobile ? 16 : 20}
                className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-500"
              />
            </motion.div>
          </div>

          {/* Bottom: text content */}
          <div>
            {/* Subtitle reveal on hover */}
            {subtitle && (
              <div className="overflow-hidden mb-3 h-5">
                <motion.span
                  className={`block font-bold uppercase tracking-[0.2em] text-xs ${
                    accentColor === "gold"
                      ? "text-gold-400"
                      : "text-brand-400"
                  }`}
                  initial={{ y: "100%", opacity: 0 }}
                  animate={
                    isHovered
                      ? { y: "0%", opacity: 1 }
                      : { y: "100%", opacity: 0 }
                  }
                  transition={{
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {subtitle}
                </motion.span>
              </div>
            )}

            {/* Title with blur-in reveal */}
            <motion.h3
              className={`${titleSize} font-display font-black text-white leading-[0.9] drop-shadow-lg [text-wrap:balance]`}
              animate={
                isHovered
                  ? { y: isFullWidth ? -6 : -12, filter: "blur(0px)" }
                  : { y: 0, filter: "blur(0px)" }
              }
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {title}
            </motion.h3>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
