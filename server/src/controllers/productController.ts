import { Response } from 'express';
import Product from '../models/Product';
import Category from '../models/Category';
import { IAuthRequest } from '../types';
import { generateSlug, paginateQuery, buildPagination, escapeRegex } from '../utils/helpers';

export const getProducts = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '12', search, category, sort, minPrice, maxPrice, tags, featured, bestSeller, newArrival } = req.query;
  const query: any = { isActive: true };
  if (search) query.$text = { $search: search as string };
  // Resolve category slug(s) to ObjectId(s) — the Product schema stores category as an ObjectId reference
  if (category) {
    const slugs = (category as string).split(',').map((s) => s.trim()).filter(Boolean);
    const categories = await Category.find({ slug: { $in: slugs } }).select('_id').lean();
    const ids = categories.map((c) => c._id);
    if (ids.length === 0) {
      // No matching categories found — return empty results
      query._id = { $in: [] };
    } else {
      query.category = { $in: ids };
    }
  }
  if (featured === 'true') query.isFeatured = true;
  if (bestSeller === 'true') query.isBestSeller = true;
  if (newArrival === 'true') query.isNewArrival = true;
  if (tags) query.tags = { $in: (tags as string).split(',') };
  if (minPrice || maxPrice) {
    query['variants.sellingPrice'] = {};
    if (minPrice) query['variants.sellingPrice'].$gte = Number(minPrice);
    if (maxPrice) query['variants.sellingPrice'].$lte = Number(maxPrice);
  }
  let sortOption: any = { createdAt: -1 };
  switch (sort) {
    case 'price-asc': sortOption = { minPrice: 1 }; break;
    case 'price-desc': sortOption = { minPrice: -1 }; break;
    case 'name-asc': sortOption = { name: 1 }; break;
    case 'name-desc': sortOption = { name: -1 }; break;
    case 'rating': sortOption = { averageRating: -1 }; break;
    case 'popular': sortOption = { totalSold: -1 }; break;
    case 'newest': sortOption = { createdAt: -1 }; break;
  }
  const { skip, limit: pageLimit, page: currentPage } = paginateQuery(Number(page), Number(limit));
  const total = await Product.countDocuments(query);
  const products = await Product.find(query).populate('category', 'name slug').sort(sortOption).skip(skip).limit(pageLimit);
  res.json({ success: true, data: { products }, pagination: buildPagination(total, currentPage, pageLimit) });
};

export const getProductBySlug = async (req: IAuthRequest, res: Response): Promise<void> => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true }).populate('category', 'name slug').populate('subcategory', 'name slug');
  if (!product) { res.status(404).json({ success: false, message: 'Product not found' }); return; }
  const relatedProducts = await Product.find({ category: product.category, _id: { $ne: product._id }, isActive: true }).limit(6).populate('category', 'name slug');
  res.json({ success: true, data: { product, relatedProducts } });
};

export const getProductById = async (req: IAuthRequest, res: Response): Promise<void> => {
  const product = await Product.findById(req.params.id).populate('category', 'name slug');
  if (!product) { res.status(404).json({ success: false, message: 'Product not found' }); return; }
  res.json({ success: true, data: { product } });
};

function parseProductBody(body: any): any {
  const allowedFields = ['name', 'description', 'shortDescription', 'category', 'subcategory', 'variants', 'tags', 'nutritionalInfo', 'ingredients', 'shelfLife', 'storageInstructions', 'fssaiLicense', 'countryOfOrigin', 'isFeatured', 'isBestSeller', 'isNewArrival', 'metaTitle', 'metaDescription', 'metaKeywords', 'isActive'];
  const data: any = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      let value = body[key];
      if (['variants', 'nutritionalInfo'].includes(key) && typeof value === 'string') { try { value = JSON.parse(value); } catch {} }
      else if (['tags', 'metaKeywords'].includes(key) && typeof value === 'string') { value = value.split(',').map((t: string) => t.trim()).filter(Boolean); }
      data[key] = value;
    }
  }
  return data;
}

export const createProduct = async (req: IAuthRequest, res: Response): Promise<void> => {
  const data = parseProductBody(req.body);
  if (!data.slug) data.slug = generateSlug(data.name);
  if (req.files && Array.isArray(req.files)) data.images = req.files.map((f: any) => `/uploads/products/${f.filename}`);
  const product = await Product.create(data);
  res.status(201).json({ success: true, data: { product }, message: 'Product created' });
};

export const updateProduct = async (req: IAuthRequest, res: Response): Promise<void> => {
  const data = parseProductBody(req.body);
  // Only regenerate slug if: (a) name explicitly changed AND (b) no slug was provided by the request.
  // This prevents overwriting existing SEO-friendly slugs just because the name was edited.
  if (data.name && req.body.slug === undefined) {
    // Leave slug unchanged — only generate a NEW slug if explicitly cleared by sending slug: ''
    // (admin intentionally wants to reset it)
  }
  if (req.body.slug === '') {
    // Admin explicitly cleared the slug field — regenerate from name
    data.slug = generateSlug(data.name || '');
  }
  let existingImages = req.body.existingImages || [];
  if (typeof existingImages === 'string') existingImages = [existingImages];
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    data.images = [...existingImages, ...req.files.map((f: any) => `/uploads/products/${f.filename}`)];
  } else if (req.body.existingImages !== undefined) data.images = existingImages;
  
  // Use find + save to trigger pre-save hook for minPrice recalculation
  const product = await Product.findById(req.params.id);
  if (!product) { res.status(404).json({ success: false, message: 'Product not found' }); return; }
  Object.assign(product, data);
  await product.save();
  
  res.json({ success: true, data: { product }, message: 'Product updated' });
};

export const deleteProduct = async (req: IAuthRequest, res: Response): Promise<void> => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) { res.status(404).json({ success: false, message: 'Product not found' }); return; }
  res.json({ success: true, data: {}, message: 'Product deleted' });
};

export const getFeaturedProducts = async (req: IAuthRequest, res: Response): Promise<void> => {
  const products = await Product.find({ isActive: true, isFeatured: true }).populate('category', 'name slug').sort({ createdAt: -1 }).limit(12);
  res.json({ success: true, data: { products } });
};

export const getBestSellers = async (req: IAuthRequest, res: Response): Promise<void> => {
  const products = await Product.find({ isActive: true, isBestSeller: true }).populate('category', 'name slug').sort({ totalSold: -1 }).limit(12);
  res.json({ success: true, data: { products } });
};

export const getNewArrivals = async (req: IAuthRequest, res: Response): Promise<void> => {
  const products = await Product.find({ isActive: true, isNewArrival: true }).populate('category', 'name slug').sort({ createdAt: -1 }).limit(12);
  res.json({ success: true, data: { products } });
};

export const searchProducts = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { q, page = '1', limit = '20' } = req.query;
  if (!q) { res.status(400).json({ success: false, message: 'Search query required' }); return; }
  const { skip, limit: pageLimit, page: currentPage } = paginateQuery(Number(page), Number(limit));
  const query: any = { isActive: true };
  const escaped = escapeRegex(q as string);
  query.$or = [
    { name: { $regex: escaped, $options: 'i' } },
    { description: { $regex: escaped, $options: 'i' } },
    { tags: { $regex: escaped, $options: 'i' } },
    { 'variants.sku': { $regex: escaped, $options: 'i' } },
  ];
  const total = await Product.countDocuments(query);
  const products = await Product.find(query).populate('category', 'name slug').sort({ totalSold: -1 }).skip(skip).limit(pageLimit);
  res.json({ success: true, data: { products }, pagination: buildPagination(total, currentPage, pageLimit) });
};

export const adminGetProducts = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', search, status } = req.query;
  const query: any = {};
  if (search) {
    const escaped = escapeRegex(search as string);
    query.$or = [{ name: { $regex: escaped, $options: 'i' } }, { 'variants.sku': { $regex: escaped, $options: 'i' } }];
  }
  if (status === 'active') query.isActive = true;
  if (status === 'inactive') query.isActive = false;
  if (status === 'out-of-stock') query.variants = { $not: { $elemMatch: { stock: { $gt: 0 } } } };
  if (status === 'low-stock') query['variants.stock'] = { $gt: 0, $lte: 10 };
  const { skip, limit: pageLimit, page: currentPage } = paginateQuery(Number(page), Number(limit));
  const total = await Product.countDocuments(query);
  const products = await Product.find(query).populate('category', 'name slug').sort({ createdAt: -1 }).skip(skip).limit(pageLimit);
  res.json({ success: true, data: { products }, pagination: buildPagination(total, currentPage, pageLimit) });
};
