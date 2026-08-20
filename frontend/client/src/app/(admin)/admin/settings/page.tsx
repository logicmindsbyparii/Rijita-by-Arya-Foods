"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Save,
  ImagePlus,
  Globe,
  Mail,
  Phone,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  MessageCircle,
  Truck,
  FileText,
  Bell,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Layout,
  Hash,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
  Search,
  BarChart3,
  AlertTriangle,
  Activity,
  Sparkles,
  Wallet,
  Info,
  User,
} from "lucide-react";
import { adminApi, shippingApi } from "@/lib/admin/api";
import { cn, getImageUrl } from "@/lib/admin/utils";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import { Card, CardContent } from "@/components/admin-ui/card";
import { Skeleton } from "@/components/admin-ui/skeleton";
import { ImageUploader } from "@/components/admin-ui/image-uploader";
import type { SiteSettings } from "@/types/admin";

interface BannerForm {
  title: string;
  subtitle: string;
  image?: string;
  link?: string;
  isActive: boolean;
  order: number;
  badge?: string;
}

interface SettingsForm {
  siteName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  socialMedia: {
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
    whatsapp: string;
  };
  footer: {
    aboutText: string;
    copyright: string;
  };
  shipping: {
    freeShippingThreshold: number;
    standardDeliveryCharge: number;
    estimatedDays: string;
    shiprocket: {
      pickupLocation: string;
      pickupPincode: string;
      length: number;
      breadth: number;
      height: number;
      packagingWeight: number;
      autoCreate: boolean;
    };
  };
  gst: {
    gstin: string;
    rate: number;
  };
  whatsapp: {
    number: string;
    messageTemplate: string;
  };
  payment: {
    upiId: string;
    upiName: string;
  };
  seo: {
    googleAnalyticsId: string;
    googleTagManagerId: string;
    metaPixelId: string;
  };
  announcement: {
    text: string;
    isActive: boolean;
  };
  story: {
    heading: string;
    text: string;
  };
  stats: { label: string; value: number; suffix: string }[];
  about: {
    heroTagline: string;
    heroHeadline: string;
    heroSubtitle: string;
    mission: string;
    vision: string;
    founderName: string;
    founderTitle: string;
    founderBio: string;
    values: { title: string; description: string }[];
    qualityBadges: { label: string; description: string }[];
  };
}

interface FormErrors {
  [key: string]: string;
}

const defaultForm: SettingsForm = {
  siteName: "", tagline: "", email: "", phone: "", address: "",
  socialMedia: { facebook: "", instagram: "", twitter: "", youtube: "", whatsapp: "" },
  footer: { aboutText: "", copyright: "" },
  // Shipping/GST defaults must be the real business defaults, NOT 0 — a 0
  // threshold means "free delivery on everything" and a 0 charge means "free
  // below the threshold too", so a settings save with empty fields used to
  // silently make every order free. 0 is sanitized back to these defaults.
  shipping: {
    freeShippingThreshold: 499,
    standardDeliveryCharge: 49,
    estimatedDays: "",
    shiprocket: { pickupLocation: "", pickupPincode: "", length: 0, breadth: 0, height: 0, packagingWeight: 0, autoCreate: false },
  },
  gst: { gstin: "", rate: 5 },
  whatsapp: { number: "", messageTemplate: "" },
  payment: { upiId: "", upiName: "" },
  seo: { googleAnalyticsId: "", googleTagManagerId: "", metaPixelId: "" },
  announcement: { text: "", isActive: false },
  story: { heading: "", text: "" },
  stats: [
    { label: "Years of Excellence", value: 0, suffix: "+" },
    { label: "Premium Products", value: 0, suffix: "+" },
    { label: "Happy Customers", value: 0, suffix: "+" },
    { label: "Happy Families", value: 0, suffix: "+" },
  ],
  about: {
    heroTagline: "About RIJITA",
    heroHeadline: "Crafting Timeless Taste",
    heroSubtitle: "We are more than a food brand — we are keepers of tradition. Every product tells a story of heritage, quality, and the unwavering commitment to bring you the purest taste of India.",
    mission: "To preserve and share the authentic taste of Indian tradition by crafting premium-quality snacks and food products using the purest ingredients, time-honored recipes, and modern hygiene standards — making every meal a celebration of heritage.",
    vision: "To become India's most trusted name in traditional snacks — delivering the authentic taste of home to every Indian, anywhere in the world, while staying true to our roots and commitment to purity.",
    founderName: "Arya Foods",
    founderTitle: "Founder & Visionary",
    founderBio: "What began as a small-scale passion project has blossomed into a brand that thousands trust. Our founder's vision was simple — to share the authentic taste of home-made Indian snacks with the world, without compromising on quality or tradition.\n\nToday, every product bearing the RIJITA name carries forward that vision, crafted with the same love and care as the recipes from our grandmother's kitchen.",
    values: [
      { title: "100% Pure", description: "No preservatives, no additives — just pure, natural ingredients sourced from the finest farms." },
      { title: "Premium Quality", description: "Every product meets rigorous quality standards with FSSAI certification and strict hygiene protocols." },
      { title: "Made with Love", description: "Traditional recipes passed down through generations, crafted with care and attention to every detail." },
      { title: "Customer First", description: "Your satisfaction is our priority. We listen, improve, and deliver excellence in every order." },
    ],
    qualityBadges: [
      { label: "FSSAI Approved", description: "Licensed & regulated" },
      { label: "100% Vegetarian", description: "Pure ingredients" },
      { label: "Premium Grade", description: "Highest quality" },
      { label: "Hygienic Processing", description: "Modern facility" },
    ],
  },
};

type TabId = "general" | "branding" | "shipping" | "social" | "seo" | "notifications" | "banners" | "about";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: Globe },
  { id: "branding", label: "Branding", icon: Layout },
  { id: "about", label: "About Page", icon: Info },
  { id: "shipping", label: "Shipping & GST", icon: Truck },
  { id: "social", label: "Social & Contact", icon: Facebook },
  { id: "seo", label: "SEO & Analytics", icon: BarChart3 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "banners", label: "Hero Banners", icon: ImagePlus },
];

export default function AdminSettings() {
  const [formData, setFormData] = useState<SettingsForm>(defaultForm);
  const [initialFormData, setInitialFormData] = useState<SettingsForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoFileRef = useRef<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const faviconFileRef = useRef<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [faviconPreview, setFaviconPreview] = useState<string>("");
  const [initialLogo, setInitialLogo] = useState<string>("");
  const [initialFavicon, setInitialFavicon] = useState<string>("");
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [faviconRemoved, setFaviconRemoved] = useState(false);
  const [storyImageFile, setStoryImageFile] = useState<File | null>(null);
  const storyImageFileRef = useRef<File | null>(null);
  const [storyImagePreview, setStoryImagePreview] = useState<string>("");
  const [initialStoryImage, setInitialStoryImage] = useState<string>("");
  const [storyImageRemoved, setStoryImageRemoved] = useState(false);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const heroImageFileRef = useRef<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState<string>("");
  const [initialHeroImage, setInitialHeroImage] = useState<string>("");
  const [heroImageRemoved, setHeroImageRemoved] = useState(false);
  const [founderImageFile, setFounderImageFile] = useState<File | null>(null);
  const founderImageFileRef = useRef<File | null>(null);
  const [founderImagePreview, setFounderImagePreview] = useState<string>("");
  const [initialFounderImage, setInitialFounderImage] = useState<string>("");
  const [founderImageRemoved, setFounderImageRemoved] = useState(false);
  const [banners, setBanners] = useState<BannerForm[]>([]);
  const [initialBanners, setInitialBanners] = useState<BannerForm[]>([]);
  const [bannerFiles, setBannerFiles] = useState<(File | null)[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [dirty, setDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabId | null>(null);

  // Unsaved changes check — on tab switch
  const handleTabSwitch = useCallback((tab: TabId) => {
    if (dirty && tab !== activeTab) {
      setPendingTab(tab);
      setShowUnsavedDialog(true);
    } else {
      setActiveTab(tab);
    }
  }, [dirty, activeTab]);

  const confirmTabSwitch = () => {
    if (pendingTab) {
      // Clean up blob URLs before discarding changes
      if (logoPreview && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
      if (faviconPreview && faviconPreview.startsWith('blob:')) URL.revokeObjectURL(faviconPreview);
      if (storyImagePreview && storyImagePreview.startsWith('blob:')) URL.revokeObjectURL(storyImagePreview);
      if (heroImagePreview && heroImagePreview.startsWith('blob:')) URL.revokeObjectURL(heroImagePreview);
      if (founderImagePreview && founderImagePreview.startsWith('blob:')) URL.revokeObjectURL(founderImagePreview);
      // Clean up banner blob URLs
      banners.forEach((b) => { if (b.image && b.image.startsWith('blob:')) URL.revokeObjectURL(b.image); });
      setFormData(JSON.parse(JSON.stringify(initialFormData)));
      setDirty(false);
      setErrors({});
      logoFileRef.current = null;
      setLogoFile(null);
      faviconFileRef.current = null;
      setFaviconFile(null);
      storyImageFileRef.current = null;
      setStoryImageFile(null);
      heroImageFileRef.current = null;
      setHeroImageFile(null);
      founderImageFileRef.current = null;
      setFounderImageFile(null);
      setLogoPreview(initialLogo);
      setFaviconPreview(initialFavicon);
      setStoryImagePreview(initialStoryImage);
      setHeroImagePreview(initialHeroImage);
      setFounderImagePreview(initialFounderImage);
      setLogoRemoved(false);
      setFaviconRemoved(false);
      setStoryImageRemoved(false);
      setHeroImageRemoved(false);
      setFounderImageRemoved(false);
      setBanners(JSON.parse(JSON.stringify(initialBanners)));
      setBannerFiles(initialBanners.map(() => null));
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
    setShowUnsavedDialog(false);
  };

  const cancelTabSwitch = () => {
    setPendingTab(null);
    setShowUnsavedDialog(false);
  };

  // beforeunload handler
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Ctrl+S keyboard shortcut - use a ref to avoid stale closure
  const handleSaveRef = useRef<() => Promise<void>>();

  // Keep the ref updated with the latest handleSave
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (dirty && handleSaveRef.current) handleSaveRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dirty]);

  const syncState = (data: SiteSettings, mergedAutoCreate?: boolean | null) => {
    const loaded: SettingsForm = {
      siteName: data.siteName || "",
      tagline: data.tagline || "",
      email: data.email || "",
      phone: data.phone || "",
      address: data.address || "",
      socialMedia: {
        facebook: data.socialMedia?.facebook || "",
        instagram: data.socialMedia?.instagram || "",
        twitter: data.socialMedia?.twitter || "",
        youtube: data.socialMedia?.youtube || "",
        whatsapp: data.socialMedia?.whatsapp || "",
      },
      footer: {
        aboutText: data.footer?.aboutText || "",
        copyright: data.footer?.copyright || "",
      },
      shipping: {
        // 0 (or a negative) value means "unset" — show the effective default so
        // saving any tab can't persist the accidental all-orders-free state.
        freeShippingThreshold: data.shipping?.freeShippingThreshold > 0 ? data.shipping.freeShippingThreshold : 499,
        standardDeliveryCharge: data.shipping?.standardDeliveryCharge > 0 ? data.shipping.standardDeliveryCharge : 49,
        estimatedDays: data.shipping?.estimatedDays || "",
        shiprocket: {
          pickupLocation: data.shipping?.shiprocket?.pickupLocation || "",
          pickupPincode: data.shipping?.shiprocket?.pickupPincode || "",
          length: data.shipping?.shiprocket?.length || 0,
          breadth: data.shipping?.shiprocket?.breadth || 0,
          height: data.shipping?.shiprocket?.height || 0,
          packagingWeight: data.shipping?.shiprocket?.packagingWeight || 0,
          // The toggle has no "blank = keep server default" state — the DB value
          // (or the effective env default) must win, or an unset key would show
          // OFF and persist `false` on the next save, silently disabling
          // auto-ship even though the server was shipping orders automatically.
          autoCreate: typeof data.shipping?.shiprocket?.autoCreate === "boolean"
            ? data.shipping.shiprocket.autoCreate
            : (mergedAutoCreate ?? false),
        },
      },
      gst: { gstin: data.gst?.gstin || "", rate: data.gst?.rate > 0 ? data.gst.rate : 5 },
      whatsapp: { number: data.whatsapp?.number || "", messageTemplate: data.whatsapp?.messageTemplate || "" },
      payment: { upiId: data.payment?.upiId || "", upiName: data.payment?.upiName || "" },
      seo: {
        googleAnalyticsId: data.seo?.googleAnalyticsId || "",
        googleTagManagerId: data.seo?.googleTagManagerId || "",
        metaPixelId: data.seo?.metaPixelId || "",
      },
      announcement: { text: data.announcement?.text || "", isActive: data.announcement?.isActive || false },
      story: { heading: data.story?.heading || "", text: data.story?.text || "" },
      stats: data.stats && data.stats.length > 0 ? data.stats : defaultForm.stats,
      about: {
        heroTagline: data.about?.heroTagline || defaultForm.about.heroTagline,
        heroHeadline: data.about?.heroHeadline || defaultForm.about.heroHeadline,
        heroSubtitle: data.about?.heroSubtitle || defaultForm.about.heroSubtitle,
        mission: data.about?.mission || defaultForm.about.mission,
        vision: data.about?.vision || defaultForm.about.vision,
        founderName: data.about?.founderName || defaultForm.about.founderName,
        founderTitle: data.about?.founderTitle || defaultForm.about.founderTitle,
        founderBio: data.about?.founderBio || defaultForm.about.founderBio,
        values: data.about?.values && data.about.values.length > 0 ? data.about.values : defaultForm.about.values,
        qualityBadges: data.about?.qualityBadges && data.about.qualityBadges.length > 0 ? data.about.qualityBadges : defaultForm.about.qualityBadges,
      },
    };
    setFormData(loaded);
    setInitialFormData(loaded);
    setLogoPreview(data.logo || "");
    setFaviconPreview(data.favicon || "");
    setInitialLogo(data.logo || "");
    setInitialFavicon(data.favicon || "");
    setStoryImagePreview(data.storyImage || "");
    setInitialStoryImage(data.storyImage || "");
    setHeroImagePreview(data.heroImage || "");
    setInitialHeroImage(data.heroImage || "");
    setFounderImagePreview(data.founderImage || "");
    setInitialFounderImage(data.founderImage || "");
    setBanners(data.banners || []);
    setInitialBanners(data.banners || []);
    setBannerFiles((data.banners || []).map(() => null));
    setDirty(false);
    setLogoRemoved(false);
    setFaviconRemoved(false);
    setStoryImageRemoved(false);
    setHeroImageRemoved(false);
    setFounderImageRemoved(false);
    logoFileRef.current = null;
    setLogoFile(null);
    faviconFileRef.current = null;
    setFaviconFile(null);
    storyImageFileRef.current = null;
    setStoryImageFile(null);
    heroImageFileRef.current = null;
    setHeroImageFile(null);
    founderImageFileRef.current = null;
    setFounderImageFile(null);
  };

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      // The effective Shiprocket config (env defaults merged with DB overrides)
      // is server-side — fetch it so an unset autoCreate key in the DB can't
      // masquerade as "off" (see syncState). Best-effort: if the status call
      // fails, fall back to the plain DB value.
      let mergedAutoCreate: boolean | null = null;
      try {
        const statusRes = await shippingApi.getStatus();
        const merged = statusRes?.data?.config?.autoCreate;
        if (typeof merged === "boolean") mergedAutoCreate = merged;
      } catch { /* best-effort */ }
      const res = await adminApi.getSettings();
      if (res.data?.settings) syncState(res.data.settings, mergedAutoCreate);
    } catch { toast.error("Failed to load settings"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  // Validate form
  const validate = (): { isValid: boolean; errorTab: TabId | null } => {
    const errs: FormErrors = {};
    let errorTab: TabId | null = null;
    if (!formData.siteName.trim()) { errs.siteName = "Site name is required"; errorTab = errorTab || "general"; }
    if (!formData.email.trim()) { errs.email = "Email is required"; errorTab = errorTab || "general"; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { errs.email = "Invalid email format"; errorTab = errorTab || "general"; }
    const phoneDigits = (formData.phone || "").replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 15) { errs.phone = "Enter a valid phone number (10-15 digits)"; errorTab = errorTab || "general"; }
    // WhatsApp number powers every wa.me link on the storefront (track order,
    // order-by-WhatsApp, order confirmations) — a malformed value would override
    // the client-side fallback and message a wrong number.
    const waDigits = (formData.whatsapp.number || "").replace(/\D/g, "");
    if (formData.whatsapp.number.trim() && (waDigits.length < 10 || waDigits.length > 15)) {
      errs.whatsappNumber = "Enter a valid WhatsApp number with country code (e.g. 919876543210)";
      errorTab = errorTab || "notifications";
    }
    // UPI ID feeds the QR code + payment link on the order page.
    const upi = formData.payment.upiId.trim();
    if (upi && !/^[^\s@]+@[^\s@]+$/.test(upi)) {
      errs.upiId = "Enter a valid UPI ID (e.g. yourstore@upi)";
      errorTab = errorTab || "shipping";
    }
    // Social links — a malformed URL breaks the footer/contact icons.
    const socialUrlRules: [string, RegExp][] = [
      ["facebook", /^https?:\/\//], ["instagram", /^https?:\/\//], ["twitter", /^https?:\/\//],
      ["youtube", /^https?:\/\//], ["whatsapp", /^(https?:\/\/|wa\.me)/],
    ];
    for (const [key, re] of socialUrlRules) {
      const v = ((formData.socialMedia as any)[key] || "").trim();
      if (v && !re.test(v)) {
        errs[key] = "Enter a full URL starting with https://";
        errorTab = errorTab || "social";
      }
    }
    if (formData.announcement.isActive && !formData.announcement.text.trim()) {
      errs.announcementText = "Announcement text is required when the bar is active";
      errorTab = errorTab || "notifications";
    }
    if (formData.gst.gstin && !/^[0-9A-Z]{15}$/.test(formData.gst.gstin.toUpperCase())) { errs.gstin = "GSTIN must be 15 characters"; errorTab = errorTab || "shipping"; }
    if (formData.gst.rate < 0 || formData.gst.rate > 100) { errs.gstRate = "Rate must be between 0 and 100"; errorTab = errorTab || "shipping"; }
    const pickupPin = formData.shipping.shiprocket.pickupPincode;
    if (pickupPin && !/^\d{6}$/.test(pickupPin)) { errs.pickupPincode = "Pickup pincode must be 6 digits"; errorTab = errorTab || "shipping"; }
    if (formData.seo.googleAnalyticsId && !/^(G|UA|AW)-/.test(formData.seo.googleAnalyticsId)) { errs.gaId = "Invalid Google Analytics ID format"; errorTab = errorTab || "seo"; }
    if (formData.seo.googleTagManagerId && !/^GTM-/.test(formData.seo.googleTagManagerId)) { errs.gtmId = "Invalid GTM ID format (GTM-XXXXXX)"; errorTab = errorTab || "seo"; }
    if (formData.seo.metaPixelId && !/^\d{7,16}$/.test(formData.seo.metaPixelId)) { errs.pixelId = "Meta Pixel ID should be a numeric ID"; errorTab = errorTab || "seo"; }
    setErrors(errs);
    return { isValid: Object.keys(errs).length === 0, errorTab };
  };

  const handleSave = async () => {
    const validation = validate();
    if (!validation.isValid) {
      if (validation.errorTab && validation.errorTab !== activeTab) {
        setActiveTab(validation.errorTab);
      }
      toast.error("Please fix the highlighted errors before saving", { icon: "⚠️" });
      return;
    }
    try {
      setSaving(true);
      const fd = new FormData();
      const append = (key: string, value: any) => { if (value !== undefined && value !== null) fd.append(key, String(value)); };
      append("siteName", formData.siteName);
      append("tagline", formData.tagline);
      append("email", formData.email);
      append("phone", formData.phone);
      append("address", formData.address);
      append("socialMedia", JSON.stringify(formData.socialMedia));
      append("footer", JSON.stringify(formData.footer));
      append("shipping", JSON.stringify(formData.shipping));
      append("gst", JSON.stringify(formData.gst));
      append("whatsapp", JSON.stringify(formData.whatsapp));
      append("payment", JSON.stringify(formData.payment));
      append("seo", JSON.stringify(formData.seo));
      append("announcement", JSON.stringify(formData.announcement));
      append("story", JSON.stringify(formData.story));
      append("stats", JSON.stringify(formData.stats));
      append("about", JSON.stringify(formData.about));
      append("banners", JSON.stringify(banners.map((b, i) => {
        const clean = { ...b };
        if (bannerFiles[i]) {
          // Remove the blob URL / old image if a new file is being uploaded
          delete clean.image;
        }
        return clean;
      })));
      if (logoFileRef.current) fd.append("logo", logoFileRef.current);
      if (logoRemoved) fd.append("removeLogo", "true");
      if (faviconFileRef.current) fd.append("favicon", faviconFileRef.current);
      if (faviconRemoved) fd.append("removeFavicon", "true");
      if (storyImageFileRef.current) fd.append("storyImage", storyImageFileRef.current);
      if (storyImageRemoved) fd.append("removeStoryImage", "true");
      if (heroImageFileRef.current) fd.append("heroImage", heroImageFileRef.current);
      if (heroImageRemoved) fd.append("removeHeroImage", "true");
      if (founderImageFileRef.current) fd.append("founderImage", founderImageFileRef.current);
      if (founderImageRemoved) fd.append("removeFounderImage", "true");
      bannerFiles.forEach((file, i) => { if (file) fd.append(`bannerImage_${i}`, file); });
      const res = await adminApi.updateSettings(fd);
      if (res.data?.settings) {
        syncState(res.data.settings);
      } else {
        setInitialFormData(JSON.parse(JSON.stringify(formData)));
        setDirty(false);
        setLogoRemoved(false);
        setFaviconRemoved(false);
        setStoryImageRemoved(false);
        setHeroImageRemoved(false);
        setFounderImageRemoved(false);
        setBannerFiles(initialBanners.map(() => null));
      }
      setErrors({});
      toast.success("Settings updated successfully", { icon: "✅" });
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || "Failed to save settings";
      toast.error(errorMessage, { icon: "❌" });
    }
    finally { setSaving(false); }
  };

  // Keep ref updated so Ctrl+S always has the latest handler
  handleSaveRef.current = handleSave;

  const markDirty = () => { if (!dirty) setDirty(true); };

  const updateField = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    markDirty();
  };

  const updateStat = (index: number, key: "label" | "value" | "suffix", value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      stats: prev.stats.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
    }));
    markDirty();
  };

  const updateAboutListItem = (
    listName: "values" | "qualityBadges",
    index: number,
    key: "title" | "label" | "description",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      about: {
        ...prev.about,
        [listName]: (prev.about[listName] as any[]).map((item, i) => (i === index ? { ...item, [key]: value } : item)),
      },
    }));
    markDirty();
  };

  const updateShiprocket = (key: string, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      shipping: { ...prev.shipping, shiprocket: { ...prev.shipping.shiprocket, [key]: value } },
    }));
    markDirty();
  };

  const updateNested = (section: string, key: string, value: any, nestedPath?: string) => {
    setFormData((prev) => ({ ...prev, [section]: { ...(prev as any)[section], [key]: value } }));
    markDirty();
    // Clear error for this field using functional updater
    const errorKey = nestedPath || key;
    setErrors((prev) => {
      if (prev[errorKey]) {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      }
      return prev;
    });
  };

  const moveBanner = (index: number, direction: "up" | "down") => {
    if ((direction === "up" && index === 0) || (direction === "down" && index === banners.length - 1)) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newBanners = [...banners];
    const newFiles = [...bannerFiles];
    [newBanners[index], newBanners[newIndex]] = [newBanners[newIndex], newBanners[index]];
    [newFiles[index], newFiles[newIndex]] = [newFiles[newIndex], newFiles[index]];
    newBanners.forEach((b, i) => { b.order = i; });
    setBanners(newBanners);
    setBannerFiles(newFiles);
    markDirty();
  };

  const getError = (key: string): string | undefined => errors[key];

  const inputClass = (key: string) => cn(
    "flex w-full rounded-xl border bg-background px-4 py-2 text-sm ring-offset-background transition-all resize-y",
    getError(key)
      ? "border-red-300 focus-visible:ring-red-400/50"
      : "border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="flex gap-2 mb-6">
          {Array.from({ length: tabs.length }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-xl" />
          ))}
        </div>
        <Card><CardContent className="p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent></Card>
      </div>
    );
  }

  const sectionHeader = (icon: React.ElementType, title: string, desc?: string) => {
    const Icon = icon;
    return (
      <div className="flex items-start gap-4 mb-4">
        <div className="p-2 rounded-xl bg-brand-50 text-brand-600 shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-lg font-bold font-display">{title}</h2>
          {desc && <p className="text-sm text-muted-foreground mt-0">{desc}</p>}
        </div>
      </div>
    );
  };

  const renderTab = () => {
    switch (activeTab) {
      case "general":
        return (
          <div className="space-y-6">
            {sectionHeader(Globe, "General Settings", "Basic information about your store")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Site Name <span className="text-red-400">*</span>
                </label>
                <Input
                  value={formData.siteName}
                  onChange={(e) => { updateField("siteName", e.target.value); if (errors.siteName) setErrors((p) => { const n = { ...p }; delete n.siteName; return n; }); }}
                  placeholder="RIJITA by Arya Foods"
                  className={cn(getError("siteName") && "border-red-300 focus-visible:ring-red-400/50")}
                />
                {getError("siteName") && <p className="text-xs text-red-500 mt-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{getError("siteName")}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tagline</label>
                <Input value={formData.tagline} onChange={(e) => updateField("tagline", e.target.value)} placeholder="Premium Namkeen & Snacks" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Email <span className="text-red-400">*</span>
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => { updateField("email", e.target.value); if (errors.email) setErrors((p) => { const n = { ...p }; delete n.email; return n; }); }}
                  placeholder="info@rijita.com"
                  className={cn(getError("email") && "border-red-300 focus-visible:ring-red-400/50")}
                />
                {getError("email") && <p className="text-xs text-red-500 mt-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{getError("email")}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Phone <span className="text-red-400">*</span>
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => { updateField("phone", e.target.value); if (errors.phone) setErrors((p) => { const n = { ...p }; delete n.phone; return n; }); }}
                  placeholder="+91 9876543210"
                  className={cn(getError("phone") && "border-red-300 focus-visible:ring-red-400/50")}
                />
                {getError("phone") && <p className="text-xs text-red-500 mt-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{getError("phone")}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Address</label>
              <textarea value={formData.address} onChange={(e) => updateField("address", e.target.value)} rows={2}
                className={inputClass("address")}
                placeholder="Store address" />
            </div>
            {sectionHeader(FileText, "Footer")}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">About Text</label>
                <textarea value={formData.footer.aboutText} onChange={(e) => updateNested("footer", "aboutText", e.target.value)}
                  rows={3} className={inputClass("aboutText")}
                  placeholder="A short description about your store for the footer..." />
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Displayed in the footer sidebar
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Copyright Text</label>
                <Input value={formData.footer.copyright} onChange={(e) => updateNested("footer", "copyright", e.target.value)}
                  placeholder="© 2024 RIJITA by Arya Foods. All rights reserved." />
              </div>
            </div>
          </div>
        );

      case "branding":
        return (
          <div className="space-y-6">
            {sectionHeader(Layout, "Branding Assets", "Upload your logo and favicon")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-2xl border border-border bg-gradient-to-br from-brand-50/20 to-transparent">
                <label className="block text-sm font-medium mb-4">Store Logo</label>
                <ImageUploader 
                  label="Upload Logo"
                  previewUrl={logoPreview}
                  file={logoFile}
                  onChange={(file) => {
                    if (logoPreview && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
                    logoFileRef.current = file;
                    setLogoFile(file);
                    setLogoPreview(URL.createObjectURL(file));
                    setLogoRemoved(false);
                    markDirty();
                  }}
                  onRemove={() => {
                    if (logoPreview && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
                    logoFileRef.current = null;
                    setLogoFile(null);
                    setLogoPreview("");
                    setLogoRemoved(true);
                    markDirty();
                  }}
                  previewClassName="h-20 w-20"
                />
              </div>
              <div className="p-4 rounded-2xl border border-border bg-gradient-to-br from-brand-50/20 to-transparent">
                <label className="block text-sm font-medium mb-4">Favicon</label>
                <ImageUploader 
                  label="Upload Favicon"
                  previewUrl={faviconPreview}
                  file={faviconFile}
                  onChange={(file) => {
                    if (faviconPreview && faviconPreview.startsWith('blob:')) URL.revokeObjectURL(faviconPreview);
                    faviconFileRef.current = file;
                    setFaviconFile(file);
                    setFaviconPreview(URL.createObjectURL(file));
                    setFaviconRemoved(false);
                    markDirty();
                  }}
                  onRemove={() => {
                    if (faviconPreview && faviconPreview.startsWith('blob:')) URL.revokeObjectURL(faviconPreview);
                    faviconFileRef.current = null;
                    setFaviconFile(null);
                    setFaviconPreview("");
                    setFaviconRemoved(true);
                    markDirty();
                  }}
                  accept=".ico,image/*"
                  previewClassName="h-16 w-16"
                />
              </div>
            </div>
            <div className="p-4 rounded-2xl border border-border bg-gradient-to-br from-amber-50/20 to-transparent">
              <label className="block text-sm font-medium mb-4">Story Image (Homepage section)</label>
              <ImageUploader 
                label="Upload Story Image"
                previewUrl={storyImagePreview}
                file={storyImageFile}
                onChange={(file) => {
                  if (storyImagePreview && storyImagePreview.startsWith('blob:')) URL.revokeObjectURL(storyImagePreview);
                  storyImageFileRef.current = file;
                  setStoryImageFile(file);
                  setStoryImagePreview(URL.createObjectURL(file));
                  setStoryImageRemoved(false);
                  markDirty();
                }}
                onRemove={() => {
                  if (storyImagePreview && storyImagePreview.startsWith('blob:')) URL.revokeObjectURL(storyImagePreview);
                  storyImageFileRef.current = null;
                  setStoryImageFile(null);
                  setStoryImagePreview("");
                  setStoryImageRemoved(true);
                  markDirty();
                }}
                previewClassName="h-20 w-20"
              />
            </div>
            <div className="border-t border-border pt-6">
              {sectionHeader(FileText, "About Page Content", "The \"Our Story\" section and stats strip shown on the About page")}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Story Heading</label>
                  <Input value={formData.story.heading}
                    onChange={(e) => updateNested("story", "heading", e.target.value)}
                    placeholder="A Tradition of Purity, Passed Down Through Generations" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Story Text</label>
                  <textarea value={formData.story.text}
                    onChange={(e) => updateNested("story", "text", e.target.value)}
                    rows={5}
                    placeholder="Tell your brand's story — shown as the 'Our Story' section on the About page. Separate paragraphs with a blank line."
                    className="flex w-full rounded-xl border border-input bg-transparent px-4 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y" />
                </div>
              </div>
              <label className="block text-sm font-medium mb-4">Stats Strip (4 numbers shown on the About page)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.stats.map((stat, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border grid grid-cols-3 gap-2">
                    <div className="col-span-3">
                      <label className="block text-xs text-muted-foreground mb-2">Label</label>
                      <Input value={stat.label} onChange={(e) => updateStat(i, "label", e.target.value)} placeholder="Happy Customers" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-muted-foreground mb-2">Value</label>
                      <Input type="number" value={stat.value} onChange={(e) => updateStat(i, "value", Number(e.target.value))} placeholder="10000" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-2">Suffix</label>
                      <Input value={stat.suffix} onChange={(e) => updateStat(i, "suffix", e.target.value)} placeholder="+" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "about":
        return (
          <div className="space-y-6">
            {sectionHeader(Sparkles, "About Page — Hero", "The top banner shown at the top of the About page")}
            <div className="p-4 rounded-2xl border border-border bg-gradient-to-br from-brand-50/20 to-transparent space-y-4">
              <ImageUploader
                label="Upload Hero Background Image"
                previewUrl={heroImagePreview}
                file={heroImageFile}
                onChange={(file) => {
                  if (heroImagePreview && heroImagePreview.startsWith('blob:')) URL.revokeObjectURL(heroImagePreview);
                  heroImageFileRef.current = file;
                  setHeroImageFile(file);
                  setHeroImagePreview(URL.createObjectURL(file));
                  setHeroImageRemoved(false);
                  markDirty();
                }}
                onRemove={() => {
                  if (heroImagePreview && heroImagePreview.startsWith('blob:')) URL.revokeObjectURL(heroImagePreview);
                  heroImageFileRef.current = null;
                  setHeroImageFile(null);
                  setHeroImagePreview("");
                  setHeroImageRemoved(true);
                  markDirty();
                }}
                previewClassName="h-20 w-20"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Small Label</label>
                  <Input value={formData.about.heroTagline} onChange={(e) => updateNested("about", "heroTagline", e.target.value)} placeholder="About RIJITA" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Headline</label>
                  <Input value={formData.about.heroHeadline} onChange={(e) => updateNested("about", "heroHeadline", e.target.value)} placeholder="Crafting Timeless Taste" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subtitle</label>
                <textarea value={formData.about.heroSubtitle} onChange={(e) => updateNested("about", "heroSubtitle", e.target.value)} rows={2}
                  className="flex w-full rounded-xl border border-input bg-transparent px-4 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y" />
              </div>
            </div>

            <div className="border-t border-border pt-6">
              {sectionHeader(Globe, "Mission & Vision")}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Our Mission</label>
                  <textarea value={formData.about.mission} onChange={(e) => updateNested("about", "mission", e.target.value)} rows={4}
                    className="flex w-full rounded-xl border border-input bg-transparent px-4 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Our Vision</label>
                  <textarea value={formData.about.vision} onChange={(e) => updateNested("about", "vision", e.target.value)} rows={4}
                    className="flex w-full rounded-xl border border-input bg-transparent px-4 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y" />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              {sectionHeader(User, "Founder Section")}
              <div className="p-4 rounded-2xl border border-border bg-gradient-to-br from-amber-50/20 to-transparent space-y-4">
                <ImageUploader
                  label="Upload Founder Photo"
                  previewUrl={founderImagePreview}
                  file={founderImageFile}
                  onChange={(file) => {
                    if (founderImagePreview && founderImagePreview.startsWith('blob:')) URL.revokeObjectURL(founderImagePreview);
                    founderImageFileRef.current = file;
                    setFounderImageFile(file);
                    setFounderImagePreview(URL.createObjectURL(file));
                    setFounderImageRemoved(false);
                    markDirty();
                  }}
                  onRemove={() => {
                    if (founderImagePreview && founderImagePreview.startsWith('blob:')) URL.revokeObjectURL(founderImagePreview);
                    founderImageFileRef.current = null;
                    setFounderImageFile(null);
                    setFounderImagePreview("");
                    setFounderImageRemoved(true);
                    markDirty();
                  }}
                  previewClassName="h-20 w-20"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Founder Name</label>
                    <Input value={formData.about.founderName} onChange={(e) => updateNested("about", "founderName", e.target.value)} placeholder="Arya Foods" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Founder Title</label>
                    <Input value={formData.about.founderTitle} onChange={(e) => updateNested("about", "founderTitle", e.target.value)} placeholder="Founder & Visionary" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Founder Bio</label>
                  <textarea value={formData.about.founderBio} onChange={(e) => updateNested("about", "founderBio", e.target.value)} rows={4}
                    className="flex w-full rounded-xl border border-input bg-transparent px-4 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y" />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              {sectionHeader(CheckCircle2, "Core Values", "The 4 value cards shown on the About page")}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.about.values.map((val, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border space-y-2">
                    <Input value={val.title} onChange={(e) => updateAboutListItem("values", i, "title", e.target.value)} placeholder="Value title" />
                    <textarea value={val.description} onChange={(e) => updateAboutListItem("values", i, "description", e.target.value)} rows={2}
                      className="flex w-full rounded-xl border border-input bg-transparent px-4 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y" />
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-6">
              {sectionHeader(Wallet, "Quality Promise Badges", "The 4 badge cards shown on the About page")}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.about.qualityBadges.map((badge, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border space-y-2">
                    <Input value={badge.label} onChange={(e) => updateAboutListItem("qualityBadges", i, "label", e.target.value)} placeholder="Badge label" />
                    <Input value={badge.description} onChange={(e) => updateAboutListItem("qualityBadges", i, "description", e.target.value)} placeholder="Short description" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "shipping":
        return (
          <div className="space-y-6">
            {sectionHeader(Truck, "Shipping Settings", "Configure delivery charges and thresholds")}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border bg-gradient-to-br from-emerald-50/30 to-transparent">
                <label className="block text-sm font-medium mb-2">Free Shipping Threshold (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                  <Input type="number" value={formData.shipping.freeShippingThreshold ?? ""}
                    onChange={(e) => updateNested("shipping", "freeShippingThreshold", Number(e.target.value))}
                    placeholder="499" className="pl-8" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Orders above this get free delivery</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-gradient-to-br from-blue-50/30 to-transparent">
                <label className="block text-sm font-medium mb-2">Delivery Charge (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                  <Input type="number" value={formData.shipping.standardDeliveryCharge ?? ""}
                    onChange={(e) => updateNested("shipping", "standardDeliveryCharge", Number(e.target.value))}
                    placeholder="49" className="pl-8" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Standard delivery fee</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-gradient-to-br from-purple-50/30 to-transparent">
                <label className="block text-sm font-medium mb-2">Estimated Days</label>
                <Input value={formData.shipping.estimatedDays}
                  onChange={(e) => updateNested("shipping", "estimatedDays", e.target.value)}
                  placeholder="3-5 business days" />
                <p className="text-[10px] text-muted-foreground mt-2">Shown at checkout</p>
              </div>
            </div>
            <div className="border-t border-border pt-6">
              {sectionHeader(
                Truck,
                "Shiprocket",
                "Overrides the server environment defaults. Leave a field blank to keep the .env value."
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Pickup Location Nickname</label>
                  <Input value={formData.shipping.shiprocket.pickupLocation}
                    onChange={(e) => updateShiprocket("pickupLocation", e.target.value)}
                    placeholder="Primary" />
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Must match a pickup address registered in Shiprocket → Settings → Pickup Addresses
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Pickup Pincode</label>
                  <Input value={formData.shipping.shiprocket.pickupPincode}
                    onChange={(e) => updateShiprocket("pickupPincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="380001" maxLength={6} className="tabular-nums" />
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Used for checkout serviceability and rate quotes
                  </p>
                  {getError("pickupPincode") && (
                    <p className="text-xs text-red-500 mt-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />{getError("pickupPincode")}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Length (cm)</label>
                  <Input type="number" min={0} value={formData.shipping.shiprocket.length || ""}
                    onChange={(e) => updateShiprocket("length", Number(e.target.value))}
                    placeholder="20" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Breadth (cm)</label>
                  <Input type="number" min={0} value={formData.shipping.shiprocket.breadth || ""}
                    onChange={(e) => updateShiprocket("breadth", Number(e.target.value))}
                    placeholder="15" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Height (cm)</label>
                  <Input type="number" min={0} value={formData.shipping.shiprocket.height || ""}
                    onChange={(e) => updateShiprocket("height", Number(e.target.value))}
                    placeholder="10" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Packaging (kg)</label>
                  <Input type="number" step="0.05" min={0} value={formData.shipping.shiprocket.packagingWeight || ""}
                    onChange={(e) => updateShiprocket("packagingWeight", Number(e.target.value))}
                    placeholder="0.1" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-4">
                Parcel weight is calculated from the ordered variants plus the packaging weight above.
              </p>

              <div className="flex items-center justify-between gap-4 mt-4 p-4 rounded-xl border border-border bg-gradient-to-br from-indigo-50/30 to-transparent">
                <div>
                  <p className="text-sm font-medium">Auto-create shipments</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Push each order to Shiprocket and assign an AWB automatically — COD orders as soon
                    as they are placed, prepaid orders once payment is marked received. Leave off to
                    push each order by hand from the Orders page.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" checked={formData.shipping.shiprocket.autoCreate}
                    onChange={(e) => updateShiprocket("autoCreate", e.target.checked)}
                    className="sr-only peer" />
                  <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600" />
                </label>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              {sectionHeader(Hash, "GST Information")}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">GSTIN</label>
                  <Input value={formData.gst.gstin} onChange={(e) => {
                    updateNested("gst", "gstin", e.target.value.toUpperCase(), "gstin");
                  }} placeholder="27ABCDE1234F1Z5" className={cn(
                    "uppercase font-mono",
                    getError("gstin") && "border-red-300 focus-visible:ring-red-400/50"
                  )} />
                  {getError("gstin") && <p className="text-xs text-red-500 mt-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{getError("gstin")}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">GST Rate (%)</label>
                  <Input type="number" value={formData.gst.rate ?? ""}
                    onChange={(e) => updateNested("gst", "rate", Number(e.target.value), "gstRate")}
                    placeholder="5"
                    className={cn(getError("gstRate") && "border-red-300 focus-visible:ring-red-400/50")} />
                  {getError("gstRate") && <p className="text-xs text-red-500 mt-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{getError("gstRate")}</p>}
                </div>
              </div>
            </div>
            <div className="border-t border-border pt-6">
              {sectionHeader(Wallet, "Payment Details", "UPI details customers pay to at checkout")}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">UPI ID</label>
                  <Input value={formData.payment.upiId}
                    onChange={(e) => updateNested("payment", "upiId", e.target.value, "upiId")}
                    placeholder="yourstore@upi"
                    className={cn("font-mono", getError("upiId") && "border-red-300 focus-visible:ring-red-400/50")} />
                  {getError("upiId") && <p className="text-xs text-red-500 mt-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{getError("upiId")}</p>}
                  <p className="text-[10px] text-muted-foreground mt-2">Used to generate the QR code and payment link customers see on their order page</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Payee Name</label>
                  <Input value={formData.payment.upiName}
                    onChange={(e) => updateNested("payment", "upiName", e.target.value)}
                    placeholder="Your Store Name" />
                </div>
              </div>
            </div>
          </div>
        );

      case "social":
        return (
          <div className="space-y-6">
            {sectionHeader(Mail, "Contact Information", "How customers can reach you")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" /> Email
                </label>
                <Input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)}
                  placeholder="info@rijita.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" /> Phone
                </label>
                <Input value={formData.phone} onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+91 9876543210" />
              </div>
            </div>

            <div className="border-t border-border pt-6">
              {sectionHeader(Facebook, "Social Media Links", "Connect your social profiles")}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "facebook", icon: Facebook, label: "Facebook", placeholder: "https://facebook.com/..." },
                  { key: "instagram", icon: Instagram, label: "Instagram", placeholder: "https://instagram.com/..." },
                  { key: "twitter", icon: Twitter, label: "Twitter / X", placeholder: "https://twitter.com/..." },
                  { key: "youtube", icon: Youtube, label: "YouTube", placeholder: "https://youtube.com/..." },
                  { key: "whatsapp", icon: MessageCircle, label: "WhatsApp", placeholder: "https://wa.me/..." },
                ].map((social) => {
                  const Icon = social.icon;
                  return (
                    <div key={social.key} className="p-4 rounded-xl border border-border hover:border-brand-200 transition-colors">
                      <label className="block text-xs font-medium mb-2 flex items-center gap-2">
                        <Icon className="h-4 w-4" /> {social.label}
                      </label>
                      <Input value={(formData.socialMedia as any)[social.key]}
                        onChange={(e) => updateNested("socialMedia", social.key, e.target.value)}
                        placeholder={social.placeholder}
                        className={cn(getError(social.key) && "border-red-300 focus-visible:ring-red-400/50")} />
                      {getError(social.key) && <p className="text-xs text-red-500 mt-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{getError(social.key)}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case "seo":
        return (
          <div className="space-y-6">
            {sectionHeader(BarChart3, "SEO & Analytics", "Connect tracking and analytics tools")}
            
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 rounded-2xl border border-border bg-gradient-to-br from-blue-50/20 to-transparent hover:border-blue-200 transition-colors">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600 shrink-0">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Google Analytics 4</h3>
                    <p className="text-xs text-muted-foreground mt-0">Track visitor behavior and site performance</p>
                  </div>
                </div>
                <Input value={formData.seo.googleAnalyticsId}
                  onChange={(e) => updateNested("seo", "googleAnalyticsId", e.target.value, "gaId")}
                  placeholder="G-XXXXXXXXXX"
                  className={cn("font-mono text-sm", getError("gaId") && "border-red-300 focus-visible:ring-red-400/50")} />
                {getError("gaId") && <p className="text-xs text-red-500 mt-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{getError("gaId")}</p>}
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Found in your GA4 property settings
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-border bg-gradient-to-br from-purple-50/20 to-transparent hover:border-purple-200 transition-colors">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-600 shrink-0">
                    <Search className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Google Tag Manager</h3>
                    <p className="text-xs text-muted-foreground mt-0">Manage tracking tags and scripts</p>
                  </div>
                </div>
                <Input value={formData.seo.googleTagManagerId}
                  onChange={(e) => updateNested("seo", "googleTagManagerId", e.target.value, "gtmId")}
                  placeholder="GTM-XXXXXXX"
                  className={cn("font-mono text-sm", getError("gtmId") && "border-red-300 focus-visible:ring-red-400/50")} />
                {getError("gtmId") && <p className="text-xs text-red-500 mt-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{getError("gtmId")}</p>}
              </div>

              <div className="p-4 rounded-2xl border border-border bg-gradient-to-br from-rose-50/20 to-transparent hover:border-rose-200 transition-colors">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-2 rounded-lg bg-rose-100 text-rose-600 shrink-0">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Meta Pixel (Facebook Ads)</h3>
                    <p className="text-xs text-muted-foreground mt-0">Track conversions and retarget visitors</p>
                  </div>
                </div>
                <Input value={formData.seo.metaPixelId}
                  onChange={(e) => updateNested("seo", "metaPixelId", e.target.value, "pixelId")}
                  placeholder="1234567890"
                  className={cn("font-mono text-sm", getError("pixelId") && "border-red-300 focus-visible:ring-red-400/50")} />
                {getError("pixelId") && <p className="text-xs text-red-500 mt-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{getError("pixelId")}</p>}
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Found in Meta Events Manager
                </p>
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            {sectionHeader(Bell, "Announcement Bar", "Show a notification bar at the top of your store")}
            <div className={cn(
              "p-4 rounded-2xl border-2 transition-all duration-300",
              formData.announcement.isActive
                ? "border-brand-300 bg-gradient-to-br from-brand-50/50 to-transparent"
                : "border-border bg-muted/10"
            )}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-2 rounded-xl transition-colors",
                    formData.announcement.isActive ? "bg-brand-100 text-brand-600" : "bg-muted text-muted-foreground"
                  )}>
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">Announcement Bar</p>
                    <p className="text-xs text-muted-foreground">
                      {formData.announcement.isActive ? "Currently visible on your store" : "Hidden from visitors"}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={formData.announcement.isActive}
                    onChange={(e) => { updateNested("announcement", "isActive", e.target.checked); }}
                    className="sr-only peer" />
                  <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600" />
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Announcement Text</label>
                <div className="relative">
                  <Input value={formData.announcement.text}
                    onChange={(e) => updateNested("announcement", "text", e.target.value, "announcementText")}
                    placeholder="Free shipping on orders above ₹499!"
                    className={cn(getError("announcementText") && "border-red-300 focus-visible:ring-red-400/50")} />
                  {getError("announcementText") && <p className="text-xs text-red-500 mt-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{getError("announcementText")}</p>}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-2">
                  {formData.announcement.isActive ? (
                    <><CheckCircle2 className="h-4 w-4 text-green-500" /> Live on store</>
                  ) : (
                    <><XCircle className="h-4 w-4 text-muted-foreground" /> Inactive</>
                  )}
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              {sectionHeader(MessageCircle, "WhatsApp Settings", "Configure WhatsApp integration for order notifications")}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" /> WhatsApp Number
                  </label>
                  <Input value={formData.whatsapp.number} onChange={(e) => updateNested("whatsapp", "number", e.target.value, "whatsappNumber")}
                    placeholder="919876543210"
                    className={cn("tabular-nums", getError("whatsappNumber") && "border-red-300 focus-visible:ring-red-400/50")} />
                  {getError("whatsappNumber") && <p className="text-xs text-red-500 mt-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{getError("whatsappNumber")}</p>}
                  <p className="text-[10px] text-muted-foreground mt-2">With country code, no + sign</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Message Template</label>
                  <Input value={formData.whatsapp.messageTemplate}
                    onChange={(e) => updateNested("whatsapp", "messageTemplate", e.target.value)}
                    placeholder="Hi, I would like to order..." />
                </div>
              </div>
            </div>
          </div>
        );

      case "banners":
        return (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              {sectionHeader(ImagePlus, "Hero Banners", "Manage promotional banners shown on the homepage carousel")}
              <Button onClick={() => {
                setBanners((b) => [...b, { title: "", subtitle: "", image: "", link: "", isActive: true, order: b.length, badge: "" }]);
                setBannerFiles((f) => [...f, null]);
                markDirty();
              }} className="shrink-0 gap-2">
                <Plus className="h-4 w-4" /> Add Banner
              </Button>
            </div>

            {banners.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
                <ImagePlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-medium mb-2">No banners yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Create your first promotional banner</p>
                <Button onClick={() => {
                  setBanners((b) => [...b, { title: "", subtitle: "", image: "", link: "", isActive: true, order: b.length, badge: "" }]);
                  setBannerFiles((f) => [...f, null]);
                  markDirty();
                }} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" /> Add Banner
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {banners.map((banner, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all",
                      banner.isActive ? "border-brand-200 bg-gradient-to-br from-brand-50/30 to-transparent" : "border-border bg-muted/10"
                    )}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-0">
                          <button onClick={() => { moveBanner(i, "up"); }} disabled={i === 0}
                            className="p-0 rounded text-muted-foreground/50 hover:text-foreground disabled:opacity-20 transition-colors">
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button onClick={() => { moveBanner(i, "down"); }} disabled={i === banners.length - 1}
                            className="p-0 rounded text-muted-foreground/50 hover:text-foreground disabled:opacity-20 transition-colors">
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </div>
                        <div>
                          <span className="text-sm font-semibold">Banner {i + 1}</span>
                          <p className="text-[10px] text-muted-foreground">
                            {banner.title || "No title"} · Order: {banner.order}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "inline-flex items-center gap-2 px-2 py-0 rounded-full text-[10px] font-medium",
                          banner.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        )}>
                          {banner.isActive ? <><Eye className="h-4 w-4" /> Live</> : <><EyeOff className="h-4 w-4" /> Hidden</>}
                        </span>
                        <button onClick={() => {
                          if (banners[i]?.image?.startsWith('blob:')) URL.revokeObjectURL(banners[i].image);
                          setBanners((b) => b.filter((_, j) => j !== i));
                          setBannerFiles((f) => f.filter((_, j) => j !== i));
                          markDirty();
                        }} className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-muted-foreground mb-2">Title</label>
                            <Input value={banner.title} onChange={(e) => {
                              const b = [...banners]; b[i] = { ...b[i], title: e.target.value }; setBanners(b); markDirty();
                            }} placeholder="Taste the Tradition" />
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-2">Subtitle</label>
                            <Input value={banner.subtitle} onChange={(e) => {
                              const b = [...banners]; b[i] = { ...b[i], subtitle: e.target.value }; setBanners(b); markDirty();
                            }} placeholder="Feel the Quality" />
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-2">Badge</label>
                            <Input value={banner.badge || ""} onChange={(e) => {
                              const b = [...banners]; b[i] = { ...b[i], badge: e.target.value }; setBanners(b); markDirty();
                            }} placeholder="Premium Quality" />
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-2">Link URL</label>
                            <Input value={banner.link || ""} onChange={(e) => {
                              const b = [...banners]; b[i] = { ...b[i], link: e.target.value }; setBanners(b); markDirty();
                            }} placeholder="/products" />
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground">Order</label>
                            <Input type="number" value={banner.order} onChange={(e) => {
                              const b = [...banners]; b[i] = { ...b[i], order: Number(e.target.value) }; setBanners(b); markDirty();
                            }} className="w-16 h-8 text-xs" />
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={banner.isActive} onChange={(e) => {
                              const b = [...banners]; b[i] = { ...b[i], isActive: e.target.checked }; setBanners(b); markDirty();
                            }} className="rounded border-border accent-brand-600" />
                            <span className="text-xs font-medium">{banner.isActive ? "Active" : "Inactive"}</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-2">Banner Image</label>
                        <label className="flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 border-dashed border-border hover:border-brand-500 cursor-pointer transition-colors bg-background min-h-[120px] group">
                          {(banner.image && !bannerFiles[i]) ? (
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                                        <Image src={getImageUrl(banner.image)} alt={banner.title || "Banner image"} width={400} height={225} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" unoptimized onError={() => setBanners(prev => prev.map((b, idx) => idx === i ? { ...b, image: '' } : b))} />
                            </div>
                          ) : bannerFiles[i] ? (
                            <div className="text-center">
                              <ImagePlus className="h-8 w-8 mx-auto text-brand-500 mb-2" />
                              <span className="text-xs text-muted-foreground">{bannerFiles[i]?.name}</span>
                            </div>
                          ) : (
                            <div className="text-center">
                                              <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                              <span className="text-xs text-muted-foreground">Click to upload</span>
                              <p className="text-[10px] text-muted-foreground/60 mt-0">PNG, JPG, WebP</p>
                            </div>
                          )}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Revoke old blob URL if it exists
                              if (banners[i]?.image?.startsWith('blob:')) URL.revokeObjectURL(banners[i].image);
                              const b = [...banners]; b[i] = { ...b[i], image: URL.createObjectURL(file) }; setBanners(b);
                              const f = [...bannerFiles]; f[i] = file; setBannerFiles(f);
                              markDirty();
                            }
                          }} />
                        </label>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-display">Settings</h1>
            {dirty && (
              <span className="inline-flex items-center gap-2 px-2 py-0 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium animate-in fade-in">
                <AlertTriangle className="h-4 w-4" /> Unsaved
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Manage your store configuration
            {dirty && <span className="hidden sm:inline"> · <span className="text-amber-600 font-medium">You have unsaved changes</span></span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <Button onClick={() => { 
              if (logoPreview && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
              if (faviconPreview && faviconPreview.startsWith('blob:')) URL.revokeObjectURL(faviconPreview);
              if (storyImagePreview && storyImagePreview.startsWith('blob:')) URL.revokeObjectURL(storyImagePreview);
              if (heroImagePreview && heroImagePreview.startsWith('blob:')) URL.revokeObjectURL(heroImagePreview);
              if (founderImagePreview && founderImagePreview.startsWith('blob:')) URL.revokeObjectURL(founderImagePreview);
              banners.forEach((b) => { if (b.image && b.image.startsWith('blob:')) URL.revokeObjectURL(b.image); });
              logoFileRef.current = null; faviconFileRef.current = null; storyImageFileRef.current = null; heroImageFileRef.current = null; founderImageFileRef.current = null;
              setFormData(JSON.parse(JSON.stringify(initialFormData))); setDirty(false); setErrors({}); setLogoFile(null); setFaviconFile(null); setStoryImageFile(null); setHeroImageFile(null); setFounderImageFile(null); setLogoPreview(initialLogo); setFaviconPreview(initialFavicon); setStoryImagePreview(initialStoryImage); setHeroImagePreview(initialHeroImage); setFounderImagePreview(initialFounderImage); setLogoRemoved(false); setFaviconRemoved(false); setStoryImageRemoved(false); setHeroImageRemoved(false); setFounderImageRemoved(false); setBanners(JSON.parse(JSON.stringify(initialBanners))); setBannerFiles(initialBanners.map(() => null)); }}
              variant="outline" className="gap-2">
              <XCircle className="h-4 w-4" /> Reset
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || loading} className="gap-2 min-w-[140px]">
            {saving ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="h-4 w-4" /> {dirty ? "Save Changes" : "Saved"}</>
            )}
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-muted/50 p-2 rounded-2xl overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabSwitch(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-white text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Unsaved changes dialog */}
      <AnimatePresence>
        {showUnsavedDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
            onClick={cancelTabSwitch}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl border border-border p-6 max-w-sm mx-4"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold">Unsaved Changes</h3>
                  <p className="text-sm text-muted-foreground">You have unsaved changes in this tab</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={cancelTabSwitch}>Stay</Button>
                <Button onClick={confirmTabSwitch} className="gap-2">
                  <XCircle className="h-4 w-4" /> Discard & Switch
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        <Card>
          <CardContent className="p-6 md:p-8">
            {renderTab()}
          </CardContent>
        </Card>
      </motion.div>

      {/* Sticky Save Footer */}
      <div className="sticky bottom-0 bg-gradient-to-t from-stone-50 via-stone-50 to-transparent pt-4 pb-2 -mx-4 sm:-mx-6 px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {dirty ? (
              <><span className="h-2 w-2 rounded-full bg-amber-400 shimmer-bg" /> Unsaved changes</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 text-green-500" /> All changes saved</>
            )}
            <span className="text-muted-foreground/50">·</span>
            <kbd className="px-2 py-0 rounded border border-border bg-muted text-[10px] font-mono">Ctrl+S</kbd>
            <span className="hidden sm:inline">to save</span>
          </div>
          <Button onClick={handleSave} disabled={saving || loading || !dirty} size="lg" className={cn(
            "gap-2 min-w-[180px] shadow-lg transition-all",
            !dirty && "opacity-60"
          )}>
            {saving ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="h-4 w-4" /> {dirty ? "Save All Settings" : "All Saved"}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
