"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Calendar, ChefHat, Clock, User, Users } from "lucide-react";
import { cn, formatDate, getImageUrl, handleImageError } from "@/lib/utils";
import { NAMKEEN_IMAGES } from "@/lib/namkeen-images";
import type { Blog, Recipe } from "@/types";

/**
 * Homepage "Stories & Recipes" — editorial journal preview. Pulls the latest
 * published blog posts and recipes and arranges them in an asymmetric grid:
 * one large featured story, a column of recipe cards, then a row of compact
 * story cards. Renders nothing when there is no content.
 */

const STORY_FALLBACKS = [
  NAMKEEN_IMAGES.bhujiaShop,
  NAMKEEN_IMAGES.chakli,
  NAMKEEN_IMAGES.mixture,
];

const RECIPE_FALLBACKS = [
  NAMKEEN_IMAGES.chivda,
  NAMKEEN_IMAGES.mathri,
  NAMKEEN_IMAGES.sev,
  NAMKEEN_IMAGES.laddu,
];

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-brand-600/10 text-brand-700 border-brand-600/25",
  medium: "bg-gold-500/10 text-gold-700 border-gold-600/30",
  hard: "bg-red-50 text-red-600 border-red-500/25",
};

function storyImage(blog: Blog, index: number) {
  const fallback = STORY_FALLBACKS[index % STORY_FALLBACKS.length];
  return {
    src: blog.featuredImage ? getImageUrl(blog.featuredImage) : fallback,
    onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
      const target = e.currentTarget;
      if (target.src !== fallback) target.src = fallback;
      else handleImageError(e);
    },
  };
}

function recipeImage(recipe: Recipe, index: number) {
  const fallback = RECIPE_FALLBACKS[index % RECIPE_FALLBACKS.length];
  return {
    src: recipe.featuredImage ? getImageUrl(recipe.featuredImage) : fallback,
    onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
      const target = e.currentTarget;
      if (target.src !== fallback) target.src = fallback;
      else handleImageError(e);
    },
  };
}

export default function StoriesRecipesSection({
  blogs = [],
  recipes = [],
}: {
  blogs?: Blog[];
  recipes?: Recipe[];
}) {
  if (blogs.length === 0 && recipes.length === 0) return null;

  const featured = blogs[0];
  const secondary = blogs.slice(1, 3);
  const hasFeatured = !!featured;

  return (
    <section className="relative py-16 sm:py-24 lg:py-32 bg-paper text-ink border-t border-ink-faint overflow-hidden">
      {/* Dotted texture — house editorial background */}
      <div className="absolute inset-0 bg-[radial-gradient(#1b5e2010_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gold-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header — left-aligned heading, right-aligned journal link */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-12 sm:mb-20">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-3 px-4 py-2 border border-brand-500/20 rounded-full bg-brand-500/5 backdrop-blur-md mb-8"
            >
              <BookOpen size={14} className="text-brand-600" />
              <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">
                From the Journal
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(2.5rem,8vw,6rem)] sm:text-5xl md:text-7xl lg:text-[6rem] font-display font-black text-ink tracking-[-0.02em] leading-[1.06] sm:leading-[1.02] [text-wrap:balance]"
            >
              Stories &{" "}
              <span className="text-gold-600 font-serif italic font-medium block mt-2">
                Recipes.
              </span>
            </motion.h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="shrink-0"
          >
            <Link href="/blog" className="group inline-flex items-center gap-4 focus-ring rounded-full">
              <span className="text-sm sm:text-base font-extrabold uppercase tracking-widest text-ink-2 group-hover:text-brand-700 transition-colors">
                Read the Journal
              </span>
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-brand-600 text-white flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 shadow-xl shadow-brand-900/20 shrink-0">
                <ArrowRight size={22} />
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Asymmetric editorial grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Featured story — large photographic card */}
          {featured && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7"
            >
              <FeaturedStoryCard blog={featured} index={0} />
            </motion.div>
          )}

          {/* Recipe cards — compact horizontal column */}
          {recipes.length > 0 && (
            <div
              className={cn(
                "flex flex-col gap-6 sm:gap-8",
                hasFeatured ? "lg:col-span-5" : "lg:col-span-12"
              )}
            >
              {recipes
                .slice(0, hasFeatured ? 2 : 3)
                .map((recipe, i) => (
                  <motion.div
                    key={recipe._id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <RecipeCard recipe={recipe} index={i} />
                  </motion.div>
                ))}
            </div>
          )}

          {/* Secondary stories — compact row */}
          {secondary.length > 0 && (
            <div
              className={cn(
                "flex overflow-x-auto snap-x snap-mandatory no-scrollbar pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:gap-8 lg:col-span-12 gap-5",
                hasFeatured ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"
              )}
            >
              {secondary.map((blog, i) => (
                <motion.div
                  key={blog._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className="w-[85vw] sm:w-auto shrink-0 snap-center sm:snap-align-none"
                >
                  <CompactStoryCard blog={blog} index={i + 1} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── Cards ─────────────────────────────────────────────────────────── */

function FeaturedStoryCard({ blog, index }: { blog: Blog; index: number }) {
  const img = storyImage(blog, index);

  return (
    <Link
      href={`/blog/${blog.slug}`}
      className="group relative block w-full min-h-[320px] sm:min-h-[420px] lg:min-h-[540px] rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden bg-brand-900 shadow-[0_30px_60px_-15px_rgba(5,20,8,0.18)] focus-ring"
    >
      <Image
        src={img.src}
        alt={blog.title}
        fill
        sizes="(max-width: 1024px) 100vw, 58vw"
        className="object-cover opacity-90 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-1000 ease-out"
        onError={img.onError}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-950/90 via-brand-950/25 to-transparent pointer-events-none" />

      <div className="absolute top-4 sm:top-6 left-4 sm:left-6 flex items-center gap-2 flex-wrap">
        {blog.category && (
          <span className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-brand-700 text-[10px] sm:text-xs font-extrabold uppercase tracking-widest shadow-sm">
            {blog.category}
          </span>
        )}
        <span className="px-3 py-1.5 rounded-full bg-gold-500 text-brand-950 text-[10px] sm:text-xs font-extrabold uppercase tracking-widest shadow-sm">
          Featured Story
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-10 z-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] sm:text-xs font-bold text-white/70 uppercase tracking-wider mb-3 sm:mb-4">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={13} />
            {formatDate(blog.publishedAt || blog.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <User size={13} />
            {blog.author}
          </span>
        </div>

        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-display font-black text-white leading-[1.05] tracking-tight [text-wrap:balance] group-hover:-translate-y-1 transition-transform duration-500">
          {blog.title}
        </h3>

        {blog.excerpt && (
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-white/80 font-medium leading-relaxed line-clamp-2 max-w-xl [text-wrap:pretty]">
            {blog.excerpt}
          </p>
        )}

        <span className="mt-5 sm:mt-6 inline-flex items-center gap-3 text-white font-extrabold text-xs sm:text-sm uppercase tracking-widest">
          Read the story
          <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gold-400 text-brand-950 flex items-center justify-center group-hover:translate-x-1.5 group-hover:bg-white transition-all duration-300 shadow-lg shrink-0">
            <ArrowRight size={16} />
          </span>
        </span>
      </div>
    </Link>
  );
}

function RecipeCard({ recipe, index }: { recipe: Recipe; index: number }) {
  const img = recipeImage(recipe, index);
  const diff = (recipe.difficulty || "easy").toLowerCase();
  const diffStyle = DIFFICULTY_STYLES[diff] || DIFFICULTY_STYLES.easy;
  const totalMinutes = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className="group flex flex-col sm:flex-row items-stretch gap-0 sm:gap-5 bg-white border border-ink-soft rounded-2xl sm:rounded-3xl overflow-hidden hover:border-brand-500/50 hover:shadow-[0_20px_50px_-20px_rgba(27,110,42,0.25)] transition-all duration-300 focus-ring"
    >
      <div className="relative w-full sm:w-44 h-48 sm:h-auto shrink-0 overflow-hidden bg-brand-50">
        <Image
          src={img.src}
          alt={recipe.title}
          fill
          sizes="(max-width: 640px) 100vw, 11rem"
          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          onError={img.onError}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="flex flex-col justify-center p-5 sm:py-5 sm:pl-0 sm:pr-6 min-w-0">
        <span
          className={cn(
            "inline-flex self-start items-center gap-1 px-2 py-1 rounded-md border text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest mb-2",
            diffStyle
          )}
        >
          <ChefHat size={11} className="shrink-0" />
          {diff.charAt(0).toUpperCase() + diff.slice(1)}
        </span>

        <h4 className="text-sm sm:text-lg font-display font-bold text-ink leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors [text-wrap:balance]">
          {recipe.title}
        </h4>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 sm:mt-3 text-[10px] sm:text-xs font-bold text-ink-3">
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            {totalMinutes > 0 ? `${totalMinutes} min` : "Quick"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users size={12} />
            {recipe.servings} servings
          </span>
        </div>
      </div>
    </Link>
  );
}

function CompactStoryCard({ blog, index }: { blog: Blog; index: number }) {
  const img = storyImage(blog, index);

  return (
    <Link
      href={`/blog/${blog.slug}`}
      className="group flex flex-col h-full bg-white border border-ink-soft rounded-2xl sm:rounded-3xl overflow-hidden hover:border-brand-500/50 hover:shadow-[0_20px_50px_-20px_rgba(27,110,42,0.25)] transition-all duration-300 focus-ring"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-brand-50">
        <Image
          src={img.src}
          alt={blog.title}
          fill
          sizes="(max-width: 1024px) 100vw, 45vw"
          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          onError={img.onError}
        />
        {blog.category && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md text-brand-700 text-[10px] font-extrabold uppercase tracking-widest shadow-sm">
            {blog.category}
          </span>
        )}
      </div>

      <div className="p-5 sm:p-6 flex flex-col flex-1">
        <div className="flex items-center gap-3 text-[10px] sm:text-xs font-bold text-ink-3 uppercase tracking-wider mb-2">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={12} />
            {formatDate(blog.publishedAt || blog.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <User size={12} />
            {blog.author}
          </span>
        </div>

        <h3 className="text-base sm:text-lg font-display font-bold text-ink leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors [text-wrap:balance]">
          {blog.title}
        </h3>

        {blog.excerpt && (
          <p className="mt-2 text-xs sm:text-sm text-ink-2 font-medium leading-relaxed line-clamp-2">
            {blog.excerpt}
          </p>
        )}

        <span className="mt-auto pt-4 inline-flex items-center gap-2 text-brand-700 font-extrabold text-[11px] sm:text-xs uppercase tracking-widest group-hover:gap-3 transition-all">
          Read story
          <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}
