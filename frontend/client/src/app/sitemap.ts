import { MetadataRoute } from "next";
import { fetchServerJson, getServerApiBase } from "@/shared/api";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Generated on request, not at build time. Prerendering this route makes the
// production build depend on the API being awake — on a cold-starting or
// unreachable backend the build blocks here until Next.js kills it, and the
// whole deploy fails over a file that is only read by crawlers.
export const dynamic = "force-dynamic";

// The sitemap degrades gracefully to its static routes, so a slow API must
// never hold the response open — see fetchServerJson for why a bare
// AbortSignal.timeout() was not enough to keep this off the build's critical
// path.
const SITEMAP_FETCH_TIMEOUT_MS = 5000;

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

  // Try to fetch dynamic slugs. Each of these resolves to null rather than
  // throwing when the API is slow or down, so the sitemap still serves its
  // static routes.
  const apiBase = getServerApiBase();
  const get = (path: string) => fetchServerJson<any>(`${apiBase}${path}`, SITEMAP_FETCH_TIMEOUT_MS);

  const [productsRes, categoriesRes, blogsRes, recipesRes] = await Promise.all([
    get("/products?limit=100"),
    get("/categories"),
    get("/blogs?limit=100"),
    get("/recipes?limit=100"),
  ]);

  const products = productsRes?.data?.products || [];
  products.forEach((p: any) => {
    entries.push({
      url: `${BASE_URL}/products/${p.slug}`,
      lastModified: new Date(p.updatedAt || p.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    });
  });

  const categories = categoriesRes?.data?.categories || [];
  categories.forEach((c: any) => {
    entries.push({
      url: `${BASE_URL}/products?category=${c.slug}`,
      lastModified: new Date(c.updatedAt || c.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    });
  });

  const blogs = blogsRes?.data?.blogs || [];
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

  const recipes = recipesRes?.data?.recipes || [];
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

  return entries;
}
