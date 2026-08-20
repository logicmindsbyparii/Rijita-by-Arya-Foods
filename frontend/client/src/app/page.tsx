import HeroSection from "@/components/home/HeroSection";
import JainMarqueeTicker from "@/components/home/JainMarqueeTicker";
import ProductShowcase from "@/components/home/ProductShowcase";
import JainPuritySection from "@/components/home/JainPuritySection";
import StoriesRecipesSection from "@/components/home/StoriesRecipesSection";
import EditorialStory from "@/components/home/EditorialStory";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import FeaturedProductSpotlight from "@/components/home/FeaturedProductSpotlight";
import { fetchServerJson, getServerApiBase } from "@/shared/api";

// Server components cannot fetch relative URLs — /api only works through the
// Next.js rewrite in the browser. Resolve to an absolute backend URL here.
const API_BASE = getServerApiBase();

export const dynamic = 'force-dynamic';

// The homepage must always reflect the live catalog. cache: "no-store" is
// required even with force-dynamic below — without it, Next.js serves these
// fetches from its persistent Data Cache (.next/cache/fetch-cache), which can
// keep deleted products/categories/collections visible indefinitely.
async function fetchServer<T = any>(endpoint: string): Promise<T | null> {
  try {
    // Every section falls back to an empty state, so a cold-starting or down
    // API must degrade rather than hang the render until the platform's
    // function timeout kills the whole page.
    const res = await fetch(`${API_BASE}${endpoint}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [featuredData, catalogData, categoriesData, settingsData, blogsData, recipesData] = await Promise.all([
    fetchServer("/products/featured"),
    // Fetch the whole active catalog so the shelf shows every product and the
    // filter tabs carry true per-category counts (not an 8-item subset).
    fetchServer("/products?limit=100"),
    fetchServer("/categories"),
    fetch(`${API_BASE}/settings`, { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
    fetchServer("/blogs?limit=3"),
    fetchServer("/recipes?limit=3"),
  ]);

  const flaggedFeatured = featuredData?.data?.products || [];
  const catalog = catalogData?.data?.products || [];

  // The featured shelf must always reflect real products. When no product has
  // been flagged isFeatured in the admin yet, fall back to the full live
  // catalog (newest first) so the homepage shows every stocked product and the
  // category tabs stay accurate. The "coming soon" state only appears when the
  // catalog is genuinely empty (0 products).
  const products = flaggedFeatured.length > 0 ? flaggedFeatured : catalog;

  const categories = categoriesData?.data?.categories || [];
  const blogs = blogsData?.data?.blogs || [];
  const recipes = recipesData?.data?.recipes || [];
  const settings = settingsData?.data?.settings || {};
  const banners = settings?.banners || [];
  const storyImage = settings?.storyImage || "";

  const story = settings?.story || {};
  const storyHeading = story?.heading || "Crafted with Devotion.";
  const storyText = story?.text || "";
  const storyParagraphs = storyText
    ? storyText.split(/\n\s*\n/).filter(Boolean)
    : [
        "Arya Foods (RIJITA) began with a simple belief — true taste comes from the finest ingredients and recipes passed down through halwai generations. From our kitchen in Gujarat, we make namkeen the way it was always meant to be made: in small batches, with patience.",
        "Every single batch follows strict 100% Jain principles — zero onion, zero garlic, zero artificial preservatives. Just pure, unadulterated flavor, packed fresh while the crunch is at its best.",
      ];

  const latestReviewsData = await fetchServer("/reviews/latest?limit=6");
  const homeReviews = latestReviewsData?.data?.reviews?.map((r: any) => ({
    id: r._id,
    name: r.userName || r.name,
    rating: r.rating,
    comment: r.comment,
    title: r.title,
    productName: r.productName,
    createdAt: r.createdAt,
  })) || [];

  // Summary comes from the admin-approved reviews actually shown, not from
  // product rating fields (which may be zero until customers review each SKU).
  const reviewSummary = homeReviews.length > 0
    ? {
        average: homeReviews.reduce((n: number, r: any) => n + r.rating, 0) / homeReviews.length,
        count: homeReviews.length,
      }
    : undefined;

  const storyValues = settings?.about?.values && settings.about.values.length > 0
    ? settings.about.values.slice(0, 4)
    : [
        { title: "100% Jain Guarantee", description: "Strictly Onion-Free & Garlic-Free." },
        { title: "Handcrafted Halwai", description: "Made in small artisanal batches." },
        { title: "Sendha Namak & Real Hing", description: "Sattvik spices, whole and ground fresh." },
        { title: "Pure Groundnut Oil", description: "Crisp frying with zero palm oil." },
      ];

  return (
    <div className="relative min-h-screen bg-paper selection:bg-gold-500/30 selection:text-ink">
      {/* Skip-to-content is provided globally in Header; LayoutWrapper renders
          the single <main id="main-content"> wrapper around this page. */}

      {/* 1. Product-Centric Hero — authentic namkeen stage + featured product */}
      <HeroSection banners={banners} products={products} categories={categories} />

      <div>
        {/* 2. Infinite Marquee Brand Promises Ticker */}
        <JainMarqueeTicker />

        {/* 3. Product Centric Spotlight — Focuses on a randomly selected featured product */}
        {products.length > 0 && (
          <FeaturedProductSpotlight product={products[Math.floor(Math.random() * products.length)]} />
        )}

        {/* 4. Featured Products Collection — always visible; empty state handled inside */}
        <ProductShowcase title="Featured 100% Jain" subtitle="Flavors." products={products} />

        {/* 5. 100% Jain Purity Guarantee Feature (Zero Onion Zero Garlic) */}
        <JainPuritySection />

        {/* 5.5 Stories & Recipes — journal preview, hidden when empty */}
        {(blogs.length > 0 || recipes.length > 0) && (
          <StoriesRecipesSection blogs={blogs} recipes={recipes} />
        )}

        {/* 6. Editorial Brand Story & Heritage */}
        <EditorialStory
          imageUrl={storyImage}
          heading={storyHeading}
          paragraphs={storyParagraphs}
          values={storyValues}
        />

        {/* 7. Customer review wall — real approved reviews, hidden when empty */}
        <TestimonialsSection reviews={homeReviews} summary={reviewSummary} />
      </div>
    </div>
  );
}
