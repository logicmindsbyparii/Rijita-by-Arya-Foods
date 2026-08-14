"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  X,
  Package,
  Sparkles,
  ChevronRight,
  Layers,
  ArrowRight,
} from "lucide-react";
import { categoryApi } from "@/lib/api";
import { Category } from "@/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const emojiMap: Record<string, string> = {
  namkeen: "🥜",
  snacks: "🍿",
  sweets: "🍬",
  "festival-specials": "🎊",
  "jain-food": "🌿",
  "gift-packs": "🎁",
  "ready-to-eat": "🍛",
  "spices-masala": "🌶️",
  traditional: "🏺",
};

function CategoryCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

function CategoryCard({ category, index }: { category: Category; index: number }) {
  const emoji = emojiMap[category.slug] || "📦";
  const productCount = category.productCount ?? 0;

  return (
    <motion.div variants={cardVariants}>
      <Link
        href={`/products?category=${category.slug}`}
        className="group block bg-white rounded-2xl border border-border overflow-hidden card-hover"
      >
        <div className="aspect-[4/3] bg-gradient-to-br from-brand-50 via-cream to-amber-50 relative overflow-hidden">
          {category.image ? (
            <Image
              src={category.image}
              alt={category.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl md:text-7xl transition-transform duration-500 group-hover:scale-110">
                {emoji}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-bold text-lg group-hover:text-brand-600 transition-colors">
              {category.name}
            </h3>
            <ChevronRight
              size={18}
              className="text-muted-foreground group-hover:text-brand-500 group-hover:translate-x-1 transition-ui"
            />
          </div>
          <div className="flex items-center gap-2">
            <Package size={13} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {productCount} {productCount === 1 ? "product" : "products"}
            </span>
          </div>
          {category.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {category.description}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.getCategories(),
  });

  const categories: Category[] = useMemo(() => {
    return data?.data?.categories || [];
  }, [data]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        (cat.description && cat.description.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  return (
    <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-100 rounded-full text-brand-700 text-sm font-medium mb-4">
            <Layers size={16} />
            Browse Categories
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">
            All <span className="text-brand-600">Categories</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Explore our wide range of premium snack categories. From traditional
            namkeen to festival specials, find the perfect taste for every occasion.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="relative max-w-md mb-10"
        >
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            aria-label="Search categories"
            className="w-full pl-12 pr-10 py-4 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-ui text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-muted rounded-full"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <Package size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Failed to load categories</h3>
            <p className="text-muted-foreground mb-4">Something went wrong. Please try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Search size={36} className="text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No categories found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              We couldn&apos;t find any categories matching &ldquo;{searchQuery}&rdquo;.
              Try a different search term.
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="px-6 py-2 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-colors"
            >
              Clear Search
            </button>
          </motion.div>
        )}

        {/* Categories Grid */}
        {!isLoading && !isError && filtered.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filtered.map((category, i) => (
              <CategoryCard key={category._id} category={category} index={i} />
            ))}
          </motion.div>
        )}

        {/* Result Count */}
        {!isLoading && !isError && filtered.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-muted-foreground mt-8 text-center"
          >
            Showing {filtered.length} of {categories.length} categories
          </motion.p>
        )}
      </div>
    </div>
  );
}
