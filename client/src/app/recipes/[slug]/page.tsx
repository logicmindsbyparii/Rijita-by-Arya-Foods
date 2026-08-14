"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Clock,
  ChefHat,
  Users,
  Check,
  ArrowLeft,
  Package,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import Image from "next/image";
import { contentApi } from "@/lib/api";
import { cn, formatPrice, getImageUrl, handleImageError } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Recipe, Product } from "@/types";

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const difficultyConfig: Record<string, { label: string; class: string }> = {
  easy: { label: "Easy", class: "bg-green-100 text-green-700" },
  medium: { label: "Medium", class: "bg-amber-100 text-amber-700" },
  hard: { label: "Hard", class: "bg-red-100 text-red-700" },
};

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["recipe", slug],
    queryFn: () => contentApi.getRecipeBySlug(slug),
    enabled: !!slug,
  });

  const recipe: Recipe | undefined = data?.data?.recipe || data?.data;
  const diff = recipe ? (recipe.difficulty as string) : "easy";
  const diffStyle = difficultyConfig[diff] || difficultyConfig.easy;

  if (isLoading) {
    return <RecipeDetailSkeleton />;
  }

  if (isError) {
    const is404 = (error as any)?.status === 404;
    return (
      <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          {is404 ? (
            <>
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-brand-50 flex items-center justify-center">
                <Package size={44} className="text-brand-500" />
              </div>
              <h1 className="text-2xl font-display font-bold mb-2">Recipe Not Found</h1>
              <p className="text-muted-foreground mb-8">
                The recipe you are looking for does not exist or may have been removed.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => router.back()} variant="outline" size="lg">
                  Go Back
                </Button>
                <Button onClick={() => router.push("/recipes")} size="lg">
                  Browse Recipes
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle size={44} className="text-red-500" />
              </div>
              <h1 className="text-2xl font-display font-bold mb-2">Something Went Wrong</h1>
              <p className="text-muted-foreground mb-8">
                {(error as any)?.message || "Failed to load recipe details."}
              </p>
              <Button onClick={() => router.refresh()} size="lg">
                <RefreshCw size={18} className="mr-2" />
                Try Again
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <Package size={44} className="text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">Recipe Not Found</h1>
          <p className="text-muted-foreground mb-8">This recipe could not be found.</p>
          <Button onClick={() => router.push("/recipes")} size="lg">Browse Recipes</Button>
        </div>
      </div>
    );
  }

  const relatedProducts = (recipe.products?.filter(
    (p): p is Product => typeof p === "object" && p !== null
  ) || []) as Product[];

  return (
    <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-muted-foreground mb-6 pt-4"
        >
          <Link href="/" className="hover:text-brand-600 transition-colors">
            Home
          </Link>
          <ChevronRight size={14} />
          <Link href="/recipes" className="hover:text-brand-600 transition-colors">
            Recipes
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium truncate max-w-[250px]">
            {recipe.title}
          </span>
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            href="/recipes"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-600 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Recipes
          </Link>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-10"
        >
          <motion.div variants={fadeInUp} className="space-y-6">
            <div className="aspect-[2/1] rounded-2xl bg-gradient-to-br from-brand-50 via-cream to-amber-50 overflow-hidden relative flex items-center justify-center">
              {recipe.featuredImage ? (
                <Image
                  src={getImageUrl(recipe.featuredImage)}
                  alt={recipe.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"
                  className="object-cover"
                  onError={handleImageError}
                />
              ) : (
                <span className="text-7xl select-none">🍽️</span>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
            </div>

            <div>
              <Badge className={cn("mb-4", diffStyle.class)}>{diffStyle.label}</Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold leading-tight mb-4">
                {recipe.title}
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">{recipe.description}</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50">
                <Clock size={18} className="text-brand-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Prep Time</p>
                  <p className="text-sm font-semibold">{recipe.prepTime} mins</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50">
                <ChefHat size={18} className="text-brand-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Cook Time</p>
                  <p className="text-sm font-semibold">{recipe.cookTime} mins</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50">
                <Users size={18} className="text-brand-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Servings</p>
                  <p className="text-sm font-semibold">{recipe.servings}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <h2 className="text-2xl font-display font-bold mb-4">Ingredients</h2>
            <div className="bg-muted/30 border border-border rounded-2xl p-6">
              <ul className="space-y-4">
                {recipe.ingredients.map((ingredient, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span className="mt-0 w-4 h-4 rounded-full border-2 border-brand-500 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-brand-500" />
                    </span>
                    <span className="text-foreground">{ingredient}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <h2 className="text-2xl font-display font-bold mb-4">Instructions</h2>
            <div className="space-y-6">
              {recipe.instructions.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <span className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 pt-2">
                    <p className="text-foreground leading-relaxed">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {relatedProducts.length > 0 && (
            <motion.div variants={fadeInUp}>
              <h2 className="text-2xl font-display font-bold mb-4">Products Used in This Recipe</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedProducts.map((product) => {
                  const price = product.variants?.[0]?.sellingPrice || 0;
                  const mrp = product.variants?.[0]?.mrp || 0;
                  return (
                    <Link
                      key={product._id}
                      href={`/products/${product.slug}`}
                      className="flex items-center gap-4 p-4 rounded-xl border border-border bg-white hover:shadow-md hover:border-brand-200 transition-ui duration-300 group"
                    >
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-brand-50 to-amber-50 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        <Package size={28} className="text-brand-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium group-hover:text-brand-600 transition-colors line-clamp-2">
                          {product.name}
                        </p>
                        <p className="text-sm font-bold text-brand-600 mt-0 tabular-nums">
                          {formatPrice(price)}
                          {mrp > price && (
                            <span className="text-xs text-muted-foreground line-through ml-2 font-normal tabular-nums">
                              {formatPrice(mrp)}
                            </span>
                          )}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}

          {recipe.tags?.length > 0 && (
            <motion.div variants={fadeInUp}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-4 py-2 bg-muted text-muted-foreground rounded-full text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function RecipeDetailSkeleton() {
  return (
    <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 mb-6 pt-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-6">
          <Skeleton className="aspect-[2/1] rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-16 w-32 rounded-xl" />
            <Skeleton className="h-16 w-32 rounded-xl" />
            <Skeleton className="h-16 w-32 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
