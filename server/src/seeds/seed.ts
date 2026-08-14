import dotenv from 'dotenv';
dotenv.config();
import connectDB from '../config/db';
import { generateSlug } from '../utils/helpers';
import User from '../models/User';
import Category from '../models/Category';
import Product from '../models/Product';
import Order from '../models/Order';
import Coupon from '../models/Coupon';
import Blog from '../models/Blog';
import Recipe from '../models/Recipe';
import Review from '../models/Review';
import Collection from '../models/Collection';
import Contact from '../models/Contact';
import Subscriber from '../models/Subscriber';
import SiteSettings from '../models/SiteSettings';

const run = async () => {
  await connectDB();

  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    Coupon.deleteMany({}),
    Blog.deleteMany({}),
    Recipe.deleteMany({}),
    Review.deleteMany({}),
    Collection.deleteMany({}),
    Contact.deleteMany({}),
    Subscriber.deleteMany({}),
    SiteSettings.deleteMany({}),
  ]);

  // ──────────────────────────────────────────────
  // 1. USERS
  // ──────────────────────────────────────────────
  console.log('Creating users...');
  const superadmin = await User.create({
    name: 'Rijita Admin',
    email: 'admin@rijita.com',
    phone: '9876543210',
    password: 'password123',
    role: 'superadmin',
    isActive: true,
    addresses: [{
      label: 'Office',
      fullName: 'Rijita Admin',
      phone: '9876543210',
      addressLine1: '42, Food Processing Zone',
      addressLine2: 'GIDC Phase 2',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '382445',
      isDefault: true,
    }],
  });

  const admin = await User.create({
    name: 'Priya Sharma',
    email: 'priya@rijita.com',
    phone: '9876543211',
    password: 'password123',
    role: 'admin',
    isActive: true,
    addresses: [{
      label: 'Office',
      fullName: 'Priya Sharma',
      phone: '9876543211',
      addressLine1: '15, Snack Complex',
      city: 'Surat',
      state: 'Gujarat',
      pincode: '395010',
      isDefault: true,
    }],
  });

  const customer1 = await User.create({
    name: 'Amit Patel',
    email: 'amit@example.com',
    phone: '9988776655',
    password: 'password123',
    role: 'customer',
    isActive: true,
    addresses: [{
      label: 'Home',
      fullName: 'Amit Patel',
      phone: '9988776655',
      addressLine1: '7, Shantinagar Society',
      addressLine2: 'Near Gurdwara',
      city: 'Vadodara',
      state: 'Gujarat',
      pincode: '390001',
      isDefault: true,
    }],
  });

  const customer2 = await User.create({
    name: 'Neha Gupta',
    email: 'neha@example.com',
    phone: '9988776666',
    password: 'password123',
    role: 'customer',
    isActive: true,
    addresses: [{
      label: 'Home',
      fullName: 'Neha Gupta',
      phone: '9988776666',
      addressLine1: '202, Sunshine Apartments',
      addressLine2: 'MG Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      isDefault: true,
    }],
  });

  const customer3 = await User.create({
    name: 'Rahul Desai',
    email: 'rahul@example.com',
    phone: '9988776677',
    password: 'password123',
    role: 'customer',
    isActive: true,
    addresses: [{
      label: 'Home',
      fullName: 'Rahul Dev',
      phone: '9988776677',
      addressLine1: '88, Lake View Colony',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      isDefault: true,
    }],
  });

  // ──────────────────────────────────────────────
  // 2. CATEGORIES & SUBCATEGORIES
  // ──────────────────────────────────────────────
  console.log('Creating categories...');
  const catNamkeen = await Category.create({
    name: 'Namkeen',
    slug: generateSlug('Namkeen'),
    description: 'Traditional Indian namkeen and savory snacks',
    image: '/uploads/categories/namkeen.jpg',
    order: 1,
    isActive: true,
  });

  const catFarsan = await Category.create({
    name: 'Farsan',
    slug: generateSlug('Farsan'),
    description: 'Gujarati farsan items for every occasion',
    image: '/uploads/categories/farsan.jpg',
    order: 2,
    isActive: true,
  });

  const catSweets = await Category.create({
    name: 'Sweets',
    slug: generateSlug('Sweets'),
    description: 'Traditional Indian mithai and sweets',
    image: '/uploads/categories/sweets.jpg',
    order: 3,
    isActive: true,
  });

  const catGiftPacks = await Category.create({
    name: 'Gift Packs',
    slug: generateSlug('Gift Packs'),
    description: 'Curated gift boxes and hampers for all occasions',
    image: '/uploads/categories/gift-packs.jpg',
    order: 4,
    isActive: true,
  });

  const catFestival = await Category.create({
    name: 'Festival Specials',
    slug: generateSlug('Festival Specials'),
    description: 'Special snacks and sweets for festivals',
    image: '/uploads/categories/festival-specials.jpg',
    order: 5,
    isActive: true,
  });

  const catReadyToEat = await Category.create({
    name: 'Ready to Eat',
    slug: generateSlug('Ready to Eat'),
    description: 'Instant ready-to-eat Indian meals and snacks',
    image: '/uploads/categories/ready-to-eat.jpg',
    order: 6,
    isActive: true,
  });

  const subSev = await Category.create({
    name: 'Sev & Mixtures',
    slug: generateSlug('Sev & Mixtures'),
    description: 'Crunchy sev and mixed namkeen',
    image: '/uploads/categories/sev-mixtures.jpg',
    parent: catNamkeen._id,
    order: 1,
    isActive: true,
  });

  const subBhujiya = await Category.create({
    name: 'Bhujiya',
    slug: generateSlug('Bhujiya'),
    description: 'Aloo bhujiya and similar crispy snacks',
    image: '/uploads/categories/bhujiya.jpg',
    parent: catNamkeen._id,
    order: 2,
    isActive: true,
  });

  // ──────────────────────────────────────────────
  // 3. PRODUCTS (15 products with 2-3 variants each)
  // ──────────────────────────────────────────────
  console.log('Creating products...');

  interface ProductVariant {
    weight: string;
    weightValue: number;
    weightUnit: string;
    mrp: number;
    sellingPrice: number;
    stock: number;
    sku: string;
  }

  interface ProductSeedData {
    name: string;
    categoryId: string;
    subcategoryId?: string;
    description: string;
    shortDescription: string;
    variants: ProductVariant[];
    isFeatured: boolean;
    isBestSeller: boolean;
    isNewArrival: boolean;
    tags: string[];
    ingredients: string;
    shelfLife: string;
    storageInstructions: string;
    fssaiLicense?: string;
    nutritionalInfo: {
      servingSize: string;
      calories: number;
      totalFat: number;
      saturatedFat?: number;
      protein: number;
      totalCarbohydrates: number;
      sodium: number;
    };
    gst: number;
    hsn: string;
    unit: string;
    metaKeywords: string[];
  }

  const productsData: ProductSeedData[] = [
    {
      name: 'Classic Sev',
      categoryId: catNamkeen._id.toString(),
      subcategoryId: subSev._id.toString(),
      description: 'Crispy, thin gram flour sev made from premium besan. A timeless Indian snack that adds crunch to any meal or chaat.',
      shortDescription: 'Crispy gram flour sev - classic Indian snack',
      variants: [
        { weight: '100g', weightValue: 100, weightUnit: 'g', mrp: 30, sellingPrice: 25, stock: 500, sku: 'SEV-100' },
        { weight: '200g', weightValue: 200, weightUnit: 'g', mrp: 55, sellingPrice: 45, stock: 400, sku: 'SEV-200' },
        { weight: '500g', weightValue: 500, weightUnit: 'g', mrp: 120, sellingPrice: 99, stock: 300, sku: 'SEV-500' },
      ],
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      tags: ['namkeen', 'sev', 'crunchy', 'tea-time snack'],
      ingredients: 'Besan (gram flour), refined palm oil, salt, spices, asafoetida',
      shelfLife: '6 months from manufacture',
      storageInstructions: 'Store in a cool, dry place. Keep airtight after opening.',
      fssaiLicense: 'FSSAI-ARYA-2024-001',
      nutritionalInfo: { servingSize: '100g', calories: 545, totalFat: 34, protein: 14, totalCarbohydrates: 45, sodium: 780 },
      gst: 5, hsn: '21069099', unit: 'Pcs',
      metaKeywords: ['namkeen', 'sev', 'gujarati snack', 'tea time snack'],
    },
    {
      name: 'Aloo Bhujia',
      categoryId: catNamkeen._id.toString(),
      subcategoryId: subBhujiya._id.toString(),
      description: 'Crispy Aloo Bhujia made from premium potatoes and authentic spices. A classic Indian tea time snack that everyone loves.',
      shortDescription: 'Crispy potato namkeen - perfect tea-time snack',
      variants: [
        { weight: '100g', weightValue: 100, weightUnit: 'g', mrp: 25, sellingPrice: 20, stock: 600, sku: 'ALOO-100' },
        { weight: '200g', weightValue: 200, weightUnit: 'g', mrp: 45, sellingPrice: 38, stock: 450, sku: 'ALOO-200' },
        { weight: '1kg', weightValue: 1000, weightUnit: 'g', mrp: 200, sellingPrice: 170, stock: 150, sku: 'ALOO-1000' },
      ],
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: true,
      tags: ['bhujiya', 'aloo', 'crispy', 'namkeen'],
      ingredients: 'Potato starch, gram flour, edible vegetable oil, salt, spices, anti-caking agent',
      shelfLife: '6 months from manufacture',
      storageInstructions: 'Store in a cool, dry place. Keep airtight after opening.',
      fssaiLicense: 'FSSAI-ARYA-2024-002',
      nutritionalInfo: { servingSize: '100g', calories: 520, totalFat: 32, protein: 9, totalCarbohydrates: 52, sodium: 890 },
      gst: 5, hsn: '210690', unit: 'Pcs',
      metaKeywords: ['aloo bhujia', 'potato snack', 'tea time snack', 'namkeen online'],
    },
    {
      name: 'Gujarati Gathiya',
      categoryId: catNamkeen._id.toString(),
      subcategoryId: subSev._id.toString(),
      description: 'Traditional Gujarati gathiya made from besan, ajwain, and a secret spice blend. Light, crunchy, and deeply satisfying.',
      shortDescription: 'Traditional Gujarati gathiya - crunchy spiral snack',
      variants: [
        { weight: '100g', weightValue: 100, weightUnit: 'g', mrp: 28, sellingPrice: 22, stock: 400, sku: 'GATHIYA-100' },
        { weight: '200g', weightValue: 200, weightUnit: 'g', mrp: 50, sellingPrice: 40, stock: 350, sku: 'GATHIYA-200' },
      ],
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: false,
      tags: ['gathiya', 'gujarati snack', 'crunchy', 'traditional'],
      ingredients: 'Besan (gram flour), refined palm oil, salt, ajwain (carrom seeds), asafoetida',
      shelfLife: '6 months from manufacture',
      storageInstructions: 'Store in a cool, dry place.',
      fssaiLicense: 'FSSAI-ARYA-2024-003',
      nutritionalInfo: { servingSize: '100g', calories: 530, totalFat: 33, protein: 12, totalCarbohydrates: 48, sodium: 750 },
      gst: 5, hsn: '210690', unit: 'Pcs',
      metaKeywords: ['gujarati gathiya', 'gathiya namkeen', 'traditional gujarati snack'],
    },
    {
      name: 'Methi Khakhra',
      categoryId: catFarsan._id.toString(),
      description: 'Lightly spiced fenugreek khakhra made from whole wheat. Toasted to perfection for a guilt-free crunchy snack.',
      shortDescription: 'Crunchy fenugreek khakhra - low fat Gujarati snack',
      variants: [
        { weight: '200g', weightValue: 200, weightUnit: 'g', mrp: 65, sellingPrice: 55, stock: 350, sku: 'KHAKH-200' },
        { weight: '400g', weightValue: 400, weightUnit: 'g', mrp: 120, sellingPrice: 100, stock: 250, sku: 'KHAKH-400' },
        { weight: '1kg', weightValue: 1000, weightUnit: 'g', mrp: 280, sellingPrice: 240, stock: 100, sku: 'KHAKH-1000' },
      ],
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      tags: ['khakhra', 'methi', 'gujarati snack', 'healthy', 'low fat'],
      ingredients: 'Whole wheat flour, methi (fenugreek) leaves, refined oil, salt, turmeric, asafoetida',
      shelfLife: '9 months from manufacture',
      storageInstructions: 'Store in a cool, dry place. Handle with care as it is fragile.',
      fssaiLicense: 'FSSAI-ARYA-2024-004',
      nutritionalInfo: { servingSize: '100g', calories: 420, totalFat: 18, protein: 10, totalCarbohydrates: 55, sodium: 620 },
      gst: 5, hsn: '190590', unit: 'Pcs',
      metaKeywords: ['methi khakhra', 'gujarati khakhra', 'khakra online', 'healthy snack'],
    },
    {
      name: 'Soan Papdi',
      categoryId: catSweets._id.toString(),
      description: 'Melt-in-the-mouth flaky sweet made with gram flour, sugar and ghee. A festival favorite across India.',
      shortDescription: 'Flaky, melt-in-mouth sweet traditional mithai',
      variants: [
        { weight: '250g', weightValue: 250, weightUnit: 'g', mrp: 110, sellingPrice: 90, stock: 200, sku: 'SOAN-250' },
        { weight: '500g', weightValue: 500, weightUnit: 'g', mrp: 200, sellingPrice: 170, stock: 150, sku: 'SOAN-500' },
      ],
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: false,
      tags: ['soan papdi', 'sweet', 'mithai', 'flaky dessert'],
      ingredients: 'Gram flour (besan), sugar, ghee, wheat flour, cardamom, milk',
      shelfLife: '3 months from manufacture',
      storageInstructions: 'Store in a cool, dry place. Avoid direct sunlight.',
      fssaiLicense: 'FSSAI-ARYA-2024-005',
      nutritionalInfo: { servingSize: '100g', calories: 480, totalFat: 24, protein: 6, totalCarbohydrates: 60, sodium: 120 },
      gst: 5, hsn: '170490', unit: 'Pcs',
      metaKeywords: ['soan papdi', 'indian sweet', 'sohan papdi', 'flaky sweet'],
    },
    {
      name: 'Kaju Katli',
      categoryId: catSweets._id.toString(),
      description: 'Premium Kaju Katli made from finest cashews, ghee, and silver vark. Rich, smooth, and absolutely delightful.',
      shortDescription: 'Rich cashew barfi - premium mithai',
      variants: [
        { weight: '250g', weightValue: 250, weightUnit: 'g', mrp: 350, sellingPrice: 299, stock: 120, sku: 'KAJU-250' },
        { weight: '500g', weightValue: 500, weightUnit: 'g', mrp: 650, sellingPrice: 550, stock: 80, sku: 'KAJU-500' },
      ],
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: false,
      tags: ['kaju katli', 'cashew sweet', 'mithai', 'premium', 'gift'],
      ingredients: 'Cashew nuts, sugar, ghee, cardamom, silver vark (edible silver foil)',
      shelfLife: '2 months from manufacture',
      storageInstructions: 'Refrigerate for longer freshness. Consume within 2 months.',
      fssaiLicense: 'FSSAI-ARYA-2024-006',
      nutritionalInfo: { servingSize: '100g', calories: 540, totalFat: 35, saturatedFat: 8, protein: 10, totalCarbohydrates: 48, sodium: 15 },
      gst: 5, hsn: '170490', unit: 'Pcs',
      metaKeywords: ['kaju katli', 'cashew barfi', 'kaju barfi', 'indian mithai online'],
    },
    {
      name: 'Besan Ladoo',
      categoryId: catSweets._id.toString(),
      description: 'Traditional Besan Ladoo made with roasted gram flour, pure ghee, and cardamom. Hand rolled to perfection.',
      shortDescription: 'Gram flour ladoos made with pure ghee - classic Indian sweet',
      variants: [
        { weight: '250g', weightValue: 250, weightUnit: 'g', mrp: 130, sellingPrice: 110, stock: 180, sku: 'BLADO-250' },
        { weight: '500g', weightValue: 500, weightUnit: 'g', mrp: 240, sellingPrice: 200, stock: 130, sku: 'BLADO-500' },
        { weight: '1kg', weightValue: 1000, weightUnit: 'g', mrp: 450, sellingPrice: 380, stock: 60, sku: 'BLADO-1000' },
      ],
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      tags: ['besan ladoo', 'ladoo', 'sweet', 'festival', 'traditional'],
      ingredients: 'Besan (gram flour), pure ghee, sugar powder, cardamom, chopped almonds',
      shelfLife: '3 months from manufacture',
      storageInstructions: 'Store in an airtight container away from moisture.',
      fssaiLicense: 'FSSAI-ARYA-2024-007',
      nutritionalInfo: { servingSize: '100g', calories: 510, totalFat: 30, saturatedFat: 15, protein: 8, totalCarbohydrates: 58, sodium: 80 },
      gst: 5, hsn: '170490', unit: 'Pcs',
      metaKeywords: ['besan ladoo', 'besan ke laddu', 'gram flour ladoo', 'gujarati mithai'],
    },
    {
      name: 'Chana Dal',
      categoryId: catNamkeen._id.toString(),
      subcategoryId: subSev._id.toString(),
      description: 'Crispy spicy chana dal namkeen. High in protein and perfect for guilt-free snacking.',
      shortDescription: 'Crunchy & spicy split chickpea snack',
      variants: [
        { weight: '100g', weightValue: 100, weightUnit: 'g', mrp: 25, sellingPrice: 20, stock: 600, sku: 'CHANA-100' },
        { weight: '200g', weightValue: 200, weightUnit: 'g', mrp: 45, sellingPrice: 38, stock: 450, sku: 'CHANA-200' },
        { weight: '500g', weightValue: 500, weightUnit: 'g', mrp: 100, sellingPrice: 85, stock: 250, sku: 'CHANA-500' },
      ],
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      tags: ['chana dal', 'namkeen', 'protein snack', 'healthy'],
      ingredients: 'Bengal gram dal (chana dal), edible vegetable oil, spices, salt, red chili powder',
      shelfLife: '6 months from manufacture',
      storageInstructions: 'Store in a cool, dry place.',
      fssaiLicense: 'FSSAI-ARYA-2024-008',
      nutritionalInfo: { servingSize: '100g', calories: 470, totalFat: 22, protein: 18, totalCarbohydrates: 52, sodium: 620 },
      gst: 5, hsn: '210690', unit: 'Pcs',
      metaKeywords: ['chana dal namkeen', 'spicy chana dal', 'protein snack online'],
    },
    {
      name: 'Murukku',
      categoryId: catNamkeen._id.toString(),
      subcategoryId: subSev._id.toString(),
      description: 'Traditional South Indian murukku made from rice flour and urad dal. Spiral shaped and perfectly crunchy.',
      shortDescription: 'Traditional spiral-shaped crunchy snack',
      variants: [
        { weight: '100g', weightValue: 100, weightUnit: 'g', mrp: 35, sellingPrice: 28, stock: 300, sku: 'MURUKKU-100' },
        { weight: '200g', weightValue: 200, weightUnit: 'g', mrp: 65, sellingPrice: 52, stock: 220, sku: 'MURUKKU-200' },
      ],
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: false,
      tags: ['murukku', 'south indian snack', 'crispy', 'namkeen'],
      ingredients: 'Rice flour, urad dal flour, butter, cumin seeds, sesame seeds, salt, asafoetida',
      shelfLife: '6 months from manufacture',
      storageInstructions: 'Store in an airtight container.',
      fssaiLicense: 'FSSAI-ARYA-2024-009',
      nutritionalInfo: { servingSize: '100g', calories: 500, totalFat: 28, protein: 7, totalCarbohydrates: 55, sodium: 700 },
      gst: 5, hsn: '210690', unit: 'Pcs',
      metaKeywords: ['murukku', 'muruku', 'south indian snack', 'chakli online'],
    },
    {
      name: 'Punjabi Mix',
      categoryId: catNamkeen._id.toString(),
      subcategoryId: subSev._id.toString(),
      description: 'A delicious blend of crispy namkeen with peanuts, fried dal, potato sticks, and puffed rice. A true Punjabi style snack mix.',
      shortDescription: 'Classic Punjabi-style snack mix with peanuts',
      variants: [
        { weight: '100g', weightValue: 100, weightUnit: 'g', mrp: 28, sellingPrice: 22, stock: 500, sku: 'PUNMIX-100' },
        { weight: '200g', weightValue: 200, weightUnit: 'g', mrp: 50, sellingPrice: 40, stock: 380, sku: 'PUNMIX-200' },
        { weight: '500g', weightValue: 500, weightUnit: 'g', mrp: 110, sellingPrice: 90, stock: 200, sku: 'PUNMIX-500' },
      ],
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      tags: ['punjabi mix', 'namkeen', 'mixed snack', 'Navratan mix'],
      ingredients: 'Potato sticks, peanuts, fried gram dal, puffed rice, corn flakes, edible oil, salt, spices',
      shelfLife: '6 months from manufacture',
      storageInstructions: 'Store in a cool, dry place. Keep airtight.',
      fssaiLicense: 'FSSAI-ARYA-2024-010',
      nutritionalInfo: { servingSize: '100g', calories: 510, totalFat: 30, saturatedFat: 8, protein: 9, totalCarbohydrates: 50, sodium: 820 },
      gst: 5, hsn: '210690', unit: 'Pcs',
      metaKeywords: ['punjabi mixture', 'namkeen mix', 'navratan mixture', 'snack mix online'],
    },
    {
      name: 'Corn Flakes Mixture',
      categoryId: catNamkeen._id.toString(),
      subcategoryId: subSev._id.toString(),
      description: 'Light and crunchy corn flakes mixture. A perfect tea-time snack that kids love.',
      shortDescription: 'Crunchy corn flakes mixture - kids favorite',
      variants: [
        { weight: '100g', weightValue: 100, weightUnit: 'g', mrp: 30, sellingPrice: 24, stock: 400, sku: 'CORN-100' },
        { weight: '200g', weightValue: 200, weightUnit: 'g', mrp: 55, sellingPrice: 42, stock: 300, sku: 'CORN-200' },
        { weight: '500g', weightValue: 500, weightUnit: 'g', mrp: 120, sellingPrice: 99, stock: 150, sku: 'CORN-500' },
      ],
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: true,
      tags: ['corn flakes', 'mixture', 'light snack', 'kids snack'],
      ingredients: 'Corn flakes, peanuts, curry leaves, roasted chana dal, edible oil, salt, spices',
      shelfLife: '6 months from manufacture',
      storageInstructions: 'Store in a cool, dry place. Keep sealed.',
      fssaiLicense: 'FSSAI-ARYA-2024-011',
      nutritionalInfo: { servingSize: '100g', calories: 490, totalFat: 26, protein: 7, totalCarbohydrates: 58, sodium: 680 },
      gst: 5, hsn: '210690', unit: 'Pcs',
      metaKeywords: ['corn flake mixture', 'corn snack', 'mixture namkeen', 'light snack'],
    },
    {
      name: 'Dabeli Mix',
      categoryId: catFarsan._id.toString(),
      description: 'Authentic Kutchhi Dabeli masala mix. Make delicious Gujarat style dabeli at home in minutes.',
      shortDescription: 'Instant mix to make authentic Kutchhi Dabeli at home',
      variants: [
        { weight: '200g', weightValue: 200, weightUnit: 'g', mrp: 60, sellingPrice: 49, stock: 250, sku: 'DABELI-200' },
        { weight: '500g', weightValue: 500, weightUnit: 'g', mrp: 130, sellingPrice: 110, stock: 150, sku: 'DABELI-500' },
      ],
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      tags: ['dabeli mix', 'gujarati snack', 'instant mix', 'street food'],
      ingredients: 'Spices mix, roasted peanuts, sev, pomegranate seeds, special dabeli masala, salt, sugar',
      shelfLife: '12 months from manufacture',
      storageInstructions: 'Store in a cool, dry place away from moisture.',
      fssaiLicense: 'FSSAI-ARYA-2024-012',
      nutritionalInfo: { servingSize: '100g', calories: 440, totalFat: 24, protein: 8, totalCarbohydrates: 48, sodium: 950 },
      gst: 5, hsn: '210390', unit: 'Pcs',
      metaKeywords: ['dabeli mix', 'kutch dabeli', 'gujarati snack mix', 'street food at home'],
    },
    {
      name: 'Jain Mithai Mix',
      categoryId: catReadyToEat._id.toString(),
      description: 'Specially curated Jain-friendly mithai preparation mix. No onion, no garlic. Pure satvik ingredients.',
      shortDescription: 'Jain-friendly sweet mix - no onion no garlic',
      variants: [
        { weight: '250g', weightValue: 250, weightUnit: 'g', mrp: 140, sellingPrice: 120, stock: 100, sku: 'JAINM-250' },
        { weight: '500g', weightValue: 500, weightUnit: 'g', mrp: 260, sellingPrice: 220, stock: 80, sku: 'JAINM-500' },
      ],
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      tags: ['jain', 'mithai', 'ready to eat', 'no onion no garlic'],
      ingredients: 'Pure ghee, milk powder, sugar, dry fruits, cardamom, edible camphor',
      shelfLife: '6 months from manufacture',
      storageInstructions: 'Store in a cool, dry place.',
      fssaiLicense: 'FSSAI-ARYA-2024-013',
      nutritionalInfo: { servingSize: '100g', calories: 490, totalFat: 28, protein: 6, totalCarbohydrates: 56, sodium: 60 },
      gst: 5, hsn: '170490', unit: 'Pcs',
      metaKeywords: ['jain mix', 'jain mithai', 'satvik sweet', 'no onion garlic sweet'],
    },
    {
      name: 'Diwali Gift Pack',
      categoryId: catGiftPacks._id.toString(),
      description: 'Curated Diwali gift box containing Classic Sev, Aloo Bhujia, Kaju Katli, Soan Papdi, Besan Ladoo, and Methi Khakhra. Beautifully packed in a reusable gift box.',
      shortDescription: 'Complete Diwali hamper - namkeen & mithai gift box',
      variants: [
        { weight: '1kg', weightValue: 1000, weightUnit: 'g', mrp: 650, sellingPrice: 549, stock: 50, sku: 'DIWALI-1KG' },
        { weight: '2kg', weightValue: 2000, weightUnit: 'g', mrp: 1200, sellingPrice: 999, stock: 30, sku: 'DIWALI-2KG' },
      ],
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      tags: ['diwali', 'gift', 'hamper', 'festival', 'special pack'],
      ingredients: 'Assorted namkeen and sweets (see individual product ingredients)',
      shelfLife: '6 months from manufacture',
      storageInstructions: 'Store in a cool, dry place. Consume mithai within 1 month.',
      fssaiLicense: 'FSSAI-ARYA-2024-014',
      nutritionalInfo: { servingSize: '100g', calories: 500, totalFat: 28, saturatedFat: 10, protein: 8, totalCarbohydrates: 54, sodium: 400 },
      gst: 5, hsn: '210690', unit: 'Box',
      metaKeywords: ['diwali gift box', 'diwali hamper', 'festival gift pack', 'namkeen gift set'],
    },
    {
      name: 'Poha Chivda',
      categoryId: catNamkeen._id.toString(),
      subcategoryId: subSev._id.toString(),
      description: 'Classic Maharashtrian Poha Chivda made with thin flattened rice, peanuts, and curry leaves. Light, crunchy, and minimally oily.',
      shortDescription: 'Light and crispy poha chivda - Maharashtrian style',
      variants: [
        { weight: '100g', weightValue: 100, weightUnit: 'g', mrp: 25, sellingPrice: 20, stock: 400, sku: 'POHA-100' },
        { weight: '200g', weightValue: 200, weightUnit: 'g', mrp: 45, sellingPrice: 38, stock: 320, sku: 'POHA-200' },
        { weight: '500g', weightValue: 500, weightUnit: 'g', mrp: 100, sellingPrice: 85, stock: 180, sku: 'POHA-500' },
      ],
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: false,
      tags: ['chivda', 'poha', 'flattened rice', 'light snack', 'diet snack'],
      ingredients: 'Thin poha (flattened rice), peanuts, curry leaves, green chili, mustard seeds, turmeric, salt, sugar',
      shelfLife: '3 months from manufacture',
      storageInstructions: 'Store in an airtight container.',
      fssaiLicense: 'FSSAI-ARYA-2024-015',
      nutritionalInfo: { servingSize: '100g', calories: 430, totalFat: 20, protein: 6, totalCarbohydrates: 56, sodium: 250 },
      gst: 5, hsn: '210690', unit: 'Pcs',
      metaKeywords: ['poha chivda', 'chivda', 'maharashtrian snack', 'flattened rice snack', 'light snack'],
    },
  ];

  const productDocuments = await Product.insertMany(
    productsData.map((p) => ({
      name: p.name,
      slug: generateSlug(p.name),
      description: p.description,
      shortDescription: p.shortDescription,
      category: p.categoryId,
      subcategory: p.subcategoryId || undefined,
      brand: 'RIJITA by Arya Foods',
      variants: p.variants.map((v) => ({
        weight: v.weight,
        weightValue: v.weightValue,
        weightUnit: v.weightUnit,
        mrp: v.mrp,
        sellingPrice: v.sellingPrice,
        discount: Math.round(((v.mrp - v.sellingPrice) / v.mrp) * 100),
        stock: v.stock,
        sku: v.sku,
        isActive: true,
      })),
      images: [`/uploads/products/${generateSlug(p.name)}.jpg`, `/uploads/products/${generateSlug(p.name)}-2.jpg`],
      tags: p.tags,
      nutritionalInfo: p.nutritionalInfo,
      ingredients: p.ingredients,
      shelfLife: p.shelfLife,
      storageInstructions: p.storageInstructions,
      countryOfOrigin: 'India',
      fssaiLicense: p.fssaiLicense || 'FSSAI-ARYA-2024-000',
      gst: p.gst,
      hsn: p.hsn,
      unit: p.unit,
      isActive: true,
      isFeatured: p.isFeatured,
      isBestSeller: p.isBestSeller,
      isNewArrival: p.isNewArrival,
      metaTitle: `Buy ${p.name} Online | RIJITA by Arya Foods`,
      metaDescription: p.shortDescription,
      metaKeywords: p.metaKeywords,
      totalSold: 0,
      averageRating: 0,
      reviewCount: 0,
    }))
  );

  console.log(`Created ${productDocuments.length} products`);

  // ──────────────────────────────────────────────
  // 4. COUPONS
  // ──────────────────────────────────────────────
  console.log('Creating coupons...');
  const coupons = await Coupon.create([
    {
      code: 'WELCOME10',
      description: 'Get 10% off on your first order!',
      type: 'percentage',
      value: 10,
      minOrderAmount: 199,
      maxDiscount: 100,
      usageLimit: 500,
      usedCount: 45,
      isActive: true,
      startsAt: new Date('2025-01-01'),
      expiresAt: new Date('2027-12-31'),
    },
    {
      code: 'RIJITA15',
      description: 'Save 15% on orders above Rs 499',
      type: 'percentage',
      value: 15,
      minOrderAmount: 499,
      maxDiscount: 150,
      usageLimit: 300,
      usedCount: 78,
      isActive: true,
      startsAt: new Date('2025-01-01'),
      expiresAt: new Date('2026-06-30'),
    },
    {
      code: 'FESTIVE20',
      description: 'Festival season special! 20% off on everything!',
      type: 'percentage',
      value: 20,
      minOrderAmount: 299,
      maxDiscount: 250,
      usageLimit: 200,
      usedCount: 120,
      isActive: true,
      startsAt: new Date('2025-10-01'),
      expiresAt: new Date('2026-11-15'),
    },
    {
      code: 'FIRSTORDER',
      description: 'Flat Rs 100 off on your first purchase',
      type: 'fixed',
      value: 100,
      minOrderAmount: 350,
      maxDiscount: 100,
      usageLimit: 1000,
      usedCount: 210,
      isActive: true,
      startsAt: new Date('2025-01-01'),
      expiresAt: new Date('2027-12-31'),
    },
    {
      code: 'FREESHIP',
      description: 'Free shipping on all orders above Rs 299',
      type: 'fixed',
      value: 49,
      minOrderAmount: 299,
      usageLimit: 1000,
      usedCount: 340,
      isActive: true,
      startsAt: new Date('2025-01-01'),
      expiresAt: new Date('2026-12-31'),
    },
  ]);

  // ──────────────────────────────────────────────
  // 5. COLLECTIONS
  // ──────────────────────────────────────────────
  console.log('Creating collections...');
  const allProducts = await Product.find({});
  const findProductByTag = (tag: string) => allProducts.filter(p => p.tags.includes(tag));

  const diwaliProductIds = allProducts.filter(p =>
    p.tags.includes('diwali') || p.tags.includes('festival') || p.tags.includes('gift')
  ).map(p => p._id);

  const jainProductIds = allProducts.filter(p =>
    p.tags.includes('jain')
  ).map(p => p._id);

  const giftProductIds = allProducts.filter(p =>
    p.tags.includes('gift') || p.tags.includes('premium')
  ).map(p => p._id);

  const collections = await Collection.create([
    {
      name: 'Diwali Special',
      slug: generateSlug('Diwali Special'),
      description: 'Curated snacks and sweets for the festival of lights',
      image: '/uploads/collections/diwali-special.jpg',
      products: diwaliProductIds,
      isActive: true,
    },
    {
      name: 'Jain Favorites',
      slug: generateSlug('Jain Favorites'),
      description: 'Authentic Jain-friendly snacks made without onion and garlic',
      image: '/uploads/collections/jain-favorites.jpg',
      products: jainProductIds,
      isActive: true,
    },
    {
      name: 'Gift Boxes',
      slug: generateSlug('Gift Boxes'),
      description: 'Beautifully packaged gift boxes for every occasion',
      image: '/uploads/collections/gift-boxes.jpg',
      products: giftProductIds,
      isActive: true,
    },
  ]);

  // ──────────────────────────────────────────────
  // 6. BLOG POSTS
  // ──────────────────────────────────────────────
  console.log('Creating blog posts...');
  const blogs = await Blog.create([
    {
      title: 'The Art of Making Perfect Gujarati Gathiya',
      slug: generateSlug('The Art of Making Perfect Gujarati Gathiya'),
      content: 'Gujarati Gathiya is more than just a snack \u2013 it is a cultural icon. This crunchy, spiral-shaped namkeen is made from gram flour (besan) and a blend of traditional spices. In this blog, we take you behind the scenes of our kitchen to show how we craft the perfect Gathiya.\n\nFrom choosing the right gram flour to the perfect consistency of the dough, every step matters. We use cold-pressed groundnut oil for frying and a secret family recipe that has been passed down for three generations.\n\nThe result? A light, airy, and impossibly crunchy snack that pairs perfectly with a hot cup of chai.',
      excerpt: 'Discover the traditional method behind our signature Gujarati Gathiya \u2013 a crunchy tea-time favorite.',
      featuredImage: '/uploads/blog/gujarati-gathiya.jpg',
      author: 'Priya Sharma',
      tags: ['gathiya', 'gujarati snacks', 'namkeen making', 'traditional recipes'],
      category: 'Food Culture',
      isPublished: true,
      publishedAt: new Date('2025-11-10'),
      metaTitle: 'Art of Gujarati Gathiya | RIJITA Blog',
      metaDescription: 'Learn how traditional Gujarati Gathiya is made using age-old techniques and premium ingredients.',
    },
    {
      title: 'Healthy Snacking: Why Poha Chivda is Your Best Bet',
      slug: generateSlug('Healthy Snacking Why Poha Chivda is Your Best Bet'),
      content: 'In a world full of fried and processed snacks, Poha Chivda stands out as a wholesome alternative. Made from lightly roasted flattened rice, peanuts, and a tempering of curry leaves and mustard seeds, this Maharashtrian classic is both nutritious and delicious.\n\nHere is why you should add Poha Chivda to your daily snacking routine:\n- Low in calories compared to fried namkeen\n- Good source of iron from poha\n- No maida (refined flour) used\n- High satiety factor \u2013 keeps you fuller longer\n\nOur Poha Chivda at RIJITA is made using thin poha sourced from Madhya Pradesh, roasted in small batches, and mixed with a special masala that elevates the flavor without adding extra oil.',
      excerpt: 'Discover why Poha Chivda is the guilt-free snack you need in your life.',
      featuredImage: '/uploads/blog/poha-chivda.jpg',
      author: 'Rijita Admin',
      tags: ['poha chivda', 'healthy snacks', 'low-calorie', 'maharashtrian food'],
      category: 'Health & Nutrition',
      isPublished: true,
      publishedAt: new Date('2025-11-20'),
      metaTitle: 'Healthy Poha Chivda Snacking | RIJITA Blog',
      metaDescription: 'Learn the health benefits of Poha Chivda and why it makes the perfect guilt-free snack.',
    },
    {
      title: 'Diwali Gift Guide: How to Choose the Perfect Hamper',
      slug: generateSlug('Diwali Gift Guide How to Choose the Perfect Hamper'),
      content: 'Diwali is the festival of lights, sweets, and gifting. But choosing the right gift can be tricky. Here is our comprehensive guide to selecting the perfect Diwali hamper for your loved ones.\n\n1. Consider dietary preferences: Does the recipient prefer mithai over namkeen? Jain option? Sugar-free?\n2. Packaging matters: A well-presented box shows care and effort.\n3. Variety is key: A mix of sweet and savory is always appreciated.\n4. Shelf life: Choose products that stay fresh longer for advance gifting.\n\nOur Diwali Gift Box (1kg and 2kg options) checks all these boxes. Packed in a vibrant, reusable box, it contains our best-selling Classic Sev, Aloo Bhujia, Kaju Katli, Soan Papdi, Besan Ladoo, and Methi Khakhra \u2013 a true festival celebration in a box!',
      excerpt: 'Confused about Diwali gifting? Here is everything you need to know to pick the perfect hamper.',
      featuredImage: '/uploads/blog/diwali-gift-guide.jpg',
      author: 'Rijita Admin',
      tags: ['diwali', 'gift guide', 'gift hampers', 'festival gifting'],
      category: 'Festival Guide',
      isPublished: false,
      publishedAt: new Date('2025-10-01'),
      metaTitle: 'Diwali Gift Hamper Guide | RIJITA Blog',
      metaDescription: 'Our complete guide to selecting the perfect Diwali gift box for your family and friends.',
    },
    {
      title: 'Besan Ladoo: A Sweet Journey Through Generations',
      slug: generateSlug('Besan Ladoo A Sweet Journey Through Generations'),
      content: 'Besan Ladoo is one of India\'s most beloved sweets. Made from roasted gram flour, ghee, and sugar, it evokes memories of grandmothers\' kitchens and festive celebrations.\n\nAt RIJITA, we honour this heritage. Our besan is slow-roasted over low heat until it releases an impossibly nutty aroma. We use only A2 ghee from grass-fed cows, and each ladoo is hand-rolled with love.\n\nThe magic lies in the proportions. Too much ghee and the ladoo crumbles; too little and it is dry. Our master sweet maker, with 25 years of experience, knows exactly when the besan is ready \u2013 the colour turns a warm golden brown and the fragrance fills the entire kitchen.\n\nEnjoy our Besan Ladoo as a post-meal dessert, a festive offering, or simply whenever you need a little sweetness in life.',
      excerpt: 'How we make traditional Besan Ladoo with love, quality ingredients, and three generations of wisdom.',
      featuredImage: '/uploads/blog/besan-ladoo.jpg',
      author: 'Priya Sharma',
      tags: ['besan ladoo', 'indian sweets', 'traditional recipes', 'mithai'],
      category: 'Food Culture',
      isPublished: true,
      publishedAt: new Date('2025-09-15'),
      metaTitle: 'Traditional Besan Ladoo Story | RIJITA Blog',
      metaDescription: 'Explore the story behind our hand-rolled Besan Ladoo made with A2 ghee and premium gram flour.',
    },
    {
      title: 'Exploring Indian Namkeen: A State-by-State Guide',
      slug: generateSlug('Exploring Indian Namkeen A State by State Guide'),
      content: 'India\'s love for namkeen varies across states. Here is a tour:\n\n**Gujarat:** The namkeen capital of India! From Gathiya to Khakhra, each snack is a masterpiece of flavour and texture.\n\n**Maharashtra:** Chivda, Chakkali, and the famous Puneri Mixture rule the state. Poha-based snacks are a staple.\n\n**Rajasthan:** Bikaneri Bhujia is not just a snack \u2013 it is an emotion! Crunchy, spicy, and legendary.\n\n**Tamil Nadu:** Murukku (also known as Chakli in the north) is a festive staple made from rice flour.\n\n**Punjab:** The state loves its snack mixes with generous helpings of peanuts and puffed grains.\n\nAt RIJITA, we celebrate namkeen from across India. Our range includes regional classics made with authentic methods passed down through generations. Order a box and take a culinary tour of India from your home!',
      excerpt: 'Take a culinary tour across India through its diverse regional namkeen traditions.',
      featuredImage: '/uploads/blog/indian-namkeen-guide.jpg',
      author: 'Rijita Admin',
      tags: ['namkeen', 'indian snacks', 'regional food', 'food travel'],
      category: 'Food Travel',
      isPublished: true,
      publishedAt: new Date('2025-08-20'),
      metaTitle: 'Indian Namkeen State Guide | RIJITA Blog',
      metaDescription: 'Explore the diverse world of Indian namkeen from Gujarat to Tamil Nadu in our state-by-state guide.',
    },
  ]);

  // ──────────────────────────────────────────────
  // 7. RECIPES
  // ──────────────────────────────────────────────
  console.log('Creating recipes...');
  const findProduct = (name: string) => allProducts.find(p => p.name.toLowerCase().includes(name.toLowerCase()));

  const classicSevProd = findProduct('Classic Sev');
  const khakhraProd = findProduct('Methi Khakhra');
  const chivdaProd = findProduct('Poha Chivda');
  const besanLadooProd = findProduct('Besan Ladoo');
  const dabeliMixProd = findProduct('Dabeli Mix');
  const cornFlakesProd = findProduct('Corn Flakes Mixture');
  const punjabiMixProd = findProduct('Punjabi Mix');

  const recipes = await Recipe.create([
    {
      title: 'Sev Puri Chaat',
      slug: generateSlug('Sev Puri Chaat'),
      description: 'A quick and easy Mumbai street food classic using our Classic Sev. Crispy puris topped with potatoes, chutneys, yogurt, and a generous heap of crunchy sev.',
      ingredients: [
        '12 puris (ready-made)',
        '1 cup boiled mashed potatoes',
        '1/2 cup nylon sev (Classic Sev)',
        '1/4 cup sweet date tamarind chutney',
        '1/4 cup green chutney',
        '1/2 cup whisked yogurt',
        '1 onion finely chopped',
        'Chaat masala, red chili powder to taste',
        'Fresh coriander for garnish',
      ],
      instructions: [
        'Arrange puris on a plate.',
        'Place a spoon of mashed potatoes on each puri.',
        'Drizzle green chutney and sweet chutney.',
        'Add a spoon of yogurt over each.',
        'Sprinkle chopped onion, chaat masala, and red chili powder.',
        'Generously top with Classic Sev.',
        'Garnish with fresh coriander and serve immediately.',
      ],
      prepTime: 15,
      cookTime: 5,
      servings: 2,
      difficulty: 'easy' as const,
      featuredImage: '/uploads/recipes/sev-puri-chaat.jpg',
      products: classicSevProd ? [classicSevProd._id] : [],
      tags: ['chaat', 'sev puri', 'mumbai street food', 'sev recipe'],
      isPublished: true,
      metaTitle: 'Sev Puri Chaat Recipe | RIJITA Recipes',
      metaDescription: 'Make Mumbai style Sev Puri at home with RIJITA Classic Sev. Quick, easy, and delicious.',
    },
    {
      title: 'Methi Khakhra Chaat Bowl',
      slug: generateSlug('Methi Khakhra Chaat Bowl'),
      description: 'Crush our Methi Khakhra and transform them into a unique chaat bowl with chutneys and fresh vegetables. A perfect on-the-go snack.',
      ingredients: [
        '8 pieces of Methi Khakhra',
        '1/2 cup mix of grated carrot, cucumber, bell peppers',
        '1/4 cup date tamarind chutney',
        '1/4 cup mint chutney',
        '1/4 cup pomegranate seeds',
        '1 tbsp chaat masala',
        '2 tbsp nylon sev',
      ],
      instructions: [
        'Crush Methi Khakhra into bite-sized pieces.',
        'Mix crushed khakhra with grated veggies.',
        'Add chutneys and toss well.',
        'Sprinkle chaat masala and pomegranate.',
        'Top with nylon sev and serve immediately in a bowl.',
      ],
      prepTime: 10,
      cookTime: 0,
      servings: 2,
      difficulty: 'easy' as const,
      featuredImage: '/uploads/recipes/khakhra-chaat.jpg',
      products: khakhraProd ? [khakhraProd._id] : [],
      tags: ['khakhra', 'chaat', 'quick snack', 'no cook recipe'],
      isPublished: true,
      metaTitle: 'Methi Khakhra Chaat Recipe | RIJITA Recipes',
      metaDescription: 'Transform your Methi Khakhra into a delicious chaat bowl with fresh veggies.',
    },
    {
      title: '5-Minute Chivda Upma',
      slug: generateSlug('5 Minute Chivda Upma'),
      description: 'A super quick upma variation using Poha Chivda. Just rehydrate and temper. Breakfast ready in 5 minutes!',
      ingredients: [
        '2 cups Poha Chivda',
        '1 cup warm water',
        '1 tbsp oil',
        '1 tsp mustard seeds',
        '1 tsp urad dal',
        'Few curry leaves',
        '1 chopped green chili',
        'Salt to taste',
        'Lemon juice',
        'Fresh coriander',
      ],
      instructions: [
        'Heat oil and add mustard seeds, urad dal, curry leaves, and green chili.',
        'When they splutter, add Poha Chivda and toss.',
        'Sprinkle warm water gradually, stirring gently.',
        'Cook for 2 minutes until the chivda softens slightly.',
        'Add salt and lemon juice.',
        'Garnish with fresh coriander and serve hot.',
      ],
      prepTime: 2,
      cookTime: 3,
      servings: 2,
      difficulty: 'easy' as const,
      featuredImage: '/uploads/recipes/chivda-upma.jpg',
      products: chivdaProd ? [chivdaProd._id] : [],
      tags: ['chivda upma', 'quick breakfast', 'poha recipe', 'easy snack'],
      isPublished: true,
      metaTitle: '5-Minute Poha Chivda Upma | RIJITA Recipes',
      metaDescription: 'Make a quick and tasty upma with RIJITA Poha Chivda. Ready in 5 minutes.',
    },
    {
      title: 'Homemade Dabeli',
      slug: generateSlug('Homemade Dabeli'),
      description: 'Use our Dabeli Mix to create authentic Gujarati Dabeli at home. Spicy, sweet, and crunchy!',
      ingredients: [
        '1 packet RIJITA Dabeli Mix',
        '4 pav buns',
        'Butter for toasting',
        'Nylon sev for topping',
        'Pomegranate seeds',
        'Coriander chutney',
        'Garlic chutney (optional)',
      ],
      instructions: [
        'Open Dabeli Mix and set aside all components.',
        'Cut pav buns in half and toast with butter on a pan.',
        'Apply coriander chutney on the bottom half.',
        'Add a generous portion of the Dabeli masala filling.',
        'Add garlic chutney if desired.',
        'Top with nylon sev and pomegranate seeds.',
        'Close with the top half bun and press lightly.',
        'Serve hot with extra chutneys.',
      ],
      prepTime: 10,
      cookTime: 10,
      servings: 4,
      difficulty: 'easy' as const,
      featuredImage: '/uploads/recipes/dabeli.jpg',
      products: dabeliMixProd ? [dabeliMixProd._id] : [],
      tags: ['dabeli', 'gujarati street food', 'kutch', 'recipes with mix'],
      isPublished: true,
      metaTitle: 'Kutchhi Dabeli Recipe | RIJITA Recipes',
      metaDescription: 'Learn to make authentic Kutch Dabeli at home using our special Dabeli Mix.',
    },
    {
      title: 'Namkeen Bhel Puri',
      slug: generateSlug('Namkeen Bhel Puri'),
      description: 'A crunchy, tangy, and spicy bhel puri made using our Punjabi Mix and Corn Flakes Mixture.',
      ingredients: [
        '1 cup Punjabi Mix',
        '1/2 cup Corn Flakes Mixture',
        '1/2 cup puffed rice (murmura)',
        '1/4 cup finely chopped onion',
        '1/4 cup finely chopped tomato',
        '1/4 cup boiled potato',
        '2 tbsp sweet date tamarind chutney',
        '2 tbsp mint chutney',
        '1 tsp chaat masala',
        'Handful of Classic Sev',
      ],
      instructions: [
        'In a large bowl, combine Punjabi Mix, Corn Flakes Mixture, and puffed rice.',
        'Add chopped onion, tomato, and boiled potato.',
        'Drizzle chutneys and toss well.',
        'Sprinkle chaat masala.',
        'Top with fresh sev.',
        'Serve immediately in bowl or paper cones.',
      ],
      prepTime: 10,
      cookTime: 0,
      servings: 2,
      difficulty: 'easy' as const,
      featuredImage: '/uploads/recipes/bhel-puri.jpg',
      products: [punjabiMixProd?._id, cornFlakesProd?._id, classicSevProd?._id].filter(Boolean),
      tags: ['bhel puri', 'chaat', 'Indian snack', 'mumbai street food'],
      isPublished: true,
      metaTitle: 'Bhel Puri with Namkeen Mix | RIJITA Recipes',
      metaDescription: 'Crunchy bhel puri made with a blend of Punjabi Mix and Corn Flakes Mixture.',
    },
  ]);

  // ──────────────────────────────────────────────
  // 8. REVIEWS
  // ──────────────────────────────────────────────
  console.log('Creating reviews...');
  const reviewProds = [allProducts[0], allProducts[1], allProducts[3], allProducts[4], allProducts[6], allProducts[7], allProducts[11], allProducts[13]];

  const reviews = await Review.create([
    {
      product: reviewProds[0]._id,
      user: customer1._id,
      userName: customer1.name,
      rating: 5,
      title: 'Best sev I have ever tasted!',
      comment: 'Absolutely love this sev. It is super fresh and crunchy. Perfect for evening tea.',
      isApproved: true,
    },
    {
      product: reviewProds[1]._id,
      user: customer2._id,
      userName: customer2.name,
      rating: 4,
      title: 'Great taste, bit oily',
      comment: 'The taste is authentic and reminds me of my hometown. Could be a tad less oily.',
      isApproved: true,
    },
    {
      product: reviewProds[2]._id,
      user: customer3._id,
      userName: customer3.name,
      rating: 5,
      title: 'Perfect for chaats!',
      comment: 'I use this khakhra for quick chaat and it works amazing. Great quality.',
      isApproved: true,
    },
    {
      product: reviewProds[3]._id,
      user: customer1._id,
      userName: customer1.name,
      rating: 5,
      title: 'Melt in mouth perfection',
      comment: 'Soan Papdi from RIJITA is incredibly flaky and fresh. Reminds me of my grandmother!',
      isApproved: true,
    },
    {
      product: reviewProds[4]._id,
      user: customer2._id,
      userName: customer2.name,
      rating: 5,
      title: 'Premium quality mithai',
      comment: 'Kaju Katli was so smooth and delicious. Packed beautifully. Will order again for festivals.',
      isApproved: true,
    },
    {
      product: reviewProds[5]._id,
      user: customer3._id,
      userName: customer3.name,
      rating: 4,
      title: 'Authentic taste',
      comment: 'Ladoos taste very authentic. Freshly prepared and great for gifts. Price is reasonable too.',
      isApproved: true,
    },
    {
      product: reviewProds[6]._id,
      user: customer1._id,
      userName: customer1.name,
      rating: 3,
      title: 'Good but could be more spicy',
      comment: 'Dabeli mix is nice but I wish it was a little more spicy. Good concept though.',
      isApproved: false,
    },
    {
      product: reviewProds[7]._id,
      user: customer2._id,
      userName: customer2.name,
      rating: 5,
      title: 'My go-to chivda',
      comment: 'Have ordered this thrice now. Light, perfectly seasoned, and delicious. My work desk snack.',
      isApproved: true,
    },
    {
      product: reviewProds[1]._id,
      user: customer3._id,
      userName: customer3.name,
      rating: 2,
      title: 'Too salty',
      comment: 'The bhujia was slightly over-salted this batch. Usually love it but this time was disappointing.',
      isApproved: false,
    },
    {
      product: reviewProds[4]._id,
      user: customer1._id,
      userName: customer1.name,
      rating: 5,
      title: 'Best Diwali gift option',
      comment: 'Bought the 2kg box for employee gifting. Everyone loved it! Beautiful packaging and fresh products.',
      isApproved: true,
    },
  ]);

  // ──────────────────────────────────────────────
  // 9. CONTACT INQUIRIES
  // ──────────────────────────────────────────────
  console.log('Creating contact inquiries...');
  const contacts = await Contact.create([
    {
      name: 'Vikas Mehta',
      email: 'vikas.mehta@gmail.com',
      phone: '9988771122',
      subject: 'Bulk order inquiry for Diwali corporate gifting',
      message: 'We are looking to place a bulk order of approx 200 Diwali gift boxes for our clients. Can you please share corporate pricing and bulk discounts?',
      type: 'bulk-order',
      isRead: true,
    },
    {
      name: 'Sunita Jain',
      email: 'sunita@jaingroup.com',
      phone: '9876540099',
      subject: 'Distributorship in Mumbai',
      message: 'We want to become a distributor of RIJITA products in Mumbai suburbs. Kindly share your distributorship terms, minimum order quantity, and area exclusivity details.',
      type: 'distributor',
      isRead: false,
    },
    {
      name: 'Rohan Kapoor',
      email: 'rohan.kapoor@ymail.com',
      phone: '9998887776',
      subject: 'Product quality concern - Aloo Bhujia',
      message: 'I ordered Aloo Bhujia last week. The expiry date is fine but the product arrived with a broken seal. Please arrange replacement or refund.',
      type: 'support',
      isRead: false,
    },
  ]);

  // ──────────────────────────────────────────────
  // 10. SUBSCRIBERS
  // ──────────────────────────────────────────────
  console.log('Creating subscribers...');
  const subscribers = await Subscriber.create([
    { email: 'amit@example.com', isActive: true },
    { email: 'neha@example.com', isActive: true },
    { email: 'rahul@example.com', isActive: true },
    { email: 'priya.sharma@email.com', isActive: true },
    { email: 'vipul.shah@gmail.com', isActive: true },
  ]);

  // ──────────────────────────────────────────────
  // 11. SITE SETTINGS
  // ──────────────────────────────────────────────
  console.log('Creating site settings...');
  const siteSettings = await SiteSettings.create({
    siteName: 'RIJITA by Arya Foods',
    tagline: 'Premium Quality Namkeen & Snacks',
    logo: '/uploads/logo.png',
    favicon: '/uploads/favicon.ico',
    storyImage: '/uploads/banners/story.webp',
    email: 'hello@rijita.com',
    phone: '+91 98765 43210',
    address: '42, Food Processing Zone, GIDC Phase 2, Ahmedabad, Gujarat 380445',
    socialMedia: {
      facebook: 'https://facebook.com/rijitafoods',
      instagram: 'https://instagram.com/rijita_foods',
      twitter: 'https://twitter.com/rijitafoods',
      youtube: 'https://youtube.com/@rijita',
      whatsapp: 'https://wa.me/919876543210',
    },
    footer: {
      aboutText: 'RIJITA is a premium Indian snacking brand brought to you by Arya Foods. We specialize in authentic Gujarat-style namkeen, traditional mithai, and curated gift packs made with the finest ingredients.',
      copyright: '\u00a9 2025 RIJITA by Arya Foods. All rights reserved.',
    },
    shipping: {
      freeShippingThreshold: 499,
      standardDeliveryCharge: 49,
      estimatedDays: '3-7 business days',
    },
    gst: {
      gstin: '24ABCDE1234F1Z5',
      rate: 5,
    },
    whatsapp: {
      number: '+919876543210',
      messageTemplate: 'Hi, I would like to order from RIJITA.',
    },
    seo: {
      googleAnalyticsId: 'G-XXXXXXXXXX',
      googleTagManagerId: 'GTM-XXXXXXX',
      metaPixelId: '1234567890',
    },
    announcement: {
      text: 'Free shipping on orders above Rs 499! Use code FREESHIP',
      isActive: true,
    },
  });

  // ──────────────────────────────────────────────
  // 12. ORDERS with tracking
  // ──────────────────────────────────────────────
  console.log('Creating orders with tracking...');
  const orders = await Order.create([
    {
      orderNumber: 'RIJ-001',
      user: customer1._id,
      items: [
        {
          product: allProducts[0]._id,
          productName: allProducts[0].name,
          variant: '200g',
          weight: '200g',
          quantity: 2,
          mrp: 55,
          price: 45,
          total: 90,
          image: `/uploads/products/${generateSlug(allProducts[0].name)}.jpg`,
        },
        {
          product: allProducts[3]._id,
          productName: allProducts[3].name,
          variant: '400g',
          weight: '400g',
          quantity: 1,
          mrp: 120,
          price: 100,
          total: 100,
          image: `/uploads/products/${generateSlug(allProducts[3].name)}.jpg`,
        },
      ],
      shippingAddress: {
        fullName: customer1.name,
        phone: customer1.phone,
        addressLine1: customer1.addresses[0].addressLine1,
        addressLine2: customer1.addresses[0].addressLine2 || '',
        city: customer1.addresses[0].city,
        state: customer1.addresses[0].state,
        pincode: customer1.addresses[0].pincode,
      },
      subtotal: 190,
      discount: 19,
      deliveryCharge: 0,
      gstAmount: 9.5,
      total: 180.5,
      coupon: 'WELCOME10',
      status: 'delivered',
      paymentStatus: 'completed',
      paymentMethod: 'whatsapp',
      whatsappSent: true,
      tracking: [
        { status: 'confirmed', location: 'Ahmedabad', note: 'Order confirmed', date: new Date('2025-10-01') },
        { status: 'packed', location: 'Ahmedabad', note: 'Product packed', date: new Date('2025-10-01') },
        { status: 'dispatched', location: 'Ahmedabad', note: 'Dispatched via Delhivery', date: new Date('2025-10-02') },
        { status: 'out-for-delivery', location: 'Vadodara', note: 'Out for delivery', date: new Date('2025-10-03') },
        { status: 'delivered', location: 'Vadodara', note: 'Package delivered successfully', date: new Date('2025-10-03') },
      ],
    },
    {
      orderNumber: 'RIJ-002',
      user: customer2._id,
      items: [
        {
          product: allProducts[6]._id,
          productName: allProducts[6].name,
          variant: '500g',
          weight: '500g',
          quantity: 1,
          mrp: 240,
          price: 200,
          total: 200,
          image: `/uploads/products/${generateSlug(allProducts[6].name)}.jpg`,
        },
        {
          product: allProducts[7]._id,
          productName: allProducts[7].name,
          variant: '200g',
          weight: '200g',
          quantity: 2,
          mrp: 45,
          price: 38,
          total: 76,
          image: `/uploads/products/${generateSlug(allProducts[7].name)}.jpg`,
        },
      ],
      shippingAddress: {
        fullName: customer2.name,
        phone: customer2.phone,
        addressLine1: customer2.addresses[0].addressLine1,
        addressLine2: customer2.addresses[0].addressLine2 || '',
        city: customer2.addresses[0].city,
        state: customer2.addresses[0].state,
        pincode: customer2.addresses[0].pincode,
      },
      subtotal: 276,
      discount: 41.4,
      deliveryCharge: 49,
      gstAmount: 13.8,
      total: 297.4,
      coupon: 'RIJITA15',
      status: 'dispatched',
      paymentStatus: 'completed',
      paymentMethod: 'whatsapp',
      whatsappSent: true,
      tracking: [
        { status: 'confirmed', location: 'Ahmedabad', note: 'Order confirmed', date: new Date('2025-11-06') },
        { status: 'packed', location: 'Ahmedabad', note: 'Products packed', date: new Date('2025-11-06') },
        { status: 'dispatched', location: 'Ahmedabad', note: 'Handed over to courier', date: new Date('2025-11-07') },
      ],
    },
    {
      orderNumber: 'RIJ-003',
      user: customer3._id,
      items: [
        {
          product: allProducts[13]._id,
          productName: allProducts[13].name,
          variant: '2kg',
          weight: '2kg',
          quantity: 1,
          mrp: 1200,
          price: 999,
          total: 999,
          image: `/uploads/products/${generateSlug(allProducts[13].name)}.jpg`,
        },
      ],
      shippingAddress: {
        fullName: customer3.name,
        phone: customer3.phone,
        addressLine1: customer3.addresses[0].addressLine1,
        addressLine2: customer3.addresses[0].addressLine2 || '',
        city: customer3.addresses[0].city,
        state: customer3.addresses[0].state,
        pincode: customer3.addresses[0].pincode,
      },
      subtotal: 999,
      discount: 0,
      deliveryCharge: 0,
      gstAmount: 49.95,
      total: 1048.95,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'whatsapp',
      whatsappSent: false,
      tracking: [],
    },
  ]);

  console.log('\n==============================');
  console.log('   SEEDING COMPLETE SUMMARY');
  console.log('==============================');
  console.log(`  Users:        ${await User.countDocuments({})} (1 superadmin, 1 admin, 3 customers)`);
  console.log(`  Categories:   ${await Category.countDocuments({})} (6 parents + 2 subcategories)`);
  console.log(`  Products:     ${await Product.countDocuments({})}`);
  console.log(`  Coupons:      ${await Coupon.countDocuments({})}`);
  console.log(`  Collections:  ${await Collection.countDocuments({})}`);
  console.log(`  Blog Posts:   ${await Blog.countDocuments({})}`);
  console.log(`  Recipes:      ${await Recipe.countDocuments({})}`);
  console.log(`  Reviews:      ${await Review.countDocuments({})}`);
  console.log(`  Contacts:     ${await Contact.countDocuments({})}`);
  console.log(`  Subscribers:  ${await Subscriber.countDocuments({})}`);
  console.log(`  Site Settings: ${await SiteSettings.countDocuments({})}`);
  console.log(`  Orders:       ${await Order.countDocuments({})}`);
  console.log('==============================');
  console.log('\nSeeding complete!');
  process.exit(0);
};

run();

// Run with: npx tsx src/seeds/seed.ts