import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriberDocument extends Document {
  email: string;
  isActive: boolean;
  createdAt: Date;
}

const subscriberSchema = new Schema<ISubscriberDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ISubscriberDocument>('Subscriber', subscriberSchema);
