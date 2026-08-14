import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteSettingsDocument extends Document {
  siteName: string;
  tagline: string;
  logo?: string;
  favicon?: string;
  storyImage?: string;
  heroImage?: string;
  founderImage?: string;
  email: string;
  phone: string;
  address: string;
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    whatsapp?: string;
  };
  footer: {
    aboutText: string;
    copyright: string;
  };
  shipping: {
    freeShippingThreshold: number;
    standardDeliveryCharge: number;
    estimatedDays: string;
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
    googleAnalyticsId?: string;
    googleTagManagerId?: string;
    metaPixelId?: string;
  };
  announcement: {
    text: string;
    isActive: boolean;
  };
  banners: Array<{
    title: string;
    subtitle: string;
    image?: string;
    link?: string;
    badge?: string;
    isActive: boolean;
    order: number;
  }>;
  story: {
    heading: string;
    text: string;
  };
  stats: Array<{
    label: string;
    value: number;
    suffix: string;
  }>;
  about: {
    heroTagline: string;
    heroHeadline: string;
    heroSubtitle: string;
    mission: string;
    vision: string;
    founderName: string;
    founderTitle: string;
    founderBio: string;
    values: Array<{ title: string; description: string }>;
    qualityBadges: Array<{ label: string; description: string }>;
  };
}

const siteSettingsSchema = new Schema<ISiteSettingsDocument>(
  {
    siteName: { type: String, required: true, default: 'RIJITA by Arya Foods' },
    tagline: { type: String, default: 'Premium Quality Namkeen & Snacks' },
    logo: { type: String },
    favicon: { type: String },
    storyImage: { type: String },
    heroImage: { type: String },
    founderImage: { type: String },
    email: { type: String, required: true, default: 'admin@rijita.com' },
    phone: { type: String, required: true, default: '+919876543210' },
    address: { type: String },
    socialMedia: {
      facebook: { type: String },
      instagram: { type: String },
      twitter: { type: String },
      youtube: { type: String },
      whatsapp: { type: String },
    },
    footer: {
      aboutText: { type: String },
      copyright: { type: String, default: '© 2024 RIJITA by Arya Foods. All rights reserved.' },
    },
    shipping: {
      freeShippingThreshold: { type: Number, default: 499 },
      standardDeliveryCharge: { type: Number, default: 49 },
      estimatedDays: { type: String, default: '3-7 business days' },
    },
    gst: {
      gstin: { type: String },
      rate: { type: Number, default: 5 },
    },
    whatsapp: {
      number: { type: String },
      messageTemplate: { type: String },
    },
    payment: {
      upiId: { type: String, default: 'merchant@upi' },
      upiName: { type: String, default: 'RIJITA Store' },
    },
    seo: {
      googleAnalyticsId: { type: String },
      googleTagManagerId: { type: String },
      metaPixelId: { type: String },
    },
    announcement: {
      text: { type: String, default: 'Free shipping on orders above ₹499!' },
      isActive: { type: Boolean, default: false },
    },
    banners: [{
      title: { type: String },
      subtitle: { type: String },
      image: { type: String },
      link: { type: String },
      badge: { type: String },
      isActive: { type: Boolean, default: true },
      order: { type: Number, default: 0 },
    }],
    story: {
      heading: { type: String, default: 'A Tradition of Purity, Passed Down Through Generations' },
      text: { type: String },
    },
    stats: [{
      label: { type: String },
      value: { type: Number, default: 0 },
      suffix: { type: String, default: '+' },
    }],
    about: {
      heroTagline: { type: String, default: 'About RIJITA' },
      heroHeadline: { type: String, default: 'Crafting Timeless Taste' },
      heroSubtitle: { type: String },
      mission: { type: String },
      vision: { type: String },
      founderName: { type: String, default: 'Arya Foods' },
      founderTitle: { type: String, default: 'Founder & Visionary' },
      founderBio: { type: String },
      values: [{ title: { type: String }, description: { type: String } }],
      qualityBadges: [{ label: { type: String }, description: { type: String } }],
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISiteSettingsDocument>('SiteSettings', siteSettingsSchema);
