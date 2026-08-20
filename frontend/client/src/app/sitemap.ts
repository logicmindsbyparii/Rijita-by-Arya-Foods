import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes
  const staticRoutes = [
    { url: "", lastModified: new Date(), changeFrequency: "daily" as const, priority: 1.0 },
    { url: "/about", lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 },
    { url: "/products", lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: "/categories", lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
    { url: "/collections", lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    { url: "/recipes", lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.6 },
    { url: "/blog", lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.6 },
    { url: "/cart", lastModified: new Date(), changeFrequency: "never" as const, priority: 0.4 },
    { url: "/checkout", lastModified: new Date(), changeFrequency: "never" as const, priority: 0.3 },
    { url: "/contact", lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.5 },
  ];

  const entries = staticRoutes.map((route) => ({
    url: `${BASE_URL}${route.url}`,
    lastModified: route.lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Try to fetch dynamic product slugs
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";
    const [productsRes, categoriesRes, blogsRes, recipesRes] = await Promise.allSettled([
      fetch(`${apiBase}/products?limit=100`).then((r) => r.json()),
      fetch(`${apiBase}/categories`).then((r) => r.json()),
      fetch(`${apiBase}/blogs?limit=100`).then((r) => r.json()),
      fetch(`${apiBase}/recipes?limit=100`).then((r) => r.json()),
    ]);

    if (productsRes.status === "fulfilled") {
      const products = productsRes.value?.data?.products || [];
      products.forEach((p: any) => {
        entries.push({
          url: `${BASE_URL}/products/${p.slug}`,
          lastModified: new Date(p.updatedAt || p.createdAt),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        });
      });
    }

    if (categoriesRes.status === "fulfilled") {
      const categories = categoriesRes.value?.data?.categories || [];
      categories.forEach((c: any) => {
        entries.push({
          url: `${BASE_URL}/products?category=${c.slug}`,
          lastModified: new Date(c.updatedAt || c.createdAt),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        });
      });
    }

    if (blogsRes.status === "fulfilled") {
      const blogs = blogsRes.value?.data?.blogs || [];
      blogs.forEach((b: any) => {
        if (b.isPublished) {
          entries.push({
            url: `${BASE_URL}/blog/${b.slug}`,
            lastModified: new Date(b.publishedAt || b.updatedAt),
            changeFrequency: "monthly" as const,
            priority: 0.6,
          });
        }
      });
    }

    if (recipesRes.status === "fulfilled") {
      const recipes = recipesRes.value?.data?.recipes || [];
      recipes.forEach((r: any) => {
        if (r.isPublished) {
          entries.push({
            url: `${BASE_URL}/recipes/${r.slug}`,
            lastModified: new Date(r.updatedAt || r.createdAt),
            changeFrequency: "monthly" as const,
            priority: 0.6,
          });
        }
      });
    }
  } catch {
    // If API is not available, just use static routes
  }

  return entries;
}
