import { Response } from 'express';
import Category from '../models/Category';
import Product from '../models/Product';
import { IAuthRequest } from '../types';
import { generateSlug } from '../utils/helpers';

export const getCategories = async (_req: IAuthRequest, res: Response): Promise<void> => {
  const categories = await Category.find({ isActive: true }).populate('parent', 'name slug').sort({ order: 1, name: 1 });
  const productCounts = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);
  const countMap = new Map(productCounts.map((c) => [c._id.toString(), c.count]));
  const categoriesWithCounts = categories.map((cat) => ({ ...cat.toObject(), productCount: countMap.get(cat._id.toString()) || 0 }));
  res.json({ success: true, data: { categories: categoriesWithCounts } });
};

export const getCategoryBySlug = async (req: IAuthRequest, res: Response): Promise<void> => {
  const category = await Category.findOne({ slug: req.params.slug, isActive: true }).populate('parent', 'name slug');
  if (!category) { res.status(404).json({ success: false, message: 'Category not found' }); return; }
  const products = await Product.find({ category: category._id, isActive: true }).populate('category', 'name slug').sort({ createdAt: -1 });
  res.json({ success: true, data: { category, products } });
};

export const adminGetCategories = async (_req: IAuthRequest, res: Response): Promise<void> => {
  const categories = await Category.find().populate('parent', 'name slug').sort({ order: 1, name: 1 });
  const productCounts = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);
  const countMap = new Map(productCounts.map((c) => [c._id.toString(), c.count]));
  const categoriesWithCounts = categories.map((cat) => ({ ...cat.toObject(), productCount: countMap.get(cat._id.toString()) || 0 }));
  res.json({ success: true, data: { categories: categoriesWithCounts } });
};

const allowedCategoryFields = ['name', 'slug', 'description', 'parent', 'isActive', 'order'];
function parseCategoryBody(body: any): any {
  const data: any = {};
  for (const key of allowedCategoryFields) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  return data;
}

export const createCategory = async (req: IAuthRequest, res: Response): Promise<void> => {
  const data = parseCategoryBody(req.body);
  if (data.parent === '' || data.parent === 'null') data.parent = null;
  if (!data.slug) data.slug = generateSlug(data.name);
  if (req.file) data.image = `/uploads/categories/${(req.file as any).filename}`;
  const category = await Category.create(data);
  res.status(201).json({ success: true, data: { category }, message: 'Category created' });
};

export const updateCategory = async (req: IAuthRequest, res: Response): Promise<void> => {
  const data = parseCategoryBody(req.body);
  if (data.parent === '' || data.parent === 'null') data.parent = null;
  if (data.slug) data.slug = generateSlug(data.slug);
  if (req.file) data.image = `/uploads/categories/${(req.file as any).filename}`;
  const removeImage = req.body.removeImage === 'true';
  if (removeImage && !req.file) data.image = null;
  const category = await Category.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!category) { res.status(404).json({ success: false, message: 'Category not found' }); return; }
  res.json({ success: true, data: { category }, message: 'Category updated' });
};

export const deleteCategory = async (req: IAuthRequest, res: Response): Promise<void> => {
  const productCount = await Product.countDocuments({ category: req.params.id });
  if (productCount > 0) { res.status(400).json({ success: false, message: `Cannot delete category with ${productCount} products. Move products first.` }); return; }
  const subcategories = await Category.countDocuments({ parent: req.params.id });
  if (subcategories > 0) { res.status(400).json({ success: false, message: `Cannot delete category with ${subcategories} subcategories. Remove them first.` }); return; }
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) { res.status(404).json({ success: false, message: 'Category not found' }); return; }
  res.json({ success: true, data: {}, message: 'Category deleted' });
};
