/* Hallmark · component: admin-layout · genre: modern-minimal
 * theme: Cobalt (admin variant) · nav: N1b canonical SaaS
 * accent: cool-indigo · paper: dark sidebar, light content
 * Pre-emit critique: P5 H5 E5 S5 R5 V5
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  LayoutDashboard, Package, ShoppingBag, Users, Tags, TicketPercent,
  Bookmark, Star, FileText, UtensilsCrossed, MessageSquare, Mail,
  BarChart3, Settings, Menu, X, LogOut, PanelLeft, ExternalLink, BadgeCheck,
  Search, Command, ArrowRight, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Categories", href: "/admin/categories", icon: Tags },
  { label: "Coupons", href: "/admin/coupons", icon: TicketPercent },
  { label: "Collections", href: "/admin/collections", icon: Bookmark },
  { label: "Reviews", href: "/admin/reviews", icon: Star },
  { label: "Blogs", href: "/admin/blogs", icon: FileText },
  { label: "Recipes", href: "/admin/recipes", icon: UtensilsCrossed },
  { label: "Contacts", href: "/admin/contacts", icon: MessageSquare },
  { label: "Subscribers", href: "/admin/subscribers", icon: Mail },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isLoginPage = pathname === "/admin/login";

  // Track scroll position for header shadow
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }
      if (e.key === "Escape") {
        if (searchOpen) setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  useEffect(() => {
    if (!isLoginPage && !isLoading && !isAuthenticated) router.push("/admin/login");
  }, [isLoginPage, isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isLoginPage && user && !["admin", "superadmin"].includes(user.role)) router.push("/403");
  }, [isLoginPage, user, router]);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out");
    router.push("/admin/login");
  };

  // Allow login page to render without auth check
  if (isLoginPage) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-paper)]">
        <div className="flex flex-col items-center gap-4">
          {/* Geometric loader */}
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-2 border-[var(--color-brand)]/20" />
            <div className="absolute inset-0 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-accent)] opacity-10 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--color-ink)]">Loading admin panel</p>
            <p className="text-[11px] text-[var(--color-muted)] mt-0">Preparing your workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !["admin", "superadmin"].includes(user.role)) return null;

  return (
    <div className="min-h-screen bg-[var(--color-paper)] flex">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300",
          "bg-[var(--color-ink)] text-white",
          "lg:sticky lg:top-0 lg:h-screen lg:z-auto",
          sidebarCollapsed ? "w-14" : "w-56",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Geometric sidebar decoration — subtle dot pattern top */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.04] pointer-events-none overflow-hidden" aria-hidden="true">
          <svg width="128" height="128" viewBox="0 0 128 128" fill="none">
            <circle cx="16" cy="16" r="2" fill="white"/>
            <circle cx="48" cy="16" r="2" fill="white"/>
            <circle cx="80" cy="16" r="2" fill="white"/>
            <circle cx="112" cy="16" r="2" fill="white"/>
            <circle cx="32" cy="48" r="2" fill="white"/>
            <circle cx="64" cy="48" r="2" fill="white"/>
            <circle cx="96" cy="48" r="2" fill="white"/>
            <circle cx="16" cy="80" r="2" fill="white"/>
            <circle cx="48" cy="80" r="2" fill="white"/>
            <circle cx="80" cy="80" r="2" fill="white"/>
            <circle cx="112" cy="80" r="2" fill="white"/>
            <circle cx="32" cy="112" r="2" fill="white"/>
            <circle cx="64" cy="112" r="2" fill="white"/>
            <circle cx="96" cy="112" r="2" fill="white"/>
          </svg>
        </div>

        {/* Logo area */}
        <div className={cn(
          "relative flex items-center h-14 shrink-0 border-b border-white/[0.06]",
          sidebarCollapsed ? "justify-center" : "justify-between px-4"
        )}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-2 rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white/70 transition-all"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <PanelLeft className={cn("h-4 w-4 transition-transform", sidebarCollapsed && "rotate-180")} />
          </button>
          {!sidebarCollapsed && (
            <Link href="/admin" className="flex items-center gap-2 min-w-0 group">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-dark)] flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-[var(--color-accent)]/20 shrink-0 group-hover:scale-105 transition-transform">
                R
              </div>
              <div className="leading-none">
                <span className="text-sm font-bold text-white tracking-tight block leading-tight">RIJITA</span>
                <span className="text-[9px] text-white/40 font-medium tracking-wider uppercase block">Admin Panel</span>
              </div>
            </Link>
          )}
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-lg hover:bg-white/[0.08] text-white/50">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0 scrollbar-thin" aria-label="Admin navigation">
          {/* Section label */}
          {!sidebarCollapsed && (
            <div className="px-4 pt-4 pb-2">
              <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-white/20">Main Menu</span>
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-xl text-xs font-medium transition-all duration-200 relative group",
                  sidebarCollapsed ? "justify-center p-2" : "px-4 py-2",
                  active
                    ? "bg-white/[0.1] text-white shadow-sm"
                    : "text-white/50 hover:text-white hover:bg-white/[0.05]"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="adminActiveNav"
                    className={cn(
                      "absolute rounded-full",
                      sidebarCollapsed
                        ? "w-2 h-4 bg-[var(--color-accent)] left-0 top-1/2 -translate-y-1/2"
                        : "w-0 h-4 bg-[var(--color-accent)] left-0 top-1/2 -translate-y-1/2"
                    )}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={cn(
                  "h-4 w-4 shrink-0 transition-all duration-300",
                  "group-hover:scale-110 group-hover:translate-x-0.5",
                  active && "text-[var(--color-accent)]"
                )} />
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
                {/* Quick arrow indicator */}
                {active && !sidebarCollapsed && (
                  <span className="ml-auto text-white/20">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="relative border-t border-white/[0.06] p-2 shrink-0 space-y-2">
          {!sidebarCollapsed && (
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] text-white/40 hover:text-white hover:bg-white/[0.05] transition-all group"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Back to Store</span>
              <ArrowRight className="h-4 w-4 ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Link>
          )}
          <div className={cn("flex items-center gap-2", sidebarCollapsed && "justify-center")}>
            <Avatar className="h-8 w-8 shrink-0 ring-2 ring-white/[0.08]">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-[11px] bg-white/[0.08] text-white/70 font-semibold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/80 truncate leading-tight">{user.name}</p>
                  <p className="text-[9px] text-white/30 capitalize truncate font-medium">{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-white/[0.08] text-white/30 hover:text-rose-400 transition-all"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300 min-w-0",
        sidebarCollapsed ? "lg:ml-14" : "lg:ml-56"
      )}>
        {/* ── Top Header ── */}
        <header
          className={cn(
            "flex items-center justify-between px-4 sm:px-6 h-14 shrink-0 sticky top-0 z-30 transition-all duration-200",
            "bg-white/90 backdrop-blur-xl border-b",
            scrolled ? "border-[var(--color-rule)] shadow-sm" : "border-transparent"
          )}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="h-4 w-4 text-[var(--color-ink-3)]" />
            </button>
            {/* Breadcrumb-style context */}
            <div className="hidden lg:flex items-center gap-2 text-xs">
              <BadgeCheck size={12} className="text-[var(--color-brand)]" />
              <span className="text-[var(--color-ink-3)] font-medium">RIJITA Admin</span>
              <ChevronRight className="h-4 w-4 text-[var(--color-ink-3)]/30" />
              <span className="text-[var(--color-ink)] font-semibold">
                {navItems.find(i => isActive(i.href))?.label || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Command Palette Trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--color-rule)] hover:border-[var(--color-accent)]/40 bg-[var(--color-surface)] hover:bg-white text-[var(--color-ink-3)] hover:text-[var(--color-ink)] transition-all text-xs select-none cursor-pointer group"
              aria-label="Open command palette"
            >
              <Search className="h-4 w-4 text-[var(--color-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
              <span className="hidden sm:inline text-[var(--color-muted)]">Search dashboard...</span>
              <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-0 rounded-md border border-[var(--color-rule)] bg-white px-2 font-mono text-[9px] font-medium text-[var(--color-ink-3)]">
                <span className="text-[8px]">⌘</span>K
              </kbd>
            </button>
          </div>
        </header>

        {/* ── Main Content ── */}
        <div className="flex-1 overflow-y-auto bg-[var(--color-paper)] flex flex-col">
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          
          <footer className="px-4 sm:px-6 py-4 border-t border-[var(--color-rule)] text-center text-[11px] text-[var(--color-muted)] shrink-0 mt-auto">
            Design & Developed by <a href="https://logicmindsbyparii.com/index.php" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-brand)] font-medium transition-colors text-[var(--color-ink-3)]">Logic Minds by Parii</a>
          </footer>
        </div>
      </div>

      {/* ── Command Palette (⌘K) ── */}
      <AnimatePresence>
        {searchOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSearchOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />
            {/* Palette Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -12 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-[12%] left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-xl"
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-[var(--color-rule)] overflow-hidden backdrop-blur-xl">
                {/* Search Input */}
                <div className="flex items-center gap-4 px-4 py-4 border-b border-[var(--color-rule)]">
                  <Command className="h-4 w-4 text-[var(--color-accent)]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    placeholder="Search products, orders, pages, coupons..."
                    className="flex-1 text-sm bg-transparent border-0 outline-none focus:ring-0 text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)]"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setSearchOpen(false);
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        const links = document.querySelectorAll('[data-palette-link]');
                        (links[0] as HTMLElement)?.focus();
                      }
                    }}
                  />
                  <button
                    onClick={() => setSearchOpen(false)}
                    className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-muted)] text-[11px] font-mono font-medium transition-colors"
                  >
                    ESC
                  </button>
                </div>

                {/* Results */}
                <div className="p-2 max-h-[340px] overflow-y-auto space-y-0">
                  {adminSearchQuery && (
                    <div className="px-4 py-2 text-xs text-[var(--color-muted)]">
                      Press <kbd className="px-2 py-0 rounded bg-[var(--color-surface-2)] font-mono text-[10px]">Enter</kbd> to search all
                    </div>
                  )}
                  <div className="space-y-0">
                    <p className="text-[10px] font-bold text-[var(--color-ink-3)] uppercase tracking-[0.12em] px-4 py-2">
                      Quick Navigation
                    </p>
                    {[
                      { label: "Dashboard", href: "/admin", desc: "Main control panel", icon: LayoutDashboard },
                      { label: "Products", href: "/admin/products", desc: "Manage catalog items", icon: Package },
                      { label: "Orders", href: "/admin/orders", desc: "View sales transactions", icon: ShoppingBag },
                      { label: "Categories", href: "/admin/categories", desc: "Configure product groups", icon: Tags },
                      { label: "Coupons", href: "/admin/coupons", desc: "Edit discount values", icon: TicketPercent },
                      { label: "Settings", href: "/admin/settings", desc: "System adjustments", icon: Settings },
                    ]
                      .filter(item =>
                        !adminSearchQuery ||
                        item.label.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                        item.desc.toLowerCase().includes(adminSearchQuery.toLowerCase())
                      )
                      .map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            data-palette-link
                            onClick={() => {
                              setSearchOpen(false);
                              setAdminSearchQuery("");
                            }}
                            className="group flex items-center gap-4 p-2 rounded-xl hover:bg-[var(--color-surface-hover)] text-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/30"
                          >
                            <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-2)] group-hover:bg-white flex items-center justify-center shrink-0 border border-[var(--color-rule)] transition-colors">
                              <Icon className="h-4 w-4 text-[var(--color-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-[var(--color-ink)] block leading-tight">{item.label}</span>
                              <span className="text-[10px] text-[var(--color-muted)] block mt-0">{item.desc}</span>
                            </div>
                            <span className="text-[10px] bg-[var(--color-surface-2)] group-hover:bg-[var(--color-accent)]/10 group-hover:text-[var(--color-accent)] text-[var(--color-muted)] px-2 py-2 rounded-md font-mono transition-colors">↵</span>
                          </Link>
                        );
                      })}
                  </div>
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2 border-t border-[var(--color-rule)] bg-[var(--color-surface)] flex items-center gap-4 text-[10px] text-[var(--color-muted)]">
                  <span className="flex items-center gap-2">
                    <kbd className="px-2 py-0 rounded bg-[var(--color-surface-2)] font-mono text-[9px] border border-[var(--color-rule)]">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-2">
                    <kbd className="px-2 py-0 rounded bg-[var(--color-surface-2)] font-mono text-[9px] border border-[var(--color-rule)]">↵</kbd>
                    Open
                  </span>
                  <span className="flex items-center gap-2 ml-auto">
                    <kbd className="px-2 py-0 rounded bg-[var(--color-surface-2)] font-mono text-[9px] border border-[var(--color-rule)]">Esc</kbd>
                    Close
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
