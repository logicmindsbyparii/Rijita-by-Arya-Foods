"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Star, ArrowRight, BadgeCheck, MessageSquareQuote } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HomeReview {
  id: string;
  name: string;
  rating: number;
  comment: string;
  title?: string;
  productName?: string;
  createdAt: string;
}

export interface ReviewSummary {
  average: number;
  count: number;
}

const monthYear = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : monthYear.format(d);
}

function Stars({ rating, size }: { rating: number; size: number }) {
  return (
    <div className="flex items-center gap-1" role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          aria-hidden="true"
          className={i < rating ? "fill-gold-500 text-gold-500" : "fill-ink-faint text-ink-faint"}
        />
      ))}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      aria-hidden="true"
      className="w-10 h-10 rounded-full flex items-center justify-center font-black text-xs tracking-wide shrink-0 bg-brand-50 text-brand-700 border border-brand-100 shadow-sm"
    >
      {initials || "·"}
    </div>
  );
}

export default function TestimonialsSection({
  reviews = [],
  summary,
}: {
  reviews?: HomeReview[];
  summary?: ReviewSummary;
}) {
  if (reviews.length === 0) return null;

  return (
    <section className="py-24 sm:py-32 md:py-48 bg-paper-2 text-ink relative overflow-hidden border-t border-ink-faint">

      {/* Editorial Noise Background */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header Area */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 mb-16 sm:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl space-y-6"
          >
            <div className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-brand-700">
              <MessageSquareQuote size={16} />
              <span>Community Voices</span>
            </div>

            <h2 className="text-[clamp(2rem,8vw,4rem)] sm:text-6xl lg:text-7xl font-display font-black text-ink tracking-[-0.02em] leading-[1.06] sm:leading-[1.02] [text-wrap:balance]">
              Trusted by <br className="hidden sm:inline" /> purists.
            </h2>

            <p className="text-ink-2 text-lg sm:text-xl font-medium max-w-xl [text-wrap:pretty]">
              Authentic feedback from our community. Every review is verified and strictly moderated to ensure genuine experiences.
            </p>
          </motion.div>

          {summary && summary.count > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex items-center gap-6 bg-white p-6 rounded-3xl border border-ink-soft shadow-sm shrink-0"
            >
              <div className="flex flex-col items-center">
                <span className="text-4xl font-black tabular-nums leading-none text-brand-700">{summary.average.toFixed(1)}</span>
              </div>
              <div className="h-12 w-px bg-ink-faint" />
              <div className="flex flex-col items-start gap-1">
                <Stars rating={Math.round(summary.average)} size={18} />
                <span className="text-xs font-bold text-ink-3 uppercase tracking-widest">
                  Based on {summary.count} reviews
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Masonry Wall */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 sm:gap-8 space-y-6 sm:space-y-8">
          {reviews.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="break-inside-avoid bg-white rounded-[2rem] p-6 sm:p-8 border border-ink-soft shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-brand-200 transition-all duration-500 group flex flex-col"
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <Stars rating={r.rating} size={16} />
                <span className="text-[10px] font-black text-ink-3 uppercase tracking-widest bg-paper-2 px-2.5 py-1 rounded-md">
                  {formatDate(r.createdAt)}
                </span>
              </div>

              {r.title && (
                <h4 className="font-bold text-ink text-lg mb-2">{r.title}</h4>
              )}

              <blockquote className="text-ink-2 text-[15px] sm:text-lg font-medium leading-relaxed mb-6 sm:mb-8 flex-grow [text-wrap:pretty]">
                &ldquo;{r.comment}&rdquo;
              </blockquote>

              <div className="flex items-center gap-4 pt-6 border-t border-ink-faint mt-auto">
                <Avatar name={r.name} />
                <div>
                  <p className="font-bold text-ink text-sm flex items-center gap-1.5">
                    {r.name}
                    <BadgeCheck size={14} className="text-brand-500" aria-label="Verified review" />
                  </p>
                  {r.productName ? (
                    <p className="text-xs font-bold text-brand-600 mt-0.5 line-clamp-1">{r.productName}</p>
                  ) : (
                    <p className="text-xs font-semibold text-ink-3 mt-0.5">Verified Buyer</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Inline CTA Block inserted into the masonry wall */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="break-inside-avoid bg-brand-900 rounded-[2rem] p-6 sm:p-10 flex flex-col items-start relative overflow-hidden group shadow-lg"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <MessageSquareQuote size={120} className="rotate-12 translate-x-8 -translate-y-8 group-hover:rotate-0 transition-transform duration-700" />
            </div>
            <div className="relative z-10 w-full">
              <h3 className="text-2xl sm:text-3xl font-display font-black text-white mb-3 sm:mb-4 leading-tight">Your voice matters.</h3>
              <p className="text-brand-200 font-medium mb-6 sm:mb-8 text-base sm:text-lg">Experience our 100% Jain purity and let us know your thoughts.</p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-gold-500 text-brand-900 px-8 py-4 rounded-xl font-bold hover:bg-gold-400 transition-colors focus-ring active:scale-95"
              >
                Shop the Collection
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
