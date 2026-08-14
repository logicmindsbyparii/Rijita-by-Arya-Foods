"use client";

import { Suspense, useState, useEffect, useCallback, useMemo, useRef, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  ArrowUpDown,
  Package,
  Star,
  ShoppingBag,
  Heart,
  TrendingUp,
  Sparkles,
  Percent,
  RotateCcw,
} from "lucide-react";
import { productApi, categoryApi } from "@/lib/api";
import ProductCard from "@/components/products/ProductCard";
import { cn, formatPrice, getImageUrl, calculateDiscount } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/* ── 08 Photographic · Catalog View ──
   Product listing is a photographic catalogue.
   Filters are minimal annotations; products are the content.
   Grid is generous, with breathing room.
*/

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "popular", label: "Most Popular" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
  { value: "rating", label: "Highest Rated" },
];

const PRICE_RANGES = [
  { label: "Under ₹100", min: 0, max: 100 },
  { label: "₹100 – ₹200", min: 100, max: 200 },
  { label: "₹200 – ₹500", min: 200, max: 500 },
  { label: "Above ₹500", min: 500, max: undefined },
];

const RATING_OPTIONS = [4, 3, 2, 1];

// ─── Staggered grid animation ───
const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // URL-driven state
  const page = Number(searchParams.get("page")) || 1;
  const search = searchParams.get("search") || "";
  const categorySlug = searchParams.get("category") || "";
  const sort = searchParams.get("sort") || "newest";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const rating = searchParams.get("rating") || "";
  const view = (searchParams.get("view") || "grid") as "grid" | "list";

  // UI state
  const [searchInput, setSearchInput] = useState(search);
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true,
    price: true,
    rating: true,
  });

  // Keyboard shortcut: ESC to close dropdowns, Cmd+K / Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowSortDropdown(false);
        setShowMobileFilters(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sync searchInput from URL
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.getCategories(),
  });

  const categories: any[] = categoriesData?.data?.categories || [];

  // Debounce search — wrap router.replace in startTransition so the browser
  // doesn't flag it as a long-running setTimeout violation
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchInput !== search) {
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput) params.set("search", searchInput);
        else params.delete("search");
        params.set("page", "1");
        startTransition(() => {
          router.replace(`/products?${params.toString()}`, { scroll: false });
        });
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, search, searchParams, router]);

  const queryParams = useMemo(
    () => ({
      page,
      limit: 12,
      sort,
      ...(search && { search }),
      ...(categorySlug && { category: categorySlug }),
      ...(minPrice && { minPrice: Number(minPrice) }),
      ...(maxPrice && { maxPrice: Number(maxPrice) }),
      ...(rating && { minRating: Number(rating) }),
    }),
    [page, search, categorySlug, sort, minPrice, maxPrice, rating]
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products", queryParams],
    queryFn: () => productApi.getProducts(queryParams),
    placeholderData: (previousData: any) => previousData,
  });

  const products: any[] = (data as any)?.data?.products || [];
  const pagination = (data as any)?.pagination;

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      params.set("page", "1");
      router.replace(`/products?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Multi-select category toggle
  const toggleCategory = useCallback(
    (slug: string) => {
      const current = categorySlug ? categorySlug.split(",") : [];
      const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
      updateParams({ category: next.length > 0 ? next.join(",") : undefined });
    },
    [categorySlug, updateParams]
  );

  // Price range toggle
  const togglePriceRange = useCallback(
    (min: number, max: number | undefined) => {
      const isActive = Number(minPrice) === min && (max ? Number(maxPrice) === max : !maxPrice);
      if (isActive) {
        updateParams({ minPrice: undefined, maxPrice: undefined });
      } else {
        updateParams({ minPrice: String(min), maxPrice: max?.toString() || undefined });
      }
    },
    [minPrice, maxPrice, updateParams]
  );

  const clearFilters = () => {
    router.replace("/products", { scroll: false });
    setSearchInput("");
  };

  const hasActiveFilters = !!(search || categorySlug || sort !== "newest" || minPrice || maxPrice || rating);

  // Selected category names for chips
  const selectedCategorySlugs = categorySlug ? categorySlug.split(",") : [];

  // ─── Render ───
  return (
    <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16 bg-white selection:bg-[var(--color-brand)]/10 selection:text-[var(--color-brand)]">
      {/* ── Top annotation band ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-[var(--color-brand)] block mb-4">
              Shop
            </span>
            <h1 className="text-[clamp(1.5rem,4vw,2.5rem)] font-display font-bold text-stone-800 leading-tight">
              Our Products
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-2 max-w-xl">
              Discover our premium collection of authentic Jain snacks and namkeen.
            </p>
          </div>

          {/* Quick count */}
          {!isLoading && products.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-stone-600 font-semibold shrink-0"
            >
              <span className="font-bold text-stone-900">{pagination?.total || products.length}</span> products
            </motion.p>
          )}
        </div>

        {/* ── Category Quick-Filter Bar ── */}
        {categories.length > 0 && (
          <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
            <button
              onClick={() => updateParams({ category: undefined })}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-ui border shrink-0 flex items-center gap-2",
                selectedCategorySlugs.length === 0
                  ? "bg-brand-600 text-white border-brand-700 shadow-md shadow-emerald-900/20"
                  : "bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200 hover:text-stone-900"
              )}
            >
              All Items
            </button>
            {categories.map((cat: any) => {
              const isSelected = selectedCategorySlugs.includes(cat.slug);
              return (
                <button
                  key={cat._id}
                  onClick={() => toggleCategory(cat.slug)}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-ui border shrink-0 flex items-center gap-2",
                    isSelected
                      ? "bg-brand-600 text-white border-brand-700 shadow-md shadow-emerald-900/20"
                      : "bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200 hover:text-stone-900"
                  )}
                >
                  {cat.name}
                  {cat.productCount > 0 && (
                    <span
                      className={cn(
                        "text-xs px-2 py-0.2 rounded-full font-extrabold",
                        isSelected ? "bg-white/20 text-white" : "bg-stone-200 text-stone-700"
                      )}
                    >
                      {cat.productCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Search & Action Bar ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder='Search products…  ⌘K'
              aria-label="Search products"
              suppressHydrationWarning
              className="w-full pl-10 pr-10 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:border-[var(--color-brand)] focus:ring-0 focus:shadow-[0_0_0_2px_var(--color-brand)]/10 transition-ui text-sm text-stone-800 placeholder:text-stone-400"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput("");
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("search");
                  router.replace(`/products?${params.toString()}`, { scroll: false });
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-stone-100 rounded-full transition-colors"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "hidden lg:inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-ui whitespace-nowrap",
                showFilters
                  ? "bg-[var(--color-brand)] border-[var(--color-brand)] text-white"
                  : "bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-800"
              )}
              aria-label="Toggle filters"
            >
              <SlidersHorizontal size={15} />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-current" />
              )}
            </button>

            {/* Mobile filter trigger */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white border-stone-200 text-stone-600 hover:border-stone-300 text-sm font-medium transition-ui"
              aria-label="Open filters"
            >
              <SlidersHorizontal size={15} />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[var(--color-brand)]" />
              )}
            </button>

            {/* Sort */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown((p) => !p)}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white text-sm font-medium transition-ui whitespace-nowrap",
                  sort !== "newest"
                    ? "border-[var(--color-brand)]/30 text-[var(--color-brand)]"
                    : "border-stone-200 text-stone-600 hover:border-stone-300"
                )}
                aria-label="Sort products"
              >
                <ArrowUpDown size={14} />
                <span className="hidden sm:inline">
                  {SORT_OPTIONS.find((o) => o.value === sort)?.label || "Sort"}
                </span>
                <ChevronDown
                  size={13}
                  className={cn("transition-transform duration-200", showSortDropdown && "rotate-180")}
                />
              </button>

              <AnimatePresence>
                {showSortDropdown && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowSortDropdown(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-stone-200 z-30 py-2 overflow-hidden"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            updateParams({ sort: option.value });
                            setShowSortDropdown(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between",
                            sort === option.value
                              ? "text-[var(--color-brand)] font-semibold bg-[var(--color-brand)]/[0.06]"
                              : "text-stone-600 hover:bg-stone-50 hover:text-stone-800"
                          )}
                        >
                          {option.label}
                          {sort === option.value && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* View toggle */}
            <div className="hidden sm:flex rounded-xl border border-stone-200 overflow-hidden bg-white">
              <button
                onClick={() => updateParams({ view: "grid" })}
                className={cn(
                  "p-2 transition-colors",
                  view === "grid" ? "bg-[var(--color-brand)] text-white" : "text-stone-500 hover:bg-stone-100"
                )}
                aria-label="Grid view"
              >
                <Grid3X3 size={15} />
              </button>
              <button
                onClick={() => updateParams({ view: "list" })}
                className={cn(
                  "p-2 transition-colors border-l border-stone-200",
                  view === "list" ? "bg-[var(--color-brand)] text-white" : "text-stone-500 hover:bg-stone-100"
                )}
                aria-label="List view"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Filter Chips (CSS transition to avoid forced reflow) ── */}
      <div
        className={cn(
          "grid transition-ui duration-300 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
          hasActiveFilters ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 mb-6 pt-2">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider mr-2">Active:</span>

              {selectedCategorySlugs.map((slug) => {
                const cat = categories.find((c: any) => c.slug === slug);
                return (
                  <span
                    key={slug}
                    className="inline-flex items-center gap-2 pl-2 pr-2 py-2 bg-[var(--color-brand)]/[0.08] text-[var(--color-brand)] border border-[var(--color-brand)]/20 rounded-full text-xs font-semibold"
                  >
                    {cat?.name || slug}
                    <button
                      onClick={() => toggleCategory(slug)}
                      className="hover:bg-[var(--color-brand)]/10 rounded-full p-0 transition-colors"
                      aria-label={`Remove ${cat?.name || slug} filter`}
                    >
                      <X size={10} />
                    </button>
                  </span>
                );
              })}

              {search && (
                <span className="inline-flex items-center gap-2 pl-2 pr-2 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
                  &ldquo;{search}&rdquo;
                  <button
                    onClick={() => { setSearchInput(""); updateParams({ search: undefined }); }}
                    className="hover:bg-amber-100 rounded-full p-0 transition-colors"
                    aria-label="Remove search"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}

              {minPrice && (
                <span className="inline-flex items-center gap-2 pl-2 pr-2 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                  ₹ {minPrice}{maxPrice ? ` – ₹${maxPrice}` : "+"}
                  <button
                    onClick={() => updateParams({ minPrice: undefined, maxPrice: undefined })}
                    className="hover:bg-emerald-100 rounded-full p-0 transition-colors"
                    aria-label="Remove price filter"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}

              {rating && (
                <span className="inline-flex items-center gap-2 pl-2 pr-2 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
                  ★ {rating}+
                  <button
                    onClick={() => updateParams({ rating: undefined })}
                    className="hover:bg-amber-100 rounded-full p-0 transition-colors"
                    aria-label="Remove rating filter"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}

              {sort !== "newest" && (
                <span className="inline-flex items-center gap-2 pl-2 pr-2 py-2 bg-stone-100 text-stone-600 border border-stone-200 rounded-full text-xs font-semibold">
                  {SORT_OPTIONS.find((o) => o.value === sort)?.label}
                  <button
                    onClick={() => updateParams({ sort: "newest" })}
                    className="hover:bg-stone-200 rounded-full p-0 transition-colors"
                    aria-label="Reset sort"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}

              <button
                onClick={clearFilters}
                className="text-xs text-rose-500 hover:text-rose-600 font-semibold transition-colors ml-2 flex items-center gap-2"
              >
                <RotateCcw size={11} />
                Clear
              </button>
            </div>
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          {/* ─── Desktop Filter Sidebar ─── */}
          <div className="hidden lg:block w-[240px] flex-shrink-0 overflow-hidden">
            <motion.div
              initial={false}
              animate={{
                x: showFilters ? 0 : -240,
                opacity: showFilters ? 1 : 0,
                width: showFilters ? 240 : 0,
              }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-[240px] overflow-hidden"
            >
              <div className="pr-6 space-y-4">
                {/* ── Categories ── */}
                <div>
                  <button
                    onClick={() => setExpandedSections((p) => ({ ...p, categories: !p.categories }))}
                    className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-stone-400 mb-2"
                  >
                    Categories
                    <ChevronDown
                      size={12}
                      className={cn("transition-transform", expandedSections.categories && "rotate-180")}
                    />
                  </button>

                  <AnimatePresence>
                    {expandedSections.categories && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-0 pt-2">                              <label className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors hover:bg-stone-50 text-sm">
                                <input
                                  type="checkbox"
                                  checked={selectedCategorySlugs.length === 0}
                                  onChange={() => updateParams({ category: undefined })}
                                  suppressHydrationWarning
                                  className="w-4 h-4 rounded border-stone-300 focus:ring-[var(--color-brand)]/30 focus:ring-offset-0"
                                  style={{ accentColor: "var(--color-brand)" }}
                                />
                                <span className={cn(selectedCategorySlugs.length === 0 ? "font-semibold text-stone-800" : "text-stone-500")}>
                                  All Categories
                                </span>
                              </label>

                          {categories.map((cat: any) => {
                            const isChecked = selectedCategorySlugs.includes(cat.slug);
                            return (
                              <label
                                key={cat._id}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors hover:bg-stone-50 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleCategory(cat.slug)}
                                  suppressHydrationWarning
                                  className="w-4 h-4 rounded border-stone-300 focus:ring-[var(--color-brand)]/30 focus:ring-offset-0"
                                style={{ accentColor: "var(--color-brand)" }}
                                />
                                <span className="flex items-center justify-between w-full">
                                  <span className={cn(isChecked ? "font-semibold text-stone-800" : "text-stone-600")}>
                                    {cat.name}
                                  </span>
                                  <span className="text-xs text-stone-400 font-medium">
                                    {cat.productCount || 0}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="h-px bg-stone-100" />

                {/* ── Price Range ── */}
                <div>
                  <button
                    onClick={() => setExpandedSections((p) => ({ ...p, price: !p.price }))}
                    className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-stone-400 mb-2"
                  >
                    Price Range
                    <ChevronDown
                      size={12}
                      className={cn("transition-transform", expandedSections.price && "rotate-180")}
                    />
                  </button>

                  <AnimatePresence>
                    {expandedSections.price && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-0 pt-2">
                          {PRICE_RANGES.map((range) => {
                            const isActive =
                              Number(minPrice) === range.min &&
                              (range.max ? Number(maxPrice) === range.max : !maxPrice);
                            return (
                              <button
                                key={range.label}
                                onClick={() => togglePriceRange(range.min, range.max)}
                                className={cn(
                                  "w-full text-left px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
                                  isActive
                                    ? "bg-emerald-50 text-emerald-700 font-semibold"
                                    : "text-stone-600 hover:bg-stone-50"
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0",
                                    isActive
                                      ? "bg-emerald-600 border-emerald-600"
                                      : "border-stone-300 bg-white"
                                  )}
                                >
                                  {isActive && (
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </span>
                                {range.label}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="h-px bg-stone-100" />

                {/* ── Rating ── */}
                <div>
                  <button
                    onClick={() => setExpandedSections((p) => ({ ...p, rating: !p.rating }))}
                    className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-stone-400 mb-2"
                  >
                    Minimum Rating
                    <ChevronDown
                      size={12}
                      className={cn("transition-transform", expandedSections.rating && "rotate-180")}
                    />
                  </button>

                  <AnimatePresence>
                    {expandedSections.rating && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-0 pt-2">
                          {RATING_OPTIONS.map((r) => {
                            const isActive = Number(rating) === r;
                            return (
                              <button
                                key={r}
                                onClick={() => updateParams({ rating: isActive ? undefined : String(r) })}
                                className={cn(
                                  "w-full text-left px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
                                  isActive
                                    ? "bg-amber-50 text-amber-700 font-semibold"
                                    : "text-stone-600 hover:bg-stone-50"
                                )}
                              >
                                <span className="flex items-center gap-0">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      size={13}
                                      className={cn(
                                        i < r ? "fill-amber-400 text-amber-400" : "text-stone-200"
                                      )}
                                    />
                                  ))}
                                </span>
                                <span className="text-xs text-stone-400">& up</span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Clear all */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="w-full py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors mt-2"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </motion.div>
          </div>

          {/* ─── Mobile Filter Drawer ─── */}
          <AnimatePresence>
            {showMobileFilters && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[500] lg:hidden"
              >
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                  onClick={() => setShowMobileFilters(false)}
                />

                {/* Sheet */}
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 300 }}
                  className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl z-10 flex flex-col"
                >
                  {/* Sticky header */}
                  <div className="flex items-center justify-between px-4 py-4 border-b border-stone-100 shrink-0">
                    <div>
                      <h3 className="text-sm font-bold text-stone-800">Filters</h3>
                      <p className="text-xs text-stone-400">Refine your search</p>
                    </div>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition-colors"
                      aria-label="Close filters"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Scrollable content */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                    {/* Categories */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-4">Categories</h4>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors hover:bg-stone-50 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedCategorySlugs.length === 0}
                            onChange={() => updateParams({ category: undefined })}
                            suppressHydrationWarning
                            className="w-4 h-4 rounded border-stone-300 focus:ring-[var(--color-brand)]/30 focus:ring-offset-0"
                            style={{ accentColor: "var(--color-brand)" }}
                          />
                          <span className={cn(selectedCategorySlugs.length === 0 ? "font-semibold" : "text-stone-500")}>All</span>
                        </label>
                        {categories.map((cat: any) => (
                          <label
                            key={cat._id}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors hover:bg-stone-50 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCategorySlugs.includes(cat.slug)}
                              onChange={() => toggleCategory(cat.slug)}
                              suppressHydrationWarning
                              className="w-4 h-4 rounded border-stone-300 focus:ring-[var(--color-brand)]/30"
                              style={{ accentColor: "var(--color-brand)" }}
                            />
                            <span className="flex items-center justify-between w-full">
                              <span className={cn(selectedCategorySlugs.includes(cat.slug) ? "font-semibold text-stone-800" : "text-stone-600")}>
                                {cat.name}
                              </span>
                              <span className="text-xs text-stone-400">{cat.productCount || 0}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-stone-100" />

                    {/* Price Range */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-4">Price Range</h4>
                      <div className="space-y-2">
                        {PRICE_RANGES.map((range) => (
                          <button
                            key={range.label}
                            onClick={() => { togglePriceRange(range.min, range.max); }}
                            className={cn(
                              "w-full text-left px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
                              Number(minPrice) === range.min && (range.max ? Number(maxPrice) === range.max : !maxPrice)
                                ? "bg-emerald-50 text-emerald-700 font-semibold"
                                : "text-stone-600 hover:bg-stone-50"
                            )}
                          >
                            <span
                              className={cn(
                                "w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0",
                                Number(minPrice) === range.min && (range.max ? Number(maxPrice) === range.max : !maxPrice)
                                  ? "bg-emerald-600 border-emerald-600"
                                  : "border-stone-300 bg-white"
                              )}
                            >
                              {(Number(minPrice) === range.min && (range.max ? Number(maxPrice) === range.max : !maxPrice)) && (
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </span>
                            {range.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-stone-100" />

                    {/* Rating */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-4">Minimum Rating</h4>
                      <div className="space-y-2">
                        {RATING_OPTIONS.map((r) => (
                          <button
                            key={r}
                            onClick={() => { updateParams({ rating: Number(rating) === r ? undefined : String(r) }); }}
                            className={cn(
                              "w-full text-left px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
                              Number(rating) === r
                                ? "bg-amber-50 text-amber-700 font-semibold"
                                : "text-stone-600 hover:bg-stone-50"
                            )}
                          >
                            <span className="flex items-center gap-0">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} size={13} className={cn(i < r ? "fill-amber-400 text-amber-400" : "text-stone-200")} />
                              ))}
                            </span>
                            <span className="text-xs text-stone-400">& up</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Sticky footer with apply */}
                  <div className="px-4 py-4 border-t border-stone-100 shrink-0 flex gap-2">
                    <button
                      onClick={clearFilters}
                      className="flex-1 py-2 rounded-xl border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="flex-1 py-2 rounded-xl bg-[var(--color-brand)] text-white text-sm font-bold hover:opacity-90 transition-opacity"
                    >
                      Show Results
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Product Grid / List ─── */}
          <div className="flex-1 min-w-0">
            {/* Loading */}
            {isLoading && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
                    <Skeleton className="aspect-[4/3] sm:aspect-square rounded-none" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-2 w-1/3 rounded" />
                      <Skeleton className="h-4 w-2/3 rounded" />
                      <Skeleton className="h-4 w-1/4 rounded" />
                      <Skeleton className="h-8 w-full rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {isError && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-24"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center ring-1 ring-red-100">
                  <Package size={28} className="text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-stone-800 mb-2">Failed to load products</h3>
                <p className="text-sm text-stone-500 mb-6 max-w-sm mx-auto">
                  Something went wrong on our end. Try reloading the page.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-bold hover:bg-stone-800 transition-colors inline-flex items-center gap-2"
                >
                  <RotateCcw size={14} />
                  Reload
                </button>
              </motion.div>
            )}

            {/* Empty */}
            {!isLoading && !isError && products.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-24"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-stone-50 flex items-center justify-center ring-1 ring-stone-100">
                  <Package size={36} className="text-stone-300" />
                </div>
                <h3 className="text-xl font-bold text-stone-800 mb-2">No products found</h3>
                <p className="text-sm text-stone-500 mb-8 max-w-sm mx-auto leading-relaxed">
                  We couldn&apos;t find anything matching your filters.
                  Try a different category or price range.
                </p>
                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-bold hover:bg-stone-800 transition-colors inline-flex items-center gap-2"
                  >
                    <RotateCcw size={14} />
                    Clear Filters
                  </button>
                  {categories.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                      <span className="text-xs text-stone-400 font-medium">Try:</span>
                      {categories.slice(0, 4).map((cat: any) => (
                        <Link
                          key={cat._id}
                          href={`/products?category=${cat.slug}`}
                          className="text-xs px-4 py-2 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors font-medium"
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Products */}
            <AnimatePresence mode="wait">
              {!isLoading && !isError && products.length > 0 && (
                <motion.div
                  key={`${view}-${page}`}
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0 }}
                >
                  {/* Results bar */}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-stone-500">
                      Page <span className="font-bold text-stone-800">{page}</span>
                      {" · "}
                      <span className="font-bold text-stone-800">{pagination?.total || products.length}</span> products
                    </p>
                    {pagination && pagination.totalPages > 1 && (
                      <p className="text-xs text-stone-400">
                        {pagination.totalPages} page{pagination.totalPages > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  {view === "grid" ? (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4">
                      {products.map((product: any, i: number) => (
                        <motion.div key={product._id} variants={itemVariants}>
                          <ProductCard product={product} index={i} showAddToCart />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {products.map((product: any, i: number) => (
                        <motion.div key={product._id} variants={itemVariants}>
                          <ProductListItem product={product} index={i} />
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Pagination */}
                  {pagination && pagination.totalPages > 1 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center gap-2 mt-12"
                    >
                      <button
                        onClick={() => {
                          const p = new URLSearchParams(searchParams.toString());
                          p.set("page", String(page - 1));
                          router.push(`/products?${p.toString()}`);
                        }}
                        disabled={page <= 1}
                        className="w-10 h-10 rounded-xl border border-stone-200 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:bg-stone-50 enabled:hover:border-stone-300"
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      {generatePageNumbers(page, pagination.totalPages).map((p, i) =>
                        p === "..." ? (
                          <span key={`e${i}`} className="px-2 text-stone-400 text-sm">…</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => {
                              const ps = new URLSearchParams(searchParams.toString());
                              ps.set("page", String(p));
                              router.push(`/products?${ps.toString()}`);
                            }}
                            className={cn(
                              "min-w-[36px] h-10 rounded-xl text-sm font-medium transition-ui border",
                              page === p
                                ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)] shadow-sm"
                                : "border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300"
                            )}
                            aria-label={`Page ${p}`}
                            aria-current={page === p ? "page" : undefined}
                          >
                            {p}
                          </button>
                        )
                      )}

                      <button
                        onClick={() => {
                          const p = new URLSearchParams(searchParams.toString());
                          p.set("page", String(page + 1));
                          router.push(`/products?${p.toString()}`);
                        }}
                        disabled={page >= (pagination?.totalPages || 1)}
                        className="w-10 h-10 rounded-xl border border-stone-200 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:bg-stone-50 enabled:hover:border-stone-300"
                        aria-label="Next page"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Suspense wrapper ───
export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-28 pb-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Skeleton className="h-4 w-12 rounded mb-4" />
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="h-4 w-96 rounded mt-2" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl mb-6" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
                <Skeleton className="aspect-[4/3] sm:aspect-square rounded-none" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-2 w-1/3 rounded" />
                  <Skeleton className="h-4 w-2/3 rounded" />
                  <Skeleton className="h-4 w-1/4 rounded" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}

// ==================== Helper Components ====================

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-4">{title}</h4>
      {children}
    </div>
  );
}

/* ─── Enhanced Product List Item ─── */
function ProductListItem({ product, index = 0 }: { product: any; index?: number }) {
  const primaryVariant = product.variants?.[0];
  const categoryName = typeof product.category === "object" ? product.category?.name : "";
  const discount = primaryVariant
    ? calculateDiscount(primaryVariant.mrp, primaryVariant.sellingPrice)
    : 0;

  const ratingStars = product.averageRating
    ? Array.from({ length: 5 }).map((_, i) => i < Math.round(product.averageRating))
    : [];

  return (
    <Link
      href={`/products/${product.slug}`}
      className="flex gap-4 p-4 rounded-2xl border border-stone-100 hover:shadow-md hover:-translate-y-0.5 transition-ui duration-200 bg-white group"
    >
      {/* Image */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-gradient-to-br from-stone-50 to-amber-50/30 overflow-hidden flex-shrink-0 relative">
        {product.images?.[0] ? (
          <Image
            src={getImageUrl(product.images[0])}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
            sizes="112px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={32} className="text-stone-300" />
          </div>
        )}

        {/* Badges on image */}
        <div className="absolute top-2 left-2 flex flex-col gap-2">
          {product.isNewArrival && (
            <span className="text-xs font-bold px-2 py-0 rounded-full bg-emerald-500/80 text-white backdrop-blur-sm flex items-center gap-2">
              <Sparkles size={8} /> New
            </span>
          )}
          {discount > 0 && (
            <span className="text-xs font-bold px-2 py-0 rounded-full bg-rose-500/80 text-white backdrop-blur-sm flex items-center gap-2">
              <Percent size={8} /> {discount}%
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {categoryName && (
          <p className="text-xs uppercase tracking-[0.15em] text-amber-600 font-bold mb-0">
            {categoryName}
          </p>
        )}
        <h3 className="text-sm sm:text-base font-bold text-stone-800 group-hover:text-[var(--color-brand)] transition-colors line-clamp-2">
          {product.name}
        </h3>

        {product.shortDescription && (
          <p className="text-xs sm:text-sm text-stone-500 line-clamp-2 mt-0">
            {product.shortDescription}
          </p>
        )}

        {/* Rating */}
        {product.averageRating > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-[1px]">
              {ratingStars.map((filled, i) => (
                <Star
                  key={i}
                  size={11}
                  className={filled ? "fill-amber-400 text-amber-400" : "text-stone-200"}
                />
              ))}
            </div>
            <span className="text-xs text-stone-400 font-medium tabular-nums">
              {product.averageRating?.toFixed(1)} ({product.reviewCount})
            </span>
          </div>
        )}

        {/* Pricing row */}
        <div className="flex items-center gap-4 mt-2">
          {primaryVariant && (
            <>
              <span className="text-base sm:text-lg font-black text-stone-800 tabular-nums">
                {formatPrice(primaryVariant.sellingPrice)}
              </span>
              {primaryVariant.mrp > primaryVariant.sellingPrice && (
                <span className="text-xs sm:text-sm text-stone-400 line-through font-medium tabular-nums">
                  {formatPrice(primaryVariant.mrp)}
                </span>
              )}
              <span className="text-xs text-stone-400 font-medium bg-stone-100 px-2 py-0 rounded-full tabular-nums">
                {primaryVariant.weightValue}{primaryVariant.weightUnit}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      {primaryVariant && primaryVariant.stock > 0 && (
        <div className="flex items-center">
          <span className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-100 text-stone-500 text-xs font-medium group-hover:bg-[var(--color-brand)] group-hover:text-white transition-colors">
            <ShoppingBag size={13} />
            View
          </span>
        </div>
      )}
    </Link>
  );
}

function generatePageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
