"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Calendar,
  User,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Mail,
  Send,
} from "lucide-react";
import { contentApi } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Blog } from "@/types";
import toast from "react-hot-toast";
import { handleImageError, getImageUrl } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

function generatePageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

export default function BlogPage() {
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  // Scroll window parallax for images
  const yImage = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  const queryParams = useMemo(
    () => ({
      page,
      ...(activeCategory && { category: activeCategory }),
    }),
    [page, activeCategory]
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["blogs", queryParams],
    queryFn: () => contentApi.getBlogs(queryParams),
  });

  const blogs: Blog[] = useMemo(() => {
    return data?.data?.blogs || data?.data || [];
  }, [data]);
  const pagination = data?.pagination;

  const categories = useMemo(() => {
    const cats = new Set<string>();
    blogs.forEach((b) => {
      if (b.category) cats.add(b.category);
    });
    return Array.from(cats);
  }, [blogs]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSubscribing(true);
    try {
      await contentApi.subscribe(email);
      toast.success("Subscribed successfully. Stay tuned for updates.");
      setEmail("");
    } catch {
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setPage(1);
  };

  return (
    <div ref={containerRef} className="min-h-screen pt-36 sm:pt-40 lg:pt-48 pb-32 relative overflow-hidden bg-paper text-ink">
      {/* Background Textures and Blurs */}
      <div className="absolute inset-0 bg-[radial-gradient(#1b5e2008_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gold-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-brand-500/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Editorial Noise Background */}
      <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="max-w-4xl mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-3 px-4 py-2 border border-brand-500/20 rounded-full bg-brand-500/5 backdrop-blur-md mb-8">
              <BookOpen size={14} className="text-brand-600 animate-pulse" />
              <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">
                The Heritage Journal
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-black text-brand-950 tracking-[-0.02em] leading-[1.06] sm:leading-[1.02] mb-6">
              Stories &amp; <span className="text-gold-600 font-serif italic font-medium block mt-2">Halwai Chronicles.</span>
            </h1>
            <p className="text-ink-2 max-w-2xl text-lg sm:text-xl font-medium leading-relaxed [text-wrap:pretty]">
              Dive deep into the traditions, recipes, and secret spices that define the authentic tastes of Surat.
            </p>
          </motion.div>
        </div>

        {/* Category Filters - Segmented Glass Control */}
        {categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mb-12 sm:mb-16 flex"
          >
            <div className="bg-white/80 border border-white/50 backdrop-blur-xl p-1.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-1 flex-wrap">
              <button
                onClick={() => handleCategoryChange("")}
                className={cn(
                  "px-6 py-2.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest transition-all duration-300 focus-ring",
                  !activeCategory
                    ? "bg-brand-700 text-white shadow-[0_8px_20px_rgba(20,82,24,0.15)]"
                    : "text-ink-2 hover:bg-brand-50/50 hover:text-brand-700"
                )}
              >
                All Stories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={cn(
                    "px-6 py-2.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest transition-all duration-300 focus-ring",
                    activeCategory === cat
                      ? "bg-brand-700 text-white shadow-[0_8px_20px_rgba(20,82,24,0.15)]"
                      : "text-ink-2 hover:bg-brand-50/50 hover:text-brand-700"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-4 bg-white/40 border border-white/20 p-6 rounded-[2rem] shadow-sm">
                <Skeleton className="aspect-[16/10] rounded-[1.5rem]" />
                <div className="space-y-3 pt-2">
                  <Skeleton className="h-6 w-1/4" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="text-center py-24 bg-white/40 border border-white/20 rounded-[2rem] max-w-2xl mx-auto shadow-sm p-8">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
              <BookOpen size={28} className="text-red-500" />
            </div>
            <h3 className="text-2xl font-display font-black mb-2 text-ink">Failed to load articles</h3>
            <p className="text-ink-2 mb-8 max-w-sm mx-auto">
              {(error as any)?.message || "Something went wrong"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-brand-700 text-white rounded-full font-black text-sm uppercase tracking-widest hover:bg-brand-800 transition-all shadow-[0_8px_20px_rgba(20,82,24,0.15)] active:scale-[0.98]"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && blogs.length === 0 && (
          <div className="text-center py-24 bg-white/40 border border-white/20 rounded-[2rem] max-w-2xl mx-auto shadow-sm p-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white flex items-center justify-center border border-brand-100 shadow-sm">
              <BookOpen size={32} className="text-brand-700" />
            </div>
            <h3 className="text-2xl font-display font-black mb-2 text-ink">No articles found</h3>
            <p className="text-ink-2 mb-8 max-w-md mx-auto">
              {activeCategory
                ? `No posts available in "${activeCategory}" yet. Try another filter category.`
                : "No journal posts available yet. Check back soon!"}
            </p>
            {activeCategory && (
              <button
                onClick={() => handleCategoryChange("")}
                className="px-8 py-4 bg-brand-700 text-white rounded-full font-black text-sm uppercase tracking-widest hover:bg-brand-800 transition-all shadow-[0_8px_20px_rgba(20,82,24,0.15)] active:scale-[0.98]"
              >
                View All Posts
              </button>
            )}
          </div>
        )}

        {/* Blog Grid */}
        {!isLoading && !isError && blogs.length > 0 && (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {blogs.map((blog) => {
                const hasImage = !!blog.featuredImage;

                return (
                  <motion.div key={blog._id} variants={cardVariants} className="h-full">
                    <Link
                      href={`/blog/${blog.slug}`}
                      className="group block h-full rounded-[2rem] border border-white/60 bg-white/70 backdrop-blur-xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-brand-200 transition-all duration-500 overflow-hidden flex flex-col relative"
                    >
                      {/* Ambient Glow Backplate on Hover */}
                      <div className="absolute inset-0 bg-brand-500/5 rounded-full blur-3xl pointer-events-none transition-opacity opacity-0 group-hover:opacity-100 duration-700" />

                      {/* Featured Image Area */}
                      <div className="aspect-[16/10] bg-brand-50 overflow-hidden relative border-b border-white/50">
                        {hasImage ? (
                          <div className="absolute inset-0 overflow-hidden">
                            <motion.div style={{ y: yImage }} className="absolute inset-0 scale-[1.3] pointer-events-none">
                              <Image
                                src={getImageUrl(blog.featuredImage!)}
                                alt={blog.title}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                className="object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000 ease-out"
                                onError={handleImageError}
                              />
                            </motion.div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-50 to-gold-50">
                            <span className="font-serif italic text-3xl text-gold-600/70 select-none transition-transform duration-500 group-hover:scale-110">
                              Journal
                            </span>
                          </div>
                        )}
                        {/* Dark overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        
                        {/* Category badge */}
                        {blog.category && (
                          <div className="absolute top-4 left-4 z-10">
                            <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm bg-white/90 backdrop-blur-md inline-block text-brand-700">
                              {blog.category}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-6 sm:p-8 flex flex-col flex-grow relative z-10">
                        <div className="flex items-center gap-4 text-[10px] font-bold text-ink-3 uppercase tracking-wider mb-4">
                          <span className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-gold-500" />
                            {blog.publishedAt ? formatDate(blog.publishedAt) : formatDate(blog.createdAt)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <User size={13} />
                            {blog.author}
                          </span>
                        </div>

                        <h3 className="text-xl sm:text-2xl font-display font-black text-brand-950 mb-2 group-hover:text-brand-700 transition-colors duration-300 line-clamp-2 leading-snug">
                          {blog.title}
                        </h3>

                        {blog.excerpt && (
                          <p className="text-sm text-ink-2 font-medium leading-relaxed line-clamp-2 mb-6">
                            {blog.excerpt}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mb-5 mt-auto">
                          {blog.tags?.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-white/60 border border-white/80 text-ink-3 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <span className="inline-flex items-center gap-2 text-brand-700 font-extrabold text-[11px] uppercase tracking-[0.2em]">
                          Read story
                          <ArrowRight size={13} className="group-hover:translate-x-1.5 transition-transform duration-300" />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-16">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="w-10 h-10 rounded-full border border-white/60 bg-white/50 backdrop-blur-sm flex items-center justify-center hover:bg-white hover:text-brand-700 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={18} />
                </button>
                {generatePageNumbers(page, pagination.totalPages).map((p, i) =>
                  p === "..." ? (
                    <span key={`e${i}`} className="px-2 text-ink-3">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "min-w-[40px] h-10 px-3 rounded-full text-sm font-semibold transition-all duration-300 focus-ring shadow-sm",
                        page === p
                          ? "bg-brand-700 text-white shadow-[0_8px_20px_rgba(20,82,24,0.15)]"
                          : "border border-white/60 bg-white/50 backdrop-blur-sm hover:bg-white hover:text-brand-700"
                      )}
                      aria-label={`Page ${p}`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="w-10 h-10 rounded-full border border-white/60 bg-white/50 backdrop-blur-sm flex items-center justify-center hover:bg-white hover:text-brand-700 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
                  aria-label="Next page"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}

        {/* Newsletter Bento Subscription Box */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="mt-24 rounded-[2rem] border border-white/60 bg-white/70 backdrop-blur-xl p-10 md:p-16 text-center relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
        >
          <div className="absolute top-0 right-0 w-72 h-72 bg-gold-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-brand-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
          <div className="relative z-10">
            <div className="w-14 h-14 bg-brand-50 text-brand-700 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-100 shadow-sm">
              <Mail size={24} />
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-black text-brand-950 mb-3 tracking-tight leading-none">
              Recipes from our <span className="font-serif italic font-medium text-gold-600">halwai</span> kitchen
            </h2>
            <p className="text-ink-2 mb-8 max-w-lg mx-auto text-base font-medium leading-relaxed">
              Subscribe to stay updated with fresh journal articles, traditional recipes, and batch notifications.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                aria-label="Email address for newsletter"
                className="flex-1 h-14 bg-white/50 border border-white/80 rounded-full px-6 text-base placeholder:text-ink-3 focus:outline-none focus:border-brand-700 focus:bg-white transition-all shadow-sm"
              />
              <button
                type="submit"
                disabled={subscribing}
                className="h-14 px-8 rounded-full bg-brand-700 hover:bg-brand-800 text-white font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-brand-900/10 flex items-center justify-center gap-2 shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {subscribing ? (
                  "Joining..."
                ) : (
                  <>
                    Join List
                    <Send size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
