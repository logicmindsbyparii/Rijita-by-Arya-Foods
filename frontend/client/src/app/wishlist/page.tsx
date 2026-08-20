"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Heart, Trash2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api";
import { formatPrice, getImageUrl, getPrimaryVariant } from "@/lib/utils";
import { Product } from "@/types";

export default function WishlistPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, updateUser } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/auth/login");
  }, [authLoading, isAuthenticated, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => authApi.getWishlist(),
    enabled: isAuthenticated,
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => authApi.toggleWishlist(productId),
    onSuccess: (data) => {
      // toggleWishlist returns the updated string-ID list — mirror it into the
      // auth context so ProductCard hearts everywhere reflect the removal
      // without a re-login.
      const updatedList = data?.data?.wishlist;
      if (Array.isArray(updatedList)) {
        updateUser({ wishlist: updatedList });
      }
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });

  const items: Product[] = data?.data?.wishlist || [];

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-cream pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-display font-bold mb-8">My Wishlist</h1>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <Heart size={48} className="mx-auto text-stone-300 mb-4" />
            <p className="text-stone-500 mb-4">Your wishlist is empty</p>
            <Link
              href="/products"
              className="inline-block px-6 py-2 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {items.map((product) => (
              <div key={product._id} className="bg-white rounded-xl border p-4 relative group">
                <Link href={`/products/${product.slug}`}>
                  <div className="aspect-square relative mb-2 rounded-lg overflow-hidden bg-stone-100">
                    <Image
                      src={getImageUrl(product.images?.[0])}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <p className="text-sm font-medium line-clamp-2 mb-2">{product.name}</p>
                  <p className="text-sm font-bold text-brand-600 tabular-nums">{formatPrice(getPrimaryVariant(product.variants)?.sellingPrice ?? 0)}</p>
                </Link>
                <button
                  onClick={() => removeMutation.mutate(product._id)}
                  className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow transition-opacity hover:bg-red-50"
                  aria-label="Remove from wishlist"
                >
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
