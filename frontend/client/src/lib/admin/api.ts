import { createFetchApi } from "@shared/api";

const fetchApi = createFetchApi("/admin/login");

// ==================== AUTH API ====================
export const authApi = {
  login: (data: { email: string; password: string }) =>
    fetchApi("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  refreshToken: (refreshToken: string) =>
    fetchApi("/auth/refresh-token", { method: "POST", body: JSON.stringify({ refreshToken }) }),
};

// ==================== PRODUCT API ====================
export const productApi = {
  adminGetProducts: (params?: any) =>
    fetchApi("/admin/products", { params }),

  createProduct: (data: FormData) =>
    fetchApi("/admin/products", { method: "POST", body: data }),

  updateProduct: (id: string, data: FormData) =>
    fetchApi(`/admin/products/${id}`, { method: "PUT", body: data }),

  deleteProduct: (id: string) =>
    fetchApi(`/admin/products/${id}`, { method: "DELETE" }),
};

// ==================== CATEGORY API ====================
export const categoryApi = {
  getCategories: () => fetchApi("/categories"),

  adminGetCategories: () => fetchApi("/admin/categories"),

  createCategory: (data: FormData) =>
    fetchApi("/admin/categories", { method: "POST", body: data }),

  updateCategory: (id: string, data: FormData) =>
    fetchApi(`/admin/categories/${id}`, { method: "PUT", body: data }),

  deleteCategory: (id: string) =>
    fetchApi(`/admin/categories/${id}`, { method: "DELETE" }),
};

// ==================== ORDER API ====================
export const orderApi = {
  adminGetOrders: (params?: any) =>
    fetchApi("/admin/orders", { params }),

  updateOrderStatus: (id: string, data: { status: string; note?: string }) =>
    fetchApi(`/admin/orders/${id}/status`, { method: "PUT", body: JSON.stringify(data) }),

  bulkUpdateStatus: (data: { orderIds: string[]; status: string; note?: string }) =>
    fetchApi("/admin/orders/bulk-status", { method: "PUT", body: JSON.stringify(data) }),

  getOrderAnalytics: () => fetchApi("/admin/orders/analytics"),

  deleteOrder: (id: string) =>
    fetchApi(`/admin/orders/${id}`, { method: "DELETE" }),

  verifyPayment: (orderNumber: string) =>
    fetchApi(`/orders/${orderNumber}/pay`, { method: "PUT" }),
};

// ==================== SHIPPING API (Shiprocket) ====================
export const shippingApi = {
  getStatus: () => fetchApi("/admin/shipping/status"),

  getPickupLocations: () => fetchApi("/admin/shipping/pickup-locations"),

  /** Courier rates for one order's destination — powers the AWB courier picker. */
  getCourierOptions: (orderId: string) =>
    fetchApi(`/admin/orders/${orderId}/shiprocket/couriers`),

  createShipment: (
    orderId: string,
    data?: {
      pickupLocation?: string;
      length?: number;
      breadth?: number;
      height?: number;
      weight?: number;
      courierId?: string;
      autoAssignAwb?: boolean;
    }
  ) =>
    fetchApi(`/admin/orders/${orderId}/shiprocket`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    }),

  assignAwb: (orderId: string, courierId?: string) =>
    fetchApi(`/admin/orders/${orderId}/shiprocket/awb`, {
      method: "POST",
      body: JSON.stringify({ courierId }),
    }),

  schedulePickup: (orderId: string) =>
    fetchApi(`/admin/orders/${orderId}/shiprocket/pickup`, { method: "POST" }),

  generateLabel: (orderId: string) =>
    fetchApi(`/admin/orders/${orderId}/shiprocket/label`, { method: "POST" }),

  generateInvoice: (orderId: string) =>
    fetchApi(`/admin/orders/${orderId}/shiprocket/invoice`, { method: "POST" }),

  generateManifest: (orderId: string) =>
    fetchApi(`/admin/orders/${orderId}/shiprocket/manifest`, { method: "POST" }),

  refreshTracking: (orderId: string) =>
    fetchApi(`/admin/orders/${orderId}/shiprocket/track`),

  cancelShipment: (orderId: string, data?: { cancelOrder?: boolean; note?: string }) =>
    fetchApi(`/admin/orders/${orderId}/shiprocket/cancel`, {
      method: "POST",
      body: JSON.stringify(data || { cancelOrder: true }),
    }),
};

// ==================== ADMIN API ====================
export const adminApi = {
  getDashboard: () => fetchApi("/admin/dashboard"),

  getOrders: (params?: any) => fetchApi("/admin/orders", { params }),

  getRevenueReport: (params?: { period?: string; fromDate?: string; toDate?: string }) =>
    fetchApi("/admin/analytics/revenue", { params: params as any }),

  getTopProducts: (limit?: number) =>
    fetchApi("/admin/analytics/top-products", { params: { limit } as any }),

  getCustomerAnalytics: () => fetchApi("/admin/analytics/customers"),

  getOrderStatusAnalytics: () => fetchApi("/admin/analytics/order-status"),

  getInventoryAlerts: () => fetchApi("/admin/analytics/inventory"),

  getSearchAnalytics: () => fetchApi("/admin/analytics/search"),

  // Users (Admin) - Manage all users including admins
  getUsers: (params?: any) => fetchApi("/admin/users", { params }),
  createUser: (data: { name: string; email: string; phone: string; password: string; role: string; isActive?: boolean }) =>
    fetchApi("/admin/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: string, data: { name?: string; email?: string; phone?: string; password?: string; role?: string; isActive?: boolean }) =>
    fetchApi(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    fetchApi(`/admin/users/${id}`, { method: "DELETE" }),

  // Coupons
  getCoupons: (params?: any) => fetchApi("/admin/coupons", { params }),
  createCoupon: (data: any) => fetchApi("/admin/coupons", { method: "POST", body: JSON.stringify(data) }),
  updateCoupon: (id: string, data: any) => fetchApi(`/admin/coupons/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCoupon: (id: string) => fetchApi(`/admin/coupons/${id}`, { method: "DELETE" }),

  // Collections
  getCollections: () => fetchApi("/admin/collections"),
  createCollection: (data: FormData) => fetchApi("/admin/collections", { method: "POST", body: data }),
  updateCollection: (id: string, data: FormData) => fetchApi(`/admin/collections/${id}`, { method: "PUT", body: data }),
  deleteCollection: (id: string) => fetchApi(`/admin/collections/${id}`, { method: "DELETE" }),

  // Blogs
  getBlogs: (params?: any) => fetchApi("/admin/blogs", { params }),
  createBlog: (data: FormData) => fetchApi("/admin/blogs", { method: "POST", body: data }),
  updateBlog: (id: string, data: FormData) => fetchApi(`/admin/blogs/${id}`, { method: "PUT", body: data }),
  deleteBlog: (id: string) => fetchApi(`/admin/blogs/${id}`, { method: "DELETE" }),

  // Recipes
  getRecipes: (params?: any) => fetchApi("/admin/recipes", { params }),
  createRecipe: (data: FormData) => fetchApi("/admin/recipes", { method: "POST", body: data }),
  updateRecipe: (id: string, data: FormData) => fetchApi(`/admin/recipes/${id}`, { method: "PUT", body: data }),
  deleteRecipe: (id: string) => fetchApi(`/admin/recipes/${id}`, { method: "DELETE" }),

  // Reviews
  getReviews: (params?: any) => fetchApi("/admin/reviews", { params }),
  approveReview: (id: string) => fetchApi(`/admin/reviews/${id}/approve`, { method: "PUT" }),
  deleteReview: (id: string) => fetchApi(`/admin/reviews/${id}`, { method: "DELETE" }),

  // Contacts
  getContacts: (params?: any) => fetchApi("/admin/contacts", { params }),
  markContactRead: (id: string) => fetchApi(`/admin/contacts/${id}/read`, { method: "PUT" }),
  deleteContact: (id: string) => fetchApi(`/admin/contacts/${id}`, { method: "DELETE" }),

  // Subscribers
  getSubscribers: (params?: any) => fetchApi("/admin/subscribers", { params }),

  // Settings
  getSettings: () => fetchApi("/admin/settings"),
  updateSettings: (data: FormData) => fetchApi("/admin/settings", { method: "PUT", body: data }),
};
