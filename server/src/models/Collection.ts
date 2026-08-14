import mongoose, { Schema, Document } from 'mongoose';

export interface ICollectionDocument extends Document {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  products: mongoose.Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const collectionSchema = new Schema<ICollectionDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String },
    image: { type: String },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

collectionSchema.index({ isActive: 1 });

export default mongoose.model<ICollectionDocument>('Collection', collectionSchema);
