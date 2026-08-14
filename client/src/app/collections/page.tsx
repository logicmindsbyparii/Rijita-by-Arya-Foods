"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Package, Sparkles, ChevronRight } from "lucide-react";
import { contentApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Collection } from "@/types";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function CollectionsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["collections"],
    queryFn: () => contentApi.getCollections(),
  });

  const collections: Collection[] = data?.data?.collections || data?.data || [];

  return (
    <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-12 rounded-2xl bg-gradient-to-br from-brand-500 to-spice-gold p-8 md:p-12 text-white overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <Sparkles size={32} className="mb-4 opacity-80" />
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">Our Collections</h1>
            <p className="text-white/80 max-w-2xl text-lg">
              Explore our thoughtfully curated collections featuring the finest traditional Indian
              snacks, sweets, and pantry essentials. Each collection tells a story of taste and
              tradition.
            </p>
          </div>
        </motion.div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[4/3] rounded-2xl" />
                <div className="space-y-2 p-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <Package size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Failed to load collections</h3>
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

        {!isLoading && !isError && collections.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Package size={36} className="text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No collections yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              We&apos;re curating our collections. Check back soon!
            </p>
          </div>
        )}

        {!isLoading && !isError && collections.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {collections.map((collection) => {
              const productCount = Array.isArray(collection.products)
                ? collection.products.length
                : 0;
              return (
                <motion.div key={collection._id} variants={cardVariants}>
                  <Link
                    href={`/collections/${collection.slug}`}
                    className="group block rounded-2xl border border-border bg-white hover:shadow-xl transition-ui duration-500 overflow-hidden"
                  >
                    <div className="aspect-[4/3] bg-gradient-to-br from-brand-50 to-amber-50 overflow-hidden relative flex items-center justify-center">
                      <span className="text-6xl select-none group-hover:scale-110 transition-transform duration-500">
                        🎁
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-white">
                          Explore Collection
                          <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-xl font-display font-semibold mb-2 group-hover:text-brand-600 transition-colors">
                        {collection.name}
                      </h3>
                      {collection.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {collection.description}
                        </p>
                      )}
                      <span className="inline-flex items-center gap-2 text-xs font-medium text-brand-600 bg-brand-50 px-4 py-2 rounded-full">
                        <Package size={12} />
                        {productCount} {productCount === 1 ? "Product" : "Products"}
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
