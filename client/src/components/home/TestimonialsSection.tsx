"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Star, ShieldCheck, ArrowRight } from "lucide-react";

export interface HomeReview {
  id: string;
  name: string;
  rating: number;
  comment: string;
  title?: string;
  productName?: string;
  /** ISO date string from the API */
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
    <div className="flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          aria-hidden="true"
          className={i < rating ? "fill-gold-500 text-gold-500" : "text-ink-faint"}
        />
      ))}
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
  // No approved reviews yet — the section has nothing honest to say, so it
  // doesn't render. It reappears the moment a review clears moderation.
  if (reviews.length === 0) return null;

  const [featured, ...rest] = reviews;

  return (
    <section className="py-16 sm:py-24 lg:py-32 bg-paper-2 text-ink relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header — one orchestrated entrance for the whole block */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-10 sm:mb-16 space-y-3 sm:space-y-4"
        >
          <div className="inline-flex items-center gap-2 sm:gap-4 text-xs font-bold uppercase tracking-[0.18em] sm:tracking-[0.22em] text-brand-700">
            <span className="h-px w-6 sm:w-10 bg-brand-600/40" />
            <ShieldCheck size={14} className="text-brand-600 shrink-0" aria-hidden="true" />
            <span>Customer Reviews</span>
            <span className="h-px w-6 sm:w-10 bg-brand-600/40" />
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black text-ink tracking-tighter leading-[1.05] [text-wrap:balance]">
            What our customers say.
          </h2>

          <p className="text-ink-2 text-sm sm:text-lg font-medium [text-wrap:pretty]">
            Every review below was left by a verified purchaser and approved before publishing.
          </p>

          {/* Real aggregate — only rendered when there is one */}
          {summary && summary.count > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 pt-2">
              <Stars rating={Math.round(summary.average)} size={16} />
              <span className="text-sm font-bold text-ink tabular-nums">
                {summary.average.toFixed(1)} / 5.0
              </span>
              <span className="text-xs text-ink-3 tabular-nums">
                from {summary.count} {summary.count === 1 ? "review" : "reviews"}
              </span>
            </div>
          )}
        </motion.div>

        {/* Review wall — asymmetric: featured quote + cards + CTA tile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

          {/* Featured review — dark brand tile spanning two rows */}
          <div className="md:row-span-2 bg-brand-800 border border-gold-500/25 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden text-white">
            <div className="absolute inset-0 bg-[radial-gradient(#D4A54514_1px,transparent_1px)] [background-size:18px_18px] pointer-events-none" />

            <div className="relative z-10">
              <div className="mb-4">
                <Stars rating={featured.rating} size={15} />
              </div>
              {featured.title && (
                <h3 className="text-base font-bold text-gold-500 mb-2">{featured.title}</h3>
              )}
              <blockquote className="text-xl sm:text-2xl font-display text-white/95 leading-relaxed [text-wrap:pretty]">
                &ldquo;{featured.comment}&rdquo;
              </blockquote>
            </div>

            <figcaption className="relative z-10 pt-5 border-t border-white/10 mt-6 not-italic">
              <p className="text-sm font-bold text-white">{featured.name}</p>
              {featured.productName && (
                <p className="text-xs text-emerald-200/80 font-semibold mt-1">
                  on {featured.productName}
                </p>
              )}
              <p className="text-xs text-white/60 font-medium mt-1">{formatDate(featured.createdAt)}</p>
            </figcaption>
          </div>

          {/* Remaining reviews */}
          {rest.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-ink-soft rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-4 shadow-[0_16px_40px_-24px_rgba(26,20,10,0.2)]"
            >
              <div>
                <div className="mb-3">
                  <Stars rating={r.rating} size={13} />
                </div>
                {r.title && (
                  <h3 className="text-sm font-bold text-ink mb-1.5">{r.title}</h3>
                )}
                <p className="text-sm text-ink-2 leading-relaxed">
                  &ldquo;{r.comment}&rdquo;
                </p>
              </div>

              <div className="pt-3 border-t border-ink-faint space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-ink tracking-wide">{r.name}</p>
                  <span className="text-xs text-ink-3 shrink-0">{formatDate(r.createdAt)}</span>
                </div>
                {r.productName && (
                  <p className="text-xs text-ink-3 font-semibold">
                    on <span className="text-ink-2">{r.productName}</span>
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* CTA tile — closes the wall */}
          <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col justify-between bg-gold-500 text-brand-800 shadow-[0_16px_40px_-24px_rgba(26,20,10,0.35)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(#0F42180d_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
            <div className="relative z-10">
              <div className="w-9 h-9 rounded-xl bg-brand-800/10 flex items-center justify-center mb-3">
                <Star size={18} className="fill-brand-800 text-brand-800" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-black leading-snug [text-wrap:balance]">
                Tried us already? Leave a review.
              </h3>
              <p className="text-sm font-semibold mt-2 opacity-80">
                Order fresh and add your voice to this wall.
              </p>
            </div>
            <Link
              href="/products"
              className="relative z-10 inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl bg-brand-800 text-white text-sm font-bold whitespace-nowrap transition-[background-color,gap] duration-short ease-out-custom hover:bg-brand-900 group-hover:gap-3 focus-ring"
            >
              Shop 100% Jain
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
