"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, ShoppingBag, TrendingUp, Sparkles, Percent, Heart } from "lucide-react";
import toast from "react-hot-toast";
import { calculateDiscount, formatPrice, cn, getImageUrl } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Product } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api";

interface ProductCardProps {
  product: Product;
  index?: number;
  showAddToCart?: boolean;
}

export default function ProductCard({
  product,
  index = 0,
  showAddToCart = true,
}: ProductCardProps) {
  const { addItem } = useCart();
  const { user, isAuthenticated, updateUser } = useAuth();
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const queryClient = useQueryClient();

  const isInWishlist = isAuthenticated && user?.wishlist?.includes(product._id);

  const toggleWishlistMutation = useMutation({
    mutationFn: () => authApi.toggleWishlist(product._id),
    onSuccess: (data: any) => {
      // Update auth context React state + localStorage so the heart icon reflects immediately
      if (data?.data?.wishlist) {
        updateUser({ wishlist: data.data.wishlist });
      }
      // Refetch wishlist for any open wishlist pages
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
    onError: () => toast.error("Failed to update wishlist"),
  });

  const primaryVariant = product.variants?.[0];
  const discount = primaryVariant
    ? calculateDiscount(primaryVariant.mrp, primaryVariant.sellingPrice)
    : 0;

  const categoryName =
    typeof product.category === "object" ? product.category?.name : "";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!primaryVariant) {
      toast.error("No variant available");
      return;
    }
    if (primaryVariant.stock <= 0) {
      toast.error("Out of stock");
      return;
    }
    setIsAdding(true);
    addItem(product, primaryVariant, 1);
    setTimeout(() => {
      setIsAdding(false);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 800);
    }, 400);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Please login to save wishlist");
      router.push("/auth/login");
      return;
    }
    toggleWishlistMutation.mutate();
  };

  const isOutOfStock = primaryVariant && primaryVariant.stock <= 0;

  const activeBadges: { label: string; icon: React.ElementType; color: string }[] = [];
  if (product.isNewArrival) activeBadges.push({ label: "New", icon: Sparkles, color: "bg-emerald-500/80 text-white border border-white/20" });
  if (product.isBestSeller) activeBadges.push({ label: "Best Seller", icon: TrendingUp, color: "bg-amber-500/80 text-white border border-white/20" });
  if (discount > 0) activeBadges.push({ label: `${discount}% OFF`, icon: Percent, color: "bg-rose-500/80 text-white border border-white/20" });

  return (
    <div className="h-full flex">
      <Link
        href={`/products/${product.slug}`}
        className="group flex flex-col w-full h-full bg-white rounded-2xl border border-stone-100/80 overflow-hidden transition-[transform,box-shadow,border-color] duration-short ease-out-custom hover:shadow-lg hover:-translate-y-0.5 hover:border-stone-200 relative"
      >
        {/* ── Image Container ── */}
        <div className="relative aspect-[4/3] sm:aspect-[1/1] xl:aspect-[4/5] bg-stone-50 overflow-hidden shrink-0">

          {/* Product image */}
          {product.images?.[0] && !imgError ? (
            <Image
              src={getImageUrl(product.images[0])}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-long ease-out-custom"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center bg-stone-100/50 text-stone-300"
              role="img"
              aria-label={product.name}
            >
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-2">
                <ShoppingBag size={24} className="text-stone-300" />
              </div>
            </div>
          )}

          {/* Top gradient on hover */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-short ease-out-custom" />

          {/* Badges — top left, improved stacking */}
          {activeBadges.length > 0 && (
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-[calc(100%-3.5rem)]">
              {activeBadges.slice(0, 2).map((badge) => {
                const Icon = badge.icon;
                return (
                  <span
                    key={badge.label}
                    className={cn(
                      "text-xs font-bold px-2 py-2 rounded-full backdrop-blur-md flex items-center gap-2 tracking-wider uppercase shadow-lg",
                      badge.color
                    )}
                  >
                    <Icon size={10} />
                    {badge.label}
                  </span>
                );
              })}
              {/* Show remaining count as a compact indicator */}
              {activeBadges.length > 2 && (
                <span className="text-xs font-bold text-white/80 bg-black/40 backdrop-blur-sm px-2 py-0 rounded-full text-center">
                  +{activeBadges.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Wishlist Button - Improved touch target */}
          <button
            onClick={handleWishlist}
            className={cn(
              "absolute top-2 right-2 sm:top-4 sm:right-4 z-10 w-8 h-8 sm:w-8 sm:h-8 rounded-full bg-white/90 backdrop-blur-sm border border-white/60 flex items-center justify-center transition-[background-color,border-color] duration-short ease-out-custom shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]",
              isInWishlist ? "bg-rose-50 border-rose-200" : "hover:bg-rose-50 hover:border-rose-200"
            )}
            aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              size={16}
              className={cn(
                "transition-colors duration-short ease-out-custom",
                isInWishlist ? "text-rose-500 fill-rose-500" : "text-stone-500 hover:text-rose-500"
              )}
            />
          </button>

          {/* Out of stock overlay - Diagonal stripe reveal */}
          {isOutOfStock && (
            <div className="absolute inset-0 z-20">
              {/* Diagonal pattern overlay */}
              <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage: 'repeating-linear-gradient(-45deg, #000, #000 4px, transparent 4px, transparent 12px)',
                }}
              />
              <div className="absolute inset-0 bg-stone-900/20 flex items-center justify-center">
                <div className="relative">
                  {/* Diagonal strike-through bar */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[3px] bg-stone-800/60 rotate-[-18deg]" />
                  <span className="relative text-xs font-black text-white/90 tracking-[0.25em] uppercase drop-shadow-lg bg-stone-900/40 px-4 py-2 rounded-full backdrop-blur-sm">
                    Sold Out
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Content Area ── */}
        <div className="flex flex-col flex-1 p-2 sm:p-4 xl:p-4 bg-white relative z-10">
          {/* Category tag */}
          {categoryName && (
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600 font-extrabold mb-2">
              {categoryName}
            </p>
          )}

          {/* Product name */}
          <h3 className="font-display font-bold text-xs sm:text-sm leading-snug text-stone-900 group-hover:text-brand-600 transition-colors line-clamp-2 mb-2">
            {product.name}
          </h3>

          {/* Spacer */}
          <div className="flex-1 min-h-[8px]" />

          {/* Pricing row */}
          <div className="mt-2 pt-2 sm:mt-4 sm:pt-4 border-t border-stone-100/80 flex items-end justify-between gap-2">
            <div className="flex flex-col gap-0">
              {primaryVariant && (
                <>
                  <span className="text-xs sm:text-[13px] text-stone-700 font-bold bg-stone-100/90 px-2 py-0 rounded-full inline-block w-fit tabular-nums">
                    {primaryVariant.weightValue}{primaryVariant.weightUnit}
                  </span>
                  <div className="flex flex-wrap items-baseline gap-2 mt-0">
                    <span className="text-sm sm:text-base font-black text-brand-600 tabular-nums">
                      {formatPrice(primaryVariant.sellingPrice)}
                    </span>
                    {primaryVariant.mrp > primaryVariant.sellingPrice && (
                      <span className="text-xs text-stone-400 font-semibold line-through tabular-nums">
                        {formatPrice(primaryVariant.mrp)}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Ratings */}
            {(product.averageRating > 0 || product.reviewCount > 0) && (
              <div className="flex flex-col items-end gap-0 shrink-0">
                <div className="flex items-center gap-0 bg-amber-50 border border-amber-200 px-2 py-0 rounded-lg">
                  <Star size={9} className="fill-amber-500 text-amber-500" />
                  <span className="text-xs font-bold text-amber-800 tabular-nums">
                    {product.averageRating?.toFixed(1)}
                  </span>
                </div>
                <span className="text-xs text-stone-600 font-medium">
                  ({product.reviewCount})
                </span>
              </div>
            )}
          </div>

          {/* Add to Cart Button — with high contrast CTA visual priority */}
          {!isOutOfStock && showAddToCart && primaryVariant && (
            <div className="mt-2 sm:mt-2 pt-2 sm:pt-2 border-t border-stone-100">
              <button
                onClick={handleAddToCart}
                disabled={isAdding || justAdded}
                className={cn(
                  "w-full h-8 sm:h-10 rounded-lg sm:rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-ui duration-short ease-out-custom focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 overflow-hidden relative shadow-sm",
                    isAdding || justAdded
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-400"
                      : "bg-brand-600 text-white hover:bg-brand-700 hover:shadow-md active:scale-[0.98]"
                )}
              >
                {/* Loading shimmer overlay */}
                {isAdding && (
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1s_ease-in-out_infinite]" />
                )}

                <span className="relative flex items-center gap-2">
                  {justAdded ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Added</span>
                    </>
                  ) : isAdding ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                      </svg>
                      <span>Adding…</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={14} />
                      <span>Add to Cart</span>
                    </>
                  )}
                </span>
              </button>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
