"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { contentApi } from "@/lib/api";
import { cn, getImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/products/ProductCard";
import type { Collection, Product } from "@/types";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

function CollectionSkeleton() {
  return (
    <div className="min-h-screen pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-4 w-40 mb-8" />
        <Skeleton className="h-48 md:h-64 rounded-2xl mb-8" />
        <Skeleton className="h-8 w-1/2 mb-4" />
        <Skeleton className="h-4 w-2/3 mb-10" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["collection", slug],
    queryFn: () => contentApi.getCollectionBySlug(slug),
    enabled: !!slug,
  });

  const collection: Collection | undefined = data?.data?.collection || data?.data;
  const products = (collection?.products || []).filter(
    (p): p is Product => typeof p === "object" && p !== null
  );

  if (isLoading) {
    return <CollectionSkeleton />;
  }

  if (isError) {
    const is404 = (error as any)?.status === 404;
    return (
      <div className="min-h-screen pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          {is404 ? (
            <>
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-brand-50 flex items-center justify-center">
                <Package size={44} className="text-brand-500" />
              </div>
              <h1 className="text-2xl font-display font-bold mb-2">Collection Not Found</h1>
              <p className="text-muted-foreground mb-8">
                The collection you are looking for does not exist or may have been removed.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => router.back()} variant="outline" size="lg">
                  Go Back
                </Button>
                <Button onClick={() => router.push("/collections")} size="lg">
                  Browse Collections
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
                {(error as any)?.message || "Failed to load collection details."}
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

  if (!collection) {
    return (
      <div className="min-h-screen pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <Package size={44} className="text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">Collection Not Found</h1>
          <p className="text-muted-foreground mb-8">This collection could not be found.</p>
          <Button onClick={() => router.push("/collections")} size="lg">
            Browse Collections
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-muted-foreground mb-6"
        >
          <Link href="/" className="hover:text-brand-600 transition-colors">
            Home
          </Link>
          <ChevronRight size={14} />
          <Link href="/collections" className="hover:text-brand-600 transition-colors">
            Collections
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium truncate max-w-[250px]">
            {collection.name}
          </span>
        </motion.nav>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl overflow-hidden mb-10 min-h-[280px] md:min-h-[350px]"
        >
          {collection.image ? (
            <Image
              src={getImageUrl(collection.image)}
              alt={collection.name}
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-50 to-amber-50">
              <span className="text-7xl select-none">🎁</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur text-white text-xs font-medium mb-3">
              <Sparkles size={14} />
              Collection
            </div>
            <h1 className="text-[clamp(2rem,8vw,3.5rem)] md:text-5xl font-display font-bold mb-2 md:mb-3 drop-shadow leading-[1.1]">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-white/90 max-w-2xl text-sm md:text-base leading-relaxed">
                {collection.description}
              </p>
            )}
            <p className="mt-4 text-white/80 text-sm">
              {products.length} {products.length === 1 ? "product" : "products"}
            </p>
          </div>
        </motion.div>

        {/* Products */}
        {products.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {products.map((product, i) => (
              <ProductCard key={product._id} product={product} index={i} />
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Package size={36} className="text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No products in this collection yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              We&apos;re adding products to this collection. Check back soon!
            </p>
            <Button onClick={() => router.push("/products")} size="lg">
              Browse All Products
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
