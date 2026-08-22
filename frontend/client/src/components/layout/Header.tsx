"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn, getImageUrl, getLogoUrl, telHref, getPrimaryVariant, formatPrice } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { contentApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShoppingBag,
  Heart,
  User,
  Menu,
  X,
  Phone,
  LogOut,
  Package,
  Settings,
  ChevronDown,
  MessageCircle,
  Leaf,
  Gift,
  BookOpen,
  Star,
  Clock,
} from "lucide-react";
import CartDrawer from "@/components/cart/CartDrawer";



const quickLinks = [
  { href: "/recipes", label: "Recipes" },
];

function SearchParamsSync({ onSearchChange }: { onSearchChange: (search: string) => void }) {
  const searchParams = useSearchParams();
  const searchParam = searchParams?.get("search") || "";
  useEffect(() => {
    onSearchChange(searchParam);
  }, [searchParam, onSearchChange]);
  return null;
}

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isHidden, setIsHidden] = useState(false);
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const prevScrollYRef = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchToggleRef = useRef<HTMLButtonElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const megaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { itemCount } = useCart();
  const { user, isAuthenticated, logout } = useAuth();

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => contentApi.getSiteSettings(),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => import("@/lib/api").then(m => m.categoryApi.getCategories()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: productsData } = useQuery({
    queryKey: ["products", { featured: true, limit: 1 }],
    queryFn: () => import("@/lib/api").then(m => m.productApi.getProducts({ featured: true, limit: 1 })),
    staleTime: 5 * 60 * 1000,
  });

  const popularSearches = useMemo(() => {
    if (productsData?.data?.products && productsData.data.products.length > 0) {
      return productsData.data.products.slice(0, 5).map((p: any) => p.name);
    }
    return ["Namkeen", "Sweets", "Gift Hampers", "Mixture"];
  }, [productsData]);

  const settings = settingsData?.data?.settings;
  const sitePhone = settings?.phone;
  const whatsappNumber = settings?.whatsapp?.number || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210";
  const siteName = settings?.siteName || "RIJITA";

  const dynamicMegaMenuItems = useMemo(() => {
    // 1. Featured Product
    const fp = productsData?.data?.products?.[0];
    const featuredProduct = fp ? {
      title: fp.name,
      desc: fp.shortDescription || fp.description?.substring(0, 50) || "Premium Quality",
      price: formatPrice(getPrimaryVariant(fp.variants)?.sellingPrice ?? 0),
      image: fp.images?.[0] || "/uploads/placeholder.png",
      href: `/products/${fp.slug}`,
    } : {
      title: "Special Ratlami Sev",
      desc: "100% Jain Pure • Cloves & Black Pepper Infused",
      price: "₹180",
      image: "/uploads/banners/653f116a8d672803b9b4ef3b.png",
      href: "/products?search=Ratlami%20Sev",
    };

    // 2. Categories
    const rawCategories = categoriesData?.data?.categories || [];
    const categoryItems = rawCategories.slice(0, 4).map((c: any) => ({
      icon: Leaf,
      label: c.name,
      href: `/products?category=${c.slug}`,
      desc: c.description?.substring(0, 30) || `Explore ${c.name}`,
    }));

    // If no categories from DB, use fallback
    if (categoryItems.length === 0) {
      categoryItems.push(
        { icon: Star, label: "Namkeen", href: "/products?category=namkeen", desc: "Crispy savory traditional mixtures" },
        { icon: Gift, label: "Sweets", href: "/products?category=sweets", desc: "Pure ghee Indian mithai" },
        { icon: Package, label: "Healthy Bites", href: "/products?category=snacks", desc: "Roasted & zero-guilt snacks" }
      );
    }

    return [
      {
        label: "Shop",
        href: "/products",
        featuredProduct,
        columns: [
          {
            title: "Collections",
            items: [
              { icon: Star, label: "All Products", href: "/products", desc: "Explore 100% pure authentic range" },
              { icon: Clock, label: "New Arrivals", href: "/products?newArrival=true", desc: "Freshly crafted savory delights" },
              { icon: Gift, label: "Best Sellers", href: "/products?bestSeller=true", desc: "Top loved customer choices" },
            ],
          },
          {
            title: "Occasions & Gifts",
            items: [
              { icon: Gift, label: "Gift Packs", href: "/collections", desc: "Festive & ceremonial hampers" },
              { icon: Leaf, label: "Categories", href: "/categories", desc: "Browse by snack family" },
            ],
          },
        ],
      },
      {
        label: "Categories",
        href: "/categories",
        columns: [
          {
            title: "Purity Collections",
            items: [
              { icon: Leaf, label: "All Categories", href: "/categories", desc: "Complete catalog view" },
              ...categoryItems,
            ],
          },
        ],
      },
      {
        label: "About",
        href: "/about",
        columns: [
          {
            title: "Our Heritage",
            items: [
              { icon: Star, label: "Our Pure Story", href: "/about", desc: "Jain tradition & craftsmanship" },
              { icon: Leaf, label: "100% Quality Promise", href: "/about#quality", desc: "Zero onion, zero garlic guarantee" },
              { icon: BookOpen, label: "Articles & Journal", href: "/blog", desc: "Recipes, purity guides & news" },
              { icon: MessageCircle, label: "Get In Touch", href: "/contact", desc: "Customer support & inquiries" },
            ],
          },
        ],
      },
    ];
  }, [categoriesData, productsData]);

  const [clientLogo, setClientLogo] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("cached_site_logo");
      if (cached) setClientLogo(cached);
    }
  }, []);

  useEffect(() => {
    if (settings?.logo) {
      try {
        localStorage.setItem("cached_site_logo", settings.logo);
      } catch (e) {}
      setClientLogo(settings.logo);
    }
  }, [settings?.logo]);

  // Smart hide on scroll
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentY = window.scrollY;
          setIsScrolled(currentY > 20);
          if (currentY > 80) {
            setIsHidden(currentY > prevScrollYRef.current && currentY > 200);
          } else {
            setIsHidden(false);
          }
          prevScrollYRef.current = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (!isSearchOpen) return;
    const t = setTimeout(() => searchInputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [isSearchOpen]);

  // The mega-menu close timer is fired from hover/blur handlers, so it can still
  // be pending when the header unmounts on navigation.
  useEffect(() => {
    return () => {
      if (megaTimeoutRef.current) clearTimeout(megaTimeoutRef.current);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    setActiveMega(null);
  }, [pathname]);

  // Close mega-menu on scroll / outside click
  useEffect(() => {
    if (!activeMega) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-mega-trigger]") && !target.closest("[data-mega-panel]")) {
        setActiveMega(null);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [activeMega]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setIsSearchOpen((prev) => !prev);
      return;
    }
    if (e.key === "Escape") {
      if (activeMega) { setActiveMega(null); return; }
      setActiveMega(null);
      if (isMobileMenuOpen) { setIsMobileMenuOpen(false); hamburgerRef.current?.focus(); }
      else if (isUserMenuOpen) setIsUserMenuOpen(false);
      else if (isSearchOpen) { setIsSearchOpen(false); searchToggleRef.current?.focus(); }
    }
  }, [isMobileMenuOpen, isUserMenuOpen, isSearchOpen, activeMega]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Focus trap in mobile menu + body scroll lock
  const drawerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    const focusable = drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    drawer.addEventListener("keydown", trap);
    first?.focus();

    return () => {
      drawer.removeEventListener("keydown", trap);
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [isMobileMenuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
      searchToggleRef.current?.focus();
    }
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    router.push("/");
  };

  // Stable identity: the header re-renders on every scroll tick, and an inline
  // arrow here would hand CartDrawer a new onClose each time.
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const showMega = (label: string) => {
    if (megaTimeoutRef.current) clearTimeout(megaTimeoutRef.current);
    setActiveMega(label);
  };

  const hideMega = (delay = 150) => {
    if (megaTimeoutRef.current) clearTimeout(megaTimeoutRef.current);
    megaTimeoutRef.current = setTimeout(() => setActiveMega(null), delay);
  };

  const ringClasses = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30 focus-visible:ring-offset-2";

  return (
    <>
    <Suspense fallback={null}>
      <SearchParamsSync onSearchChange={setSearchQuery} />
    </Suspense>
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-[var(--z-sticky-nav)] transition-transform duration-300",
        isHidden ? "-translate-y-full" : "translate-y-0"
      )}
      aria-label="Site header"
    >
      {/* Subtle top gold accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-brand-600 via-gold-500 to-brand-600" />

      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[var(--z-modal)] focus:px-4 focus:py-2 focus:bg-brand-600 focus:text-white focus:rounded-xl focus:shadow-2xl focus:font-bold focus:text-sm focus:tracking-wide focus:outline-none focus:ring-4 focus:ring-gold-400/30 transition-ui"
      >
        Skip to main content
      </a>

      {/* ── Editorial Announcement Bar ── */}
      <div className="bg-brand-700 text-gold-300 text-[10px] py-2 px-6 font-black uppercase tracking-[0.2em] flex items-center justify-between gap-4 shadow-sm">
        <div className="hidden lg:flex items-center gap-2 opacity-80">
          <Clock size={12} className="text-gold-500" />
          <span>Same-Day Fresh Batch Packaging</span>
        </div>

        {settings?.announcement?.isActive && settings.announcement.text ? (
          <div className="flex-1 text-center px-2" title="Announcement">
            <span className="text-white tracking-widest text-balance leading-tight block">{settings.announcement.text}</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-6 mx-auto lg:mx-0 text-center">
            <span className="inline-flex items-center gap-2 text-white/90">
              <Leaf size={12} className="text-gold-500" />
              100% Pure Jain
            </span>
            <span className="hidden sm:inline opacity-20">|</span>
            <span className="hidden sm:inline text-white/80">Zero Onion • Zero Garlic</span>
            <span className="hidden md:inline opacity-20">|</span>
            <span className="hidden md:inline text-gold-400">
              Free Express Shipping &gt; ₹{Number(settings?.shipping?.freeShippingThreshold ?? 499).toLocaleString("en-IN")}
            </span>
          </div>
        )}

        <div className="hidden lg:flex items-center gap-3">
          {sitePhone && (
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hello! I would like to inquire about 100% Jain Namkeen from RIJITA Arya Foods.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white hover:text-whatsapp transition-colors group/wa"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-whatsapp opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-whatsapp"></span>
              </span>
              <MessageCircle size={14} className="text-whatsapp" />
              <span>WhatsApp Order</span>
            </a>
          )}
        </div>
      </div>

      {/* ── Main Navbar (Floating Glass Pill) ── */}
      <div className={cn(
        "w-full transition-all duration-700 ease-expo-out px-4 sm:px-6 lg:px-8",
        isScrolled ? "pt-2" : "pt-2 sm:pt-3"
      )}>
        <nav
          className={cn(
            "mx-auto transition-all duration-700 ease-expo-out max-w-7xl relative z-50",
            isScrolled
              ? "bg-white/70 backdrop-blur-3xl shadow-[0_40px_80px_-20px_rgba(5,20,8,0.1)] border border-white/40 rounded-[2rem] py-1 px-4 sm:px-8"
              : "bg-white shadow-[0_20px_60px_-15px_rgba(5,20,8,0.05)] border border-transparent rounded-[2rem] py-1.5 md:py-2 px-4 sm:px-8"
          )}
        >
          <div className="flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              ref={hamburgerRef}
              className={cn("lg:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-brand-50/60 transition-colors text-brand-800", ringClasses)}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isMobileMenuOpen ? (
                  <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X size={24} className="text-brand-800" />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu size={24} className="text-brand-800" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* ── Prominent Large Logo ── */}
            <Link href="/" className="flex items-center gap-3 group shrink-0 py-0.5" aria-label="Go to homepage">
              <div className={cn(
                "relative flex items-center transition-all duration-700 ease-out hover:scale-[1.02] origin-left",
                isScrolled
                  ? "h-9 sm:h-10 md:h-11 lg:h-12"
                  : "h-[clamp(2.5rem,8vw,3.25rem)] sm:h-13 md:h-15 lg:h-16 xl:h-18"
              )}>
                {(() => {
                  const logoUrl = getLogoUrl(settings?.logo || clientLogo || undefined, settings?.updatedAt);
                  if (logoUrl) {
                    return (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={logoUrl}
                        alt={siteName}
                        suppressHydrationWarning
                        className={cn(
                          "w-auto object-contain mix-blend-multiply filter contrast-[1.03] transition-all duration-700 ease-expo-out",
                          isScrolled
                            ? "h-9 sm:h-10 md:h-11 lg:h-12 max-w-[140px] sm:max-w-[180px] lg:max-w-[220px]"
                            : "h-[clamp(2.5rem,8vw,3.25rem)] sm:h-13 md:h-15 lg:h-16 xl:h-18 max-w-[150px] sm:max-w-[220px] md:max-w-[280px] lg:max-w-[340px]"
                        )}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent && parent.lastElementChild?.tagName !== 'SPAN') {
                            const span = document.createElement('span');
                            span.className = "text-xl sm:text-3xl md:text-4xl font-black text-brand-900 tracking-tight whitespace-nowrap font-serif";
                            span.innerText = siteName;
                            parent.appendChild(span);
                          }
                        }}
                      />
                    );
                  }
                  return (
                    <span className="text-xl sm:text-3xl md:text-4xl font-black text-brand-900 tracking-tight whitespace-nowrap font-serif px-2">
                      {siteName}
                    </span>
                  );
                })()}
              </div>
            </Link>

            {/* ── Desktop Navigation ── */}
            <div className="hidden lg:flex items-center gap-1.5" aria-label="Main navigation">
              {dynamicMegaMenuItems.map((item: any) => (
                <div
                  key={item.label}
                  className="relative"
                  data-mega-trigger
                  onMouseEnter={() => showMega(item.label)}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.contains(document.activeElement)) hideMega();
                  }}
                  onFocus={() => showMega(item.label)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      hideMega(0);
                    }
                  }}
                >
                  <Link
                    href={item.href}
                    aria-haspopup="true"
                    aria-expanded={activeMega === item.label}
                    className={cn(
                      "relative px-5 py-2.5 text-[15px] font-bold tracking-wide rounded-full transition-all duration-300 flex items-center gap-2 group/nav",
                      ringClasses,
                      activeMega === item.label || isActive(item.href)
                        ? "text-white bg-brand-700 shadow-[0_8px_16px_-6px_rgba(5,20,8,0.4)]"
                        : "text-brand-700/80 hover:text-brand-700 hover:bg-brand-50/80"
                    )}
                  >
                    <span>{item.label}</span>
                    <ChevronDown size={14} className={cn("transition-transform duration-300 opacity-60 group-hover/nav:opacity-100", activeMega === item.label && "rotate-180 opacity-100")} />
                  </Link>

                  {/* Mega-menu panel (gpt-taste Premium) */}
                  <AnimatePresence>
                    {activeMega === item.label && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50" data-mega-panel>
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.98 }}
                          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                          className="bg-brand-700 text-paper rounded-3xl shadow-[0_40px_100px_-20px_#051408] border border-white/10 overflow-hidden"
                          style={{ minWidth: item.featuredProduct ? "720px" : item.label === "About" ? "360px" : "600px" }}
                        >
                          <div className={cn(
                            "grid gap-px bg-white/10",
                            item.featuredProduct ? "grid-cols-12" : item.columns.length === 2 ? "grid-cols-2" : "grid-cols-1"
                          )}>
                            {/* Columns */}
                            <div className={cn(
                              "p-6 bg-brand-700 flex flex-col gap-6",
                              item.featuredProduct ? "col-span-7" : "col-span-1"
                            )}>
                              {item.columns.map((col: any) => (
                                <div key={col.title}>
                                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-300 mb-3 px-3 opacity-80">
                                    {col.title}
                                  </p>
                                  <div className="space-y-1">
                                    {col.items.map((sub: any) => {
                                      const Icon = sub.icon;
                                      return (
                                        <Link
                                          key={sub.href}
                                          href={sub.href}
                                          onClick={() => setActiveMega(null)}
                                          className="flex items-start gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors group/item"
                                        >
                                          <div className="w-10 h-10 rounded-xl bg-white/5 group-hover/item:bg-brand-500 text-brand-300 group-hover/item:text-brand-700 flex items-center justify-center shrink-0 transition-ui">
                                            <Icon size={18} />
                                          </div>
                                          <div className="min-w-0 flex flex-col justify-center min-h-[40px]">
                                            <span className="text-sm font-extrabold text-paper group-hover/item:text-brand-300 transition-colors block leading-tight">
                                              {sub.label}
                                            </span>
                                            <span className="text-[11px] text-white/50 leading-tight block mt-1 font-medium">
                                              {sub.desc}
                                            </span>
                                          </div>
                                        </Link>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Featured Card inside Mega Menu */}
                            {item.featuredProduct && (
                              <div className="col-span-5 p-6 bg-brand-700 flex flex-col relative overflow-hidden group/featured">
                                <div className="absolute inset-0 bg-brand-900/50 z-0 transition-colors duration-500 group-hover/featured:bg-brand-900/80" />
                                {item.featuredProduct.image && (
                                  <div className="absolute inset-0 z-0 opacity-20 mix-blend-overlay transition-opacity duration-500 group-hover/featured:opacity-40">
                                    <Image
                                      src={getImageUrl(item.featuredProduct.image)}
                                      alt=""
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                )}
                                <div className="relative z-10 flex flex-col h-full justify-between">
                                  <div>
                                    <span className="inline-block px-3 py-1 rounded-full bg-brand-500 text-brand-700 text-[10px] font-black uppercase tracking-widest mb-4">
                                      Featured
                                    </span>
                                    <h4 className="text-xl font-black text-paper leading-tight tracking-tight mb-2 group-hover/featured:text-brand-300 transition-colors">
                                      {item.featuredProduct.title}
                                    </h4>
                                    <p className="text-xs text-white/60 font-medium leading-relaxed max-w-[90%]">
                                      {item.featuredProduct.desc}
                                    </p>
                                  </div>
                                  <div className="mt-8 flex items-center justify-between">
                                    <span className="text-lg font-black text-brand-300">{item.featuredProduct.price}</span>
                                    <Link
                                      href={item.featuredProduct.href}
                                      onClick={() => setActiveMega(null)}
                                      className="px-4 py-2 rounded-xl bg-white text-brand-700 text-xs font-black hover:bg-brand-300 transition-colors"
                                    >
                                      View Details
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              {/* Quick links */}
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-5 py-2.5 text-[15px] font-bold tracking-wide rounded-full transition-all duration-300 flex items-center gap-2 group/nav",
                    ringClasses,
                    isActive(link.href)
                      ? "text-white bg-brand-700 shadow-[0_8px_16px_-6px_rgba(5,20,8,0.4)]"
                      : "text-brand-700/80 hover:text-brand-700 hover:bg-brand-50/80"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search Trigger with Command-K indicator */}
              <button
                ref={searchToggleRef}
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={cn(
                  "w-11 h-11 xl:w-auto xl:px-4 xl:py-2.5 flex items-center justify-center xl:justify-start gap-2.5 rounded-full transition-all duration-300 bg-brand-700/5 hover:bg-brand-700/10 text-brand-700/80 hover:text-brand-700 shrink-0",
                  ringClasses,
                  isSearchOpen && "bg-brand-700 text-white hover:bg-brand-700 hover:text-white shadow-md"
                )}
                aria-label="Search products"
                aria-expanded={isSearchOpen}
                aria-controls="header-search-panel"
              >
                <Search size={18} strokeWidth={2.2} className={isSearchOpen ? "text-white" : ""} />
                <span className="hidden xl:inline text-[13px] font-bold">Search</span>
                <kbd className={cn(
                  "hidden xl:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-md ml-1",
                  isSearchOpen ? "bg-white/20 text-white" : "bg-white text-brand-700 shadow-sm"
                )}>
                  ⌘K
                </kbd>
              </button>

              {/* Wishlist */}
              <button
                onClick={() => {
                  if (!isAuthenticated) { router.push("/auth/login"); return; }
                  router.push("/wishlist");
                }}
                className={cn("hidden md:flex w-11 h-11 items-center justify-center rounded-full bg-brand-700/5 hover:bg-rose-50 hover:text-rose-600 text-brand-700/80 transition-all duration-300 relative group/icon shrink-0", ringClasses)}
                aria-label={isAuthenticated && user?.wishlist?.length ? `Wishlist (${user.wishlist.length} items)` : "Wishlist"}
              >
                <Heart size={20} strokeWidth={2.2} className="group-hover/icon:scale-110 transition-transform duration-300" />
                {isAuthenticated && user?.wishlist && user.wishlist.length > 0 && (
                  <span className="absolute top-1 right-1 w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-sm">
                    {user.wishlist.length > 99 ? "99+" : user.wishlist.length}
                  </span>
                )}
              </button>

              {/* Cart */}
              <button
                onClick={() => setIsCartOpen(true)}
                className={cn("w-11 h-11 flex items-center justify-center rounded-full bg-brand-700 text-white hover:bg-brand-800 hover:scale-105 transition-all duration-300 shadow-md relative group/cart shrink-0", ringClasses)}
                aria-label={itemCount > 0 ? `Cart (${itemCount} items)` : "Cart"}
              >
                <ShoppingBag size={20} strokeWidth={2.2} className="group-hover/cart:scale-110 transition-transform duration-300" />
                <AnimatePresence>
                  {itemCount > 0 && (
                     <motion.span
                       initial={{ scale: 0 }}
                       animate={{ scale: 1 }}
                       exit={{ scale: 0 }}
                       transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                       className="absolute -top-1 -right-1 w-5 h-5 bg-gold-500 text-brand-700 text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-md"
                     >
                       {itemCount > 99 ? "99+" : itemCount}
                     </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* User Menu */}
              <div className="relative hidden md:block shrink-0" ref={userMenuRef}>
                <button
                  onClick={() => {
                    if (isAuthenticated) setIsUserMenuOpen(!isUserMenuOpen);
                    else router.push("/auth/login");
                  }}
                  className={cn(
                    "w-11 h-11 flex items-center justify-center rounded-full transition-all duration-300 bg-brand-700/5 hover:bg-brand-700/10 text-brand-700/80 hover:text-brand-700",
                    ringClasses,
                    isUserMenuOpen && "bg-brand-700/10 text-brand-700 shadow-inner"
                  )}
                  aria-label={isAuthenticated ? `Account menu${user?.name ? ` (${user.name})` : ""}` : "Sign in"}
                  aria-haspopup={isAuthenticated ? "true" : undefined}
                  aria-expanded={isAuthenticated ? isUserMenuOpen : undefined}
                >
                  {isAuthenticated && user?.avatar ? (
                    <Image src={getImageUrl(user.avatar)} alt="" width={44} height={44} className="w-full h-full rounded-full object-cover border border-white/50" />
                  ) : (
                    <User size={20} strokeWidth={2.2} />
                  )}
                </button>

                {/* Dropdown */}
                <AnimatePresence>
                  {isUserMenuOpen && isAuthenticated && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} aria-hidden="true" />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -4 }}
                        transition={{ duration: 0.15 }}
                        role="menu"
                        className="absolute right-0 top-full mt-2 w-64 bg-white rounded-3xl shadow-[0_20px_50px_-10px_rgba(10,41,15,0.15)] border border-rule z-50 py-2.5 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-rule/70 bg-gradient-to-r from-brand-50/80 to-gold-500/10 mx-2 rounded-2xl mb-1.5">
                          <p className="text-xs font-extrabold text-brand-800 truncate">{user?.name}</p>
                          <p className="text-xs text-brand-600 truncate mt-0.5 font-medium">{user?.email}</p>
                        </div>
                        <div className="px-2 py-1 space-y-0.5">
                          <Link href="/orders" onClick={() => setIsUserMenuOpen(false)} role="menuitem"
                            className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-extrabold hover:bg-brand-50/80 rounded-xl transition-colors text-brand-700 hover:text-brand-600">
                            <Package size={15} className="text-brand-600" />
                            <span>My Orders</span>
                          </Link>
                          <Link href="/wishlist" onClick={() => setIsUserMenuOpen(false)} role="menuitem"
                            className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-extrabold hover:bg-rose-50/80 rounded-xl transition-colors text-brand-700 hover:text-rose-600">
                            <Heart size={15} className="text-rose-500" />
                            <span>Wishlist</span>
                          </Link>
                          {user?.role && ["admin", "superadmin"].includes(user.role) && (
                            <Link href="/admin" onClick={() => setIsUserMenuOpen(false)} role="menuitem"
                              className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-extrabold hover:bg-gold-500/10 rounded-xl transition-colors text-brand-700 hover:text-gold-800">
                              <Settings size={15} className="text-gold-600" />
                              <span>Admin Dashboard</span>
                            </Link>
                          )}
                          <div className="h-px bg-paper-3 my-1 mx-2" />
                          <button onClick={handleLogout} role="menuitem"
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-extrabold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                            <LogOut size={15} />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

        {/* Search Panel */}
        <div
          id="header-search-panel"
          className={cn(
            "grid transition-[grid-template-rows,opacity,border] duration-300 ease-in-out bg-white overflow-hidden",
            isSearchOpen ? "grid-rows-[1fr] opacity-100 border-t border-rule" : "grid-rows-[0fr] opacity-0 border-t-0"
          )}
          aria-hidden={!isSearchOpen}
        >
          <div className="min-h-0">
            <div className="max-w-3xl mx-auto px-4 py-5">
              <form onSubmit={handleSearch}>
                <div className="relative group">
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-600 group-focus-within:text-brand-600 transition-colors" aria-hidden="true" />
                  <label htmlFor="header-search" className="sr-only">Search products</label>
                  <input
                    id="header-search"
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && setIsSearchOpen(false)}
                    placeholder="Search for products..."
                    className="w-full pl-12 pr-12 py-3.5 rounded-2xl border-2 border-rule bg-paper-2/80 focus:outline-none focus:ring-0 focus:border-brand-600 focus:bg-white text-brand-800 font-semibold transition-ui placeholder:text-brand-600 text-[16px] sm:text-sm shadow-inner"
                    tabIndex={isSearchOpen ? 0 : -1}
                  />
                  <button
                    type="button"
                    onClick={() => { setIsSearchOpen(false); setSearchQuery(""); searchToggleRef.current?.focus(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-paper-3 text-brand-600 transition-colors"
                    aria-label="Close search"
                    tabIndex={isSearchOpen ? 0 : -1}
                  >
                    <X size={18} />
                  </button>
                </div>
              </form>
              <div className="mt-3.5 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-widest text-brand-600">Popular Searches:</span>
                {popularSearches.map((tag: string) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => { router.push(`/products?search=${encodeURIComponent(tag)}`); setIsSearchOpen(false); }}
                    className={cn("px-3.5 py-1.5 rounded-full bg-paper-3 hover:bg-brand-700 text-brand-700 hover:text-white transition-ui text-xs font-extrabold shadow-2xs", ringClasses)}
                    tabIndex={isSearchOpen ? 0 : -1}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
    </header>

    {/* ── Mobile Menu Drawer ── */}
    <AnimatePresence>
      {isMobileMenuOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-[400] bg-brand-700/60 lg:hidden"
            aria-hidden="true"
          />
          <motion.div
            ref={drawerRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 left-0 z-[420] w-full max-w-[340px] bg-white shadow-2xl lg:hidden flex flex-col overflow-hidden overscroll-contain will-change-transform"
          >
            {/* Drawer header — Prominent Drawer Logo */}
            <div className="flex items-center justify-between px-5 py-5 bg-white border-b border-rule z-10 shadow-xs">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getLogoUrl(settings?.logo || clientLogo || undefined, settings?.updatedAt)}
                  alt={siteName}
                  suppressHydrationWarning
                  className="h-16 sm:h-20 w-auto max-w-[300px] object-contain mix-blend-multiply filter contrast-[1.03] transition-ui duration-300"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes("logo.png")) {
                      target.src = "/uploads/logo.png";
                    }
                  }}
                />
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn("p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-paper-3 text-brand-700 transition-colors", ringClasses)}
                aria-label="Close menu"
              >
                <X size={22} />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto py-4 px-4 bg-paper-2 min-h-0 flex flex-col">
              <div className="space-y-1.5 shrink-0">
                {dynamicMegaMenuItems.map((item: any) => (
                  <div key={item.label}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center px-4 py-3.5 rounded-xl text-base font-black transition-ui",
                        ringClasses,
                        isActive(item.href)
                          ? "text-brand-600 bg-brand-100/70"
                          : "text-brand-800 hover:bg-paper-3 hover:text-brand-800"
                      )}
                    >
                      <span>{item.label}</span>
                      {isActive(item.href) && <span className="ml-auto w-2.5 h-2.5 rounded-full bg-brand-600" />}
                    </Link>
                    {/* Sub-links */}
                    <div className="ml-4 my-1.5 space-y-1">
                      {item.columns.flatMap((col: any) => col.items).map((sub: any) => {
                        const SubIcon = sub.icon;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-extrabold text-brand-700 hover:text-brand-800 hover:bg-paper-3 transition-colors"
                          >
                            <SubIcon size={15} className="text-brand-600 shrink-0" />
                            <span className="truncate">{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center px-4 py-3.5 rounded-xl text-base font-black transition-ui",
                      ringClasses,
                      isActive(link.href)
                        ? "text-brand-600 bg-brand-100/70"
                        : "text-brand-800 hover:bg-paper-3 hover:text-brand-800"
                    )}
                  >
                    <span>{link.label}</span>
                    {isActive(link.href) && <span className="ml-auto w-2.5 h-2.5 rounded-full bg-brand-600" />}
                  </Link>
                ))}
              </div>

              <div className="my-4 h-px bg-rule shrink-0" />

              {isAuthenticated ? (
                <div className="space-y-1.5 px-1 mt-auto shrink-0 pb-2">
                  <div className="px-4 py-3.5 border border-rule rounded-xl bg-white shadow-xs mb-3">
                    <p className="text-sm font-extrabold text-brand-800 truncate">{user?.name}</p>
                    <p className="text-xs text-brand-600 truncate mt-0.5 font-medium">{user?.email}</p>
                  </div>
                  {[
                    { href: "/orders", label: "My Orders", icon: Package },
                    { href: "/wishlist", label: "Wishlist", icon: Heart },
                  ].map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href} onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-extrabold text-brand-700 hover:bg-paper-3 hover:text-brand-800 transition-ui">
                      <Icon size={18} className="text-brand-600" />
                      <span>{label}</span>
                    </Link>
                  ))}
                  {user?.role && ["admin", "superadmin"].includes(user.role) && (
                    <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-extrabold text-gold-800 bg-gold-500/10 hover:bg-gold-500/20 transition-ui">
                      <Settings size={18} className="text-gold-600" />
                      <span>Admin Panel</span>
                    </Link>
                  )}
                  <button onClick={handleLogout}
                    className="flex w-full items-center gap-3.5 px-4 py-3.5 mt-2 rounded-xl text-sm font-extrabold text-rose-600 bg-rose-50/80 hover:bg-rose-100 transition-colors">
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 px-1 mt-auto shrink-0 pb-2">
                  <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}
                    className="text-center px-4 py-3.5 rounded-xl text-sm font-black bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-md">
                    Sign In to Account
                  </Link>
                  <Link href="/auth/register" onClick={() => setIsMobileMenuOpen(false)}
                    className="text-center px-4 py-3.5 rounded-xl text-sm font-black border border-rule text-brand-800 hover:border-brand-600 hover:text-brand-600 hover:bg-brand-50/50 transition-ui">
                    Create Account
                  </Link>
                </div>
              )}
            </nav>

            {/* WhatsApp CTA */}
            <div className="p-4 bg-white border-t border-rule shrink-0">
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-whatsapp text-white text-sm font-black shadow-md hover:bg-whatsapp-600 transition-colors"
              >
                <MessageCircle size={18} />
                <span>Order on WhatsApp</span>
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* ── Cart Drawer ── */}
    <CartDrawer open={isCartOpen} onClose={closeCart} />
  </>
);
}
