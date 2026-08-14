import mongoose, { Schema, Document } from 'mongoose';

export interface IVariantDocument {
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

export interface INutritionalInfoDocument {
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

export interface IProductDocument extends Document {
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  category: mongoose.Types.ObjectId;
  subcategory?: mongoose.Types.ObjectId;
  brand?: string;
  variants: IVariantDocument[];
  images: string[];
  videos?: string[];
  tags: string[];
  nutritionalInfo?: INutritionalInfoDocument;
  ingredients?: string;
  shelfLife?: string;
  storageInstructions?: string;
  countryOfOrigin?: string;
  fssaiLicense?: string;
  gst: number;
  hsn: string;
  minPrice: number;
  isActive: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  unit: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  totalSold: number;
  averageRating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const variantSchema = new Schema<IVariantDocument>({
  weight: { type: String, required: true },
  weightValue: { type: Number, required: true },
  weightUnit: { type: String, required: true, default: 'g' },
  mrp: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  stock: { type: Number, required: true, default: 0, min: 0 },
  sku: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
});

const nutritionalInfoSchema = new Schema<INutritionalInfoDocument>({
  servingSize: { type: String },
  calories: { type: Number },
  totalFat: { type: Number },
  saturatedFat: { type: Number },
  transFat: { type: Number },
  cholesterol: { type: Number },
  sodium: { type: Number },
  totalCarbohydrates: { type: Number },
  dietaryFiber: { type: Number },
  sugars: { type: Number },
  protein: { type: Number },
  vitaminA: { type: Number },
  vitaminC: { type: Number },
  calcium: { type: Number },
  iron: { type: Number },
});

const productSchema = new Schema<IProductDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    shortDescription: { type: String },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    subcategory: { type: Schema.Types.ObjectId, ref: 'Category' },
    brand: { type: String },
    variants: [variantSchema],
    images: [{ type: String }],
    videos: [{ type: String }],
    tags: [{ type: String }],
    nutritionalInfo: { type: nutritionalInfoSchema },
    ingredients: { type: String },
    shelfLife: { type: String },
    storageInstructions: { type: String },
    countryOfOrigin: { type: String, default: 'India' },
    fssaiLicense: { type: String },
    gst: { type: Number, default: 5 },
    hsn: { type: String },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    unit: { type: String, default: 'Pcs' },
    metaTitle: { type: String },
    metaDescription: { type: String },
    metaKeywords: [{ type: String }],
    minPrice: { type: Number, default: 0 },
    totalSold: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Pre-save: auto-calculate minPrice from variants
productSchema.pre('save', function (next) {
  if (this.variants && this.variants.length > 0) {
    const activeVariants = this.variants.filter(v => v.isActive !== false);
    this.minPrice = Math.min(...activeVariants.map(v => v.sellingPrice));
  }
  next();
});

productSchema.index({ category: 1 });
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ minPrice: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

export default mongoose.model<IProductDocument>('Product', productSchema);
