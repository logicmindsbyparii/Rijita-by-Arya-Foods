"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Leaf, Sparkles, Award, HeartHandshake, ShieldCheck, BadgeCheck } from "lucide-react";
import { getImageUrl } from "@/lib/utils";
import { NAMKEEN_IMAGES } from "@/lib/namkeen-images";

interface EditorialStoryProps {
  imageUrl?: string;
  heading?: string;
  paragraphs?: string[];
  values?: Array<{ title: string; description: string }>;
}

const valueIcons = [Leaf, Award, HeartHandshake, Sparkles];

const PURITY_FACTS = [
  { value: "100%", label: "Jain Guarantee" },
  { value: "0%", label: "Onion • Garlic" },
  { value: "100%", label: "Groundnut Oil" },
  { value: "FSSAI", label: "Certified Unit" },
];

export default function EditorialStory({
  imageUrl,
  heading = "Crafted with Devotion.",
  paragraphs = [
    "Arya Foods (RIJITA) began with a simple belief — true taste comes from the finest ingredients and recipes passed down through halwai generations. From our kitchen in Gujarat, we make namkeen the way it was always meant to be made: in small batches, with patience.",
    "Every single batch follows strict 100% Jain principles — zero onion, zero garlic, zero artificial preservatives. Just pure, unadulterated flavor, packed fresh while the crunch is at its best."
  ],
  values = [
    { title: "100% Jain Guarantee", description: "Strictly onion-free & garlic-free." },
    { title: "Small Batch Halwai", description: "Made fresh in small artisanal batches." },
    { title: "Sendha Namak & Real Hing", description: "Sattvik spices, whole and ground fresh." },
    { title: "Pure Groundnut Oil", description: "Crisp frying with zero palm oil." },
  ],
}: EditorialStoryProps) {
  return (
    <section className="py-16 sm:py-24 lg:py-32 bg-paper text-ink relative overflow-hidden">
      {/* Background ambient lighting */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* Left Column: Heritage Showcase Card & Image */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-lg bg-white border border-ink-soft rounded-2xl sm:rounded-3xl shadow-[0_32px_80px_-32px_rgba(26,20,10,0.25)] overflow-hidden">
              <div className="p-4 sm:p-6">
                <div className="relative aspect-[4/3] w-full rounded-xl sm:rounded-2xl overflow-hidden mb-4 sm:mb-6 bg-paper-2 border border-ink-faint">
                  {imageUrl ? (
                    <Image
                      src={getImageUrl(imageUrl)}
                      alt="Heritage Namkeen Crafting"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  ) : (
                    <Image
                      src={NAMKEEN_IMAGES.bhujiaShop}
                      alt="Traditional halwai shop selling Bikaneri bhujia"
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-950/70 via-transparent to-transparent" />

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white z-10 gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-700/90 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider">
                      <ShieldCheck size={13} />
                      <span>Purity First</span>
                    </div>
                    <span className="text-xs text-ink font-bold bg-white/90 px-3 py-1.5 rounded-full backdrop-blur-md">
                      Arya Foods Heritage
                    </span>
                  </div>
                </div>

                {/* Purity Facts */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-paper-2 border border-ink-faint">
                  {PURITY_FACTS.map((fact) => (
                    <div key={fact.label}>
                      <span className="text-xl sm:text-3xl font-display font-extrabold text-brand-800 block">{fact.value}</span>
                      <span className="text-xs text-ink-3 font-semibold uppercase tracking-wider">{fact.label}</span>
                    </div>
                  ))}
                </div>
                <p className="flex items-center gap-2 text-xs text-ink-3 font-semibold mt-3 sm:mt-4">
                  <BadgeCheck size={13} className="text-brand-600 shrink-0" />
                  <span>Every batch verified before it leaves our kitchen.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Text & Values */}
          <div className="lg:col-span-6 space-y-6 sm:space-y-8">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] sm:tracking-[0.22em] text-brand-700 mb-3 sm:mb-4"
              >
                <span className="h-px w-6 sm:w-8 bg-brand-600/40" />
                <Leaf size={14} className="text-brand-600" />
                <span>Our Heritage & Sattvik Faith</span>
              </motion.div>

              <motion.h2
                className="text-3xl sm:text-5xl lg:text-6xl font-display font-black text-ink tracking-tighter leading-[1.05] [text-wrap:balance]"
              >
                {heading}
              </motion.h2>
            </div>

            <motion.div
              className="space-y-3 sm:space-y-4 text-ink-2 text-sm sm:text-lg leading-relaxed font-normal [text-wrap:pretty]"
            >
              {paragraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </motion.div>

            {/* Heritage Values Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
              {values.slice(0, 4).map((val, i) => {
                const Icon = valueIcons[i % valueIcons.length];
                return (
                  <div key={i} className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-ink-soft hover:border-brand-500 transition-colors shadow-2xs">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-brand-700 text-white flex items-center justify-center mb-3 shadow-md">
                      <Icon size={18} />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-ink mb-0.5">{val.title}</h4>
                    <p className="text-xs text-ink-2 font-medium">{val.description}</p>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <div className="pt-2 sm:pt-4">
              <Link
                href="/products"
                className="group inline-flex items-center justify-between sm:justify-start gap-4 px-6 sm:pl-8 sm:pr-2 py-3.5 sm:py-2 rounded-xl sm:rounded-full bg-brand-700 hover:bg-brand-800 text-white font-extrabold text-xs sm:text-base transition-ui duration-300 shadow-xl shadow-brand-700/20 active:scale-[0.98] focus-ring w-full sm:w-auto"
              >
                <span>Explore 100% Jain Products</span>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white text-brand-700 flex items-center justify-center group-hover:translate-x-1 transition-transform shadow-md shrink-0">
                  <ArrowRight size={16} />
                </div>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
