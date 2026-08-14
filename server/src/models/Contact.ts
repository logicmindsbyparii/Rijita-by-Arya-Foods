import mongoose, { Schema, Document } from 'mongoose';

export interface IContactDocument extends Document {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  type: 'general' | 'bulk-order' | 'corporate' | 'wholesale' | 'distributor' | 'dealer' | 'career' | 'support';
  isRead: boolean;
  createdAt: Date;
}

const contactSchema = new Schema<IContactDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['general', 'bulk-order', 'corporate', 'wholesale', 'distributor', 'dealer', 'career', 'support'],
      default: 'general',
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

contactSchema.index({ isRead: 1, createdAt: -1 });
contactSchema.index({ type: 1 });

export default mongoose.model<IContactDocument>('Contact', contactSchema);
