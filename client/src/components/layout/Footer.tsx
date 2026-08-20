"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Facebook,
  Instagram,
  Youtube,
  MapPin,
  Phone,
  Mail,
  Heart,
  Shield,
  Leaf,
  Truck,
  CheckCircle,
  MessageCircle,
  ArrowUpRight,
  Sparkles,
  Send,
  BadgeCheck,
  Award,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { contentApi, categoryApi } from "@/lib/api";
import { motion } from "framer-motion";
import { cn, getLogoUrl, telHref } from "@/lib/utils";

// Fallback trust badges used only when the admin hasn't set qualityBadges yet.
const DEFAULT_BADGES = [
  { icon: Leaf, label: "100% Pure Jain", desc: "Zero Onion & Zero Garlic" },
  { icon: Shield, label: "FSSAI Approved", desc: "100% Certified Facility" },
  { icon: CheckCircle, label: "No Preservatives", desc: "Fresh Natural Ingredients" },
  { icon: Truck, label: "Pan India Delivery", desc: "Safe & Fast Express Shipping" },
];

// Icons are chosen by keyword from the badge label, so admin-edited labels
// still get a sensible icon. Unknown labels fall back to BadgeCheck.
function badgeIconFor(label: string) {
  const l = (label || "").toLowerCase();
  if (l.includes("jain") || l.includes("vegetarian") || l.includes("sattvik") || l.includes("onion")) return Leaf;
  if (l.includes("fssai") || l.includes("certified") || l.includes("approved") || l.includes("licensed")) return Shield;
  if (l.includes("hygien") || l.includes("delivery") || l.includes("ship") || l.includes("pack")) return Truck;
  if (l.includes("premium") || l.includes("grade") || l.includes("quality") || l.includes("pure")) return Award;
  if (l.includes("preservative") || l.includes("natural") || l.includes("fresh")) return CheckCircle;
  return BadgeCheck;
}

const companyLinks = [
  { label: "Our Heritage Story", href: "/about" },
  { label: "100% Jain Quality Promise", href: "/about#quality" },
  { label: "Snack Recipes", href: "/recipes" },
  { label: "Blog & Stories", href: "/blog" },
  { label: "Contact Us", href: "/contact" },
];

const customerLinks = [
  { label: "My Orders & Tracking", href: "/orders" },
  { label: "Frequently Asked Questions", href: "/faq" },
  { label: "Shipping & Terms", href: "/terms" },
  { label: "Refund Policy", href: "/refund-policy" },
  { label: "Privacy Policy", href: "/privacy-policy" },
];

const DEFAULT_ABOUT_TEXT =
  "Crafting 100% pure Jain namkeen, sweets, and traditional Indian delicacies in Surat, Gujarat. Prepared with time-honored recipes, zero onion, zero garlic, and uncompromised dietary purity.";

export default function Footer() {
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => contentApi.getSiteSettings(),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Live categories drive the "Quick Shop" column so it always matches the
  // actual catalog (no hardcoded links to categories that don't exist).
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.getCategories(),
    staleTime: 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Newsletter signup state
  const [email, setEmail] = useState("");
  const [subStatus, setSubStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [subMessage, setSubMessage] = useState("");

  const s = settingsData?.data?.settings || {};
  const siteName = s?.siteName || "RIJITA by Arya Foods";
  const sitePhone = s?.phone || "+91 99044 59998";
  const siteEmail = s?.email || "info@rijita.com";
  const siteAddress = s?.address || "Shop no - 12B, Veer arihanta shopping complex, near nishal circle, Pal, Surat, Gujarat 395009";
  const whatsappNumber = s?.whatsapp?.number || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919904459998";
  const copyright = s?.footer?.copyright || `© ${new Date().getFullYear()} RIJITA by Arya Foods. All rights reserved.`;
  const socialMedia = s?.socialMedia || {};
  const siteLogo = s?.logo;

  // About text comes from the admin (Settings → Footer), with a brand fallback.
  const aboutText = s?.footer?.aboutText?.trim() || DEFAULT_ABOUT_TEXT;

  // Trust badges come from the admin-editable qualityBadges; icons are mapped
  // by keyword. Falls back to the classic certification set.
  const qualityBadges: { label: string; description?: string }[] = s?.about?.qualityBadges || [];
  const trustBadges: { icon: React.ElementType; label: string; desc: string }[] = qualityBadges.length > 0
    ? qualityBadges.map((b) => ({
      icon: badgeIconFor(b.label),
      label: b.label,
      desc: b.description || "",
    }))
    : DEFAULT_BADGES;

  const categories: any[] = categoriesData?.data?.categories || [];
  const activeCategories = categories.filter((c) => (c.productCount ?? 0) > 0);
  const shopSource = activeCategories.length > 0 ? activeCategories : categories;

  const shopLinks = [
    { label: "All Products", href: "/products" },
    ...shopSource.slice(0, 4).map((cat) => ({
      label: cat.name,
      href: `/products?category=${cat.slug}`,
    })),
    { label: "Curated Gift Packs", href: "/collections" },
    { label: "New Arrivals", href: "/products?sort=newest" },
  ];

  const [clientLogo, setClientLogo] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("cached_site_logo");
      if (cached) setClientLogo(cached);
    }
  }, []);

  useEffect(() => {
    if (siteLogo) {
      try {
        localStorage.setItem("cached_site_logo", siteLogo);
      } catch (e) { }
      setClientLogo(siteLogo);
    }
  }, [siteLogo]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setSubStatus("error");
      setSubMessage("Please enter a valid email address.");
      return;
    }
    setSubStatus("loading");
    setSubMessage("");
    try {
      await contentApi.subscribe(clean);
      setSubStatus("success");
      setSubMessage("You're on the list — fresh batches and recipes land in your inbox.");
      setEmail("");
    } catch (err: any) {
      setSubStatus("error");
      setSubMessage(err?.data?.message || err?.message || "Could not subscribe. Please try again.");
    }
  };

  return (
    <footer role="contentinfo" className="bg-brand-950 text-white border-t border-brand-900 relative overflow-hidden">
      {/* Subtle background ambient glows matching brand gold & forest green */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-800/30 blur-[120px] rounded-[100%] pointer-events-none" />

      {/* ── 1. Certifications & Brand Trust Ribbon ── */}
      <div className="bg-brand-900/90 border-b border-white/5 backdrop-blur-md relative z-10">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trustBadges.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gold-500/15 text-gold-300 border border-gold-400/30 flex items-center justify-center shrink-0">
                  <Icon size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-wide uppercase">{label}</h4>
                  <p className="text-xs text-brand-50/90 font-medium mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. Main Footer Body ── */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-16 lg:py-24 relative z-10">

        {/* Massive High-Contrast CTA */}
        <div className="mb-20 text-center lg:text-left flex flex-col lg:flex-row justify-between items-center gap-10">
          <h2 className="text-[40px] sm:text-[64px] lg:text-[80px] font-black tracking-tight leading-[0.9] text-white max-w-3xl">
            Taste the <span className="font-serif italic text-gold-400 font-medium">Difference.</span>
          </h2>
          <div className="shrink-0">
            <Link
              href="/products"
              className="group relative inline-flex items-center justify-center gap-4 px-10 py-5 bg-gold-500 text-brand-950 rounded-full font-black text-xl hover:bg-gold-400 hover:scale-105 shadow-[0_10px_30px_rgba(212,175,55,0.2)] transition-all duration-500"
            >
              Shop Now <ArrowUpRight size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 border-t border-white/10 pt-16">

          {/* Brand Header Column — Uploaded Logo & Story */}
          <div className="lg:col-span-5 space-y-6">
            {/* Uploaded Logo Display */}
            <Link href="/" className="inline-block group" aria-label="Go to Homepage">
              <div className="relative flex items-center bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-xl transition-ui duration-300 group-hover:scale-[1.02]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getLogoUrl(siteLogo || clientLogo || undefined, s?.updatedAt)}
                  alt={siteName}
                  suppressHydrationWarning
                  // Matches the Header's fallback — without it a bad logo path
                  // renders a broken-image icon in the footer.
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes("logo.png")) {
                      target.src = "/uploads/logo.png";
                    }
                  }}
                  className="h-16 sm:h-20 md:h-24 w-auto max-w-[320px] sm:max-w-[420px] object-contain"
                />
              </div>
            </Link>

            <p className="text-brand-50/90 text-sm leading-relaxed max-w-md font-normal">
              {aboutText}
            </p>

            {/* Newsletter Signup — feeds the admin's subscriber list */}
            <div className="pt-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-gold-300">Fresh batches &amp; recipes</span>
              </div>
              <form onSubmit={handleSubscribe} className="flex gap-2" noValidate>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (subStatus !== "idle") { setSubStatus("idle"); setSubMessage(""); } }}
                  placeholder="Your email address"
                  aria-label="Email address for newsletter"
                  aria-invalid={subStatus === "error"}
                  aria-describedby={subStatus === "error" || subStatus === "success" ? "newsletter-status" : undefined}
                  className="flex-1 min-w-0 px-6 py-4 rounded-full bg-white/5 border border-white/15 text-white text-base placeholder:text-brand-50/40 focus:outline-none focus:border-gold-400/60 focus:bg-white/10 transition-all"
                />
                <button
                  type="submit"
                  disabled={subStatus === "loading"}
                  // The only text label below is `hidden sm:inline`, so on a phone
                  // this collapses to a bare send icon with no accessible name —
                  // a screen reader announced just "button" on the newsletter
                  // form. The aria-label names it at every breakpoint.
                  aria-label="Subscribe to newsletter"
                  className="inline-flex items-center gap-3 px-6 sm:px-8 py-4 rounded-full bg-gold-500 hover:bg-gold-400 text-brand-950 font-black text-sm tracking-widest uppercase shadow-lg shadow-gold-800/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                  <span className="hidden sm:inline">{subStatus === "loading" ? "Joining..." : "Join"}</span>
                </button>
              </form>
              {/* Always rendered so assistive tech is already observing this
                  region when the message appears — a live region mounted at the
                  same time as its text is frequently not announced at all. */}
              <div id="newsletter-status" role="status" aria-live="polite">
                {subStatus === "success" && (
                  <p className="mt-2.5 text-xs font-medium text-gold-300 flex items-center gap-1.5">
                    <CheckCircle size={13} className="shrink-0" aria-hidden="true" /> {subMessage}
                  </p>
                )}
                {subStatus === "error" && (
                  <p className="mt-2.5 text-xs font-medium text-gold-300 flex items-center gap-1.5">
                    <span className="shrink-0" aria-hidden="true">⚠</span> {subMessage}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Contact & WhatsApp Action */}
            <div className="space-y-3 pt-2">
              <a
                href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent("Hello! I have an inquiry about RIJITA Arya Foods.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-6 py-4 rounded-full bg-whatsapp hover:bg-whatsapp-600 text-white font-black text-sm tracking-widest uppercase shadow-lg shadow-whatsapp/40 transition-all hover:scale-[1.02]"
              >
                <MessageCircle size={16} className="fill-white" />
                <span>Order via WhatsApp</span>
                <ArrowUpRight size={14} />
              </a>

              <div className="flex flex-wrap gap-4 text-xs text-brand-50/90 pt-2 font-medium">
                <a href={telHref(sitePhone)} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone size={14} className="text-gold-300" />
                  <span>{sitePhone}</span>
                </a>
                <a href={`mailto:${siteEmail}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Mail size={14} className="text-gold-300" />
                  <span>{siteEmail}</span>
                </a>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs font-bold tracking-widest uppercase text-brand-50/80">Follow Us:</span>
              {[
                { icon: Facebook, href: socialMedia.facebook, label: "Facebook" },
                { icon: Instagram, href: socialMedia.instagram, label: "Instagram" },
                { icon: Youtube, href: socialMedia.youtube, label: "YouTube" },
              ].filter((sm) => sm.href).map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  whileHover={{ y: -3, scale: 1.05 }}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-gold-500 hover:text-brand-950 border border-white/15 flex items-center justify-center text-white transition-ui shadow-sm"
                >
                  <Icon size={16} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Navigation Links Columns */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-8">

            {/* Column 1: Shop — built from live categories */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gold-300 mb-5 flex items-center gap-2">
                <Sparkles size={13} className="text-gold-300" />
                Quick Shop
              </h3>
              <ul className="space-y-3">
                {shopLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs font-semibold text-brand-50/90 hover:text-gold-300 transition-colors flex items-center gap-1.5 group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-50/40 text-gold-400 transition-colors" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Our World */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gold-300 mb-5 flex items-center gap-2">
                <Leaf size={13} className="text-gold-300" />
                Our Story
              </h3>
              <ul className="space-y-3">
                {companyLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs font-semibold text-brand-50/90 hover:text-gold-300 transition-colors flex items-center gap-1.5 group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-50/40 text-gold-400 transition-colors" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Customer Care */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gold-300 mb-5 flex items-center gap-2">
                <Shield size={13} className="text-gold-300" />
                Customer Support
              </h3>
              <ul className="space-y-3">
                {customerLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs font-semibold text-brand-50/90 hover:text-gold-300 transition-colors flex items-center gap-1.5 group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-50/40 text-gold-400 transition-colors" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Store Address Banner */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10">
          <div className="flex items-start gap-3 text-xs text-brand-50/90 font-medium">
            <MapPin size={18} className="text-gold-300 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Flagship Store Location:</span>
              <span>{siteAddress}</span>
            </div>
          </div>
          <Link
            href="/contact"
            className="text-xs font-bold text-gold-300 hover:text-white uppercase tracking-wider flex items-center gap-1 shrink-0 transition-colors"
          >
            Visit Store / Directions <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── 3. Bottom Copyright & Developer Bar ── */}
      <div className="bg-brand-950 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-brand-50/80 font-medium text-center sm:text-left">
          <p>{copyright}</p>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-5">
            <p className="flex items-center gap-1.5 text-brand-50">
              Made with <Heart size={11} className="text-rose-400 fill-rose-400" /> in Surat, India
            </p>
            <span className="hidden sm:inline opacity-30">|</span>
            <p>
              Design & Developed by{" "}
              <a
                href="https://logicmindsbyparii.com/index.php"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gold-300 transition-colors font-bold text-white underline underline-offset-2"
              >
                Logic Minds by Parii
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
