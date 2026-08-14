"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn, getImageUrl, getLogoUrl } from "@/lib/utils";
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

/* ── Nav Data ── */
const megaMenuItems = [
  {
    label: "Shop",
    href: "/products",
    featuredProduct: {
      title: "Special Ratlami Sev",
      desc: "100% Jain Pure • Cloves & Black Pepper Infused",
      price: "₹180",
      image: "/uploads/banners/653f116a8d672803b9b4ef3b.png",
      href: "/products?search=Ratlami%20Sev",
    },
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
          { icon: Star, label: "Namkeen", href: "/products?category=namkeen", desc: "Crispy savory traditional mixtures" },
          { icon: Gift, label: "Sweets", href: "/products?category=sweets", desc: "Pure ghee Indian mithai" },
          { icon: Package, label: "Healthy Bites", href: "/products?category=snacks", desc: "Roasted & zero-guilt snacks" },
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

const quickLinks = [
  { href: "/recipes", label: "Recipes" },
];

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
  const settings = settingsData?.data?.settings;
  const sitePhone = settings?.phone;
  const whatsappNumber = settings?.whatsapp?.number || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210";
  const siteName = settings?.siteName || "RIJITA";

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
    if (isSearchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [isSearchOpen]);

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
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[var(--z-modal)] focus:px-4 focus:py-2 focus:bg-brand-600 focus:text-white focus:rounded-xl focus:shadow-2xl focus:font-bold focus:text-sm focus:tracking-wide focus:outline-none focus:ring-4 focus:ring-emerald-500/30 transition-ui"
      >
        Skip to main content
      </a>

      {/* ── Editorial Announcement Bar ── */}
      <div className="bg-brand-600 text-white text-center text-xs py-2 px-4 font-semibold tracking-wider flex items-center justify-between gap-4 border-b border-brand-700 shadow-xs">
        <div className="hidden lg:flex items-center gap-2 text-emerald-100/90 text-xs">
          <Clock size={13} className="text-gold-500" />
          <span>Same-Day Fresh Batch Packaging</span>
        </div>

        <div className="flex items-center justify-center gap-2.5 sm:gap-4 mx-auto lg:mx-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-black uppercase tracking-wider">
            <Leaf size={11} className="animate-pulse text-amber-300" />
            100% Pure Jain
          </span>
          <span className="hidden sm:inline opacity-30">|</span>
          <span className="text-white/95 font-medium">Zero Onion • Zero Garlic</span>
          <span className="hidden sm:inline opacity-30">|</span>
          <span className="hidden md:inline text-amber-300 font-extrabold">Free Express Shipping &gt; ₹499</span>
        </div>

        <div className="hidden lg:flex items-center gap-3 text-xs">
          {sitePhone && (
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hello! I would like to inquire about 100% Jain Namkeen from RIJITA Arya Foods.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-amber-300 hover:text-white transition-colors font-extrabold group/wa"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-whatsapp opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-whatsapp"></span>
              </span>
              <MessageCircle size={13} className="text-whatsapp" />
              <span>WhatsApp Express Order</span>
            </a>
          )}
        </div>
      </div>

      {/* ── Main Navbar ── */}
      <nav
        className={cn(
          "transition-ui duration-300",
          isScrolled
            ? "bg-white/95 backdrop-blur-xl shadow-[0_12px_32px_-12px_rgba(27,110,42,0.12)] border-b border-emerald-900/10 py-2 sm:py-2.5"
            : "bg-white border-b border-stone-200/60 py-2.5 sm:py-3 md:py-3.5"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              ref={hamburgerRef}
              className={cn("lg:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-emerald-50/60 transition-colors text-stone-800", ringClasses)}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isMobileMenuOpen ? (
                  <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X size={24} className="text-stone-800" />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu size={24} className="text-stone-800" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* ── Prominent Large Logo ── */}
            <Link href="/" className="flex items-center gap-3 group shrink-0 py-0.5" aria-label="Go to homepage">
              <div className={cn(
                "relative flex items-center transition-all duration-300 hover:scale-[1.02]",
                isScrolled
                  ? "h-10 sm:h-12 md:h-14 lg:h-16"
                  : "h-12 sm:h-14 md:h-16 lg:h-18 xl:h-20"
              )}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getLogoUrl(settings?.logo || clientLogo || undefined, settings?.updatedAt)}
                  alt={siteName}
                  suppressHydrationWarning
                  className={cn(
                    "w-auto max-w-[200px] sm:max-w-[280px] md:max-w-[360px] lg:max-w-[420px] xl:max-w-[480px] object-contain mix-blend-multiply filter contrast-[1.03] transition-ui duration-300",
                    isScrolled
                      ? "h-10 sm:h-12 md:h-14 lg:h-16"
                      : "h-12 sm:h-14 md:h-16 lg:h-18 xl:h-20"
                  )}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes("logo.png")) {
                      target.src = "/uploads/logo.png";
                    }
                  }}
                />
              </div>
            </Link>

            {/* ── Desktop Navigation ── */}
            <div className="hidden lg:flex items-center gap-1.5" aria-label="Main navigation">
              {megaMenuItems.map((item) => (
                <div
                  key={item.label}
                  className="relative"
                  data-mega-trigger
                  onMouseEnter={() => showMega(item.label)}
                  onMouseLeave={() => hideMega()}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "relative px-4 py-2.5 text-base font-extrabold tracking-wide rounded-full transition-ui duration-200 flex items-center gap-1.5 group/nav",
                      ringClasses,
                      activeMega === item.label || isActive(item.href)
                        ? "text-brand-600 bg-emerald-50/90 font-black shadow-2xs"
                        : "text-stone-700 hover:text-brand-600 hover:bg-stone-50"
                    )}
                  >
                    <span>{item.label}</span>
                    <ChevronDown size={15} className={cn("transition-transform duration-200 text-stone-400 group-hover/nav:text-brand-600", activeMega === item.label && "rotate-180 text-brand-600")} />
                  </Link>

                  {/* Mega-menu panel */}
                  <AnimatePresence>
                    {activeMega === item.label && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50" data-mega-panel>
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.98 }}
                          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                          className="bg-white rounded-3xl shadow-[0_24px_60px_-15px_rgba(27,110,42,0.18)] border border-stone-200/90 overflow-hidden"
                          style={{ minWidth: item.featuredProduct ? "640px" : item.label === "About" ? "360px" : "540px" }}
                        >
                          <div className={cn(
                            "grid gap-0",
                            item.featuredProduct ? "grid-cols-12" : item.columns.length === 2 ? "grid-cols-2" : "grid-cols-1"
                          )}>
                            {/* Columns */}
                            <div className={cn(
                              "p-5",
                              item.featuredProduct ? "col-span-7 border-r border-stone-100" : "col-span-1"
                            )}>
                              {item.columns.map((col) => (
                                <div key={col.title} className="mb-4 last:mb-0">
                                  <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-600 mb-2.5 px-2">
                                    {col.title}
                                  </p>
                                  <div className="space-y-1">
                                    {col.items.map((sub) => {
                                      const Icon = sub.icon;
                                      return (
                                        <Link
                                          key={sub.href}
                                          href={sub.href}
                                          onClick={() => setActiveMega(null)}
                                          className="flex items-start gap-3.5 p-2.5 rounded-2xl hover:bg-emerald-50/70 transition-colors group/item"
                                        >
                                          <div className="w-9 h-9 rounded-xl bg-stone-100 group-hover/item:bg-brand-600 text-stone-600 group-hover/item:text-white flex items-center justify-center shrink-0 transition-ui shadow-2xs">
                                            <Icon size={16} />
                                          </div>
                                          <div className="min-w-0">
                                            <span className="text-xs font-extrabold text-stone-800 group-hover/item:text-brand-600 transition-colors block leading-tight">
                                              {sub.label}
                                            </span>
                                            <span className="text-xs text-stone-500 leading-tight block mt-0.5 font-medium">
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
                              <div className="col-span-5 p-5 bg-gradient-to-b from-stone-50 to-emerald-50/30 flex flex-col justify-between border-l border-stone-100">
                                <div>
                                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-brand-600 text-white text-xs font-black uppercase tracking-widest mb-3">
                                    Featured Snack
                                  </span>
                                  <h4 className="text-sm font-extrabold text-stone-900 leading-snug">
                                    {item.featuredProduct.title}
                                  </h4>
                                  <p className="text-xs text-stone-500 mt-1 font-medium leading-relaxed">
                                    {item.featuredProduct.desc}
                                  </p>
                                </div>
                                <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between">
                                  <span className="text-sm font-black text-brand-600">{item.featuredProduct.price}</span>
                                  <Link
                                    href={item.featuredProduct.href}
                                    onClick={() => setActiveMega(null)}
                                    className="px-3.5 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-extrabold hover:bg-brand-700 transition-colors shadow-xs"
                                  >
                                    View Details
                                  </Link>
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
                    "px-4 py-2.5 text-base font-extrabold tracking-wide rounded-full transition-ui duration-200",
                    ringClasses,
                    isActive(link.href)
                      ? "text-brand-600 bg-emerald-50/90 font-black shadow-2xs"
                      : "text-stone-700 hover:text-brand-600 hover:bg-stone-50"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Search Trigger with Command-K indicator */}
              <button
                ref={searchToggleRef}
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={cn(
                  "px-3 py-2 sm:px-3.5 sm:py-2 flex items-center gap-2 rounded-full transition-ui duration-200 border border-stone-200/80 bg-stone-50/80 hover:bg-stone-100 text-stone-700 hover:text-stone-950",
                  ringClasses,
                  isSearchOpen && "bg-emerald-50 border-brand-600/40 text-brand-600"
                )}
                aria-label="Search products"
                aria-expanded={isSearchOpen}
                aria-controls="header-search-panel"
              >
                <Search size={18} strokeWidth={2.2} className={isSearchOpen ? "text-brand-600" : "text-stone-600"} />
                <span className="hidden xl:inline text-xs font-bold text-stone-500">Search…</span>
                <kbd className="hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-extrabold text-stone-400 bg-white border border-stone-200 rounded-md">
                  ⌘K
                </kbd>
              </button>

              {/* Phone (mobile) */}
              {sitePhone && (
                <a
                  href={`tel:${sitePhone}`}
                  className={cn("p-2.5 sm:p-3 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-emerald-50 transition-ui text-stone-700 hover:text-brand-600 lg:hidden", ringClasses)}
                  aria-label={`Call us at ${sitePhone}`}
                >
                  <Phone size={19} strokeWidth={2.2} />
                </a>
              )}

              {/* Wishlist */}
              <button
                onClick={() => {
                  if (!isAuthenticated) { router.push("/auth/login"); return; }
                  router.push("/wishlist");
                }}
                className={cn("p-2.5 sm:p-3 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-rose-50 transition-ui text-stone-700 hover:text-rose-600 relative group/icon", ringClasses)}
                aria-label={isAuthenticated && user?.wishlist?.length ? `Wishlist (${user.wishlist.length} items)` : "Wishlist"}
              >
                <Heart size={20} strokeWidth={2.2} className="group-hover/icon:scale-110 transition-transform" />
                {isAuthenticated && user?.wishlist && user.wishlist.length > 0 && (
                  <span className="absolute top-1 right-1 w-[18px] h-[18px] bg-rose-500 text-white text-xs font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                    {user.wishlist.length > 99 ? "99+" : user.wishlist.length}
                  </span>
                )}
              </button>

              {/* Cart */}
              <button
                onClick={() => setIsCartOpen(true)}
                className={cn("p-2.5 sm:p-3 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-emerald-50 transition-ui text-stone-700 hover:text-brand-600 relative group/cart", ringClasses)}
                aria-label={itemCount > 0 ? `Cart (${itemCount} items)` : "Cart"}
              >
                <ShoppingBag size={20} strokeWidth={2.2} className="group-hover/cart:scale-110 transition-transform" />
                <AnimatePresence>
                  {itemCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute top-1 right-1 w-[18px] h-[18px] bg-gold-500 text-stone-950 text-xs font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-xs"
                    >
                      {itemCount > 99 ? "99+" : itemCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* User Menu */}
              <div className="relative hidden sm:block" ref={userMenuRef}>
                <button
                  onClick={() => {
                    if (isAuthenticated) setIsUserMenuOpen(!isUserMenuOpen);
                    else router.push("/auth/login");
                  }}
                  className={cn(
                    "p-2.5 sm:p-3 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full transition-ui duration-200 gap-1 border border-transparent",
                    ringClasses,
                    isUserMenuOpen
                      ? "bg-emerald-50 text-brand-600 border-emerald-200"
                      : "hover:bg-stone-100 text-stone-700 hover:text-stone-950"
                  )}
                  aria-label={isAuthenticated ? `Account menu${user?.name ? ` (${user.name})` : ""}` : "Sign in"}
                  aria-haspopup={isAuthenticated ? "true" : undefined}
                  aria-expanded={isAuthenticated ? isUserMenuOpen : undefined}
                >
                  {isAuthenticated && user?.avatar ? (
                    <Image src={getImageUrl(user.avatar)} alt="" width={26} height={26} className="rounded-full object-cover ring-2 ring-emerald-300" />
                  ) : (
                    <User size={20} strokeWidth={2.2} />
                  )}
                  {isAuthenticated && <ChevronDown size={12} className={cn("text-stone-400 transition-transform duration-200", isUserMenuOpen && "rotate-180")} />}
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
                        className="absolute right-0 top-full mt-2 w-64 bg-white rounded-3xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] border border-stone-200 z-50 py-2.5 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-stone-100 bg-gradient-to-r from-emerald-50/80 to-amber-50/40 mx-2 rounded-2xl mb-1.5">
                          <p className="text-xs font-extrabold text-stone-900 truncate">{user?.name}</p>
                          <p className="text-xs text-stone-500 truncate mt-0.5 font-medium">{user?.email}</p>
                        </div>
                        <div className="px-2 py-1 space-y-0.5">
                          <Link href="/orders" onClick={() => setIsUserMenuOpen(false)} role="menuitem"
                            className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-extrabold hover:bg-emerald-50/80 rounded-xl transition-colors text-stone-700 hover:text-brand-600">
                            <Package size={15} className="text-brand-600" />
                            <span>My Orders</span>
                          </Link>
                          <Link href="/wishlist" onClick={() => setIsUserMenuOpen(false)} role="menuitem"
                            className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-extrabold hover:bg-rose-50/80 rounded-xl transition-colors text-stone-700 hover:text-rose-600">
                            <Heart size={15} className="text-rose-500" />
                            <span>Wishlist</span>
                          </Link>
                          {user?.role && ["admin", "superadmin"].includes(user.role) && (
                            <a href={process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3002"} onClick={() => setIsUserMenuOpen(false)} role="menuitem"
                              className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-extrabold hover:bg-amber-50/80 rounded-xl transition-colors text-amber-800">
                              <Settings size={15} className="text-amber-600" />
                              <span>Admin Dashboard</span>
                            </a>
                          )}
                          <div className="h-px bg-stone-100 my-1 mx-2" />
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
        </div>

        {/* Search Panel */}
        <div
          id="header-search-panel"
          className={cn(
            "grid transition-[grid-template-rows,opacity,border] duration-300 ease-in-out bg-white overflow-hidden",
            isSearchOpen ? "grid-rows-[1fr] opacity-100 border-t border-stone-200" : "grid-rows-[0fr] opacity-0 border-t-0"
          )}
          aria-hidden={!isSearchOpen}
        >
          <div className="min-h-0">
            <div className="max-w-3xl mx-auto px-4 py-5">
              <form onSubmit={handleSearch}>
                <div className="relative group">
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-brand-600 transition-colors" aria-hidden="true" />
                  <label htmlFor="header-search" className="sr-only">Search products</label>
                  <input
                    id="header-search"
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && setIsSearchOpen(false)}
                    placeholder="Search 100% Jain namkeen, sweets, gift hampers..."
                    className="w-full pl-12 pr-12 py-3.5 rounded-2xl border-2 border-stone-200 bg-stone-50/80 focus:outline-none focus:ring-0 focus:border-brand-600 focus:bg-white text-stone-900 font-semibold transition-ui placeholder:text-stone-400 text-sm shadow-inner"
                    tabIndex={isSearchOpen ? 0 : -1}
                  />
                  <button
                    type="button"
                    onClick={() => { setIsSearchOpen(false); setSearchQuery(""); searchToggleRef.current?.focus(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-stone-200 text-stone-400 transition-colors"
                    aria-label="Close search"
                    tabIndex={isSearchOpen ? 0 : -1}
                  >
                    <X size={18} />
                  </button>
                </div>
              </form>
              <div className="mt-3.5 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-widest text-brand-600">Popular Searches:</span>
                {["Ratlami Sev", "Kaju Katli", "Special Mixture", "Jain Chakli", "Festive Hamper"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => { router.push(`/products?search=${encodeURIComponent(tag)}`); setIsSearchOpen(false); }}
                    className={cn("px-3.5 py-1.5 rounded-full bg-stone-100 hover:bg-brand-600 text-stone-700 hover:text-white transition-ui text-xs font-extrabold shadow-2xs", ringClasses)}
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
            className="fixed inset-0 z-[400] bg-black/60 lg:hidden"
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
            <div className="flex items-center justify-between px-5 py-5 bg-white border-b border-stone-200 z-10 shadow-xs">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getLogoUrl(settings?.logo || clientLogo || undefined, settings?.updatedAt)}
                  alt={siteName}
                  suppressHydrationWarning
                  className="h-12 sm:h-14 w-auto max-w-[240px] object-contain mix-blend-multiply filter contrast-[1.03] transition-ui duration-300"
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
                className={cn("p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-stone-100 text-stone-700 transition-colors", ringClasses)}
                aria-label="Close menu"
              >
                <X size={22} />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto py-4 px-4 bg-stone-50 min-h-0">
              <div className="space-y-1.5">
                {megaMenuItems.map((item) => (
                  <div key={item.label}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center px-4 py-3.5 rounded-xl text-base font-black transition-ui",
                        ringClasses,
                        isActive(item.href)
                          ? "text-brand-600 bg-emerald-100/70"
                          : "text-stone-800 hover:bg-stone-100 hover:text-stone-950"
                      )}
                    >
                      <span>{item.label}</span>
                      {isActive(item.href) && <span className="ml-auto w-2.5 h-2.5 rounded-full bg-brand-600" />}
                    </Link>
                    {/* Sub-links */}
                    <div className="ml-4 my-1.5 space-y-1">
                      {item.columns.flatMap(col => col.items).map((sub) => {
                        const SubIcon = sub.icon;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-extrabold text-stone-700 hover:text-stone-950 hover:bg-stone-100 transition-colors"
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
                        ? "text-brand-600 bg-emerald-100/70"
                        : "text-stone-800 hover:bg-stone-100 hover:text-stone-950"
                    )}
                  >
                    <span>{link.label}</span>
                    {isActive(link.href) && <span className="ml-auto w-2.5 h-2.5 rounded-full bg-brand-600" />}
                  </Link>
                ))}
              </div>

              <div className="my-4 h-px bg-stone-200" />

              {isAuthenticated ? (
                <div className="space-y-1.5 px-1">
                  <div className="px-4 py-3.5 border border-stone-200 rounded-xl bg-white shadow-xs mb-3">
                    <p className="text-sm font-extrabold text-stone-900 truncate">{user?.name}</p>
                    <p className="text-xs text-stone-500 truncate mt-0.5 font-medium">{user?.email}</p>
                  </div>
                  {[
                    { href: "/orders", label: "My Orders", icon: Package },
                    { href: "/wishlist", label: "Wishlist", icon: Heart },
                  ].map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href} onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-extrabold text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-ui">
                      <Icon size={18} className="text-brand-600" />
                      <span>{label}</span>
                    </Link>
                  ))}
                  {user?.role && ["admin", "superadmin"].includes(user.role) && (
                    <a href={process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3002"} onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-extrabold text-amber-800 bg-amber-50 hover:bg-amber-100 transition-ui">
                      <Settings size={18} className="text-amber-600" />
                      <span>Admin Panel</span>
                    </a>
                  )}
                  <button onClick={handleLogout}
                    className="flex w-full items-center gap-3.5 px-4 py-3.5 mt-2 rounded-xl text-sm font-extrabold text-rose-600 bg-rose-50/80 hover:bg-rose-100 transition-colors">
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 px-1">
                  <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}
                    className="text-center px-4 py-3.5 rounded-xl text-sm font-black bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-md">
                    Sign In to Account
                  </Link>
                  <Link href="/auth/register" onClick={() => setIsMobileMenuOpen(false)}
                    className="text-center px-4 py-3.5 rounded-xl text-sm font-black border border-stone-300 text-stone-800 hover:border-brand-600 hover:text-brand-600 hover:bg-emerald-50/50 transition-ui">
                    Create Account
                  </Link>
                </div>
              )}
            </nav>

            {/* WhatsApp CTA */}
            <div className="p-4 bg-white border-t border-stone-200 shrink-0">
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
    <CartDrawer open={isCartOpen} onClose={() => setIsCartOpen(false)} />
  </>
);
}
