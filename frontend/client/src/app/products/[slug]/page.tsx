"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Thumbs, FreeMode, Navigation } from "swiper/modules";
import type SwiperType from "swiper";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/navigation";
import "swiper/css/thumbs";
import {
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  Truck,
  Shield,
  Leaf,
  Heart,
  Share2,
  Package,
  Info,
  Apple,
  Percent,
  MessageSquare,
  Check,
  AlertTriangle,
  ChevronLeft,
  X,
  Camera,
  Box,
  RotateCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { productApi, contentApi } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { cn, formatPrice, calculateDiscount, generateWhatsAppUrl, handleImageError, getImageUrl, PLACEHOLDER_IMAGE, getPrimaryVariant } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/products/ProductCard";
import type { Product, Variant, Review } from "@/types";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { addItem } = useCart();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "nutrition" | "ingredients" | "reviews">("description");
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [justAddedToCart, setJustAddedToCart] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => productApi.getProductBySlug(slug!),
    enabled: !!slug,
  });

  // Free-delivery threshold comes from admin Settings — never hardcoded, so the
  // badge stays truthful when the store changes the threshold.
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => contentApi.getSiteSettings(),
    staleTime: 10 * 60 * 1000,
  });
  const freeShippingThreshold = settingsData?.data?.settings?.shipping?.freeShippingThreshold ?? 499;
  const whatsappNumber = settingsData?.data?.settings?.whatsapp?.number || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210";

  const product: Product | undefined = data?.data?.product || data?.data;

  const selectedVariant: Variant | undefined = product?.variants?.[selectedVariantIndex];

  const discount = selectedVariant
    ? calculateDiscount(selectedVariant.mrp, selectedVariant.sellingPrice)
    : 0;

  const { data: reviewsData } = useQuery({
    queryKey: ["reviews", product?._id],
    queryFn: () => contentApi.getProductReviews(product!._id),
    enabled: !!product?._id,
  });

  const allReviews: Review[] = reviewsData?.data?.reviews || reviewsData?.data || [];
  const [reviewPage, setReviewPage] = useState(1);
  const reviewsPerPage = 5;
  const reviews = allReviews.slice(0, reviewPage * reviewsPerPage);
  const hasMoreReviews = reviews.length < allReviews.length;

  const { data: relatedData } = useQuery({
    queryKey: ["products", "related", product?.category],
    queryFn: () =>
      productApi.getProducts({
        category: typeof product?.category === "object" ? product?.category?.slug : "",
        limit: 8,
      }),
    enabled: !!product?.category,
  });

  const relatedProducts =
    relatedData?.data?.products?.filter((p: Product) => p._id !== product?._id) || [];

  const reviewMutation = useMutation({
    mutationFn: (data: { productId: string; rating: number; title?: string; comment: string }) =>
      contentApi.createReview(data),
    onSuccess: () => {
      toast.success("Review submitted! It will appear once approved by our team.");
      setReviewForm({ rating: 5, title: "", comment: "" });
      queryClient.invalidateQueries({ queryKey: ["reviews", product?._id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit review");
    },
  });

  // Scroll detection for sticky mobile bar
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setQuantity(1);
  }, [selectedVariantIndex]);

  // Land on a variant the customer can actually buy. The index defaulted to 0,
  // so a product whose first pack was sold out (or deactivated) opened with a
  // disabled "Add to Cart" and an out-of-stock notice, even when its other
  // sizes were in stock. Keyed on the product id so a background refetch does
  // not stomp a selection the customer has since made.
  useEffect(() => {
    const variants = product?.variants;
    if (!variants?.length) return;
    const preferred = getPrimaryVariant(variants);
    const idx = preferred ? variants.indexOf(preferred) : -1;
    if (idx > -1) setSelectedVariantIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?._id]);

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;
    if (selectedVariant.stock <= 0) {
      toast.error("This variant is out of stock");
      return;
    }
    setIsAddingToCart(true);
    addItem(product, selectedVariant, quantity);
    setTimeout(() => {
      setIsAddingToCart(false);
      setJustAddedToCart(true);
      setTimeout(() => setJustAddedToCart(false), 1000);
    }, 400);
  };

  const handleWhatsAppOrder = () => {
    if (!product || !selectedVariant) return;
    const message = `Hi! I'd like to order:\n\n${product.name}\n${selectedVariant.weight}\n${formatPrice(selectedVariant.sellingPrice)} x ${quantity}\n\nTotal: ${formatPrice(selectedVariant.sellingPrice * quantity)}\n\nPlease share the payment details. Thank you!`;
    window.open(generateWhatsAppUrl(message, whatsappNumber), "_blank");
  };

  const handleSubmitReview = async () => {
    if (!product) return;
    if (!isAuthenticated) {
      toast.error("Please login to leave a review");
      return;
    }
    if (!reviewForm.comment.trim()) {
      toast.error("Please write a review comment");
      return;
    }
    setSubmittingReview(true);
    try {
      await reviewMutation.mutateAsync({
        productId: product._id,
        rating: reviewForm.rating,
        title: reviewForm.title || undefined,
        comment: reviewForm.comment,
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: product?.shortDescription || product?.description,
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  /**
   * Human-readable weight label — the admin's display string ("500 g") wins,
   * falling back to value+unit so a missing display string never renders as
   * a raw "500g". Mirrors ProductCard's weightLabel logic.
   */
  const weightLabel = (v: Variant | undefined) =>
    v?.weight?.trim() || (v ? `${v.weightValue ?? ""}${v.weightUnit ?? ""}`.trim() : "");

  /**
   * Price per unit for the "per g / per 100g" hint. formatPrice() rounds to
   * whole rupees, so a direct sellingPrice/weightValue division renders "₹0"
   * for small units (₹90 / 500g = ₹0.18 → "₹0 per g"). Indian retail convention
   * is per-100g for gram packs, per-kg for kg packs — pick the right denominator
   * and keep enough decimals to never show ₹0.
   */
  const unitPriceLabel = (v: Variant | undefined) => {
    if (!v || !v.sellingPrice || !v.weightValue || v.weightValue <= 0) return "";
    if (v.weightUnit === "kg") {
      const perKg = v.sellingPrice / (v.weightValue / 1000);
      return `${formatPrice(perKg)} per kg`;
    }
    if (v.weightUnit === "g" && v.weightValue >= 100) {
      const per100 = (v.sellingPrice / v.weightValue) * 100;
      return `${formatPrice(per100)} per 100g`;
    }
    // Small packs — show the exact unit price with 2 decimals, never ₹0.
    const perUnit = v.sellingPrice / v.weightValue;
    const formatted =
      perUnit >= 1
        ? formatPrice(perUnit)
        : `₹${perUnit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `${formatted} per ${v.weightUnit || "unit"}`;
  };

  const nutritionFields = [
    { key: "calories", label: "Calories", unit: "kcal" },
    { key: "protein", label: "Protein", unit: "g" },
    { key: "totalFat", label: "Total Fat", unit: "g" },
    { key: "saturatedFat", label: "Saturated Fat", unit: "g" },
    { key: "transFat", label: "Trans Fat", unit: "g" },
    { key: "cholesterol", label: "Cholesterol", unit: "mg" },
    { key: "sodium", label: "Sodium", unit: "mg" },
    { key: "totalCarbohydrates", label: "Total Carbs", unit: "g" },
    { key: "dietaryFiber", label: "Dietary Fiber", unit: "g" },
    { key: "sugars", label: "Sugars", unit: "g" },
  ];

  if (isLoading) {
    return (
<div className="min-h-dvh pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="space-y-4">
              <Skeleton className="aspect-square rounded-2xl" />
              <div className="flex gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-20 rounded-xl" />
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-dvh pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle size={36} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Product Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The product you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-4 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors"
          >
            <ChevronLeft size={16} />
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  const categoryName =
    typeof product.category === "object" ? product.category?.name : "";
  const categorySlug =
    typeof product.category === "object" ? product.category?.slug : "";

  return (
    <div className="min-h-dvh pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <motion.nav
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-muted-foreground mb-8 flex-wrap"
        >
          <Link href="/" className="hover:text-brand-600 transition-colors">
            Home
          </Link>
          <ChevronRight size={14} />
          <Link href="/products" className="hover:text-brand-600 transition-colors">
            Products
          </Link>
          {categoryName && (
            <>
              <ChevronRight size={14} />
              <Link
                href={`/products?category=${categorySlug}`}
                className="hover:text-brand-600 transition-colors"
              >
                {categoryName}
              </Link>
            </>
          )}
          <ChevronRight size={14} />
          <span className="text-foreground font-medium truncate max-w-[200px]">
            {product.name}
          </span>
        </motion.nav>

        {/* Main Product Section */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 mb-20">
          {/* ── Image Gallery ── */}
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="lg:sticky lg:top-28 self-start"
          >
            <div className="relative">
              {/* Discount badge */}
              {discount > 0 && (
                <div className="absolute top-4 left-4 z-20 px-4 py-2 bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2">
                  <Percent size={11} />
                  {discount}% OFF
                </div>
              )}

                  {/* Main swiper — click to open lightbox */}
                  <div
                    className="rounded-2xl overflow-hidden bg-gradient-to-br from-paper-2 via-gold-500/10 to-paper-3 aspect-square cursor-zoom-in group relative"
                    onClick={(e) => {
                      // Don't open lightbox when clicking navigation arrows
                      if ((e.target as HTMLElement).closest(".swiper-button-prev, .swiper-button-next, .swiper-button-lock")) return;
                      const swiperEl = document.querySelector(".product-main-swiper .swiper-slide-active");
                      const idx = swiperEl ? Number(swiperEl.getAttribute("data-swiper-slide-index") || "0") : 0;
                      setLightboxIndex(idx);
                      setLightboxOpen(true);
                    }}
                  >
                    <Swiper
                      modules={[Thumbs, FreeMode, Navigation]}
                      navigation
                      thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
                      className="h-full w-full product-main-swiper"
                      onSlideChange={(s) => {
                        setLightboxIndex(s.realIndex);
                      }}
                    >
                      {(product.images?.length > 0 ? product.images : [""]).map(
                        (img, i) => (
                          <SwiperSlide key={i} data-swiper-slide-index={i}>
                            <div className="relative aspect-square w-full h-full">
                              <Image
                                src={img ? getImageUrl(img) : PLACEHOLDER_IMAGE}
                                alt={`${product.name} - Image ${i + 1}`}
                                fill
                                sizes="(max-width: 1024px) 100vw, 50vw"
                                className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                                priority={i === 0}
                                onError={handleImageError}
                              />
                            </div>
                          </SwiperSlide>
                        )
                      )}
                    </Swiper>

                    {/* Zoom hint */}
                    <div className="absolute bottom-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shadow-sm">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="11" y1="8" x2="11" y2="14" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                      </svg>
                    </div>
                  </div>

                  {/* Thumbnails */}
                  {product.images && product.images.length > 1 && (
                    <div className="mt-4">
                      <Swiper
                        onSwiper={setThumbsSwiper}
                        modules={[FreeMode]}
                        spaceBetween={8}
                        slidesPerView={4.5}
                        freeMode
                        watchSlidesProgress
                        className="!ml-0"
                      >
                        {product.images.map((img, i) => (
                          <SwiperSlide key={i}>
                            <div
                              className={cn(
                                "relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-ui",
                                "opacity-60 hover:opacity-100 [&.swiper-slide-thumb-active]:opacity-100 [&.swiper-slide-thumb-active]:border-[var(--color-brand)]"
                              )}
                            >
                              <Image
                                src={getImageUrl(img)}
                                alt={`${product.name} thumbnail ${i + 1}`}
                                fill
                                sizes="80px"
                                className="object-cover"
                              />
                            </div>
                          </SwiperSlide>
                        ))}
                      </Swiper>
                    </div>
                  )}
            </div>
          </motion.div>

          {/* Product Info */}
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {categoryName && (
              <Link
                href={`/products?category=${categorySlug}`}
                className="text-xs uppercase tracking-wider text-brand-600 hover:text-brand-700 font-medium"
              >
                {categoryName}
              </Link>
            )}

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-ink tracking-tight leading-tight [text-wrap:balance]">
              {product.name}
            </h1>

            {/* Rating — hidden until a genuine rating/review exists */}
            {(product.averageRating > 0 || product.reviewCount > 0) && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={cn(
                      i < Math.round(product.averageRating || 0)
                        ? "fill-gold-500 text-gold-500"
                        : "fill-ink-faint text-ink-faint"
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-medium tabular-nums text-ink-2">{product.averageRating?.toFixed(1)}</span>
              <span className="text-sm text-ink-3">
                ({product.reviewCount || 0} review{product.reviewCount === 1 ? "" : "s"})
              </span>
              {product.totalSold > 0 && (
                <span className="text-xs text-ink-2 bg-paper-3 px-2 py-2 rounded-lg">
                  {product.totalSold}+ sold
                </span>
              )}
            </div>
            )}

            {/* A description that merely repeats the product name (common in
                early catalogue data) is not content — don't render it as one. */}
            {product.shortDescription &&
              product.shortDescription.trim().toLowerCase() !== product.name.trim().toLowerCase() && (
              <p className="text-muted-foreground leading-relaxed">
                {product.shortDescription}
              </p>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-4">
              <span className="text-3xl sm:text-4xl font-black text-ink tabular-nums">
                {formatPrice(selectedVariant?.sellingPrice || 0)}
              </span>
              {selectedVariant && selectedVariant.mrp > selectedVariant.sellingPrice && (
                <>
                  <span className="text-xl text-ink-3 line-through tabular-nums">
                    {formatPrice(selectedVariant.mrp)}
                  </span>
                  <span className="font-serif italic text-gold-600 text-base tabular-nums">
                    Save {formatPrice(selectedVariant.mrp - selectedVariant.sellingPrice)}
                  </span>
                </>
              )}
            </div>

            {/* ── Variant Selector ── */}
            {product.variants && product.variants.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-ink-2">
                    Select Weight
                  </label>
                  {unitPriceLabel(selectedVariant) && (
                    <span className="text-xs text-ink-3 tabular-nums">
                      {unitPriceLabel(selectedVariant)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant, index) => {
                    // Deactivated variants are not orderable — place_order
                    // rejects them outright — so offering one here only led the
                    // customer to a failure at checkout. Skipped rather than
                    // disabled: an unbuyable pack is not a choice at all.
                    if (variant.isActive === false) return null;
                    const isActive = index === selectedVariantIndex;
                    const isInStock = variant.stock > 0;
                    const variantDiscount = calculateDiscount(variant.mrp, variant.sellingPrice);
                    const savings = variant.mrp - variant.sellingPrice;
                    return (
                      <button
                        key={variant._id || index}
                        onClick={() => {
                          if (isInStock) {
                            setSelectedVariantIndex(index);
                            setLightboxIndex(0); // Reset gallery on variant change
                          }
                        }}
                        disabled={!isInStock}
                        className={cn(
                          "relative flex flex-col items-center px-4 py-4 rounded-xl border-2 transition-ui min-w-[90px]",
                          isActive
                            ? "border-brand-600 bg-brand-600/5 shadow-sm"
                            : isInStock
                            ? "border-rule hover:border-gold-500/60 bg-paper-2"
                            : "border-rule bg-paper-3 opacity-50 cursor-not-allowed"
                        )}
                      >
                        {/* Weight label — display string when present (matches ProductCard) */}
                        <span className="text-sm font-bold text-ink">
                          {weightLabel(variant)}
                        </span>

                        {/* Price */}
                        <div className="flex items-baseline gap-2 mt-0 tabular-nums">
                          <span className={cn("text-xs font-bold", isActive ? "text-[var(--color-brand)]" : "text-ink-2")}>
                            {formatPrice(variant.sellingPrice)}
                          </span>
                          {variant.mrp > variant.sellingPrice && (
                            <span className="text-xs text-ink-3 line-through tabular-nums">
                              {formatPrice(variant.mrp)}
                            </span>
                          )}
                        </div>

                        {/* Discount or OOS badge */}
                        {isInStock && variantDiscount > 0 && (
                          <span className="absolute -top-2 -right-2 px-2 py-0 bg-gold-500 text-brand-950 text-xs font-bold rounded-md leading-none tabular-nums">
                            Save {formatPrice(savings)}
                          </span>
                        )}
                        {!isInStock && (
                          <span className="absolute -top-2 -right-2 px-2 py-0 bg-ink text-paper text-[10px] font-bold rounded-md leading-none uppercase tracking-wide">
                            Sold out
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stock Status */}
            {selectedVariant && (
              <div className="flex items-center gap-2">
                {selectedVariant.stock > 10 ? (
                  <Badge variant="success">
                    <Check size={12} className="mr-2" />
                    In Stock
                  </Badge>
                ) : selectedVariant.stock > 0 ? (
                  <Badge variant="warning">
                    Only {selectedVariant.stock} left in stock
                  </Badge>
                ) : (
                  <Badge variant="destructive">Out of Stock</Badge>
                )}
              </div>
            )}

            {/* ── Quantity & Add to Cart ── */}
            <div className="flex items-center gap-4">
              <div className="flex items-center border-2 border-rule rounded-xl overflow-hidden bg-paper-2">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="h-12 w-12 flex items-center justify-center hover:bg-paper-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Decrease quantity"
                >
                  <Minus size={15} />
                </button>
                <span className="h-12 w-14 flex items-center justify-center font-bold text-base border-x border-rule text-ink select-none">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(selectedVariant?.stock ?? 10, q + 1))}
                  disabled={quantity >= (selectedVariant?.stock ?? 10)}
                  className="h-12 w-12 flex items-center justify-center hover:bg-paper-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Increase quantity"
                >
                  <Plus size={15} />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!selectedVariant || selectedVariant.stock <= 0 || isAddingToCart || justAddedToCart}
                className={cn(
                  "flex-1 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-ui overflow-hidden relative",
                  isAddingToCart || justAddedToCart
                    ? "bg-brand-100 text-brand-800 border border-brand-200"
                    : "bg-brand-600 text-white hover:bg-brand-700 border border-brand-700 shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {isAddingToCart && (
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1s_ease-in-out_infinite]" />
                )}
                <span className="relative flex items-center gap-2">
                  {justAddedToCart ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-800">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Added to Cart
                    </>
                  ) : isAddingToCart ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                      </svg>
                      Adding…
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={16} />
                      Add to Cart
                    </>
                  )}
                </span>
              </button>
            </div>

            {/* ── Total ── */}
            <div className="flex items-center justify-between p-4 bg-gold-500/10 rounded-xl border border-gold-500/25">
              <span className="text-sm font-medium text-gold-800">
                Total <span className="text-gold-600 font-normal tabular-nums">({quantity} × {formatPrice(selectedVariant?.sellingPrice || 0)})</span>
              </span>
              <span className="text-lg font-black text-ink tabular-nums">
                {formatPrice((selectedVariant?.sellingPrice || 0) * quantity)}
              </span>
            </div>

            {/* ── WhatsApp Order ── */}
            <button
              onClick={handleWhatsAppOrder}
              className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-whatsapp text-white hover:bg-whatsapp-600 transition-colors border border-whatsapp-700"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Order on WhatsApp
            </button>

            {/* ── Actions row ── */}
            <div className="flex gap-4">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-rule text-sm font-medium text-ink-2 hover:bg-paper-3 transition-colors"
              >
                <Share2 size={14} />
                Share
              </button>
            </div>

            {/* ── Quick Info — palette-restrained, hairline-tinted ── */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-rule">
              <div className="text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-brand-600/10 border border-brand-600/15 flex items-center justify-center">
                  <Leaf size={18} className="text-brand-700" />
                </div>
                <p className="text-xs font-semibold text-ink">100% Pure</p>
                <p className="text-xs text-ink-3">No Preservatives</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-gold-500/10 border border-gold-500/25 flex items-center justify-center">
                  <Truck size={18} className="text-gold-600" />
                </div>
                <p className="text-xs font-semibold text-ink">Free Delivery</p>
                <p className="text-xs text-ink-3">
                  Above ₹{freeShippingThreshold.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-ink-faint border border-rule flex items-center justify-center">
                  <Shield size={18} className="text-ink-2" />
                </div>
                <p className="text-xs font-semibold text-ink">FSSAI Approved</p>
                <p className="text-xs text-ink-3">Quality Assured</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="flex gap-2 bg-muted/50 p-2 rounded-xl mb-8 overflow-x-auto snap-x snap-mandatory relative scrollbar-none">
            <div className="flex gap-2 shrink-0">
              {[
                { key: "description" as const, label: "Description" },
                { key: "nutrition" as const, label: "Nutrition Info" },
                { key: "ingredients" as const, label: "Ingredients" },
                { key: "reviews" as const, label: `Reviews (${allReviews.length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-ui whitespace-nowrap snap-start",
                    activeTab === tab.key
                      ? "bg-paper-2 text-ink shadow-sm"
                      : "text-ink-3 hover:text-ink"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-muted/50 to-transparent pointer-events-none" />
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "description" && (
              <motion.div
                key="description"
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="prose prose-sm max-w-none"
              >
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">About this product</h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line max-w-[65ch]">
                      {product.description &&
                      product.description.trim().toLowerCase() !== product.name.trim().toLowerCase()
                        ? product.description
                        : "No description available."}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4">Product Details</h3>
                    <div className="space-y-4">
                      {product.shelfLife && (
                        <div className="flex justify-between py-2 border-b border-border">
                          <span className="text-sm text-muted-foreground">Shelf Life</span>
                          <span className="text-sm font-medium">{product.shelfLife}</span>
                        </div>
                      )}
                      {product.storageInstructions && (
                        <div className="flex justify-between py-2 border-b border-border">
                          <span className="text-sm text-muted-foreground">Storage</span>
                          <span className="text-sm font-medium">{product.storageInstructions}</span>
                        </div>
                      )}
                      {product.fssaiLicense && (
                        <div className="flex justify-between py-2 border-b border-border">
                          <span className="text-sm text-muted-foreground">FSSAI License</span>
                          <span className="text-sm font-medium font-mono">{product.fssaiLicense}</span>
                        </div>
                      )}
                      {product.countryOfOrigin && (
                        <div className="flex justify-between py-2 border-b border-border">
                          <span className="text-sm text-muted-foreground">Country of Origin</span>
                          <span className="text-sm font-medium">{product.countryOfOrigin}</span>
                        </div>
                      )}
                    </div>
                    {product.tags && product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {product.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-4 py-2 bg-brand-50 text-brand-700 text-xs font-medium rounded-lg"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "nutrition" && (
              <motion.div
                key="nutrition"
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {product.nutritionalInfo ? (
                  (() => {
                    // A zero/blank nutrition sheet (unfilled admin form) must
                    // not render as "0 kcal, 0 g …" rows — show the unavailable
                    // state instead, same as a missing object.
                    const rows = nutritionFields.filter((field) => {
                      const value = (product.nutritionalInfo as any)?.[field.key];
                      return value !== undefined && value !== null && Number(value) > 0;
                    });
                    if (rows.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <Info size={36} className="mx-auto text-muted-foreground/30 mb-4" />
                          <p className="text-muted-foreground">Nutritional information not available for this product.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="max-w-lg">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="p-2 bg-brand-600/10 rounded-xl">
                            <Apple size={20} className="text-brand-700" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">Nutritional Information</h3>
                            <p className="text-sm text-muted-foreground">
                              Per serving ({product.nutritionalInfo.servingSize || "100g"})
                            </p>
                          </div>
                        </div>
                        <div className="rounded-xl border border-border overflow-hidden">
                          {rows.map((field, i) => {
                            const value = (product.nutritionalInfo as any)[field.key];
                            return (
                              <div
                                key={field.key}
                                className={cn(
                                  "flex items-center justify-between px-4 py-4",
                                  i % 2 === 0 ? "bg-muted/30" : "bg-paper-2"
                                )}
                              >
                                <span className="text-sm">{field.label}</span>
                                <span className="text-sm font-medium">
                                  {Number(value)} {field.unit}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-12">
                    <Info size={36} className="mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">Nutritional information not available for this product.</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "ingredients" && (
              <motion.div
                key="ingredients"
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {product.ingredients ? (
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-2 bg-gold-500/10 rounded-xl">
                        <Leaf size={20} className="text-gold-600" />
                      </div>
                      <h3 className="text-lg font-semibold">Ingredients</h3>
                    </div>
                    <div className="p-6 bg-cream rounded-xl border border-brand-100">
                      <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
                        {product.ingredients}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Info size={36} className="mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">Ingredients information not available.</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "reviews" && (
              <motion.div
                key="reviews"
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-3xl"
              >
                {/* Review Form */}
                <Card className="mb-8">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
                    {!isAuthenticated ? (
                      <div className="text-center py-6">
                        <p className="text-muted-foreground mb-4">
                          Please login to leave a review
                        </p>
                        <Link
                          href="/auth/login"
                          className="text-brand-600 hover:text-brand-700 font-medium text-sm"
                        >
                          Login here
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Star rating selector */}
                        <div>
                          <label className="block text-sm font-medium text-ink-2 mb-2">
                            Your Rating *
                          </label>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setReviewForm((p) => ({ ...p, rating: star }))}
                                className={cn(
                                  "p-2 rounded-lg transition-ui hover:scale-110",
                                  star <= reviewForm.rating ? "scale-105" : ""
                                )}
                                aria-label={`${star} star${star > 1 ? "s" : ""}`}
                              >
                                <Star
                                  size={28}
                                  className={cn(
                                    "transition-ui duration-150",
                                    star <= reviewForm.rating
                                      ? "fill-gold-500 text-gold-500 drop-shadow-sm"
                                      : "fill-ink-faint text-ink-faint"
                                  )}
                                />
                              </button>
                            ))}
                            <span className="text-xs text-ink-3 self-center ml-2">
                              {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][reviewForm.rating]}
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <div>
                          <label className="block text-sm font-medium text-ink-2 mb-2">
                            Title <span className="text-ink-3 font-normal">(optional)</span>
                          </label>
                          <input
                            type="text"
                            value={reviewForm.title}
                            onChange={(e) => setReviewForm((p) => ({ ...p, title: e.target.value }))}
                            placeholder="Summarize your experience"
                            maxLength={100}
                            className="flex w-full rounded-xl border border-rule bg-paper-2 px-4 py-2 text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--color-focus)] transition-ui placeholder:text-ink-3"
                          />
                        </div>

                        {/* Comment */}
                        <div>
                          <label className="block text-sm font-medium text-ink-2 mb-2">
                            Your Review *
                          </label>
                          <textarea
                            value={reviewForm.comment}
                            onChange={(e) => setReviewForm((p) => ({ ...p, comment: e.target.value }))}
                            rows={4}
                            maxLength={500}
                            placeholder="What did you like or dislike? How was the taste, packaging, delivery?"
                            className="flex w-full rounded-xl border border-rule bg-paper-2 px-4 py-2 text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--color-focus)] transition-ui resize-none placeholder:text-ink-3"
                          />
                          <div className="flex justify-end mt-2">
                            <span className={cn(
                              "text-xs",
                              reviewForm.comment.length > 450 ? "text-gold-600 font-medium" : "text-ink-3"
                            )}>
                              {reviewForm.comment.length}/500
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={handleSubmitReview}
                          disabled={submittingReview || !reviewForm.comment.trim()}
                          className="w-full sm:w-auto px-6 py-2 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-ui disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                        >
                          {submittingReview && (
                            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 12a9 9 0 11-6.219-8.56" />
                            </svg>
                          )}
                          Submit Review
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Reviews List */}
                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare size={36} className="mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">
                        No reviews yet. Be the first to review this product!
                      </p>
                    </div>
                  ) : (
                    reviews.map((review) => {
                      const reviewerName =
                        typeof review.user === "object"
                          ? review.user?.name
                          : review.userName || "Anonymous";
                      return (
                        <motion.div
                          key={review._id}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
                                  {reviewerName?.[0]?.toUpperCase() || "A"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-medium text-sm">{reviewerName}</span>
                                    {review.isApproved && (
                                      <Badge variant="success" className="text-xs px-2">
                                        Verified
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star
                                        key={i}
                                        size={12}
                                        className={cn(
                                          i < review.rating
                                            ? "fill-brand-500 text-brand-500"
                                            : "fill-muted text-muted"
                                        )}
                                      />
                                    ))}
                                    <span className="text-xs text-muted-foreground ml-2">
                                      {new Date(review.createdAt).toLocaleDateString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </span>
                                  </div>
                                  {review.title && (
                                    <p className="font-medium text-sm mb-2">{review.title}</p>
                                  )}
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {review.comment}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    }                    )
                  )}

                  {hasMoreReviews && (
                    <div className="text-center pt-4">
                      <button
                        onClick={() => setReviewPage((p) => p + 1)}
                        className="px-6 py-2 text-sm font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors"
                      >
                        Show More Reviews ({allReviews.length - reviews.length} remaining)
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <motion.section
          >
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl font-display font-bold">You May Also Like</h2>
                <p className="text-muted-foreground text-sm mt-2">
                  Similar products from the same category
                </p>
              </div>
              <Link
                href={`/products?category=${categorySlug}`}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                View All
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.slice(0, 4).map((rp: Product, i: number) => (
                <ProductCard key={rp._id} product={rp} index={i} />
              ))}
            </div>
          </motion.section>
        )}
      </div>

      {/* ── Sticky Mobile Add to Cart Bar ── */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed bottom-0 inset-x-0 z-40 bg-paper-2 border-t border-rule shadow-2xl px-4 py-4 lg:hidden"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-ink-3 font-medium truncate">{product.name}</p>
                <div className="flex items-baseline gap-2 mt-0">
                  <span className="text-sm font-bold text-ink">
                    {selectedVariant ? formatPrice(selectedVariant.sellingPrice) : ""}
                  </span>
                  {selectedVariant && (
                    <span className="text-xs text-ink-3">
                      ×{quantity} · {weightLabel(selectedVariant)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Quantity in sticky */}
                <div className="flex items-center border border-rule rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-8 flex items-center justify-center hover:bg-paper-3 transition-colors disabled:opacity-30"
                    aria-label="Decrease"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-8 h-8 flex items-center justify-center text-xs font-bold border-x border-rule text-ink select-none">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(selectedVariant?.stock ?? 10, q + 1))}
                    disabled={quantity >= (selectedVariant?.stock ?? 10)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-paper-3 transition-colors disabled:opacity-30"
                    aria-label="Increase"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                <button
                  disabled={!selectedVariant || selectedVariant.stock <= 0 || isAddingToCart || justAddedToCart}
                  onClick={handleAddToCart}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-ui",
                    justAddedToCart
                      ? "bg-brand-600/10 text-brand-700 border border-brand-600/25"
                      : "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  )}
                >
                  {justAddedToCart ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <ShoppingCart size={12} />
                  )}
                  {justAddedToCart ? "Added" : "Add"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Lightbox Portal Overlay */}
      <AnimatePresence>
        {lightboxOpen && product.images && product.images.length > 0 && (
          <motion.div
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-brand-950/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-ui"
              aria-label="Close gallery"
            >
              <X size={24} />
            </button>
            
            <div className="relative w-full max-w-4xl max-h-[85vh] aspect-square md:aspect-video flex items-center justify-center select-none">
              <button
                disabled={lightboxIndex === 0}
                onClick={() => setLightboxIndex((prev) => Math.max(0, prev - 1))}
                className="absolute left-4 p-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-ui disabled:opacity-20 disabled:cursor-not-allowed z-10"
              >
                <ChevronLeft size={24} />
              </button>

              <div className="relative w-full h-full max-h-[80vh] flex items-center justify-center">
                <Image
                  src={getImageUrl(product.images[lightboxIndex])}
                  alt={`${product.name} - Full Image`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority
                />
              </div>

              <button
                disabled={lightboxIndex === product.images.length - 1}
                onClick={() => setLightboxIndex((prev) => Math.min(product.images.length - 1, prev + 1))}
                className="absolute right-4 p-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-ui disabled:opacity-20 disabled:cursor-not-allowed z-10"
              >
                <ChevronRight size={24} />
              </button>
            </div>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
              {lightboxIndex + 1} / {product.images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
