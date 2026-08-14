"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock, ChefHat, Users, UtensilsCrossed } from "lucide-react";
import { contentApi } from "@/lib/api";
import { cn, getImageUrl, handleImageError } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Recipe } from "@/types";

const DIFFICULTIES = ["all", "easy", "medium", "hard"] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const difficultyConfig: Record<string, { label: string; class: string }> = {
  easy: { label: "Easy", class: "bg-green-100 text-green-700" },
  medium: { label: "Medium", class: "bg-amber-100 text-amber-700" },
  hard: { label: "Hard", class: "bg-red-100 text-red-700" },
};

export default function RecipesPage() {
  const [activeDifficulty, setActiveDifficulty] = useState<string>("all");

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

  return (
    <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Recipes</h1>
          <p className="text-muted-foreground max-w-2xl">
            Discover delicious recipes made with our premium traditional Indian ingredients.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-8"
        >
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setActiveDifficulty(d)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-ui",
                activeDifficulty === d
                  ? "bg-brand-500 text-white shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {d === "all" ? "All" : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </motion.div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[4/3] rounded-2xl" />
                <div className="space-y-2 p-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-4 pt-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <ChefHat size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Failed to load recipes</h3>
            <p className="text-muted-foreground mb-4">
              {(error as any)?.message || "Something went wrong"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {!isLoading && !isError && recipes.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <UtensilsCrossed size={36} className="text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No recipes found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {activeDifficulty !== "all"
                ? `No ${activeDifficulty} recipes available yet. Try a different difficulty level.`
                : "No recipes available yet. Check back soon!"}
            </p>
            {activeDifficulty !== "all" && (
              <button
                onClick={() => setActiveDifficulty("all")}
                className="px-6 py-2 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-colors"
              >
                View All Recipes
              </button>
            )}
          </div>
        )}

        {!isLoading && !isError && recipes.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {recipes.map((recipe) => {
              const diff = recipe.difficulty as string;
              const style = difficultyConfig[diff] || difficultyConfig.easy;
              return (
                <motion.div key={recipe._id} variants={cardVariants}>
                  <Link
                    href={`/recipes/${recipe.slug}`}
                    className="group block rounded-2xl border border-border bg-white hover:shadow-lg transition-ui duration-300 overflow-hidden"
                  >
                    <div className="aspect-[4/3] bg-gradient-to-br from-brand-50 to-amber-50 overflow-hidden relative flex items-center justify-center">
                      {recipe.featuredImage ? (
                        <Image
                          src={getImageUrl(recipe.featuredImage)}
                          alt={recipe.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={handleImageError}
                        />
                      ) : (
                        <span className="text-5xl select-none group-hover:scale-110 transition-transform duration-500">
                          🍽️
                        </span>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <div className="p-4">
                      <Badge className={cn("mb-4", style.class)}>{style.label}</Badge>
                      <h3 className="text-lg font-display font-semibold mb-2 group-hover:text-brand-600 transition-colors line-clamp-2">
                        {recipe.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {recipe.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <Clock size={14} />
                          {recipe.prepTime} min prep
                        </span>
                        <span className="flex items-center gap-2">
                          <ChefHat size={14} />
                          {recipe.cookTime} min cook
                        </span>
                        <span className="flex items-center gap-2">
                          <Users size={14} />
                          {recipe.servings} servings
                        </span>
                      </div>
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
