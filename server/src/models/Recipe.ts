import mongoose, { Schema, Document } from 'mongoose';

export interface IRecipeDocument extends Document {
  title: string;
  slug: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  featuredImage?: string;
  products: mongoose.Types.ObjectId[];
  tags: string[];
  isPublished: boolean;
  metaTitle: string;
  metaDescription: string;
  createdAt: Date;
  updatedAt: Date;
}

const recipeSchema = new Schema<IRecipeDocument>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    ingredients: [{ type: String, required: true }],
    instructions: [{ type: String, required: true }],
    prepTime: { type: Number, required: true },
    cookTime: { type: Number, required: true },
    servings: { type: Number, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    featuredImage: { type: String },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    tags: [{ type: String }],
    isPublished: { type: Boolean, default: false },
    metaTitle: { type: String },
    metaDescription: { type: String },
  },
  { timestamps: true }
);

recipeSchema.index({ isPublished: 1 });
recipeSchema.index({ tags: 1 });

export default mongoose.model<IRecipeDocument>('Recipe', recipeSchema);
