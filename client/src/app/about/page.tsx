"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { contentApi } from "@/lib/api";
import { getImageUrl } from "@/lib/utils";
import {
  ArrowRight,
  Leaf,
  Award,
  Heart,
  Star,
  Shield,
  CheckCircle,
  Trophy,
  Sparkles,
  Quote,
  Factory,
} from "lucide-react";

/* ── 08 Photographic · About Page ──
   Each fold is anchored by a photograph.
   Text is annotation — small, specific, restrained.
   The page says "look" before it says "read."
*/

function AnimatedCounter({ target, suffix = "", decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { damping: 25, stiffness: 70 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (isInView) motionValue.set(target);
  }, [isInView, target, motionValue]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (v) => setDisplay(`${v.toFixed(decimals)}${suffix}`));
    return unsubscribe;
  }, [spring, suffix, decimals]);

  return <p ref={ref} className="text-2xl sm:text-3xl font-bold text-brand-600 tabular-nums">{display}</p>;
}

const valueIcons = [Leaf, Award, Heart, Star];

const fallbackValues = [
  { title: "100% Pure", description: "No preservatives, no additives — just pure, natural ingredients sourced from the finest farms." },
  { title: "Premium Quality", description: "Every product meets rigorous quality standards with FSSAI certification and strict hygiene protocols." },
  { title: "Made with Love", description: "Traditional recipes passed down through generations, crafted with care and attention to every detail." },
  { title: "Customer First", description: "Your satisfaction is our priority. We listen, improve, and deliver excellence in every order." },
];

const fallbackStats = [
  { value: 5, suffix: "+", label: "Years of Excellence", placeholder: true },
  { value: 50, suffix: "+", label: "Premium Products", placeholder: true },
  { value: 10000, suffix: "+", label: "Happy Customers", placeholder: true },
  { value: 5000, suffix: "+", label: "Happy Families", placeholder: true },
];

const fallbackStory = {
  heading: "A Tradition of Purity, Passed Down Through Generations",
  text: "RIJITA by Arya Foods was born from a deep-rooted passion for authentic Indian cuisine. What started as a small family kitchen in Surat, Gujarat, has grown into a beloved brand synonymous with quality, purity, and traditional taste.\n\nEvery recipe we use is a treasured heirloom — passed down through generations, perfected over decades. We believe that food is more than sustenance; it is a connection to our roots, a celebration of culture, and a medium of love.\n\nFrom sourcing the finest ingredients to maintaining rigorous hygiene standards, every step of our process is guided by one principle: deliver the purest, most delicious experience to every home.",
};

const qualityBadgeIcons = [Shield, CheckCircle, Trophy, Sparkles];

const fallbackQualityBadges = [
  { label: "FSSAI Approved", description: "Licensed & regulated" },
  { label: "100% Vegetarian", description: "Pure ingredients" },
  { label: "Premium Grade", description: "Highest quality" },
  { label: "Hygienic Processing", description: "Modern facility" },
];

export default function AboutPage() {
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => contentApi.getSiteSettings(),
    staleTime: 10 * 60 * 1000,
  });
  const settings = settingsData?.data?.settings;
  const stats = settings?.stats && settings.stats.length > 0
    ? settings.stats.map((s: { label: string; value: number; suffix: string }) => ({ ...s, placeholder: false }))
    : fallbackStats;
  const story = settings?.story?.text ? settings.story : fallbackStory;
  const storyParagraphs = story.text.split(/\n\s*\n/).filter(Boolean);
  const about = settings?.about;
  const heroTagline = about?.heroTagline || "About RIJITA";
  const heroHeadline = about?.heroHeadline || "Crafting Timeless Taste";
  const heroSubtitle = about?.heroSubtitle || "We are more than a food brand — we are keepers of tradition. Every product tells a story of heritage, quality, and the unwavering commitment to bring you the purest taste of India.";
  const heroImage = settings?.heroImage;
  const mission = about?.mission || "To preserve and share the authentic taste of Indian tradition by crafting premium-quality snacks and food products using the purest ingredients, time-honored recipes, and modern hygiene standards — making every meal a celebration of heritage.";
  const vision = about?.vision || "To become India's most trusted name in traditional snacks — delivering the authentic taste of home to every Indian, anywhere in the world, while staying true to our roots and commitment to purity.";
  const founderName = about?.founderName || "Arya Foods";
  const founderTitle = about?.founderTitle || "Founder & Visionary";
  const founderBio = about?.founderBio || "What began as a small-scale passion project has blossomed into a brand that thousands trust. Our founder's vision was simple — to share the authentic taste of home-made Indian snacks with the world, without compromising on quality or tradition.\n\nToday, every product bearing the RIJITA name carries forward that vision, crafted with the same love and care as the recipes from our grandmother's kitchen.";
  const founderBioParagraphs = founderBio.split(/\n\s*\n/).filter(Boolean);
  const founderImage = settings?.founderImage;
  const values = (about?.values && about.values.length > 0 ? about.values : fallbackValues).map((v: { title: string; description: string }, i: number) => ({ ...v, icon: valueIcons[i % valueIcons.length] }));
  const qualityBadges = (about?.qualityBadges && about.qualityBadges.length > 0 ? about.qualityBadges : fallbackQualityBadges).map((b: { label: string; description: string }, i: number) => ({ ...b, icon: qualityBadgeIcons[i % qualityBadgeIcons.length] }));

  return (
    <div className="overflow-hidden bg-white">
      {/* ═══ HERO — photographic fold ═══ */}
      <section className="relative min-h-[65vh] flex items-end bg-brand-600 pt-36 sm:pt-40 lg:pt-44">
        {/* Background photo */}
        <div className="absolute inset-0 overflow-hidden">
          {heroImage ? (
            <Image src={getImageUrl(heroImage)} alt={heroHeadline} fill sizes="100vw" className="object-cover" priority />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900" style={heroImage ? { opacity: 0.7 } : undefined} />
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.08) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        </div>

        {/* Caption over the photo */}
        <div className="relative w-full px-6 sm:px-10 lg:px-16 pb-12 sm:pb-16 lg:pb-20">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-gold-300 mb-4 block">
              {heroTagline}
            </span>
            <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-display font-bold text-white leading-[1.1] tracking-tight">
              {heroHeadline}
            </h1>
            <p className="mt-4 text-sm sm:text-base text-white/90 font-medium max-w-lg leading-relaxed">
              {heroSubtitle}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══ OUR STORY — photo-led ═══ */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Photo side */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-brand-100 via-gold-50 to-brand-50 relative">
                {settings?.storyImage ? (
                  <Image src={getImageUrl(settings.storyImage)} alt={story.heading} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Factory size={120} className="text-brand-200 opacity-15" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-500/10 to-transparent" />
              </div>
              <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-lg p-4 hidden md:block border border-stone-100">
                <p className="text-xl font-bold text-brand-600">{stats[0]?.value}{stats[0]?.suffix}</p>
                <p className="text-xs text-stone-500 uppercase tracking-wider">{stats[0]?.label || "Years of Tradition"}</p>
              </div>
            </motion.div>

            {/* Text side — annotation */}
            <motion.div
            >
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-gold-600 block mb-4">
                Our Story
              </span>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-stone-800 mb-4 leading-tight">
                {story.heading}
              </h2>
              <div className="space-y-4 text-xs sm:text-sm text-stone-500 leading-relaxed">
                {storyParagraphs.map((para: string, i: number) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              <div className="mt-6">
                <Link href="/products" className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors border-b border-brand-300 hover:border-brand-500 pb-0 group">
                  Explore Products <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ MISSION & VISION — text band ═══ */}
      <section className="py-16 bg-stone-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="grid md:grid-cols-2 gap-4">
            <motion.div
              className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center mb-4">
                <Star size={18} className="text-brand-600" />
              </div>
              <h3 className="text-sm font-display font-bold text-stone-800 mb-2">Our Mission</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                {mission}
              </p>
            </motion.div>
            <motion.div
              className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200"
            >
              <div className="w-10 h-10 rounded-lg bg-gold-50 flex items-center justify-center mb-4">
                <Trophy size={18} className="text-gold-600" />
              </div>
              <h3 className="text-sm font-display font-bold text-stone-800 mb-2">Our Vision</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                {vision}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ CORE VALUES — annotation cards ═══ */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="text-center mb-10">              <span className="text-xs font-bold tracking-[0.2em] uppercase text-stone-400 block mb-2" aria-hidden="true">
                Principles
              </span>
              <h2 className="text-lg sm:text-xl font-display font-bold text-stone-800">
                Our Core Values
              </h2>
              <h2 className="sr-only">Core Values</h2>
            <p className="text-xs text-stone-500 mt-2 max-w-md mx-auto">
              The principles that guide everything we do.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4">
            {values.map((val: { title: string; description: string; icon: React.ElementType }, i: number) => {
              const Icon = val.icon;
              return (
                <motion.div
                  key={val.title}
                  className="text-center p-4 sm:p-6 rounded-xl border border-stone-200 bg-stone-50/50"
                >
                  <div className="w-10 h-10 mx-auto mb-4 rounded-lg bg-brand-50 flex items-center justify-center">
                    <Icon size={16} className="text-brand-600" />
                  </div>
                  <h3 className="text-xs font-bold text-stone-700 mb-2">{val.title}</h3>
                  <p className="text-xs text-stone-500 leading-relaxed">{val.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ FOUNDER — photographic fold ═══ */}
      <section className="relative bg-brand-600 text-white overflow-hidden">
        <div className="grid lg:grid-cols-2 min-h-[60vh]">
          {/* Photo side */}
          <div className="relative h-[40vh] lg:min-h-[60vh] order-2 lg:order-1">
            {founderImage ? (
              <Image src={getImageUrl(founderImage)} alt={founderName} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-brand-950/60 to-transparent lg:bg-gradient-to-r" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                {!founderImage && (
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center text-2xl font-bold shadow-xl">
                    {founderName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <h3 className="text-lg font-display font-bold">{founderName}</h3>
                <p className="text-gold-400 text-xs mt-2">{founderTitle}</p>
              </div>
            </div>
          </div>

          {/* Text side */}
          <div className="relative order-1 lg:order-2 flex items-center px-8 sm:px-12 lg:px-16 py-16">
            <motion.div
              className="max-w-lg"
            >
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-gold-400/80 mb-4 block">
                Our Founder
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold leading-[1.15] mb-4">
                Driven by Passion,
                <span className="text-gold-400">Guided by Tradition</span>
              </h2>
              <div className="space-y-4 text-sm sm:text-base text-white/70 leading-relaxed">
                {founderBioParagraphs.map((para: string, i: number) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ STATS — tight annotation strip ═══ */}
      <section className="py-12 bg-white border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat: { label: string; value: number; suffix: string; placeholder?: boolean }, i: number) => (
              <motion.div
                key={stat.label}
                className="text-center"
              >
                {stat.placeholder ? (
                  <>
                    <p className="text-2xl sm:text-3xl font-bold text-stone-300 tabular-nums">—</p>
                    <span className="text-xs text-stone-300 block">metric to confirm</span>
                  </>
                ) : (
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                )}
                <p className="text-xs text-stone-400 uppercase tracking-wider mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ QUALITY PROMISE — badge strip ═══ */}
      <section className="py-16 bg-stone-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="text-center mb-8">
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-stone-400 block mb-2">
              Guarantee
            </span>
            <h2 className="text-lg sm:text-xl font-display font-bold text-stone-800">
              Our Quality Promise
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {qualityBadges.map((badge: { label: string; description: string; icon: React.ElementType }, i: number) => {
              const Icon = badge.icon;
              return (
                <motion.div
                  key={badge.label}
                  className="bg-white rounded-xl p-4 border border-stone-200 text-center"
                >
                  <div className="w-10 h-10 mx-auto mb-4 rounded-lg bg-brand-50 flex items-center justify-center">
                    <Icon size={16} className="text-brand-600" />
                  </div>
                  <h4 className="text-xs font-bold text-stone-700 mb-0">{badge.label}</h4>
                  <p className="text-xs text-stone-500">{badge.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ CTA — minimal ═══ */}
      <section className="py-16 bg-brand-600">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 text-center">
          <motion.div
          >
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-white mb-2 leading-tight">
              Taste the Tradition
            </h2>
            <p className="text-white/60 text-sm max-w-md mx-auto mb-6">
              Browse our collection of premium snacks and experience the authentic
              taste of India, delivered fresh to your doorstep.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-4 bg-white text-brand-700 rounded-lg text-sm font-bold hover:shadow-lg hover:bg-stone-50 transition-ui group"
            >
              Browse Products <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
