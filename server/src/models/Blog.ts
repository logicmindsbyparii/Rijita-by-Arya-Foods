import mongoose, { Schema, Document } from 'mongoose';

export interface IBlogDocument extends Document {
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
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<IBlogDocument>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    content: { type: String, required: true },
    excerpt: { type: String },
    featuredImage: { type: String },
    author: { type: String, required: true },
    tags: [{ type: String }],
    category: { type: String },
    isPublished: { type: Boolean, default: false },
    metaTitle: { type: String },
    metaDescription: { type: String },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

blogSchema.index({ isPublished: 1, publishedAt: -1 });
blogSchema.index({ tags: 1 });

export default mongoose.model<IBlogDocument>('Blog', blogSchema);
