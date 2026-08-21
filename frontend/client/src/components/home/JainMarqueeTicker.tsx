"use client";

import { Leaf, ShieldCheck, Flame, Sparkles, Heart } from "lucide-react";

const TICKER_ITEMS = [
  { text: "100% PURE JAIN GUARANTEE", icon: Leaf },
  { text: "ZERO ONION • ZERO GARLIC", icon: ShieldCheck },
  { text: "PURE GROUNDNUT OIL FRYING", icon: Flame },
  { text: "SENDHA NAMAK • REAL HING", icon: Sparkles },
  { text: "SMALL BATCH HALWAI CRAFT", icon: Heart },
  { text: "FSSAI CERTIFIED • PAN-INDIA SHIPPING", icon: ShieldCheck },
];

export default function JainMarqueeTicker() {
  return (
    <div className="relative py-2.5 sm:py-4 bg-gold-500/10 border-y border-gold-500/30 text-brand-800 overflow-hidden select-none z-20">
      {/* Subtle gold dot texture — breaks the flat surface */}
      <div className="absolute inset-0 bg-[radial-gradient(#B8893012_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-gold-500/10 via-transparent to-gold-500/10 pointer-events-none" />
      {/* Hairline accents top/bottom for depth */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gold-500/40" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gold-500/40" />
      <div className="relative flex w-max animate-marquee">
        {/* Render twice for seamless infinite scrolling loop */}
        {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="flex items-center gap-4 mx-6 shrink-0">
              <Icon size={14} className="text-gold-600" />
              <span className="text-xs sm:text-sm font-bold tracking-[0.18em] uppercase text-brand-800/90">
                {item.text}
              </span>
              <span className="text-gold-500/50 text-xs ml-4">✦</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
