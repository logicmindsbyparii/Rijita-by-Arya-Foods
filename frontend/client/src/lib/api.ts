import { createFetchApi } from "@shared/api";

const fetchApi = createFetchApi("/auth/login");

// ==================== AUTH API ====================
export const authApi = {
  register: (data: { name: string; email: string; phone: string; password: string }) =>
    fetchApi("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    fetchApi("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  refreshToken: (refreshToken: string) =>
    fetchApi("/auth/refresh-token", { method: "POST", body: JSON.stringify({ refreshToken }) }),

  /** Clears the httpOnly refresh cookie server-side — localStorage alone can't. */
  logout: () => fetchApi("/auth/logout", { method: "POST", credentials: "include" }),

  forgotPassword: (email: string) =>
    fetchApi("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),

  resetPassword: (token: string, password: string) =>
    fetchApi("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),

  getProfile: () => fetchApi("/auth/profile"),

  updateProfile: (data: { name?: string; phone?: string }) =>
    fetchApi("/auth/profile", { method: "PUT", body: JSON.stringify(data) }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    fetchApi("/auth/change-password", { method: "PUT", body: JSON.stringify(data) }),

  addAddress: (data: any) =>
    fetchApi("/auth/addresses", { method: "POST", body: JSON.stringify(data) }),

  updateAddress: (addressId: string, data: any) =>
    fetchApi(`/auth/addresses/${addressId}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteAddress: (addressId: string) =>
    fetchApi(`/auth/addresses/${addressId}`, { method: "DELETE" }),

  getWishlist: () => fetchApi("/auth/wishlist"),

  toggleWishlist: (productId: string) =>
    fetchApi(`/auth/wishlist/${productId}`, { method: "POST" }),
};

// ==================== PRODUCT API ====================
export const productApi = {
  getProducts: (params?: { page?: number; limit?: number; search?: string; category?: string; sort?: string; minPrice?: number; maxPrice?: number; tags?: string; featured?: boolean; bestSeller?: boolean; newArrival?: boolean }) =>
    fetchApi("/products", { params: params as any }),

  getProductBySlug: (slug: string) => fetchApi(`/products/slug/${slug}`),

  getProductById: (id: string) => fetchApi(`/products/${id}`),

  getFeatured: () => fetchApi("/products/featured"),

  getBestSellers: () => fetchApi("/products/best-sellers"),

  getNewArrivals: () => fetchApi("/products/new-arrivals"),

  search: (q: string, page?: number) =>
    fetchApi("/products/search", { params: { q, page } as any }),
};

// ==================== CATEGORY API ====================
export const categoryApi = {
  getCategories: () => fetchApi("/categories"),

  getCategoryBySlug: (slug: string) => fetchApi(`/categories/slug/${slug}`),
};

// ==================== ORDER API ====================
export const orderApi = {
  placeOrder: (data: any) =>
    fetchApi("/orders", { method: "POST", body: JSON.stringify(data) }),

  getMyOrders: (params?: { page?: number; status?: string }) =>
    fetchApi("/orders/my-orders", { params: params as any }),

  getOrderByNumber: (orderNumber: string) =>
    fetchApi(`/orders/number/${orderNumber}`),

  cancelOrder: (orderNumber: string) =>
    fetchApi(`/orders/${orderNumber}/cancel`, { method: "PUT" }),

  verifyPayment: (orderNumber: string) =>
    fetchApi(`/orders/${orderNumber}/pay`, { method: "PUT" }),

  trackByPhone: (phone: string) =>
    fetchApi(`/orders/track/${phone}`),
};

// ==================== SHIPPING API (Shiprocket) ====================
export const shippingApi = {
  /** Pincode serviceability + live courier rates for checkout. */
  checkServiceability: (data: {
    deliveryPincode: string;
    items?: Array<{ product: string; variant?: string; sku?: string; quantity: number }>;
    weight?: number;
    cod?: boolean;
    declaredValue?: number;
  }) => fetchApi("/shipping/serviceability", { method: "POST", body: JSON.stringify(data) }),

  /** Live courier tracking for one order. */
  trackShipment: (orderNumber: string) => fetchApi(`/shipping/track/${orderNumber}`),
};

// ==================== CONTENT API ====================
export const contentApi = {
  getBlogs: (params?: { page?: number; category?: string }) =>
    fetchApi("/blogs", { params: params as any }),

  getBlogBySlug: (slug: string) => fetchApi(`/blogs/slug/${slug}`),

  getRecipes: (params?: { page?: number; difficulty?: string }) =>
    fetchApi("/recipes", { params: params as any }),

  getRecipeBySlug: (slug: string) => fetchApi(`/recipes/slug/${slug}`),

  submitContact: (data: any) =>
    fetchApi("/contact", { method: "POST", body: JSON.stringify(data) }),

  subscribe: (email: string) =>
    fetchApi("/subscribers/subscribe", { method: "POST", body: JSON.stringify({ email }) }),

  getCollections: () => fetchApi("/collections"),

  getCollectionBySlug: (slug: string) => fetchApi(`/collections/slug/${slug}`),

  getSiteSettings: () => fetchApi("/settings"),

  validateCoupon: (code: string, subtotal: number) =>
    fetchApi("/coupons/validate", { method: "POST", body: JSON.stringify({ code, subtotal }) }),

  /** Coupons currently valid at checkout — powers the Offers page. */
  getCoupons: () => fetchApi("/coupons"),

  // Reviews
  // The product page renders its own "show more" pagination from the returned
  // list, so fetch the full set (not the server default of 10) — otherwise the
  // tab count and load-more button are silently capped at 10 reviews.
  getProductReviews: (productId: string) =>
    fetchApi(`/reviews/product/${productId}`, { params: { limit: 100 } }),

  createReview: (data: { productId: string; rating: number; title?: string; comment: string }) =>
    fetchApi("/reviews", { method: "POST", body: JSON.stringify(data) })
};
