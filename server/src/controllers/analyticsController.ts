import { Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import Contact from '../models/Contact';
import { IAuthRequest } from '../types';

export const getDashboardStats = async (_req: IAuthRequest, res: Response): Promise<void> => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [totalOrders, todayOrders, monthOrders, totalRevenue, monthRevenue, totalProducts, totalCustomers, todayCustomers, pendingOrders, lowStockProducts, unreadContacts] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: startOfToday } }),
    Order.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
    Order.aggregate([{ $match: { status: 'delivered' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.aggregate([{ $match: { status: 'delivered', createdAt: { $gte: startOfThisMonth } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Product.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'customer', createdAt: { $gte: startOfToday } }),
    Order.countDocuments({ status: { $in: ['pending', 'confirmed'] } }),
    Product.countDocuments({ 'variants.stock': { $lte: 10, $gt: 0 }, isActive: true }),
    Contact.countDocuments({ isRead: false }),
  ]);
  res.json({
    success: true, data: {
      stats: { totalOrders, todayOrders, monthOrders, totalRevenue: totalRevenue[0]?.total || 0, monthRevenue: monthRevenue[0]?.total || 0, totalProducts, totalCustomers, todayCustomers, pendingOrders, lowStockProducts, unreadContacts, conversionRate: totalCustomers > 0 ? ((totalOrders / totalCustomers) * 100).toFixed(1) : '0' }
    }
  });
};

export const getRevenueReport = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { period = 'monthly', fromDate, toDate, year = new Date().getFullYear() } = req.query;
  let matchStage: any = { status: 'delivered' };
  let groupStage: any;
  let dateFormat: any;
  switch (period) {
    case 'daily': {
      const start = fromDate ? new Date(fromDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
      const end = toDate ? new Date(toDate as string) : new Date();
      matchStage.createdAt = { $gte: start, $lte: end };
      groupStage = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } };
      dateFormat = 'daily'; break;
    }
    case 'weekly': {
      const start = fromDate ? new Date(fromDate as string) : new Date(new Date().setDate(new Date().getDate() - 90));
      const end = toDate ? new Date(toDate as string) : new Date();
      matchStage.createdAt = { $gte: start, $lte: end };
      groupStage = { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } };
      dateFormat = 'weekly'; break;
    }
    default:
      matchStage.createdAt = { $gte: new Date(Number(year), 0, 1), $lte: new Date(Number(year), 11, 31) };
      groupStage = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
      dateFormat = 'monthly';
  }
  const revenue = await Order.aggregate([{ $match: matchStage }, { $group: { _id: groupStage, revenue: { $sum: '$total' }, orders: { $sum: 1 }, items: { $sum: { $sum: '$items.quantity' } } } }, { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }]);
  res.json({ success: true, data: { revenue, period: dateFormat } });
};

export const getTopProducts = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { limit = '10' } = req.query;
  const products = await Product.find({ isActive: true }).sort({ totalSold: -1 }).limit(Number(limit)).populate('category', 'name slug').select('name slug images totalSold averageRating variants.sellingPrice variants.mrp');
  const productIds = products.map((p) => p._id);
  const revenueByProduct = await Order.aggregate([
    { $match: { status: 'delivered' } },
    { $unwind: '$items' },
    { $match: { 'items.product': { $in: productIds } } },
    { $group: { _id: '$items.product', revenue: { $sum: '$items.total' } } },
  ]);
  const revenueMap = new Map(revenueByProduct.map((r) => [r._id.toString(), r.revenue]));
  const productsWithRevenue = products.map((p) => ({ ...p.toObject(), revenue: revenueMap.get((p._id as any).toString()) || 0 }));
  res.json({ success: true, data: { products: productsWithRevenue } });
};

export const getCustomerAnalytics = async (_req: IAuthRequest, res: Response): Promise<void> => {
  const now = new Date();
  const totalCustomers = await User.countDocuments({ role: 'customer' });
  const customersThisMonth = await User.countDocuments({ role: 'customer', createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } });
  const repeatCustomers = await Order.aggregate([{ $match: { user: { $ne: null } } }, { $group: { _id: '$user', count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $count: 'total' }]);
  const topCustomers = await Order.aggregate([
    { $match: { status: 'delivered', user: { $ne: null } } },
    { $group: { _id: '$user', totalSpent: { $sum: '$total' }, orderCount: { $sum: 1 }, lastOrder: { $max: '$createdAt' } } },
    { $sort: { totalSpent: -1 } }, { $limit: 10 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $project: { name: '$user.name', email: '$user.email', phone: '$user.phone', totalSpent: 1, orderCount: 1, lastOrder: 1 } },
  ]);
  const threeMonthsAgo = new Date(now); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  // Only count authenticated customers (exclude guest orders where user = null)
  const inactiveCustomers = await Order.aggregate([{ $match: { user: { $ne: null } } }, { $group: { _id: '$user', lastOrder: { $max: '$createdAt' } } }, { $match: { lastOrder: { $lt: threeMonthsAgo } } }, { $count: 'total' }]);
  res.json({
    success: true, data: {
      analytics: { totalCustomers, customersThisMonth, repeatCustomers: repeatCustomers[0]?.total || 0, repeatRate: totalCustomers > 0 ? (((repeatCustomers[0]?.total || 0) / totalCustomers) * 100).toFixed(1) : '0', inactiveCustomers: inactiveCustomers[0]?.total || 0, topCustomers }
    }
  });
};

export const getOrderStatusAnalytics = async (_req: IAuthRequest, res: Response): Promise<void> => {
  const statuses = ['pending', 'confirmed', 'packed', 'dispatched', 'out-for-delivery', 'delivered', 'cancelled', 'returned'];
  const counts = await Promise.all(statuses.map((status) => Order.countDocuments({ status })));
  res.json({ success: true, data: { statusAnalytics: statuses.map((status, i) => ({ status, count: counts[i] })) } });
};

export const getInventoryAlerts = async (_req: IAuthRequest, res: Response): Promise<void> => {
  const outOfStock = await Product.find({ 'variants.stock': 0, isActive: true }).select('name slug images variants').populate('category', 'name');
  const lowStock = await Product.find({ 'variants.stock': { $gt: 0, $lte: 10 }, isActive: true }).select('name slug images variants').populate('category', 'name');
  res.json({ success: true, data: { alerts: { outOfStock: outOfStock.length, lowStock: lowStock.length, products: { outOfStock, lowStock } } } });
};

export const getSearchAnalytics = async (_req: IAuthRequest, res: Response): Promise<void> => {
  const topSelling = await Product.find({ isActive: true }).sort({ totalSold: -1 }).limit(10).select('name slug totalSold');
  const popularCategories = await Product.aggregate([
    { $match: { isActive: true } }, { $group: { _id: '$category', count: { $sum: 1 }, totalSold: { $sum: '$totalSold' } } },
    { $sort: { totalSold: -1 } }, { $limit: 10 },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
    { $unwind: '$category' }, { $project: { name: '$category.name', slug: '$category.slug', count: 1, totalSold: 1 } },
  ]);
  res.json({ success: true, data: { analytics: { topSelling, popularCategories } } });
};
