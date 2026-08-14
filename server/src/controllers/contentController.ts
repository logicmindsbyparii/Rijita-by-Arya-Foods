import { Response } from 'express';
import Blog from '../models/Blog';
import Recipe from '../models/Recipe';
import Review from '../models/Review';
import Contact from '../models/Contact';
import Subscriber from '../models/Subscriber';
import Collection from '../models/Collection';
import Coupon from '../models/Coupon';
import SiteSettings from '../models/SiteSettings';
import Product from '../models/Product';
import User from '../models/User';
import { IAuthRequest } from '../types';
import { generateSlug, paginateQuery, buildPagination, escapeRegex } from '../utils/helpers';

export const getBlogs = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '9', category, tag } = req.query;
  const query: any = { isPublished: true };
  if (category) query.category = category;
  if (tag) query.tags = tag;
  const { skip, limit: pageLimit, page: currentPage } = paginateQuery(Number(page), Number(limit));
  const total = await Blog.countDocuments(query);
  const blogs = await Blog.find(query).sort({ publishedAt: -1 }).skip(skip).limit(pageLimit);
  res.json({ success: true, data: { blogs }, pagination: buildPagination(total, currentPage, pageLimit) });
};

export const getBlogBySlug = async (req: IAuthRequest, res: Response): Promise<void> => {
  const blog = await Blog.findOne({ slug: req.params.slug, isPublished: true });
  if (!blog) { res.status(404).json({ success: false, message: 'Blog not found' }); return; }
  res.json({ success: true, data: { blog } });
};

export const adminGetBlogs = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', search, status } = req.query;
  const query: any = {};
  if (status === 'published') query.isPublished = true;
  else if (status === 'draft') query.isPublished = false;
  if (search) {
    const escaped = escapeRegex(search as string);
    query.$or = [{ title: { $regex: escaped, $options: 'i' } }, { author: { $regex: escaped, $options: 'i' } }];
  }
  const { skip, limit: pageLimit, page: currentPage } = paginateQuery(Number(page), Number(limit));
  const total = await Blog.countDocuments(query);
  const blogs = await Blog.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageLimit);
  res.json({ success: true, data: { blogs }, pagination: buildPagination(total, currentPage, pageLimit) });
};

const allowedBlogFields = ['title', 'slug', 'content', 'excerpt', 'author', 'tags', 'category', 'featuredImage', 'isPublished', 'metaTitle', 'metaDescription', 'publishedAt'];

function parseBlogBody(body: any): any {
  const data: any = {};
  for (const key of allowedBlogFields) {
    if (body[key] !== undefined) {
      let value = body[key];
      if (key === 'tags' && typeof value === 'string') { try { value = JSON.parse(value); } catch {} }
      data[key] = value;
    }
  }
  return data;
}

export const createBlog = async (req: IAuthRequest, res: Response): Promise<void> => {
  const data = parseBlogBody(req.body);
  if (!data.slug) data.slug = generateSlug(data.title);
  if (req.file) data.featuredImage = `/uploads/blogs/${(req.file as any).filename}`;
  if (data.isPublished && !data.publishedAt) data.publishedAt = new Date();
  const blog = await Blog.create(data);
  res.status(201).json({ success: true, data: { blog }, message: 'Blog created' });
};

export const updateBlog = async (req: IAuthRequest, res: Response): Promise<void> => {
  const data = parseBlogBody(req.body);
  if (data.title && !data.slug) data.slug = generateSlug(data.title);
  if (req.file) data.featuredImage = `/uploads/blogs/${(req.file as any).filename}`;
  if (data.isPublished && !data.publishedAt) data.publishedAt = new Date();
  const blog = await Blog.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!blog) { res.status(404).json({ success: false, message: 'Blog not found' }); return; }
  res.json({ success: true, data: { blog }, message: 'Blog updated' });
};

export const deleteBlog = async (req: IAuthRequest, res: Response): Promise<void> => {
  const blog = await Blog.findByIdAndDelete(req.params.id);
  if (!blog) { res.status(404).json({ success: false, message: 'Blog not found' }); return; }
  res.json({ success: true, data: {}, message: 'Blog deleted' });
};

export const getRecipes = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '12', difficulty } = req.query;
  const query: any = { isPublished: true };
  if (difficulty) query.difficulty = difficulty;
  const { skip, limit: pageLimit, page: currentPage } = paginateQuery(Number(page), Number(limit));
  const total = await Recipe.countDocuments(query);
  const recipes = await Recipe.find(query).populate('products', 'name slug images').sort({ createdAt: -1 }).skip(skip).limit(pageLimit);
  res.json({ success: true, data: { recipes }, pagination: buildPagination(total, currentPage, pageLimit) });
};

export const getRecipeBySlug = async (req: IAuthRequest, res: Response): Promise<void> => {
  const recipe = await Recipe.findOne({ slug: req.params.slug, isPublished: true }).populate('products', 'name slug images variants');
  if (!recipe) { res.status(404).json({ success: false, message: 'Recipe not found' }); return; }
  res.json({ success: true, data: { recipe } });
};

export const adminGetRecipes = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', search, difficulty } = req.query;
  const query: any = {};
  if (difficulty) query.difficulty = difficulty;
  if (search) {
    const escaped = escapeRegex(search as string);
    query.$or = [{ title: { $regex: escaped, $options: 'i' } }, { description: { $regex: escaped, $options: 'i' } }];
  }
  const { skip, limit: pageLimit, page: currentPage } = paginateQuery(Number(page), Number(limit));
  const total = await Recipe.countDocuments(query);
  const recipes = await Recipe.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageLimit);
  res.json({ success: true, data: { recipes }, pagination: buildPagination(total, currentPage, pageLimit) });
};

const allowedRecipeFields = ['title', 'slug', 'description', 'ingredients', 'instructions', 'prepTime', 'cookTime', 'servings', 'difficulty', 'featuredImage', 'products', 'tags', 'isPublished', 'metaTitle', 'metaDescription'];

function parseRecipeBody(body: any): any {
  const data: any = {};
  for (const key of allowedRecipeFields) {
    if (body[key] !== undefined) {
      let value = body[key];
      if (['ingredients', 'instructions', 'tags', 'products'].includes(key) && typeof value === 'string') { try { value = JSON.parse(value); } catch {} }
      data[key] = value;
    }
  }
  return data;
}

export const createRecipe = async (req: IAuthRequest, res: Response): Promise<void> => {
  const data = parseRecipeBody(req.body);
  if (!data.slug) data.slug = generateSlug(data.title);
  if (req.file) data.featuredImage = `/uploads/recipes/${(req.file as any).filename}`;
  const recipe = await Recipe.create(data);
  res.status(201).json({ success: true, data: { recipe }, message: 'Recipe created' });
};

export const updateRecipe = async (req: IAuthRequest, res: Response): Promise<void> => {
  const data = parseRecipeBody(req.body);
  if (data.title && !data.slug) data.slug = generateSlug(data.title);
  if (req.file) data.featuredImage = `/uploads/recipes/${(req.file as any).filename}`;
  const recipe = await Recipe.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!recipe) { res.status(404).json({ success: false, message: 'Recipe not found' }); return; }
  res.json({ success: true, data: { recipe }, message: 'Recipe updated' });
};

export const deleteRecipe = async (req: IAuthRequest, res: Response): Promise<void> => {
  const recipe = await Recipe.findByIdAndDelete(req.params.id);
  if (!recipe) { res.status(404).json({ success: false, message: 'Recipe not found' }); return; }
  res.json({ success: true, data: {}, message: 'Recipe deleted' });
};

export const getProductReviews = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '10' } = req.query;
  const query: any = { product: req.params.productId, isApproved: true };
  const { skip, limit: pageLimit, page: currentPage } = paginateQuery(Number(page), Number(limit));
  const total = await Review.countDocuments(query);
  const reviews = await Review.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageLimit);
  res.json({ success: true, data: { reviews }, pagination: buildPagination(total, currentPage, pageLimit) });
};

export const createReview = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { productId, rating, title, comment } = req.body;
  const product = await Product.findById(productId);
  if (!product) { res.status(404).json({ success: false, message: 'Product not found' }); return; }
  const existingReview = await Review.findOne({ product: productId, user: req.user?.id });
  if (existingReview) { res.status(400).json({ success: false, message: 'You already reviewed this product' }); return; }
  const reviewer = await User.findById(req.user?.id);
  const review = await Review.create({ product: productId, user: req.user?.id, userName: reviewer?.name || 'Anonymous', rating, title, comment });
  const stats = await Review.aggregate([{ $match: { product: review.product, isApproved: true } }, { $group: { _id: '$product', averageRating: { $avg: '$rating' }, count: { $sum: 1 } } }]);
  if (stats.length > 0) await Product.findByIdAndUpdate(productId, { averageRating: Math.round(stats[0].averageRating * 10) / 10, reviewCount: stats[0].count });
  res.status(201).json({ success: true, data: { review }, message: 'Review submitted. Awaiting approval.' });
};

export const adminGetReviews = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', isApproved, search } = req.query;
  const query: any = {};
  if (isApproved === 'true') query.isApproved = true;
  if (isApproved === 'false') query.isApproved = false;
  if (search) {
    const escaped = escapeRegex(search as string);
    query.$or = [{ userName: { $regex: escaped, $options: 'i' } }, { comment: { $regex: escaped, $options: 'i' } }];
  }
  const { skip, limit: pageLimit, page: currentPage } = paginateQuery(Number(page), Number(limit));
  const total = await Review.countDocuments(query);
  const reviews = await Review.find(query).populate('product', 'name slug').populate('user', 'name email').sort({ createdAt: -1 }).skip(skip).limit(pageLimit);
  res.json({ success: true, data: { reviews }, pagination: buildPagination(total, currentPage, pageLimit) });
};

export const approveReview = async (req: IAuthRequest, res: Response): Promise<void> => {
  const review = await Review.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
  if (!review) { res.status(404).json({ success: false, message: 'Review not found' }); return; }
  const stats = await Review.aggregate([{ $match: { product: review.product, isApproved: true } }, { $group: { _id: '$product', averageRating: { $avg: '$rating' }, count: { $sum: 1 } } }]);
  if (stats.length > 0) await Product.findByIdAndUpdate(review.product, { averageRating: Math.round(stats[0].averageRating * 10) / 10, reviewCount: stats[0].count });
  res.json({ success: true, data: { review }, message: 'Review approved' });
};

export const deleteReview = async (req: IAuthRequest, res: Response): Promise<void> => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) { res.status(404).json({ success: false, message: 'Review not found' }); return; }
  const stats = await Review.aggregate([{ $match: { product: review.product, isApproved: true } }, { $group: { _id: '$product', averageRating: { $avg: '$rating' }, count: { $sum: 1 } } }]);
  if (stats.length > 0) await Product.findByIdAndUpdate(review.product, { averageRating: Math.round(stats[0].averageRating * 10) / 10, reviewCount: stats[0].count });
  else await Product.findByIdAndUpdate(review.product, { averageRating: 0, reviewCount: 0 });
  res.json({ success: true, data: {}, message: 'Review deleted' });
};

export const submitContact = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { name, email, phone, subject, message, type } = req.body;
  if (!name || !email || !phone || !subject || !message) { res.status(400).json({ success: false, message: 'Name, email, phone, subject, and message are required' }); return; }
  const contact = await Contact.create({ name, email, phone, subject, message, type: type || 'general' });
  res.status(201).json({ success: true, data: { contact }, message: 'Message sent successfully' });
};

export const getContacts = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', type, isRead } = req.query;
  const query: any = {};
  if (type) query.type = type;
  if (isRead === 'true') query.isRead = true;
  if (isRead === 'false') query.isRead = false;
  const { skip, limit: pageLimit, page: currentPage } = paginateQuery(Number(page), Number(limit));
  const total = await Contact.countDocuments(query);
  const contacts = await Contact.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageLimit);
  res.json({ success: true, data: { contacts }, pagination: buildPagination(total, currentPage, pageLimit) });
};

export const markContactRead = async (req: IAuthRequest, res: Response): Promise<void> => {
  const contact = await Contact.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
  if (!contact) { res.status(404).json({ success: false, message: 'Contact not found' }); return; }
  res.json({ success: true, data: { contact }, message: 'Marked as read' });
};

export const deleteContact = async (req: IAuthRequest, res: Response): Promise<void> => {
  const contact = await Contact.findByIdAndDelete(req.params.id);
  if (!contact) { res.status(404).json({ success: false, message: 'Contact not found' }); return; }
  res.json({ success: true, data: {}, message: 'Contact deleted' });
};

export const subscribe = async (req: IAuthRequest, res: Response): Promise<void> => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ success: false, message: 'Valid email is required' }); return; }
  const existing = await Subscriber.findOne({ email });
  if (existing) {
    if (!existing.isActive) { existing.isActive = true; await existing.save(); res.json({ success: true, data: { subscriber: existing }, message: 'Subscription renewed' }); return; }
    res.status(400).json({ success: false, message: 'Email already subscribed' }); return;
  }
  const subscriber = await Subscriber.create({ email });
  res.status(201).json({ success: true, data: { subscriber }, message: 'Subscribed successfully' });
};

export const getSubscribers = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20' } = req.query;
  const { skip, limit: pageLimit, page: currentPage } = paginateQuery(Number(page), Number(limit));
  const total = await Subscriber.countDocuments({ isActive: true });
  const subscribers = await Subscriber.find({ isActive: true }).sort({ createdAt: -1 }).skip(skip).limit(pageLimit);
  res.json({ success: true, data: { subscribers }, pagination: buildPagination(total, currentPage, pageLimit) });
};

export const getCollections = async (_req: IAuthRequest, res: Response): Promise<void> => {
  const collections = await Collection.find({ isActive: true }).populate('products', 'name slug images variants');
  res.json({ success: true, data: { collections } });
};

export const getCollectionBySlug = async (req: IAuthRequest, res: Response): Promise<void> => {
  const collection = await Collection.findOne({ slug: req.params.slug, isActive: true }).populate('products', 'name slug images variants category averageRating');
  if (!collection) { res.status(404).json({ success: false, message: 'Collection not found' }); return; }
  res.json({ success: true, data: { collection } });
};

export const adminGetCollections = async (_req: IAuthRequest, res: Response): Promise<void> => {
  const collections = await Collection.find().populate('products', 'name slug');
  res.json({ success: true, data: { collections } });
};

export const createCollection = async (req: IAuthRequest, res: Response): Promise<void> => {
  const data = req.body;
  if (!data.slug) data.slug = generateSlug(data.name);
  if (req.file) data.image = `/uploads/gallery/${(req.file as any).filename}`;
  const collection = await Collection.create(data);
  res.status(201).json({ success: true, data: { collection }, message: 'Collection created' });
};

export const updateCollection = async (req: IAuthRequest, res: Response): Promise<void> => {
  const data = req.body;
  if (data.name && !data.slug) data.slug = generateSlug(data.name);
  if (req.file) data.image = `/uploads/gallery/${(req.file as any).filename}`;
  const collection = await Collection.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!collection) { res.status(404).json({ success: false, message: 'Collection not found' }); return; }
  res.json({ success: true, data: { collection }, message: 'Collection updated' });
};

export const deleteCollection = async (req: IAuthRequest, res: Response): Promise<void> => {
  const collection = await Collection.findByIdAndDelete(req.params.id);
  if (!collection) { res.status(404).json({ success: false, message: 'Collection not found' }); return; }
  res.json({ success: true, data: {}, message: 'Collection deleted' });
};

export const adminGetCoupons = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', search, status } = req.query;
  const query: any = {};
  if (search) {
    const escaped = escapeRegex(search as string);
    query.code = { $regex: escaped, $options: 'i' };
  }
  if (status === 'active') {
    query.isActive = true;
    query.startsAt = { $lte: new Date() };
    query.expiresAt = { $gte: new Date() };
  } else if (status === 'inactive') {
    query.isActive = false;
  } else if (status === 'expired') {
    query.isActive = true;
    query.expiresAt = { $lt: new Date() };
  }
  const { skip, limit: pageLimit, page: currentPage } = paginateQuery(Number(page), Number(limit));
  const total = await Coupon.countDocuments(query);
  const coupons = await Coupon.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageLimit);
  res.json({ success: true, data: { coupons }, pagination: buildPagination(total, currentPage, pageLimit) });
};

export const createCoupon = async (req: IAuthRequest, res: Response): Promise<void> => {
  const allowedFields = ['code', 'type', 'value', 'minOrderAmount', 'maxDiscount', 'usageLimit', 'startsAt', 'expiresAt', 'isActive', 'description'];
  const data: any = {};
  for (const key of allowedFields) { if (req.body[key] !== undefined) data[key] = req.body[key]; }
  const coupon = await Coupon.create(data);
  res.status(201).json({ success: true, data: { coupon }, message: 'Coupon created' });
};

export const updateCoupon = async (req: IAuthRequest, res: Response): Promise<void> => {
  const allowedFields = ['code', 'type', 'value', 'minOrderAmount', 'maxDiscount', 'usageLimit', 'startsAt', 'expiresAt', 'isActive', 'description'];
  const data: any = {};
  for (const key of allowedFields) { if (req.body[key] !== undefined) data[key] = req.body[key]; }
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!coupon) { res.status(404).json({ success: false, message: 'Coupon not found' }); return; }
  res.json({ success: true, data: { coupon }, message: 'Coupon updated' });
};

export const deleteCoupon = async (req: IAuthRequest, res: Response): Promise<void> => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) { res.status(404).json({ success: false, message: 'Coupon not found' }); return; }
  res.json({ success: true, data: {}, message: 'Coupon deleted' });
};

export const validateCoupon = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { code, subtotal } = req.body;
  if (typeof code !== 'string' || typeof subtotal !== 'number') { res.status(400).json({ success: false, message: 'Invalid input' }); return; }
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true, startsAt: { $lte: new Date() }, expiresAt: { $gte: new Date() } });
  if (!coupon) { res.status(400).json({ success: false, message: 'Invalid or expired coupon' }); return; }
  if (coupon.usedCount >= coupon.usageLimit) { res.status(400).json({ success: false, message: 'Coupon usage limit reached' }); return; }
  if (subtotal < coupon.minOrderAmount) { res.status(400).json({ success: false, message: `Minimum order: ₹${coupon.minOrderAmount}` }); return; }
  const discount = coupon.type === 'percentage' ? Math.min(subtotal * (coupon.value / 100), coupon.maxDiscount || Infinity) : Math.min(coupon.value, subtotal);
  res.json({ success: true, data: { coupon, discount: Math.round(discount) }, message: 'Coupon valid' });
};

export const getSiteSettings = async (_req: IAuthRequest, res: Response): Promise<void> => {
  let settings = await SiteSettings.findOne();
  if (!settings) settings = await SiteSettings.create({});
  res.json({ success: true, data: { settings } });
};

export const updateSiteSettings = async (req: IAuthRequest, res: Response): Promise<void> => {
  const jsonFields: string[] = ['socialMedia', 'footer', 'shipping', 'gst', 'seo', 'whatsapp', 'payment', 'announcement', 'banners', 'story', 'stats', 'about'];
  const data: any = {};
  for (const [key, value] of Object.entries(req.body)) {
    if (value !== undefined) {
      if (jsonFields.includes(key) && typeof value === 'string') { try { data[key] = JSON.parse(value); } catch { data[key] = value; } }
      else { data[key] = value; }
    }
  }
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  if (files) {
    if (files.logo?.[0]) data.logo = `/uploads/banners/${files.logo[0].filename}`;
    if (files.favicon?.[0]) data.favicon = `/uploads/banners/${files.favicon[0].filename}`;
    if (files.storyImage?.[0]) data.storyImage = `/uploads/banners/${files.storyImage[0].filename}`;
    if (files.heroImage?.[0]) data.heroImage = `/uploads/banners/${files.heroImage[0].filename}`;
    if (files.founderImage?.[0]) data.founderImage = `/uploads/banners/${files.founderImage[0].filename}`;
    if (data.banners && Array.isArray(data.banners)) {
      data.banners = data.banners.map((banner: any, index: number) => {
        const bannerFile = files[`bannerImage_${index}`];
        if (bannerFile?.[0]) {
          // New uploaded image replaces the old one
          banner.image = `/uploads/banners/${bannerFile[0].filename}`;
        } else if (!banner.image) {
          // If no image URL in payload (missing or empty string), keep existing
          // (banner.image remains as-is from the original settings document)
        }
        return banner;
      });
    } else if (data.banners === undefined && req.body.banners === undefined) {
      // No banners data at all — don't touch existing banners
      delete data.banners;
    }
  }
  if (req.body.removeLogo === 'true') data.logo = '';
  if (req.body.removeFavicon === 'true') data.favicon = '';
  if (req.body.removeStoryImage === 'true') data.storyImage = '';
  if (req.body.removeHeroImage === 'true') data.heroImage = '';
  if (req.body.removeFounderImage === 'true') data.founderImage = '';
  const settings = await SiteSettings.findOneAndUpdate({}, data, { upsert: true, new: true });
  res.json({ success: true, data: { settings }, message: 'Settings updated' });
};

export const adminCreateUser = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { name, email, phone, password, role, isActive } = req.body;
  if (role === 'superadmin' && req.user?.role !== 'superadmin') { res.status(403).json({ success: false, message: 'Only superadmins can create superadmins' }); return; }
  if (!name || !email || !phone || !password) { res.status(400).json({ success: false, message: 'Name, email, phone, and password are required' }); return; }
  const existingUser = await User.findOne({ email });
  if (existingUser) { res.status(400).json({ success: false, message: 'Email already registered' }); return; }
  const user = await User.create({ name, email, phone, password, role: role || 'customer', isActive: isActive !== undefined ? isActive : true });
  res.status(201).json({ success: true, data: { user: user.toJSON() }, message: 'User created' });
};

export const adminUpdateUser = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { name, email, phone, password, role, isActive } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  if (role === 'superadmin' && req.user?.role !== 'superadmin') { res.status(403).json({ success: false, message: 'Only superadmins can assign superadmin role' }); return; }
  if (user.role === 'superadmin' && req.user?.role !== 'superadmin') { res.status(403).json({ success: false, message: 'Only superadmins can modify a superadmin' }); return; }
  if (name !== undefined) user.name = name;
  if (email !== undefined) { const existing = await User.findOne({ email, _id: { $ne: user._id } }); if (existing) { res.status(400).json({ success: false, message: 'Email already in use' }); return; } user.email = email; }
  if (phone !== undefined) user.phone = phone;
  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (password) user.password = password;
  await user.save();
  res.json({ success: true, data: { user: user.toJSON() }, message: 'User updated' });
};

export const adminDeleteUser = async (req: IAuthRequest, res: Response): Promise<void> => {
  // Fetch first so we can check role BEFORE deleting
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  if (user.role === 'superadmin' && req.user?.role !== 'superadmin') { res.status(403).json({ success: false, message: 'Only superadmins can delete a superadmin' }); return; }
  await user.deleteOne();
  res.json({ success: true, data: {}, message: 'User deleted' });
};

export const adminGetUsers = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', role, search } = req.query;
  const query: any = {};
  if (role) query.role = role;
  if (search) {
    const escaped = escapeRegex(search as string);
    query.$or = [{ name: { $regex: escaped, $options: 'i' } }, { email: { $regex: escaped, $options: 'i' } }, { phone: { $regex: escaped, $options: 'i' } }];
  }
  const { skip, limit: pageLimit, page: currentPage } = paginateQuery(Number(page), Number(limit));
  const total = await User.countDocuments(query);
  const users = await User.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageLimit);
  res.json({ success: true, data: { users }, pagination: buildPagination(total, currentPage, pageLimit) });
};


