import HeroSection from "@/components/home/HeroSection";
import JainMarqueeTicker from "@/components/home/JainMarqueeTicker";
import ProductShowcase from "@/components/home/ProductShowcase";
import BentoCategories from "@/components/home/BentoCategories";
import JainPuritySection from "@/components/home/JainPuritySection";
import EditorialStory from "@/components/home/EditorialStory";
import TestimonialsSection from "@/components/home/TestimonialsSection";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export const dynamic = 'force-dynamic';

// force-dynamic (below) already renders per request, so per-fetch
// revalidate options would be dead weight — keep fetches simple.
async function fetchServer<T = any>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [featuredData, newArrivalsData, categoriesData, settingsData] = await Promise.all([
    fetchServer("/products/featured"),
    fetchServer("/products/new-arrivals"),
    fetchServer("/categories"),
    fetch(`${API_BASE}/settings`).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);

  const products = featuredData?.data?.products || [];
  const newArrivals = newArrivalsData?.data?.products || [];
  const categories = categoriesData?.data?.categories || [];
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

  // Real, moderator-approved reviews for the wall. The API is per-product, so
  // pull from the products already on this page and take the newest few.
  // No reviews approved yet → TestimonialsSection renders nothing.
  const reviewSources = [...products, ...newArrivals]
    .filter((p: any, i: number, all: any[]) => all.findIndex((q) => q._id === p._id) === i)
    .filter((p: any) => (p.reviewCount ?? 0) > 0)
    .slice(0, 8);

  const reviewResponses = await Promise.all(
    reviewSources.map((p: any) =>
      fetchServer(`/reviews/product/${p._id}?limit=4`).then((r: any) => ({
        productName: p.name as string,
        reviews: r?.data?.reviews ?? [],
      }))
    )
  );

  const homeReviews = reviewResponses
    .flatMap(({ productName, reviews }) =>
      reviews.map((r: any) => ({
        id: r._id,
        name: r.userName,
        rating: r.rating,
        comment: r.comment,
        title: r.title,
        productName,
        createdAt: r.createdAt,
      }))
    )
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 4);

  // Weighted mean of the real per-product ratings — never a stated constant.
  const rated = reviewSources.filter((p: any) => p.averageRating > 0);
  const totalReviews = rated.reduce((n: number, p: any) => n + p.reviewCount, 0);
  const reviewSummary = totalReviews > 0
    ? {
        average: rated.reduce((n: number, p: any) => n + p.averageRating * p.reviewCount, 0) / totalReviews,
        count: totalReviews,
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

        {/* 3. Featured Products — front and center, right after the hero */}
        {products.length > 0 && (
          <ProductShowcase title="Featured 100% Jain" subtitle="Flavors." products={products} />
        )}

        {/* 4. Category Bento Grid — shop by collection */}
        <BentoCategories categories={categories} />

        {/* 5. 100% Jain Purity Guarantee Feature (Zero Onion Zero Garlic) */}
        <JainPuritySection />

        {/* 6. Editorial Brand Story & Heritage */}
        <EditorialStory
          imageUrl={storyImage}
          heading={storyHeading}
          paragraphs={storyParagraphs}
          values={storyValues}
        />

        {/* 7. Customer review wall — real approved reviews, hidden when empty */}
        <TestimonialsSection reviews={homeReviews} summary={reviewSummary} />

        {/* 8. Fresh Arrivals Showcase */}
        {newArrivals.length > 0 && (
          <ProductShowcase title="Freshly Made" subtitle="Arrivals." products={newArrivals} variant="arrivals" />
        )}
      </div>
    </div>
  );
}
