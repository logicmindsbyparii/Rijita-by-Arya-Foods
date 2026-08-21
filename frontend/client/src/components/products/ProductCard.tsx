"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, ShoppingBag, Heart } from "lucide-react";
import toast from "react-hot-toast";
import { calculateDiscount, formatPrice, cn, getImageUrl, getPrimaryVariant } from "@/lib/utils";
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

  // Clicking the card navigates away mid-animation, so the add-to-cart feedback
  // timers below can outlive the component and set state on an unmounted card.
  const feedbackTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const timers = feedbackTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

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

  const primaryVariant = getPrimaryVariant(product.variants);
  const discount = primaryVariant
    ? calculateDiscount(primaryVariant.mrp, primaryVariant.sellingPrice)
    : 0;

  // Prefer the display weight string ("500 g") when present — it's what the
  // admin enters as the human-readable label. Fall back to weightValue+unit so
  // cards never render a raw "10g" when the fields disagree.
  const weightLabel = primaryVariant?.weight
    ? String(primaryVariant.weight).trim()
    : primaryVariant
      ? `${primaryVariant.weightValue ?? ""}${primaryVariant.weightUnit ?? ""}`.trim()
      : "";

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
    feedbackTimers.current.push(
      setTimeout(() => {
        setIsAdding(false);
        setJustAdded(true);
        feedbackTimers.current.push(setTimeout(() => setJustAdded(false), 800));
      }, 400)
    );
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

  const activeBadges: { label: string; tone: string }[] = [];
  if (product.isNewArrival) activeBadges.push({ label: "New", tone: "quiet" });
  if (product.isBestSeller) activeBadges.push({ label: "Best Seller", tone: "quiet" });
  if (discount > 0) activeBadges.push({ label: `${discount}% Off`, tone: "gold" });

  return (
    <div className="h-full flex">
      {/*
        The card is a plain container, not an <a>. The wishlist and add-to-cart
        controls are real <button>s, and nesting a button inside an anchor is
        invalid HTML that breaks keyboard and screen-reader navigation. Instead
        the anchor is a stretched overlay (below) that covers the card, with the
        two buttons stacked above it.
      */}
      <div
        className="group flex flex-col w-full h-full bg-paper rounded-[2rem] shadow-sm hover:shadow-[0_30px_60px_-20px_rgba(10,41,15,0.12)] border border-rule/50 hover:border-brand-200/50 overflow-hidden transition-all duration-700 ease-expo-out hover:-translate-y-2 relative focus-within:ring-2 focus-within:ring-brand-500"
      >
        {/* ── Image Container ── */}
        <div className="relative aspect-[4/5] bg-paper-3 overflow-hidden shrink-0">

          {/* Product image */}
          {product.images?.[0] && !imgError ? (
            <Image
              src={getImageUrl(product.images[0])}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-1200 ease-expo-out group-hover:scale-[1.08]"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center bg-paper-3 text-ink-faint"
              role="img"
              aria-label={product.name}
            >
              <div className="w-16 h-16 rounded-full bg-paper-2 border border-rule flex items-center justify-center shadow-sm mb-2">
                <ShoppingBag size={24} />
              </div>
            </div>
          )}

          {/* Top gradient on hover */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-ink/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-short ease-out-custom" />

          {/* Badges — top left, editorial: gold serif for OFF, quiet tracked caps otherwise */}
          {activeBadges.length > 0 && (
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 max-w-[calc(100%-3.5rem)]">
              {activeBadges.slice(0, 2).map((badge) => (
                <span
                  key={badge.label}
                  className={cn(
                    "w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-xl shadow-sm",
                    badge.tone === "gold"
                      ? "bg-gold-400 text-brand-950"
                      : "bg-white/90 text-brand-800"
                  )}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          )}

          {/* Wishlist Button - Improved touch target */}
          <button
            type="button"
            onClick={handleWishlist}
            disabled={toggleWishlistMutation.isPending}
            aria-pressed={!!isInWishlist}
            className={cn(
              "absolute top-2 right-2 sm:top-4 sm:right-4 z-30 w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-white/90 backdrop-blur-sm border border-white/60 flex items-center justify-center transition-[background-color,border-color] duration-short ease-out-custom shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] disabled:opacity-60",
              isInWishlist ? "bg-rose-50 border-rose-200" : "hover:bg-rose-50 hover:border-rose-200"
            )}
            aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              size={16}
              className={cn(
                "transition-colors duration-short ease-out-custom",
                isInWishlist ? "text-rose-500 fill-rose-500" : "text-ink-2 hover:text-rose-500"
              )}
            />
          </button>

          {/* Out of stock overlay - Diagonal stripe reveal */}
          {isOutOfStock && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              {/* Diagonal pattern overlay */}
              <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage: 'repeating-linear-gradient(-45deg, #1C1917, #1C1917 4px, transparent 4px, transparent 12px)',
                }}
              />
              <div className="absolute inset-0 bg-ink/20 flex items-center justify-center">
                <div className="relative">
                  {/* Diagonal strike-through bar */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[3px] bg-ink-3/60 rotate-[-18deg]" />
                  <span className="relative text-xs font-black text-white/90 tracking-[0.25em] uppercase drop-shadow-lg bg-ink/40 px-4 py-2 rounded-full backdrop-blur-sm">
                    Sold Out
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Content Area ── */}
        {/* Deliberately no z-index: a stacking context here would trap the
            add-to-cart button beneath the stretched link overlay. */}
        <div className="flex flex-col flex-1 p-4 sm:p-6 bg-paper relative">
          {/* Category tag */}
          {categoryName && (
            <p className="text-[10px] uppercase tracking-[0.25em] text-brand-600 font-black mb-2 opacity-80">
              {categoryName}
            </p>
          )}

          {/* Product name */}
          <h3 className="font-display font-black text-lg sm:text-xl leading-tight text-ink line-clamp-2 mb-2 [text-wrap:balance] group-hover:text-brand-800 transition-colors duration-500">
            {product.name}
          </h3>

          {/* Spacer */}
          <div className="flex-1 min-h-[8px]" />

          {/* Pricing row */}
          <div className="mt-2 pt-2 sm:mt-3 sm:pt-3 border-t border-ink-faint flex items-end justify-between gap-2">
            <div className="flex flex-col gap-0">
              {primaryVariant && (
                <>
                  {weightLabel && (
                    <span className="text-[11px] sm:text-xs text-ink-2 font-bold bg-paper-3 px-2 py-0 rounded-md inline-block w-fit tabular-nums">
                      {weightLabel}
                    </span>
                  )}
                  <div className="flex flex-wrap items-baseline gap-2 mt-0">
                    <span className="text-base sm:text-lg font-black text-brand-700 tabular-nums">
                      {formatPrice(primaryVariant.sellingPrice)}
                    </span>
                    {primaryVariant.mrp > primaryVariant.sellingPrice && (
                      <span className="text-xs text-ink-faint font-semibold line-through tabular-nums">
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
                <div className="flex items-center gap-1 bg-gold-500/10 border border-gold-500/25 px-2 py-0 rounded-lg">
                  <Star size={10} className="fill-gold-500 text-gold-500" />
                  <span className="text-xs font-bold text-gold-700 tabular-nums">
                    {product.averageRating?.toFixed(1)}
                  </span>
                </div>
                <span className="text-[11px] text-ink-3 font-medium tabular-nums">
                  ({product.reviewCount})
                </span>
              </div>
            )}
          </div>

          {/* Add to Cart Button — with high contrast CTA visual priority */}
          {!isOutOfStock && showAddToCart && primaryVariant && (
            <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-ink-faint relative z-30">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAdding || justAdded}
                className={cn(
                  "w-full h-12 rounded-full text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all duration-500 ease-expo-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 overflow-hidden relative",
                    isAdding || justAdded
                      ? "bg-brand-100 text-brand-800"
                      : "bg-brand-700 text-white hover:bg-brand-800 hover:shadow-lg hover:shadow-brand-900/20 hover:-translate-y-0.5 active:scale-95"
                )}
              >
                {/* Loading shimmer overlay */}
                {isAdding && (
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1s_ease-in-out_infinite]" />
                )}

                <span className="relative flex items-center gap-2">
                  {justAdded ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-800">
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

        {/* Stretched link: covers the whole card for click/keyboard navigation.
            Rendered last and at z-20 so it sits over the passive content, while
            the wishlist and add-to-cart buttons (z-30) stay clickable. */}
        <Link
          href={`/products/${product.slug}`}
          className="absolute inset-0 z-20 rounded-2xl focus:outline-none"
        >
          <span className="sr-only">View {product.name}</span>
        </Link>
      </div>
    </div>
  );
}
