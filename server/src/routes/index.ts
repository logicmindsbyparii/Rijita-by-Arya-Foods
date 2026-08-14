import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { protect, authorize, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { upload, uploadMultiple, uploadSingle, uploadGallery, processImages, processSingleImage, BANNER_CONFIG } from '../middleware/imageProcessor';

import * as authController from '../controllers/authController';
import * as productController from '../controllers/productController';
import * as categoryController from '../controllers/categoryController';
import * as orderController from '../controllers/orderController';
import * as contentController from '../controllers/contentController';
import * as analyticsController from '../controllers/analyticsController';

import rateLimit from 'express-rate-limit';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: process.env.NODE_ENV === 'production' ? 5 : 1000,
  message: { success: false, message: 'Too many login attempts, please try again later' },
  standardHeaders: true, legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: process.env.NODE_ENV === 'production' ? 10 : 100,
  message: { success: false, message: 'Too many registration attempts, please try again later' },
  standardHeaders: true, legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: process.env.NODE_ENV === 'production' ? 3 : 100,
  message: { success: false, message: 'Too many password reset requests, please try again later' },
  standardHeaders: true, legacyHeaders: false,
});

const orderLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: process.env.NODE_ENV === 'production' ? 10 : 1000,
  message: { success: false, message: 'Too many order lookup attempts, please try again later' },
  standardHeaders: true, legacyHeaders: false,
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: process.env.NODE_ENV === 'production' ? 5 : 100,
  message: { success: false, message: 'Too many submissions, please try again later' },
  standardHeaders: true, legacyHeaders: false,
});

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'RIJITA API is running', timestamp: new Date().toISOString() });
});

router.post('/auth/register', registerLimiter, validate([body('name').notEmpty().withMessage('Name is required'), body('email').isEmail().withMessage('Valid email is required'), body('phone').notEmpty().withMessage('Phone is required'), body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')]), asyncHandler(authController.register));
router.post('/auth/login', authLimiter, validate([body('email').isEmail().withMessage('Valid email is required'), body('password').notEmpty().withMessage('Password is required')]), asyncHandler(authController.login));
router.post('/auth/forgot-password', forgotPasswordLimiter, asyncHandler(authController.forgotPassword));
router.post('/auth/reset-password', asyncHandler(authController.resetPassword));
router.post('/auth/refresh-token', authLimiter, asyncHandler(authController.refreshToken));
router.get('/auth/profile', protect, asyncHandler(authController.getProfile));
router.put('/auth/profile', protect, asyncHandler(authController.updateProfile));
router.put('/auth/change-password', protect, asyncHandler(authController.changePassword));
router.post('/auth/addresses', protect, asyncHandler(authController.addAddress));
router.put('/auth/addresses/:addressId', protect, asyncHandler(authController.updateAddress));
router.delete('/auth/addresses/:addressId', protect, asyncHandler(authController.deleteAddress));
router.get('/auth/wishlist', protect, asyncHandler(authController.getWishlist));
router.post('/auth/wishlist/:productId', protect, asyncHandler(authController.toggleWishlist));

router.get('/products', asyncHandler(productController.getProducts));
router.get('/products/search', asyncHandler(productController.searchProducts));
router.get('/products/featured', asyncHandler(productController.getFeaturedProducts));
router.get('/products/best-sellers', asyncHandler(productController.getBestSellers));
router.get('/products/new-arrivals', asyncHandler(productController.getNewArrivals));
router.get('/products/slug/:slug', asyncHandler(productController.getProductBySlug));
router.get('/products/:id', asyncHandler(productController.getProductById));

router.get('/categories', asyncHandler(categoryController.getCategories));
router.get('/categories/slug/:slug', asyncHandler(categoryController.getCategoryBySlug));

router.post('/orders', optionalAuth, asyncHandler(orderController.placeOrder));
router.get('/orders/my-orders', optionalAuth, asyncHandler(orderController.getMyOrders));
router.get('/orders/number/:orderNumber', optionalAuth, asyncHandler(orderController.getOrderByNumber));
router.put('/orders/:orderNumber/cancel', protect, asyncHandler(orderController.cancelOrder));
// Payment confirmation is staff-only: there is no payment gateway integration yet, so this
// endpoint must never be reachable by the customer/client directly (see verifyPayment).
router.put('/orders/:orderNumber/pay', protect, authorize('admin', 'superadmin'), asyncHandler(orderController.verifyPayment));

router.get('/orders/track/:phone', orderLookupLimiter, asyncHandler(orderController.getOrderByPhone));

router.get('/reviews/product/:productId', asyncHandler(contentController.getProductReviews));
router.post('/reviews', protect, asyncHandler(contentController.createReview));
router.post('/contact', contactLimiter, asyncHandler(contentController.submitContact));
router.post('/subscribe', contactLimiter, asyncHandler(contentController.subscribe));
router.get('/collections', asyncHandler(contentController.getCollections));
router.get('/collections/slug/:slug', asyncHandler(contentController.getCollectionBySlug));
router.get('/blogs', asyncHandler(contentController.getBlogs));
router.get('/blogs/slug/:slug', asyncHandler(contentController.getBlogBySlug));
router.get('/recipes', asyncHandler(contentController.getRecipes));
router.get('/recipes/slug/:slug', asyncHandler(contentController.getRecipeBySlug));
router.get('/settings', asyncHandler(contentController.getSiteSettings));
router.post('/coupons/validate', asyncHandler(contentController.validateCoupon));

router.get('/admin/dashboard', protect, authorize('admin', 'superadmin'), asyncHandler(analyticsController.getDashboardStats));
router.get('/admin/analytics/revenue', protect, authorize('admin', 'superadmin'), asyncHandler(analyticsController.getRevenueReport));
router.get('/admin/analytics/top-products', protect, authorize('admin', 'superadmin'), asyncHandler(analyticsController.getTopProducts));
router.get('/admin/analytics/customers', protect, authorize('admin', 'superadmin'), asyncHandler(analyticsController.getCustomerAnalytics));
router.get('/admin/analytics/order-status', protect, authorize('admin', 'superadmin'), asyncHandler(analyticsController.getOrderStatusAnalytics));
router.get('/admin/analytics/inventory', protect, authorize('admin', 'superadmin'), asyncHandler(analyticsController.getInventoryAlerts));
router.get('/admin/analytics/search', protect, authorize('admin', 'superadmin'), asyncHandler(analyticsController.getSearchAnalytics));

router.get('/admin/products', protect, authorize('admin', 'superadmin'), asyncHandler(productController.adminGetProducts));
router.post('/admin/products', protect, authorize('admin', 'superadmin'), uploadMultiple, processImages({ subDir: 'products' }), asyncHandler(productController.createProduct));
router.put('/admin/products/:id', protect, authorize('admin', 'superadmin'), uploadMultiple, processImages({ subDir: 'products' }), asyncHandler(productController.updateProduct));
router.delete('/admin/products/:id', protect, authorize('admin', 'superadmin'), asyncHandler(productController.deleteProduct));

router.get('/admin/categories', protect, authorize('admin', 'superadmin'), asyncHandler(categoryController.adminGetCategories));
router.post('/admin/categories', protect, authorize('admin', 'superadmin'), uploadSingle, processSingleImage('categories'), asyncHandler(categoryController.createCategory));
router.put('/admin/categories/:id', protect, authorize('admin', 'superadmin'), uploadSingle, processSingleImage('categories'), asyncHandler(categoryController.updateCategory));
router.delete('/admin/categories/:id', protect, authorize('admin', 'superadmin'), asyncHandler(categoryController.deleteCategory));

router.get('/admin/orders', protect, authorize('admin', 'superadmin'), asyncHandler(orderController.adminGetOrders));
router.get('/admin/orders/analytics', protect, authorize('admin', 'superadmin'), asyncHandler(orderController.getOrderAnalytics));
router.put('/admin/orders/:id/status', protect, authorize('admin', 'superadmin'), validate([body('status').isIn(['pending', 'confirmed', 'packed', 'dispatched', 'out-for-delivery', 'delivered', 'cancelled', 'returned']).withMessage('Invalid order status')]), asyncHandler(orderController.updateOrderStatus));
router.put('/admin/orders/bulk-status', protect, authorize('admin', 'superadmin'), validate([body('orderIds').isArray({ min: 1 }).withMessage('orderIds must be a non-empty array'), body('status').isIn(['pending', 'confirmed', 'packed', 'dispatched', 'out-for-delivery', 'delivered', 'cancelled', 'returned']).withMessage('Invalid order status')]), asyncHandler(orderController.bulkUpdateOrderStatus));
router.delete('/admin/orders/:id', protect, authorize('admin', 'superadmin'), asyncHandler(orderController.deleteOrder));

router.get('/admin/users', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.adminGetUsers));
router.post('/admin/users', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.adminCreateUser));
router.put('/admin/users/:id', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.adminUpdateUser));
router.delete('/admin/users/:id', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.adminDeleteUser));
router.get('/admin/coupons', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.adminGetCoupons));
router.post('/admin/coupons', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.createCoupon));
router.put('/admin/coupons/:id', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.updateCoupon));
router.delete('/admin/coupons/:id', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.deleteCoupon));

router.get('/admin/collections', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.adminGetCollections));
router.post('/admin/collections', protect, authorize('admin', 'superadmin'), uploadSingle, processSingleImage('gallery'), asyncHandler(contentController.createCollection));
router.put('/admin/collections/:id', protect, authorize('admin', 'superadmin'), uploadSingle, processSingleImage('gallery'), asyncHandler(contentController.updateCollection));
router.delete('/admin/collections/:id', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.deleteCollection));

router.get('/admin/blogs', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.adminGetBlogs));
router.post('/admin/blogs', protect, authorize('admin', 'superadmin'), uploadSingle, processSingleImage('blogs'), asyncHandler(contentController.createBlog));
router.put('/admin/blogs/:id', protect, authorize('admin', 'superadmin'), uploadSingle, processSingleImage('blogs'), asyncHandler(contentController.updateBlog));
router.delete('/admin/blogs/:id', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.deleteBlog));

router.get('/admin/recipes', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.adminGetRecipes));
router.post('/admin/recipes', protect, authorize('admin', 'superadmin'), uploadSingle, processSingleImage('recipes'), asyncHandler(contentController.createRecipe));
router.put('/admin/recipes/:id', protect, authorize('admin', 'superadmin'), uploadSingle, processSingleImage('recipes'), asyncHandler(contentController.updateRecipe));
router.delete('/admin/recipes/:id', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.deleteRecipe));

router.get('/admin/reviews', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.adminGetReviews));
router.put('/admin/reviews/:id/approve', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.approveReview));
router.delete('/admin/reviews/:id', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.deleteReview));

router.get('/admin/contacts', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.getContacts));
router.put('/admin/contacts/:id/read', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.markContactRead));
router.delete('/admin/contacts/:id', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.deleteContact));

router.get('/admin/subscribers', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.getSubscribers));

router.get('/admin/settings', protect, authorize('admin', 'superadmin'), asyncHandler(contentController.getSiteSettings));
const bannerFields = Array.from({ length: 10 }, (_, i) => ({ name: `bannerImage_${i}`, maxCount: 1 }));
router.put('/admin/settings', protect, authorize('admin', 'superadmin'), upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'favicon', maxCount: 1 }, { name: 'storyImage', maxCount: 1 }, { name: 'heroImage', maxCount: 1 }, { name: 'founderImage', maxCount: 1 }, ...bannerFields]), processImages({ subDir: 'banners', generateThumb: false, config: BANNER_CONFIG }), asyncHandler(contentController.updateSiteSettings));


export default router;
