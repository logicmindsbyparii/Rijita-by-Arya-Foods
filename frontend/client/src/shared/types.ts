export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: "customer" | "admin" | "superadmin";
  isActive: boolean;
  avatar?: string;
  addresses: Address[];
  wishlist: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  _id?: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parent?: string | Category;
  isActive: boolean;
  order: number;
  productCount?: number;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  category: Category | string;
  subcategory?: Category | string;
  brand?: string;
  variants: Variant[];
  images: string[];
  videos?: string[];
  tags: string[];
  nutritionalInfo?: NutritionalInfo;
  ingredients?: string;
  shelfLife?: string;
  storageInstructions?: string;
  countryOfOrigin?: string;
  fssaiLicense?: string;
  gst: number;
  hsn: string;
  isActive: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  unit: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  minPrice?: number;
  maxPrice?: number;
  totalSold: number;
  averageRating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  relatedProducts?: Product[];
}

export interface Variant {
  _id?: string;
  weight: string;
  weightValue: number;
  weightUnit: string;
  mrp: number;
  sellingPrice: number;
  discount: number;
  stock: number;
  sku: string;
  isActive: boolean;
}

export interface NutritionalInfo {
  servingSize?: string;
  calories?: number;
  totalFat?: number;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  sodium?: number;
  totalCarbohydrates?: number;
  dietaryFiber?: number;
  sugars?: number;
  protein?: number;
  vitaminA?: number;
  vitaminC?: number;
  calcium?: number;
  iron?: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  user?: string | User;
  items: OrderItem[];
  shippingAddress: {
    fullName: string;
    phone: string;
    email?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  gstAmount: number;
  total: number;
  coupon?: string;
  notes?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  whatsappSent: boolean;
  tracking: Tracking[];
  shipping?: OrderShipping;
  createdAt: string;
  updatedAt: string;
}

// ─── Shiprocket ──────────────────────────────────────────────────────

export interface ShipmentScan {
  date?: string;
  status?: string;
  activity?: string;
  location?: string;
}

export interface OrderShipping {
  provider?: string;
  shiprocketOrderId?: string;
  shipmentId?: string;
  awbCode?: string;
  courierName?: string;
  courierId?: string;
  status?: string;
  labelUrl?: string;
  invoiceUrl?: string;
  manifestUrl?: string;
  trackUrl?: string;
  pickupLocation?: string;
  pickupScheduledDate?: string;
  pickupTokenNumber?: string;
  expectedDeliveryDate?: string;
  deliveredDate?: string;
  appliedWeight?: number;
  freightCharge?: number;
  scans?: ShipmentScan[];
  lastSyncedAt?: string;
  createdAt?: string;
  cancelledAt?: string | null;
  error?: string | null;
}

export interface ShipmentTracking {
  awb?: string;
  courierName?: string;
  currentStatus?: string;
  expectedDeliveryDate?: string;
  deliveredDate?: string;
  trackUrl?: string;
  scans: ShipmentScan[];
}

export interface CourierOption {
  id: number | string;
  name: string;
  rate?: number;
  codCharges?: number;
  codAvailable?: boolean;
  estimatedDays?: number | string;
  etd?: string;
  rating?: number;
}

export interface ServiceabilityResult {
  serviceable: boolean;
  pincode: string;
  weight: number;
  couriers: CourierOption[];
  cheapest?: CourierOption;
  fastest?: CourierOption;
  recommended?: CourierOption;
}

export interface ShiprocketStatus {
  configured: boolean;
  connected: boolean;
  error?: string | null;
  webhookConfigured: boolean;
  config: {
    pickupLocation?: string;
    pickupPincode?: string;
    length?: number;
    breadth?: number;
    height?: number;
    packagingWeight?: number;
    autoCreate?: boolean;
  };
}

export interface OrderItem {
  product: string;
  productName: string;
  variant: string;
  weight: string;
  quantity: number;
  mrp: number;
  price: number;
  total: number;
  image?: string;
}

export interface Tracking {
  status: string;
  location?: string;
  note?: string;
  date: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "packed"
  | "dispatched"
  | "out-for-delivery"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export interface Coupon {
  _id: string;
  code: string;
  description?: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderAmount: number;
  maxDiscount?: number;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
}

export interface Collection {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  products: Product[] | string[];
  isActive: boolean;
}

export interface Review {
  _id: string;
  product: string | Product;
  user: string | User;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  isApproved: boolean;
  createdAt: string;
}

export interface Blog {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  author: string;
  tags: string[];
  category?: string;
  isPublished: boolean;
  metaTitle: string;
  metaDescription: string;
  publishedAt?: string;
  createdAt: string;
}

export interface Recipe {
  _id: string;
  title: string;
  slug: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: "easy" | "medium" | "hard";
  featuredImage?: string;
  products: Product[] | string[];
  tags: string[];
  isPublished: boolean;
  metaTitle: string;
  metaDescription: string;
}

export interface SiteSettings {
  _id: string;
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
    /** Overrides for the server's Shiprocket env defaults */
    shiprocket?: {
      pickupLocation?: string;
      pickupPincode?: string;
      length?: number;
      breadth?: number;
      height?: number;
      packagingWeight?: number;
      autoCreate?: boolean;
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
  seo?: {
    googleAnalyticsId?: string;
    googleTagManagerId?: string;
    metaPixelId?: string;
  };
  announcement: {
    text: string;
    isActive: boolean;
  };
  banners?: Array<{
    title: string;
    subtitle: string;
    image?: string;
    link?: string;
    badge?: string;
    isActive: boolean;
    order: number;
  }>;
  story?: {
    heading: string;
    text: string;
  };
  stats?: Array<{
    label: string;
    value: number;
    suffix: string;
  }>;
  about?: {
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

export interface CartItem {
  product: Product;
  variant: Variant;
  quantity: number;
  notes?: string;
}

export interface Contact {
  _id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalOrders: number;
  todayOrders: number;
  monthOrders: number;
  totalRevenue: number;
  monthRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  todayCustomers: number;
  pendingOrders: number;
  lowStockProducts: number;
  unreadContacts: number;
  conversionRate: string;
}
