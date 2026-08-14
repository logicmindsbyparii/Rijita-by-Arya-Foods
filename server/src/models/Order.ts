import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IOrderItemDocument {
  product: mongoose.Types.ObjectId;
  productName: string;
  variant: string;
  sku?: string;
  weight: string;
  quantity: number;
  mrp: number;
  price: number;
  total: number;
  image?: string;
}

export interface ITrackingDocument {
  status: string;
  location?: string;
  note?: string;
  date: Date;
}

export interface IOrderDocument extends Document {
  orderNumber: string;
  user?: mongoose.Types.ObjectId;
  items: IOrderItemDocument[];
  shippingAddress: {
    fullName: string;
    phone: string;
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
  status: 'pending' | 'confirmed' | 'packed' | 'dispatched' | 'out-for-delivery' | 'delivered' | 'cancelled' | 'returned';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  whatsappSent: boolean;
  whatsappMessageId?: string;
  tracking: ITrackingDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItemDocument>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  variant: { type: String, required: true },
  sku: { type: String },
  weight: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  mrp: { type: Number, required: true },
  price: { type: Number, required: true },
  total: { type: Number, required: true },
  image: { type: String },
});

const trackingSchema = new Schema<ITrackingDocument>({
  status: { type: String, required: true },
  location: { type: String },
  note: { type: String },
  date: { type: Date, default: Date.now },
});

const orderSchema = new Schema<IOrderDocument>(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    items: [orderItemSchema],
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    coupon: { type: String },
    notes: { type: String },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'packed', 'dispatched', 'out-for-delivery', 'delivered', 'cancelled', 'returned'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: { type: String, default: 'whatsapp' },
    whatsappSent: { type: Boolean, default: false },
    whatsappMessageId: { type: String },
    tracking: [trackingSchema],
  },
  { timestamps: true }
);

orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'shippingAddress.phone': 1 });

// Auto-generate order number. Must run on 'validate', not 'save' — Mongoose runs schema
// validation (which enforces `required: true` on orderNumber) before 'save' hooks ever fire,
// so generating it in a pre('save') hook always failed validation first.
orderSchema.pre('validate', function (next) {
  if (this.isNew && !this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.orderNumber = `RIJ-${timestamp}-${random}`;
  }
  next();
});

export default mongoose.model<IOrderDocument>('Order', orderSchema);
