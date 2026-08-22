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
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { productApi, categoryApi } from "@/lib/api";
import ProductCard from "@/components/products/ProductCard";
import { cn, formatPrice, getImageUrl, calculateDiscount, getPrimaryVariant } from "@/lib/utils";
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
  const newArrival = searchParams.get("newArrival") === "true";
  const bestSeller = searchParams.get("bestSeller") === "true";
  const featured = searchParams.get("featured") === "true";
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

  // Sync searchInput from URL, but prevent it from overwriting ongoing typing.
  // We track the last value we pushed to the URL to distinguish between
  // external URL changes (like browser back button or header search)
  // and our own debounced updates.
  const lastDebouncedSearch = useRef(search);
  useEffect(() => {
    if (search !== lastDebouncedSearch.current) {
      setSearchInput(search);
      lastDebouncedSearch.current = search;
    }
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
        lastDebouncedSearch.current = searchInput;
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
      ...(newArrival && { newArrival: true }),
      ...(bestSeller && { bestSeller: true }),
      ...(featured && { featured: true }),
    }),
    [page, search, categorySlug, sort, minPrice, maxPrice, rating, newArrival, bestSeller, featured]
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

  const hasActiveFilters = !!(search || categorySlug || sort !== "newest" || minPrice || maxPrice || rating || newArrival || bestSeller || featured);

  // Selected category names for chips
  const selectedCategorySlugs = categorySlug ? categorySlug.split(",") : [];

  // ─── Render ───
  return (
    <div className="min-h-dvh pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16 bg-paper text-ink relative overflow-hidden selection:bg-brand-500/20 selection:text-brand-900">
      {/* Editorial Background Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#05140806_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-500/5 blur-[120px] rounded-full pointer-events-none" />
      {/* ── Top annotation band ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-600/10 border border-brand-600/20 text-brand-700 text-[10px] font-black uppercase tracking-[0.2em] mb-6 backdrop-blur-md">
              <Sparkles size={12} className="text-brand-600" /> Catalog
            </span>
            <h1 className="text-[clamp(2.5rem,8vw,6rem)] sm:text-7xl lg:text-8xl font-display font-black text-ink tracking-tighter leading-[0.9] [text-wrap:balance]">
              Our <span className="font-serif italic font-medium text-gold-600">Products</span>
            </h1>
            <p className="text-base sm:text-lg text-ink-2 mt-4 max-w-xl font-medium">
              Discover our premium collection of authentic Jain snacks and namkeen.
            </p>
          </div>

          {/* Quick count */}
          {!isLoading && products.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-ink-2 font-semibold shrink-0"
            >
              <span className="font-bold text-ink">{pagination?.total || products.length}</span> products
            </motion.p>
          )}
        </div>

        {/* ── Category Quick-Filter Bar ── */}
        {categories.length > 0 && (
          <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth relative z-10">
            <button
              onClick={() => updateParams({ category: undefined })}
              className={cn(
                "px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 border shrink-0 flex items-center gap-2 focus-ring",
                selectedCategorySlugs.length === 0
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-paper-2 text-ink-2 border-ink-soft hover:border-ink hover:text-ink"
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
                    "px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 border shrink-0 flex items-center gap-2 focus-ring",
                    isSelected
                      ? "bg-brand-600 text-white border-brand-600 shadow-md"
                      : "bg-paper-2 text-ink-2 border-ink-soft hover:border-ink hover:text-ink"
                  )}
                >
                  {cat.name}
                  {cat.productCount > 0 && (
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-black",
                        isSelected ? "bg-white/20 text-white" : "bg-brand-50 text-brand-700"
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
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder='Search products…  ⌘K'
              aria-label="Search products"
              suppressHydrationWarning
              className="w-full pl-10 pr-10 py-2 rounded-xl border border-rule bg-paper-2 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--color-focus)] transition-ui text-sm text-ink placeholder:text-ink-3"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput("");
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("search");
                  router.replace(`/products?${params.toString()}`, { scroll: false });
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-paper-3 rounded-full transition-colors"
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
                "hidden lg:inline-flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-bold transition-all duration-300 whitespace-nowrap focus-ring",
                showFilters
                  ? "bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-900/20"
                  : "bg-paper-2 border-ink-soft text-ink-2 hover:border-ink hover:text-ink"
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
              className="lg:hidden inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-paper-2 border-rule text-ink-2 hover:border-brand-500 text-sm font-medium transition-ui"
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
                  "inline-flex items-center gap-2 px-5 py-2.5 rounded-full border bg-paper-2 text-sm font-bold transition-all duration-300 whitespace-nowrap focus-ring",
                  sort !== "newest"
                    ? "border-brand-600/30 text-brand-700 bg-brand-50"
                    : "border-ink-soft text-ink-2 hover:border-ink hover:text-ink"
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
                      className="absolute right-0 mt-2 w-52 bg-paper-2 rounded-xl shadow-xl border border-rule z-30 py-2 overflow-hidden"
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
                              : "text-ink-2 hover:bg-paper-3 hover:text-ink"
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
            <div className="hidden sm:flex rounded-full border border-ink-soft overflow-hidden bg-paper-2 p-0.5">
              <button
                onClick={() => updateParams({ view: "grid" })}
                className={cn(
                  "p-2 rounded-full transition-all duration-300",
                  view === "grid" ? "bg-ink text-paper shadow-md" : "text-ink-3 hover:text-ink hover:bg-ink-faint"
                )}
                aria-label="Grid view"
              >
                <Grid3X3 size={15} />
              </button>
              <button
                onClick={() => updateParams({ view: "list" })}
                className={cn(
                  "p-2 rounded-full transition-all duration-300",
                  view === "list" ? "bg-ink text-paper shadow-md" : "text-ink-3 hover:text-ink hover:bg-ink-faint"
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
              <span className="text-xs font-bold text-ink-3 uppercase tracking-wider mr-2">Active:</span>

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
                <span className="inline-flex items-center gap-2 pl-2 pr-2 py-2 bg-gold-500/10 text-gold-700 border border-gold-500/25 rounded-full text-xs font-semibold">
                  &ldquo;{search}&rdquo;
                  <button
                    onClick={() => { setSearchInput(""); updateParams({ search: undefined }); }}
                    className="hover:bg-gold-500/20 rounded-full p-0 transition-colors"
                    aria-label="Remove search"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}

              {minPrice && (
                <span className="inline-flex items-center gap-2 pl-2 pr-2 py-2 bg-gold-500/10 text-gold-700 border border-gold-500/25 rounded-full text-xs font-semibold">
                  ₹ {minPrice}{maxPrice ? ` – ₹${maxPrice}` : "+"}
                  <button
                    onClick={() => updateParams({ minPrice: undefined, maxPrice: undefined })}
                    className="hover:bg-gold-500/20 rounded-full p-0 transition-colors"
                    aria-label="Remove price filter"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}

              {rating && (
                <span className="inline-flex items-center gap-2 pl-2 pr-2 py-2 bg-gold-500/10 text-gold-700 border border-gold-500/25 rounded-full text-xs font-semibold">
                  ★ {rating}+
                  <button
                    onClick={() => updateParams({ rating: undefined })}
                    className="hover:bg-gold-500/20 rounded-full p-0 transition-colors"
                    aria-label="Remove rating filter"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}

              {sort !== "newest" && (
                <span className="inline-flex items-center gap-2 pl-2 pr-2 py-2 bg-paper-3 text-ink-2 border border-rule rounded-full text-xs font-semibold">
                  {SORT_OPTIONS.find((o) => o.value === sort)?.label}
                  <button
                    onClick={() => updateParams({ sort: "newest" })}
                    className="hover:bg-paper-3 rounded-full p-0 transition-colors"
                    aria-label="Reset sort"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}

              <button
                onClick={clearFilters}
                className="text-xs text-ink-3 hover:text-ink font-semibold transition-colors ml-2 flex items-center gap-2"
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
          <div className="hidden lg:block overflow-hidden">
            <motion.div
              initial={false}
              animate={{
                x: showFilters ? 0 : -240,
                opacity: showFilters ? 1 : 0,
                width: showFilters ? 240 : 0,
              }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-[240px] overflow-hidden shrink-0"
            >
              <div className="pr-6 space-y-4">
                {/* ── Categories ── */}
                <div>
                  <button
                    onClick={() => setExpandedSections((p) => ({ ...p, categories: !p.categories }))}
                    className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-ink-3 mb-2"
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
                        <div className="space-y-0 pt-2">                              <label className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors hover:bg-paper-3 text-sm">
                                <input
                                  type="checkbox"
                                  checked={selectedCategorySlugs.length === 0}
                                  onChange={() => updateParams({ category: undefined })}
                                  suppressHydrationWarning
                                  className="w-4 h-4 rounded border-rule focus:ring-[var(--color-brand)]/30 focus:ring-offset-0"
                                  style={{ accentColor: "var(--color-brand)" }}
                                />
                                <span className={cn(selectedCategorySlugs.length === 0 ? "font-semibold text-ink" : "text-ink-3")}>
                                  All Categories
                                </span>
                              </label>

                          {categories.map((cat: any) => {
                            const isChecked = selectedCategorySlugs.includes(cat.slug);
                            return (
                              <label
                                key={cat._id}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors hover:bg-paper-3 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleCategory(cat.slug)}
                                  suppressHydrationWarning
                                  className="w-4 h-4 rounded border-rule focus:ring-[var(--color-brand)]/30 focus:ring-offset-0"
                                style={{ accentColor: "var(--color-brand)" }}
                                />
                                <span className="flex items-center justify-between w-full">
                                  <span className={cn(isChecked ? "font-semibold text-ink" : "text-ink-2")}>
                                    {cat.name}
                                  </span>
                                  <span className="text-xs text-ink-3 font-medium">
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

                <div className="h-px bg-paper-3" />

                {/* ── Price Range ── */}
                <div>
                  <button
                    onClick={() => setExpandedSections((p) => ({ ...p, price: !p.price }))}
                    className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-ink-3 mb-2"
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
                                    ? "bg-gold-500/10 text-gold-700 font-semibold"
                                    : "text-ink-2 hover:bg-paper-3"
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0",
                                    isActive
                                      ? "bg-brand-600 border-brand-600"
                                      : "border-rule bg-paper-2"
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

                <div className="h-px bg-paper-3" />

                {/* ── Rating ── */}
                <div>
                  <button
                    onClick={() => setExpandedSections((p) => ({ ...p, rating: !p.rating }))}
                    className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-ink-3 mb-2"
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
                                    ? "bg-gold-500/10 text-gold-700 font-semibold"
                                    : "text-ink-2 hover:bg-paper-3"
                                )}
                              >
                                <span className="flex items-center gap-0">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      size={13}
                                      className={cn(
                                        i < r ? "fill-gold-500 text-gold-500" : "text-rule"
                                      )}
                                    />
                                  ))}
                                </span>
                                <span className="text-xs text-ink-3">& up</span>
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
                    className="w-full py-2 rounded-lg border border-rule text-sm font-medium text-ink-2 hover:bg-paper-3 transition-colors mt-2"
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
                  className="absolute inset-0 bg-ink-2/40 backdrop-blur-sm"
                  onClick={() => setShowMobileFilters(false)}
                />

                {/* Sheet */}
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 300 }}
                  className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-paper-2 shadow-2xl z-10 flex flex-col"
                >
                  {/* Sticky header */}
                  <div className="flex items-center justify-between px-4 py-4 border-b border-rule shrink-0">
                    <div>
                      <h3 className="text-sm font-bold text-ink">Filters</h3>
                      <p className="text-xs text-ink-3">Refine your search</p>
                    </div>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-paper-3 transition-colors"
                      aria-label="Close filters"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Scrollable content */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                    {/* Categories */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-4">Categories</h4>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-colors active:bg-paper-3 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedCategorySlugs.length === 0}
                            onChange={() => updateParams({ category: undefined })}
                            suppressHydrationWarning
                            className="w-4 h-4 rounded border-rule focus:ring-[var(--color-brand)]/30 focus:ring-offset-0"
                            style={{ accentColor: "var(--color-brand)" }}
                          />
                          <span className={cn(selectedCategorySlugs.length === 0 ? "font-semibold" : "text-ink-3")}>All</span>
                        </label>
                        {categories.map((cat: any) => (
                          <label
                            key={cat._id}
                            className="flex items-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-colors active:bg-paper-3 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCategorySlugs.includes(cat.slug)}
                              onChange={() => toggleCategory(cat.slug)}
                              suppressHydrationWarning
                              className="w-4 h-4 rounded border-rule focus:ring-[var(--color-brand)]/30"
                              style={{ accentColor: "var(--color-brand)" }}
                            />
                            <span className="flex items-center justify-between w-full">
                              <span className={cn(selectedCategorySlugs.includes(cat.slug) ? "font-semibold text-ink" : "text-ink-2")}>
                                {cat.name}
                              </span>
                              <span className="text-xs text-ink-3">{cat.productCount || 0}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-paper-3" />

                    {/* Price Range */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-4">Price Range</h4>
                      <div className="space-y-2">
                        {PRICE_RANGES.map((range) => (
                          <button
                            key={range.label}
                            onClick={() => { togglePriceRange(range.min, range.max); }}
                            className={cn(
                              "w-full text-left px-4 py-3 rounded-lg text-sm transition-colors flex items-center gap-2",
                              Number(minPrice) === range.min && (range.max ? Number(maxPrice) === range.max : !maxPrice)
                                ? "bg-gold-500/10 text-gold-700 font-semibold"
                                : "text-ink-2 hover:bg-paper-3"
                            )}
                          >
                            <span
                              className={cn(
                                "w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0",
                                Number(minPrice) === range.min && (range.max ? Number(maxPrice) === range.max : !maxPrice)
                                  ? "bg-brand-600 border-brand-600"
                                  : "border-rule bg-paper-2"
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

                    <div className="h-px bg-paper-3" />

                    {/* Rating */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-4">Minimum Rating</h4>
                      <div className="space-y-2">
                        {RATING_OPTIONS.map((r) => (
                          <button
                            key={r}
                            onClick={() => { updateParams({ rating: Number(rating) === r ? undefined : String(r) }); }}
                            className={cn(
                              "w-full text-left px-4 py-3 rounded-lg text-sm transition-colors flex items-center gap-2",
                              Number(rating) === r
                                ? "bg-gold-500/10 text-gold-700 font-semibold"
                                : "text-ink-2 hover:bg-paper-3"
                            )}
                          >
                            <span className="flex items-center gap-0">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} size={13} className={cn(i < r ? "fill-gold-500 text-gold-500" : "text-rule")} />
                              ))}
                            </span>
                            <span className="text-xs text-ink-3">& up</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Sticky footer with apply */}
                  <div className="px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-rule shrink-0 flex gap-2 bg-paper-2">
                    <button
                      onClick={clearFilters}
                      className="flex-1 py-3.5 rounded-xl border border-rule text-sm font-medium text-ink-2 active:bg-paper-3 transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="flex-1 py-3.5 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-colors"
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
                  <div key={i} className="bg-paper-2 rounded-2xl border border-ink-soft overflow-hidden">
                    <Skeleton className="aspect-[4/3] sm:aspect-square rounded-none bg-ink-faint" />
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
                <h3 className="text-lg font-bold text-ink mb-2">Failed to load products</h3>
                <p className="text-sm text-ink-3 mb-6 max-w-sm mx-auto">
                  Something went wrong on our end. Try reloading the page.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-colors inline-flex items-center gap-2"
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
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-paper-2 flex items-center justify-center ring-1 ring-ink-soft">
                  <Package size={36} className="text-ink-3" />
                </div>
                <h3 className="text-xl font-display font-bold text-ink mb-2">No products found</h3>
                <p className="text-sm text-ink-2 mb-8 max-w-sm mx-auto leading-relaxed">
                  We couldn&apos;t find anything matching your filters.
                  Try a different category or price range.
                </p>
                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-colors inline-flex items-center gap-2"
                  >
                    <RotateCcw size={14} />
                    Clear Filters
                  </button>
                  {categories.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                      <span className="text-xs text-ink-3 font-medium">Try:</span>
                      {categories.slice(0, 4).map((cat: any) => (
                        <Link
                          key={cat._id}
                          href={`/products?category=${cat.slug}`}
                          className="text-xs px-4 py-2 rounded-full bg-paper-3 text-ink-2 hover:bg-paper-3 transition-colors font-medium"
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
                    <p className="text-sm text-ink-3">
                      Page <span className="font-bold text-ink">{page}</span>
                      {" · "}
                      <span className="font-bold text-ink">{pagination?.total || products.length}</span> products
                    </p>
                    {pagination && pagination.totalPages > 1 && (
                      <p className="text-xs text-ink-3">
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
                        className="w-10 h-10 rounded-xl border border-ink-soft bg-paper-2 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:bg-ink-faint enabled:hover:border-ink"
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      {generatePageNumbers(page, pagination.totalPages).map((p, i) =>
                        p === "..." ? (
                          <span key={`e${i}`} className="px-2 text-ink-3 font-bold text-sm">…</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => {
                              const ps = new URLSearchParams(searchParams.toString());
                              ps.set("page", String(p));
                              router.push(`/products?${ps.toString()}`);
                            }}
                            className={cn(
                              "min-w-[36px] h-10 rounded-xl text-sm font-black transition-all border",
                              page === p
                                ? "bg-brand-600 text-white border-brand-600 shadow-md"
                                : "border-ink-soft bg-paper-2 text-ink hover:bg-ink-faint hover:border-ink"
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
                        className="w-10 h-10 rounded-xl border border-ink-soft bg-paper-2 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:bg-ink-faint enabled:hover:border-ink"
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
      <div className="min-h-dvh pt-28 pb-16 bg-paper-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Skeleton className="h-4 w-12 rounded mb-4" />
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="h-4 w-96 rounded mt-2" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl mb-6" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-paper-2 rounded-2xl border border-rule overflow-hidden">
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
      <h4 className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-4">{title}</h4>
      {children}
    </div>
  );
}

/* ─── Enhanced Product List Item ─── */
function ProductListItem({ product, index = 0 }: { product: any; index?: number }) {
  const primaryVariant = getPrimaryVariant(product.variants);
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
      className="flex flex-row gap-4 sm:gap-6 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-ink-soft hover:border-ink/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-paper-2 group"
    >
      {/* Image */}
      <div className="w-28 sm:w-48 h-28 sm:h-48 rounded-xl sm:rounded-[1.5rem] bg-paper-3 overflow-hidden flex-shrink-0 relative">
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
            <Package size={32} className="text-ink-3" />
          </div>
        )}

        {/* Badges on image — editorial: gold OFF, quiet tracked caps */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          {product.isNewArrival && (
            <span className="w-fit text-[10px] font-extrabold uppercase tracking-[0.16em] px-2.5 py-1 rounded-lg bg-paper-2/90 text-ink-3 border border-rule backdrop-blur-md">
              New
            </span>
          )}
          {discount > 0 && (
            <span className="w-fit text-[10px] font-extrabold uppercase tracking-[0.16em] px-2.5 py-1 rounded-lg bg-gold-500 text-brand-950 border border-gold-400 backdrop-blur-md">
              {discount}% Off
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {categoryName && (
          <p className="text-[10px] uppercase tracking-[0.2em] text-brand-600 font-black mb-2">
            {categoryName}
          </p>
        )}
        <h3 className="text-base sm:text-xl font-display font-bold text-ink group-hover:text-brand-600 transition-colors line-clamp-2 leading-tight">
          {product.name}
        </h3>

        {product.shortDescription &&
          product.shortDescription.trim().toLowerCase() !== product.name.trim().toLowerCase() && (
          <p className="text-[11px] sm:text-sm text-ink-3 line-clamp-2 mt-0">
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
                  className={filled ? "fill-gold-500 text-gold-500" : "text-rule"}
                />
              ))}
            </div>
            <span className="text-[10px] sm:text-xs text-ink-3 font-medium tabular-nums">
              {product.averageRating?.toFixed(1)} ({product.reviewCount})
            </span>
          </div>
        )}

        {/* Pricing row */}
        <div className="flex items-center gap-2 sm:gap-4 mt-auto pt-2 sm:pt-4">
          {primaryVariant && (
            <>
              <span className="text-lg sm:text-2xl font-black text-ink tabular-nums">
                {formatPrice(primaryVariant.sellingPrice)}
              </span>
              {primaryVariant.mrp > primaryVariant.sellingPrice && (
                <span className="text-xs sm:text-base text-ink-3 line-through font-semibold tabular-nums">
                  {formatPrice(primaryVariant.mrp)}
                </span>
              )}
              <span className="text-xs text-ink-2 font-black uppercase tracking-widest bg-ink/5 border border-ink/10 px-2.5 py-1 rounded-md tabular-nums ml-auto">
                {primaryVariant.weightValue}{primaryVariant.weightUnit}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      {primaryVariant && primaryVariant.stock > 0 && (
        <div className="flex items-center">
          <span className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-paper-3 text-ink-3 text-xs font-medium group-hover:bg-[var(--color-brand)] group-hover:text-white transition-colors">
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
