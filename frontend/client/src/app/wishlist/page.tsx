"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Heart } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api";
import { Product } from "@/types";
import ProductCard from "@/components/products/ProductCard";

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
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
