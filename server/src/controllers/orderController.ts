import { Response } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order';
import Product from '../models/Product';
import Coupon from '../models/Coupon';
import SiteSettings from '../models/SiteSettings';
import { IAuthRequest } from '../types';
import { paginateQuery, buildPagination, escapeRegex } from '../utils/helpers';
import logger from '../utils/logger';

export const placeOrder = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { items, shippingAddress, notes, paymentMethod = 'whatsapp' } = req.body;
  const couponCode = req.body.coupon || req.body.couponCode;
  
  // NEVER trust paymentStatus from the client — only 'pending' is allowed at order placement
  // Payment verification must go through the verifyPayment endpoint with actual gateway checks
  const paymentStatus = 'pending';
  if (!items || items.length === 0) { res.status(400).json({ success: false, message: 'Cart is empty' }); return; }
  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      let subtotal = 0;
      const validatedItems: any[] = [];
      for (const item of items) {
        const productId = item.product || item.productId;
        const variantId = item.variant || item.variantId;
        const product = await Product.findById(productId).session(session);
        if (!product) throw new Error(`Product not found: ${productId}`);
        const variant = (product.variants as any[]).find((v: any) => v._id?.toString() === variantId || v.sku === item.sku);
        if (!variant) throw new Error(`Variant not found for product: ${product.name}`);
        if (!variant.isActive) throw new Error(`This variant of ${product.name} is no longer available`);
        if (variant.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name} (${variant.weight})`);
        const total = variant.sellingPrice * item.quantity;
        subtotal += total;
        validatedItems.push({ product: product._id, productName: product.name, variant: variant.weight, sku: variant.sku, weight: `${variant.weightValue}${variant.weightUnit}`, quantity: item.quantity, mrp: variant.mrp, price: variant.sellingPrice, total, image: product.images[0] || '' });
      }
      let discount = 0;
      if (couponCode) {
        // 1) Validate coupon before using it
        const existingCoupon = await Coupon.findOne({ code: couponCode.toUpperCase() }).session(session);
        if (!existingCoupon) throw new Error('Invalid coupon code');
        if (!existingCoupon.isActive) throw new Error('This coupon is no longer active');
        if (new Date() < existingCoupon.startsAt) throw new Error('This coupon is not yet valid');
        if (new Date() > existingCoupon.expiresAt) throw new Error('This coupon has expired');
        if (existingCoupon.usedCount >= existingCoupon.usageLimit) throw new Error('Coupon usage limit reached');
        if (subtotal < existingCoupon.minOrderAmount) throw new Error(`Minimum order amount of ₹${existingCoupon.minOrderAmount} required for this coupon`);

        // 2) Atomically increment usedCount, fail if limit reached mid-flight (race-condition-safe)
        const coupon = await Coupon.findOneAndUpdate(
          { _id: existingCoupon._id, $expr: { $lt: ['$usedCount', '$usageLimit'] } },
          { $inc: { usedCount: 1 } },
          { new: true, session }
        );
        if (!coupon) throw new Error('Coupon usage limit reached. Please try a different coupon.');

        discount = coupon.type === 'percentage'
          ? Math.min(subtotal * (coupon.value / 100), coupon.maxDiscount || Infinity)
          : Math.min(coupon.value, subtotal);
      }
      let threshold = 499, shippingFee = 49, gstRate = 5;
      const settings = await SiteSettings.findOne().session(session);
      if (settings?.shipping) { threshold = settings.shipping.freeShippingThreshold ?? 499; shippingFee = settings.shipping.standardDeliveryCharge ?? 49; }
      if (settings?.gst?.rate) gstRate = settings.gst.rate;
      const deliveryCharge = subtotal >= threshold ? 0 : shippingFee;
      const gstAmount = (subtotal - discount) * (gstRate / 100);
      const total = subtotal - discount + deliveryCharge + gstAmount;
      // Payment is always 'pending' at order placement — verified via verifyPayment endpoint
      const status = 'pending';
      const orderData: any = { items: validatedItems, shippingAddress, subtotal: Math.round(subtotal), discount: Math.round(discount), deliveryCharge, gstAmount: Math.round(gstAmount), total: Math.round(total), notes, coupon: couponCode?.toUpperCase(), paymentMethod, paymentStatus, status, tracking: [{ status, note: 'Order placed successfully', date: new Date() }] };
      if (req.user) orderData.user = req.user.id;
      const orders = await Order.create([orderData], { session });
      order = orders[0];
      for (const item of validatedItems) {
        // Match by SKU (unique, immutable) — fallback to weight string for legacy orders
        const skuMatch = item.sku ? { _id: item.product, 'variants.sku': item.sku } : { _id: item.product, 'variants.weight': item.variant };
        const stockCheck = item.sku ? {} : { 'variants.stock': { $gte: item.quantity } };
        const result = await Product.findOneAndUpdate(
          { ...skuMatch, ...stockCheck, 'variants.stock': { $gte: item.quantity } },
          { $inc: { 'variants.$.stock': -item.quantity, totalSold: item.quantity } },
          { session, new: true }
        );
        if (!result) throw new Error(`Insufficient stock for ${item.productName}. Please try again.`);
      }
    });
  } catch (error: any) {
    res.status(error.message.includes('stock') ? 409 : 400).json({ success: false, message: error.message || 'Order failed' });
    return;
  } finally {
    await session.endSession();
  }
  res.status(201).json({ success: true, data: { order }, message: 'Order placed successfully' });
};

export const getMyOrders = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '10', status } = req.query;
  const query: any = {};
  if (!req.user) { res.status(401).json({ success: false, message: 'Authentication required to view orders' }); return; }
  query.user = req.user.id;
  if (status) query.status = status;
  const { skip, limit: pageLimit, page: currentPage } = paginateQuery(Number(page), Number(limit));
  const total = await Order.countDocuments(query);
  const orders = await Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageLimit);
  res.json({ success: true, data: { orders }, pagination: buildPagination(total, currentPage, pageLimit) });
};

export const getOrderByNumber = async (req: IAuthRequest, res: Response): Promise<void> => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber });
  if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }
  if (order.user && req.user) {
    if (order.user.toString() !== req.user.id && !['admin', 'superadmin'].includes(req.user.role)) { res.status(403).json({ success: false, message: 'You can only view your own orders' }); return; }
  } else if (order.user && !req.user) { res.status(401).json({ success: false, message: 'Authentication required to view this order' }); return; }
  res.json({ success: true, data: { order } });
};

export const adminGetOrders = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', status, paymentStatus, search, fromDate, toDate } = req.query;
  const query: any = {};
  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (fromDate || toDate) { query.createdAt = {}; if (fromDate) query.createdAt.$gte = new Date(fromDate as string); if (toDate) query.createdAt.$lte = new Date(toDate as string); }
  if (search) query.$or = [{ orderNumber: { $regex: escapeRegex(search as string), $options: 'i' } }, { 'shippingAddress.fullName': { $regex: escapeRegex(search as string), $options: 'i' } }, { 'shippingAddress.phone': { $regex: escapeRegex(search as string), $options: 'i' } }];
  const { skip, limit: pageLimit, page: currentPage } = paginateQuery(Number(page), Number(limit));
  const total = await Order.countDocuments(query);
  const orders = await Order.find(query).populate('user', 'name email phone').sort({ createdAt: -1 }).skip(skip).limit(pageLimit);
  res.json({ success: true, data: { orders }, pagination: buildPagination(total, currentPage, pageLimit) });
};

export const bulkUpdateOrderStatus = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { orderIds, status, note } = req.body;
  if (!Array.isArray(orderIds) || orderIds.length === 0) { res.status(400).json({ success: false, message: 'Array of orderIds is required' }); return; }
  const validStatuses = ['pending', 'confirmed', 'packed', 'dispatched', 'out-for-delivery', 'delivered', 'cancelled', 'returned'];
  if (!validStatuses.includes(status)) { res.status(400).json({ success: false, message: 'Invalid order status' }); return; }
  
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (status === 'cancelled' || status === 'returned') {
        const orders = await Order.find({ _id: { $in: orderIds }, status: { $nin: ['cancelled', 'returned'] } }).session(session);
        for (const order of orders) {
          for (const item of order.items) {
            const skuQuery = (item as any).sku
              ? { _id: item.product, 'variants.sku': (item as any).sku }
              : { _id: item.product, 'variants.weight': item.variant };
            await Product.findOneAndUpdate(
              skuQuery,
              { $inc: { 'variants.$.stock': item.quantity, totalSold: -item.quantity } },
              { session }
            );
          }
          if (order.coupon) {
            await Coupon.findOneAndUpdate({ code: order.coupon }, { $inc: { usedCount: -1 } }, { session });
          }
        }
      } else {
        const orders = await Order.find({ _id: { $in: orderIds }, status: { $in: ['cancelled', 'returned'] } }).session(session);
        for (const order of orders) {
          for (const item of order.items) {
            const skuQuery = (item as any).sku
              ? { _id: item.product, 'variants.sku': (item as any).sku }
              : { _id: item.product, 'variants.weight': item.variant };
            const result = await Product.findOneAndUpdate(
              { ...skuQuery, 'variants.stock': { $gte: item.quantity } },
              { $inc: { 'variants.$.stock': -item.quantity, totalSold: item.quantity } },
              { session }
            );
            if (!result) throw new Error(`Insufficient stock for product ${item.productName} to un-cancel order ${order.orderNumber}`);
          }
          if (order.coupon) {
            await Coupon.findOneAndUpdate({ code: order.coupon }, { $inc: { usedCount: 1 } }, { session });
          }
        }
      }
      const updatePayload: any = { $set: { status }, $push: { tracking: { status, note: note || `Bulk update: Order ${status}`, date: new Date() } } };
      if (status === 'delivered') updatePayload.$set.paymentStatus = 'completed';
      
      const result = await Order.updateMany({ _id: { $in: orderIds } }, updatePayload, { session });
      res.json({ success: true, data: { modifiedCount: result.modifiedCount }, message: `${result.modifiedCount} orders updated to ${status}` });
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Bulk update failed' });
  } finally {
    await session.endSession();
  }
};

export const updateOrderStatus = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }
  const previousStatus = order.status;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      order.status = status;
      order.tracking.push({ status, note: note || `Order ${status}`, date: new Date() });
      if (status === 'delivered') order.paymentStatus = 'completed';
      
      if ((status === 'cancelled' || status === 'returned') && previousStatus !== 'cancelled' && previousStatus !== 'returned') {
        for (const item of order.items) {
          const skuQuery = (item as any).sku
            ? { _id: item.product, 'variants.sku': (item as any).sku }
            : { _id: item.product, 'variants.weight': item.variant };
          await Product.findOneAndUpdate(
            skuQuery,
            { $inc: { 'variants.$.stock': item.quantity, totalSold: -item.quantity } },
            { session }
          );
        }
        if (order.coupon) {
          await Coupon.findOneAndUpdate({ code: order.coupon }, { $inc: { usedCount: -1 } }, { session });
        }
      } else if (status !== 'cancelled' && status !== 'returned' && (previousStatus === 'cancelled' || previousStatus === 'returned')) {
        for (const item of order.items) {
          const skuQuery = (item as any).sku
            ? { _id: item.product, 'variants.sku': (item as any).sku }
            : { _id: item.product, 'variants.weight': item.variant };
          const result = await Product.findOneAndUpdate(
            { ...skuQuery, 'variants.stock': { $gte: item.quantity } },
            { $inc: { 'variants.$.stock': -item.quantity, totalSold: item.quantity } },
            { session }
          );
          if (!result) throw new Error(`Insufficient stock for product ${item.productName} to un-cancel order ${order.orderNumber}`);
        }
        if (order.coupon) {
          await Coupon.findOneAndUpdate({ code: order.coupon }, { $inc: { usedCount: 1 } }, { session });
        }
      }
      
      await order.save({ session });
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update order status' });
    return;
  } finally {
    await session.endSession();
  }
  res.json({ success: true, data: { order }, message: 'Order status updated' });
};

export const cancelOrder = async (req: IAuthRequest, res: Response): Promise<void> => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber });
  if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }
  if (order.user?.toString() !== req.user?.id && !['admin', 'superadmin'].includes(req.user?.role || '')) { res.status(403).json({ success: false, message: 'You can only cancel your own orders' }); return; }
  if (['delivered', 'cancelled', 'returned'].includes(order.status)) { res.status(400).json({ success: false, message: `Cannot cancel order that is ${order.status}` }); return; }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      order.status = 'cancelled';
      order.tracking.push({ status: 'cancelled', note: 'Order cancelled', date: new Date() });
      for (const item of order.items) {
        const skuQuery = (item as any).sku
          ? { _id: item.product, 'variants.sku': (item as any).sku }
          : { _id: item.product, 'variants.weight': item.variant };
        await Product.findOneAndUpdate(skuQuery, { $inc: { 'variants.$.stock': item.quantity, totalSold: -item.quantity } }, { session });
      }
      if (order.coupon) {
        await Coupon.findOneAndUpdate({ code: order.coupon }, { $inc: { usedCount: -1 } }, { session });
      }
      await order.save({ session });
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to cancel order' });
    return;
  } finally {
    await session.endSession();
  }
  res.json({ success: true, data: { order }, message: 'Order cancelled' });
};

// Admin-only (see route): marks an order as paid after staff has manually confirmed
// receipt (UPI/bank transfer screenshot, etc.) — there is no payment gateway integration,
// so this must never be callable by the customer to self-confirm their own payment.
export const verifyPayment = async (req: IAuthRequest, res: Response): Promise<void> => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber });
  if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }

  if (order.paymentStatus === 'completed') {
    res.status(400).json({ success: false, message: 'Payment already completed' }); return;
  }

  order.paymentStatus = 'completed';
  if (order.status === 'pending') {
    order.status = 'confirmed';
    order.tracking.push({ status: 'confirmed', note: 'Payment successful, order confirmed', date: new Date() });
  }

  await order.save();
  res.json({ success: true, data: { order }, message: 'Payment verified successfully' });
};

export const getOrderByPhone = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { phone } = req.params;
  if (!phone) { res.status(400).json({ success: false, message: 'Phone number is required' }); return; }
  const digitsOnly = phone.replace(/\D/g, '');
  // Require the full 10-digit number (matches the format enforced at checkout) — a partial/short
  // digit string must never match, or this endpoint leaks other customers' orders to anyone guessing digits.
  if (digitsOnly.length !== 10) { res.status(400).json({ success: false, message: 'Valid 10-digit phone number is required' }); return; }
  const escapedPhone = escapeRegex(digitsOnly);
  const { skip, limit: pageLimit, page: currentPage } = paginateQuery(1, 5);
  const phoneQuery = { 'shippingAddress.phone': { $regex: escapedPhone, $options: 'i' } };
  const total = await Order.countDocuments(phoneQuery);
  const orders = await Order.find(phoneQuery)
    .sort({ createdAt: -1 }).skip(skip).limit(pageLimit);
  res.json({ success: true, data: { orders }, pagination: buildPagination(total, currentPage, pageLimit) });
};

export const deleteOrder = async (req: IAuthRequest, res: Response): Promise<void> => {
  const order = await Order.findById(req.params.id);
  if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Restore stock if the order wasn't cancelled/returned already
      if (!['cancelled', 'returned'].includes(order.status)) {
        for (const item of order.items) {
          const skuQuery = (item as any).sku
            ? { _id: item.product, 'variants.sku': (item as any).sku }
            : { _id: item.product, 'variants.weight': item.variant };
          await Product.findOneAndUpdate(
            skuQuery,
            { $inc: { 'variants.$.stock': item.quantity, totalSold: -item.quantity } },
            { session }
          );
        }
      }

      // Restore coupon usage count if a coupon was applied
      if (order.coupon) {
        await Coupon.findOneAndUpdate(
          { code: order.coupon },
          { $inc: { usedCount: -1 } },
          { session }
        );
      }

      await Order.findByIdAndDelete(req.params.id, { session });
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete order' });
    return;
  } finally {
    await session.endSession();
  }
  res.json({ success: true, message: 'Order deleted successfully' });
};

export const getOrderAnalytics = async (_req: IAuthRequest, res: Response): Promise<void> => {
  const [totalOrders, pendingOrders, completedOrders, cancelledOrders, totalRevenue] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: { $in: ['pending', 'confirmed'] } }),
    Order.countDocuments({ status: 'delivered' }),
    Order.countDocuments({ status: 'cancelled' }),
    Order.aggregate([{ $match: { status: 'delivered' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
  ]);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayOrders = await Order.countDocuments({ createdAt: { $gte: today } });
  const whatsappOrders = await Order.countDocuments({ whatsappSent: true });
  res.json({ success: true, data: { analytics: { totalOrders, pendingOrders, completedOrders, cancelledOrders, totalRevenue: totalRevenue[0]?.total || 0, todayOrders, whatsappOrders } } });
};
