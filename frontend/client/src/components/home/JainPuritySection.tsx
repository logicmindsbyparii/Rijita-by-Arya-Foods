"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Leaf, Sparkles, Flame, Award, CheckCircle2, HeartHandshake } from "lucide-react";
import { NAMKEEN_IMAGES } from "@/lib/namkeen-images";

const PURITY_PILLARS = [
  {
    id: "purity",
    icon: Leaf,
    title: "100% Jain Guarantee",
    subtitle: "Zero Onion • Zero Garlic",
    description: "Every spice blend and namkeen batch follows strict Sattvik Jain principles. No onion, no garlic, no root vegetables — across the entire catalog.",
    features: [
      "Dedicated 100% Sattvik Kitchen",
      "No Onion or Garlic Raw Materials",
      "Pure Natural Hing & Whole Spices",
      "Checked at Every Batch"
    ],
    accent: "from-brand-700 to-brand-950"
  },
  {
    id: "ingredients",
    icon: Sparkles,
    title: "Pure Desi Spices",
    subtitle: "Real Hing, Sendha Namak & Besan",
    description: "We source quality hing, gram flour (besan), and natural rock salt (sendha namak). No artificial colors, no synthetic flavor enhancers, ever.",
    features: [
      "Chana Dal & Gram Flour Based",
      "Fresh Ground Whole Spices",
      "Sendha Namak Options",
      "Zero MSG or Chemical Flavors"
    ],
    accent: "from-gold-700 to-brand-900"
  },
  {
    id: "oil",
    icon: Flame,
    title: "Fresh Batch Frying",
    subtitle: "Pure Groundnut Oil Only",
    description: "Fried in high-grade pure groundnut oil. Frying oil is changed regularly to guarantee fresh crunch and a clean, non-greasy texture.",
    features: [
      "100% Pure Groundnut Oil",
      "Zero Palm Oil & Zero Hydro-fats",
      "Monitored Frying Temperature",
      "Crisp, Non-Greasy Texture"
    ],
    accent: "from-gold-600 to-brand-800"
  },
  {
    id: "trust",
    icon: Award,
    title: "Hygiene & Trust",
    subtitle: "FSSAI Certified • Sealed Fresh",
    description: "Every pack is hygienically sealed at our certified unit and dispatched fresh, so the crunch reaches your home exactly as it left the kadai.",
    features: [
      "Hygienic Sealed Foil Packaging",
      "FSSAI Certified Unit",
      "Direct Fresh Dispatch",
      "Satisfaction Promise"
    ],
    accent: "from-brand-800 to-brand-950"
  }
];

export default function JainPuritySection() {
  const [activePillar, setActivePillar] = useState(PURITY_PILLARS[0]);

  return (
    <section className="relative py-16 sm:py-32 md:py-48 bg-paper text-ink overflow-hidden">
      {/* Ambient light washes */}

      {/* Subtle grain overlay — replaces the generic dot pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025] mix-blend-multiply"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 lg:mb-16">
          <motion.span
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 sm:gap-4 text-xs font-bold uppercase tracking-[0.18em] sm:tracking-[0.22em] text-brand-700 mb-3 sm:mb-4"
          >
            <span className="h-px w-6 sm:w-10 bg-brand-600/40" />
            <ShieldCheck size={14} className="text-brand-600 shrink-0" />
            <span>100% Jain Purity Standards</span>
            <span className="h-px w-6 sm:w-10 bg-brand-600/40" />
          </motion.span>

          <motion.h2
            className="text-[clamp(2rem,6vw,4rem)] sm:text-5xl lg:text-6xl font-display font-black tracking-[-0.02em] text-ink leading-[1.1] sm:leading-[1.02] [text-wrap:balance]"
          >
            Sacred Sattvik Taste. <br />
            <span className="text-brand-700">
              Zero Garlic. Zero Onion. Zero Compromise.
            </span>
          </motion.h2>

          <motion.p
            className="mt-3 sm:mt-4 text-ink-2 text-xs sm:text-lg leading-relaxed font-medium [text-wrap:pretty]"
          >
            For us, Jain Namkeen is not just a label — it is a holy commitment. Every recipe is meticulously prepared without onion, garlic, or root spices.
          </motion.p>
        </div>

        {/* Pillar Navigation Tabs */}
        <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar sm:grid sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mb-8 sm:mb-12 lg:mb-16 pb-4 sm:pb-0 -mx-4 px-4 sm:mx-auto sm:px-0 mask-gradient-x sm:mask-none">
          {PURITY_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            const isActive = activePillar.id === pillar.id;

            return (
              <button
                key={pillar.id}
                onClick={() => setActivePillar(pillar)}
                className={`relative w-[200px] shrink-0 sm:w-auto sm:shrink-1 snap-start p-3 sm:p-4 rounded-xl sm:rounded-2xl text-left transition-ui duration-300 border flex flex-col items-center sm:items-start text-center sm:text-left focus-ring active:scale-[0.98] ${isActive
                    ? "bg-white border-brand-600 shadow-[0_12px_32px_-16px_rgba(20,82,24,0.35)]"
                    : "bg-white/60 border-ink-soft hover:bg-white hover:border-ink-mid"
                  }`}
              >
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 transition-ui duration-300 ${isActive ? "bg-brand-700 text-white shadow-md scale-105" : "bg-paper-2 text-ink-3"
                    }`}
                >
                  <Icon size={18} />
                </div>
                <span className="text-xs sm:text-sm font-bold text-ink tracking-wide block leading-snug">{pillar.title}</span>
                <span className="text-xs text-ink-3 hidden sm:block mt-0.5">{pillar.subtitle.split("•")[0]}</span>

                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-brand-600 pointer-events-none"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Feature Card */}
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePillar.id}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              className="bg-white border border-ink-soft rounded-2xl sm:rounded-3xl shadow-[0_32px_80px_-32px_rgba(26,20,10,0.25)] overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center p-5 sm:p-8 lg:p-12">

                {/* Left Content */}
                <div className="lg:col-span-7 space-y-4 sm:space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-600/10 border border-brand-600/25 text-brand-700 text-xs font-bold uppercase tracking-wider">
                    <HeartHandshake size={13} />
                    <span>{activePillar.subtitle}</span>
                  </div>

                  <h3 className="text-xl sm:text-3xl lg:text-4xl font-display font-bold text-ink tracking-tight">
                    {activePillar.title}
                  </h3>

                  <p className="text-ink-2 leading-relaxed font-normal text-sm sm:text-lg [text-wrap:pretty]">
                    {activePillar.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 pt-2">
                    {activePillar.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-ink-2 text-xs sm:text-sm font-semibold bg-paper-2 p-2.5 rounded-xl border border-ink-faint">
                        <CheckCircle2 size={15} className="text-brand-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Visual — editorial ingredient showcase instead of gradient box */}
                <div className="lg:col-span-5 flex justify-center">
                  <div className="w-full max-w-[280px] sm:max-w-[320px] relative">
                    {/* Main image with rounded corners — no gradient box behind it */}
                    <div className="relative aspect-[4/3] sm:aspect-[4/5] rounded-2xl sm:rounded-3xl overflow-hidden border border-ink-faint shadow-[0_32px_80px_-20px_rgba(26,20,10,0.2)] bg-white group">
                      <Image
                        src={NAMKEEN_IMAGES.sattvik}
                        alt="Pure Sattvik Jain Namkeen"
                        fill
                        sizes="320px"
                        className="object-cover object-center scale-105 group-hover:scale-100 transition-transform duration-1000 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-950/60 via-transparent to-transparent" />

                      {/* Floating tag — positioned at bottom-left */}
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-700/90 backdrop-blur-md">
                          {(() => {
                            const PillarIcon = activePillar.icon;
                            return <PillarIcon size={14} className="text-gold-300" />;
                          })()}
                          <span className="text-[11px] font-bold text-white">{activePillar.subtitle.split("•")[0].trim()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Small floating stat card — offset below-right for depth */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="absolute -bottom-4 -right-3 sm:-right-6 bg-white rounded-2xl border border-ink-faint shadow-[0_16px_48px_-12px_rgba(26,20,10,0.25)] p-3.5 sm:p-4 z-20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200/50 flex items-center justify-center">
                          {(() => {
                            const PillarIcon = activePillar.icon;
                            return <PillarIcon size={18} className="text-brand-700" />;
                          })()}
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-ink leading-none mb-0.5">100% Pure Jain</p>
                          <p className="text-[10px] text-ink-3 font-semibold">Small Batch • Freshly Fried</p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>

              </div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
