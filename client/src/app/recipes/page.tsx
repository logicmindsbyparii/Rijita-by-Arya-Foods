"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock, ChefHat, Users, UtensilsCrossed, ArrowRight } from "lucide-react";
import { contentApi } from "@/lib/api";
import { cn, getImageUrl, handleImageError } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Recipe } from "@/types";

// GSAP Imports
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const DIFFICULTIES = ["all", "easy", "medium", "hard"] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const difficultyConfig: Record<string, { label: string; class: string }> = {
  easy: { label: "Easy", class: "bg-brand-50 text-brand-700 border border-brand-200/60" },
  medium: { label: "Medium", class: "bg-gold-50 text-gold-700 border border-gold-200/60" },
  hard: { label: "Hard", class: "bg-ink/5 text-ink border border-ink/10" },
};

export default function RecipesPage() {
  const [activeDifficulty, setActiveDifficulty] = useState<string>("all");
  const gridRef = useRef<HTMLDivElement>(null);

  const queryParams = useMemo(
    () => ({
      ...(activeDifficulty !== "all" && { difficulty: activeDifficulty }),
    }),
    [activeDifficulty]
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["recipes", queryParams],
    queryFn: () => contentApi.getRecipes(queryParams),
  });

  const recipes: Recipe[] = data?.data?.recipes || data?.data || [];

  // GSAP: Staggered card reveal on scroll
  useGSAP(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll(".recipe-card");
    if (cards.length === 0) return;

    gsap.fromTo(
      cards,
      { opacity: 0, y: 40, scale: 0.97 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        stagger: 0.07,
        ease: "power2.out",
        scrollTrigger: {
          trigger: gridRef.current,
          start: "top 85%",
        },
      }
    );
  }, { scope: gridRef });

  return (
    <div className="min-h-screen pt-36 sm:pt-40 lg:pt-48 pb-32 relative overflow-hidden bg-paper">
      {/* Background Textures and Blurs */}
      <div className="absolute inset-0 bg-[radial-gradient(#1b5e2008_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gold-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-brand-500/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Editorial Noise Background */}
      <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="max-w-4xl mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-3 px-4 py-2 border border-brand-500/20 rounded-full bg-brand-500/5 backdrop-blur-md mb-8">
              <ChefHat size={14} className="text-brand-600 animate-pulse" />
              <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">
                Our Kitchen Stories
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-black text-brand-950 tracking-[-0.02em] leading-[1.06] sm:leading-[1.02] mb-6">
              Our Journal <span className="text-gold-600 font-serif italic font-medium block mt-2"> &amp; Recipes.</span>
            </h1>
            <p className="text-ink-2 max-w-2xl text-lg sm:text-xl font-medium leading-relaxed [text-wrap:pretty]">
              Discover culinary inspiration, quick snack ideas, and traditional recipes crafted around our pure Jain snacks and sweets.
            </p>
          </motion.div>
        </div>

        {/* Difficulty Filters - Segmented Glass Control */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 sm:mb-16 flex"
        >
          <div className="bg-white/80 border border-white/50 backdrop-blur-xl p-1.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-1 flex-wrap">
            {DIFFICULTIES.map((d) => {
              const isActive = activeDifficulty === d;
              return (
                <button
                  key={d}
                  onClick={() => setActiveDifficulty(d)}
                  className={cn(
                    "px-6 py-2.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest transition-all duration-300 focus-ring",
                    isActive
                      ? "bg-brand-700 text-white shadow-[0_8px_20px_rgba(20,82,24,0.15)]"
                      : "text-ink-2 hover:bg-brand-50/50 hover:text-brand-700"
                  )}
                >
                  {d === "all" ? "All Levels" : d}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-4 bg-white/40 border border-white/20 p-6 rounded-[2rem] shadow-sm">
                <Skeleton className="aspect-[16/10] rounded-[1.5rem]" />
                <div className="space-y-3 pt-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-5 pt-3">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="text-center py-24 bg-white/40 border border-white/20 rounded-[2rem] max-w-2xl mx-auto shadow-sm p-8">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
              <ChefHat size={28} className="text-red-500" />
            </div>
            <h3 className="text-2xl font-display font-black mb-2 text-ink">Failed to load recipes</h3>
            <p className="text-ink-2 mb-8 max-w-sm mx-auto">
              {(error as any)?.message || "Something went wrong"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-brand-700 text-white rounded-full font-black text-sm uppercase tracking-widest hover:bg-brand-800 transition-all shadow-[0_8px_20px_rgba(20,82,24,0.15)] active:scale-[0.98]"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && recipes.length === 0 && (
          <div className="text-center py-24 bg-white/40 border border-white/20 rounded-[2rem] max-w-2xl mx-auto shadow-sm p-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white flex items-center justify-center border border-brand-100 shadow-sm">
              <UtensilsCrossed size={32} className="text-brand-700" />
            </div>
            <h3 className="text-2xl font-display font-black mb-2 text-ink">No recipes found</h3>
            <p className="text-ink-2 mb-8 max-w-md mx-auto">
              {activeDifficulty !== "all"
                ? `No ${activeDifficulty} recipes available yet. Try a different difficulty filter.`
                : "No recipes available yet. Check back soon!"}
            </p>
            {activeDifficulty !== "all" && (
              <button
                onClick={() => setActiveDifficulty("all")}
                className="px-8 py-4 bg-brand-700 text-white rounded-full font-black text-sm uppercase tracking-widest hover:bg-brand-800 transition-all shadow-[0_8px_20px_rgba(20,82,24,0.15)] active:scale-[0.98]"
              >
                View All Recipes
              </button>
            )}
          </div>
        )}

        {/* Recipe Grid */}
        {!isLoading && !isError && recipes.length > 0 && (
          <motion.div
            ref={gridRef}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {recipes.map((recipe) => {
              const diff = recipe.difficulty as string;
              const style = difficultyConfig[diff] || difficultyConfig.easy;
              return (
                <motion.div key={recipe._id} variants={cardVariants} className="h-full">
                  <Link
                    href={`/recipes/${recipe.slug}`}
                    className="recipe-card group block h-full rounded-[2rem] border border-white/60 bg-white/70 backdrop-blur-xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-brand-200 transition-all duration-500 overflow-hidden flex flex-col relative"
                  >
                    {/* Ambient Glow Backplate on Hover */}
                    <div className="absolute inset-0 bg-brand-500/5 rounded-full blur-3xl pointer-events-none transition-opacity opacity-0 group-hover:opacity-100 duration-700" />

                    {/* Image Area */}
                    <div className="aspect-[16/10] bg-brand-50 overflow-hidden relative border-b border-white/50">
                      {recipe.featuredImage ? (
                        <Image
                          src={getImageUrl(recipe.featuredImage)}
                          alt={recipe.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
                          className="object-cover scale-105 group-hover:scale-110 transition-transform duration-1000 ease-out"
                          onError={handleImageError}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UtensilsCrossed size={40} className="text-gold-400 group-hover:scale-110 transition-transform duration-700 ease-out" />
                        </div>
                      )}
                      {/* Dark overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                      
                      {/* Difficulty badge */}
                      <div className="absolute top-4 left-4 z-10">
                        <span className={cn(style.class, "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm bg-white/90 backdrop-blur-md inline-block")}>
                          {style.label}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 sm:p-8 flex flex-col flex-grow relative z-10">
                      <h3 className="text-xl sm:text-2xl font-display font-black text-brand-950 mb-2 group-hover:text-brand-700 transition-colors duration-300 line-clamp-2 leading-snug">
                        {recipe.title}
                      </h3>
                      <p className="text-sm text-ink-2 font-medium leading-relaxed line-clamp-2 mb-6">
                        {recipe.description}
                      </p>
                      
                      {/* Meta and details */}
                      <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-ink-3 uppercase tracking-wider border-t border-brand-100/50 pt-5 mt-auto">
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} className="text-gold-500" />
                          {recipe.prepTime} min prep
                        </span>
                        <span className="flex items-center gap-1.5">
                          <ChefHat size={13} className="text-gold-500" />
                          {recipe.cookTime} min cook
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users size={13} className="text-gold-500" />
                          {recipe.servings} serving{recipe.servings !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Read Recipe action */}
                      <span className="inline-flex items-center gap-2 text-brand-700 font-extrabold text-[11px] uppercase tracking-[0.2em] mt-5">
                        View recipe
                        <ArrowRight size={13} className="group-hover:translate-x-1.5 transition-transform duration-300" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
