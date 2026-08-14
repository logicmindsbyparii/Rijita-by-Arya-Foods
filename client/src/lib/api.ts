const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiError";
  }
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const payload = data?.data || data;
    const newAccessToken = payload?.accessToken;
    const newRefreshToken = payload?.refreshToken;
    if (newAccessToken) {
      localStorage.setItem("accessToken", newAccessToken);
      if (newRefreshToken) localStorage.setItem("refreshToken", newRefreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function fetchApi<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOpts } = options;

  let url = `${API_BASE}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let response = await fetch(url, {
    ...fetchOpts,
    headers,
  });

  if (response.status === 401 && typeof window !== "undefined") {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = tryRefreshToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;

    if (refreshed) {
      const newToken = localStorage.getItem("accessToken");
      if (newToken) headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(url, { ...fetchOpts, headers });
    } else {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      const loginPath = "/auth/login";
      if (typeof window !== "undefined" && window.location.pathname !== loginPath && !window.location.pathname.startsWith(loginPath)) {
        window.location.href = loginPath;
      }
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.message || "API Error", response.status, data);
  }

  return data;
}

// ==================== AUTH API ====================
export const authApi = {
  register: (data: { name: string; email: string; phone: string; password: string }) =>
    fetchApi("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    fetchApi("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  refreshToken: (refreshToken: string) =>
    fetchApi("/auth/refresh-token", { method: "POST", body: JSON.stringify({ refreshToken }) }),

  forgotPassword: (email: string) =>
    fetchApi("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),

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
    fetchApi("/subscribe", { method: "POST", body: JSON.stringify({ email }) }),

  getCollections: () => fetchApi("/collections"),

  getCollectionBySlug: (slug: string) => fetchApi(`/collections/slug/${slug}`),

  getSiteSettings: () => fetchApi("/settings"),

  validateCoupon: (code: string, subtotal: number) =>
    fetchApi("/coupons/validate", { method: "POST", body: JSON.stringify({ code, subtotal }) }),

  // Reviews
  getProductReviews: (productId: string) =>
    fetchApi(`/reviews/product/${productId}`),

  createReview: (data: { productId: string; rating: number; title?: string; comment: string }) =>
    fetchApi("/reviews", { method: "POST", body: JSON.stringify(data) })
};
