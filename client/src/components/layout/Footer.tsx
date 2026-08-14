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
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { contentApi } from "@/lib/api";
import { motion } from "framer-motion";
import { cn, getLogoUrl } from "@/lib/utils";

const certificationBadges = [
  { icon: Leaf, label: "100% Pure Jain", desc: "Zero Onion & Zero Garlic" },
  { icon: Shield, label: "FSSAI Approved", desc: "100% Certified Facility" },
  { icon: CheckCircle, label: "No Preservatives", desc: "Fresh Natural Ingredients" },
  { icon: Truck, label: "Pan India Delivery", desc: "Safe & Fast Express Shipping" },
];

const shopLinks = [
  { label: "All Products", href: "/products" },
  { label: "Namkeen & Snacks", href: "/products?category=namkeen" },
  { label: "Traditional Sweets", href: "/products?category=sweets" },
  { label: "Curated Gift Packs", href: "/collections" },
  { label: "New Arrivals", href: "/products?newArrival=true" },
];

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

export default function Footer() {
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => contentApi.getSiteSettings(),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const s = settingsData?.data?.settings || {};
  const siteName = s?.siteName || "RIJITA by Arya Foods";
  const sitePhone = s?.phone || "+91 99044 59998";
  const siteEmail = s?.email || "info@rijita.com";
  const siteAddress = s?.address || "Shop no - 12B, Veer arihanta shopping complex, near nishal circle, Pal, Surat, Gujarat 395009";
  const whatsappNumber = s?.whatsapp?.number || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919904459998";
  const copyright = s?.footer?.copyright || `© ${new Date().getFullYear()} RIJITA by Arya Foods. All rights reserved.`;
  const socialMedia = s?.socialMedia || {};
  const siteLogo = s?.logo;

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
      } catch (e) {}
      setClientLogo(siteLogo);
    }
  }, [siteLogo]);

  return (
    <footer role="contentinfo" className="bg-brand-700 text-white border-t border-brand-600 relative overflow-hidden">
      {/* Subtle background ambient glows matching brand gold & forest green */}

      {/* ── 1. Certifications & Brand Trust Ribbon ── */}
      <div className="bg-brand-600/90 border-b border-emerald-700/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {certificationBadges.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <Icon size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-wide uppercase">{label}</h4>
                  <p className="text-xs text-emerald-200/90 font-medium mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. Main Footer Body ── */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-12 lg:py-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
          
          {/* Brand Header Column — Uploaded Logo & Story */}
          <div className="lg:col-span-5 space-y-6">
            {/* Uploaded Logo Display */}
            <Link href="/" className="inline-block group" aria-label="Go to Homepage">
              <div className="relative flex items-center bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-xl transition-ui duration-300 group-hover:scale-[1.02]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getLogoUrl(siteLogo || clientLogo || undefined, s?.updatedAt)}
                  alt={siteName}
                  className="h-16 sm:h-20 md:h-24 w-auto max-w-[320px] sm:max-w-[420px] object-contain"
                />
              </div>
            </Link>

            <p className="text-emerald-100/90 text-sm leading-relaxed max-w-md font-normal">
              Crafting 100% pure Jain namkeen, sweets, and traditional Indian delicacies in Surat, Gujarat. Prepared with time-honored recipes, zero onion, zero garlic, and uncompromised dietary purity.
            </p>

            {/* Quick Contact & WhatsApp Action */}
            <div className="space-y-3 pt-2">
              <a
                href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent("Hello! I have an inquiry about RIJITA Arya Foods.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-emerald-950/40 transition-ui hover:scale-[1.02]"
              >
                <MessageCircle size={16} className="fill-stone-950" />
                <span>Order via WhatsApp</span>
                <ArrowUpRight size={14} />
              </a>

              <div className="flex flex-wrap gap-4 text-xs text-emerald-200/90 pt-2 font-medium">
                <a href={`tel:${sitePhone}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone size={14} className="text-amber-300" />
                  <span>{sitePhone}</span>
                </a>
                <a href={`mailto:${siteEmail}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Mail size={14} className="text-amber-300" />
                  <span>{siteEmail}</span>
                </a>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs font-bold tracking-widest uppercase text-emerald-300/80">Follow Us:</span>
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
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-amber-400 hover:text-stone-950 border border-white/15 flex items-center justify-center text-white transition-ui shadow-sm"
                >
                  <Icon size={16} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Navigation Links Columns */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-8">
            
            {/* Column 1: Shop */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-300 mb-5 flex items-center gap-2">
                <Sparkles size={13} className="text-amber-300" />
                Quick Shop
              </h3>
              <ul className="space-y-3">
                {shopLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs font-semibold text-emerald-100/80 hover:text-amber-300 transition-colors flex items-center gap-1.5 group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/40 group-hover:bg-amber-300 transition-colors" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Our World */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-300 mb-5 flex items-center gap-2">
                <Leaf size={13} className="text-amber-300" />
                Our Story
              </h3>
              <ul className="space-y-3">
                {companyLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs font-semibold text-emerald-100/80 hover:text-amber-300 transition-colors flex items-center gap-1.5 group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/40 group-hover:bg-amber-300 transition-colors" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Customer Care */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-300 mb-5 flex items-center gap-2">
                <Shield size={13} className="text-amber-300" />
                Customer Support
              </h3>
              <ul className="space-y-3">
                {customerLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs font-semibold text-emerald-100/80 hover:text-amber-300 transition-colors flex items-center gap-1.5 group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/40 group-hover:bg-amber-300 transition-colors" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Store Address Banner */}
        <div className="mt-12 pt-6 border-t border-emerald-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10">
          <div className="flex items-start gap-3 text-xs text-emerald-100/90 font-medium">
            <MapPin size={18} className="text-amber-300 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Flagship Store Location:</span>
              <span>{siteAddress}</span>
            </div>
          </div>
          <Link
            href="/contact"
            className="text-xs font-bold text-amber-300 hover:text-white uppercase tracking-wider flex items-center gap-1 shrink-0 transition-colors"
          >
            Visit Store / Directions <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── 3. Bottom Copyright & Developer Bar ── */}
      <div className="bg-brand-850 border-t border-emerald-800/80">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-300/80 font-medium text-center sm:text-left">
          <p>{copyright}</p>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-5">
            <p className="flex items-center gap-1.5 text-emerald-200">
              Made with <Heart size={11} className="text-rose-400 fill-rose-400" /> in Surat, India
            </p>
            <span className="hidden sm:inline opacity-30">|</span>
            <p>
              Design & Developed by{" "}
              <a
                href="https://logicmindsbyparii.com/index.php"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-300 transition-colors font-bold text-white underline underline-offset-2"
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
