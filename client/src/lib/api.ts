import { API_BASE, ApiError, FetchOptions, parseResponseBody, extractErrorMessage } from "@shared/api";

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

  let response: Response;
  try {
    response = await fetch(url, { ...fetchOpts, headers });
  } catch {
    // fetch only rejects on network-level failure (server unreachable, DNS,
    // CORS preflight, offline). Surface that as an ApiError so callers can use
    // the same `err.message` path they use for HTTP errors.
    throw new ApiError("Unable to reach the server. Please check your connection.", 0);
  }

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
      try {
        response = await fetch(url, { ...fetchOpts, headers });
      } catch {
        throw new ApiError("Unable to reach the server. Please check your connection.", 0);
      }
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

  const data = await parseResponseBody(response);

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data, response.status), response.status, data);
  }

  return data as T;
}

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
