"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
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

const blogEmojis = ["📖", "🍳", "🥜", "🌶️", "🎉", "🧆", "📝", "🏆"];

export default function BlogPage() {
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

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
      toast.success("Subscribed successfully! Stay tuned for updates.");
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
    <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-100 rounded-full text-brand-700 text-sm font-medium mb-4">
            <BookOpen size={16} />
            Our Blog
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Stories & <span className="text-brand-600">Recipes</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg">
            Discover stories, insights, and recipes from the world of traditional Indian food.
          </p>
        </motion.div>

        {categories.length > 0 && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2 mb-8"
          >
            <button
              onClick={() => handleCategoryChange("")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-ui",
                !activeCategory
                  ? "bg-brand-500 text-white shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-ui",
                  activeCategory === cat
                    ? "bg-brand-500 text-white shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {cat}
              </button>
            ))}
          </motion.div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[16/9] rounded-2xl" />
                <div className="space-y-2 p-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <BookOpen size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Failed to load blog posts</h3>
            <p className="text-muted-foreground mb-4">
              {(error as any)?.message || "Something went wrong"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {!isLoading && !isError && blogs.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <BookOpen size={36} className="text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No blog posts found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {activeCategory
                ? `No posts in "${activeCategory}" category. Check back later or browse all posts.`
                : "No blog posts available yet. Check back soon!"}
            </p>
            {activeCategory && (
              <button
                onClick={() => handleCategoryChange("")}
                className="px-6 py-2 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-colors"
              >
                View All Posts
              </button>
            )}
          </div>
        )}

        {!isLoading && !isError && blogs.length > 0 && (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {blogs.map((blog, idx) => {
                const hasImage = !!blog.featuredImage;
                const emoji = blogEmojis[idx % blogEmojis.length];

                return (
                  <motion.div key={blog._id} variants={cardVariants}>
                    <Link
                      href={`/blog/${blog.slug}`}
                      className="group block rounded-2xl border border-border bg-white hover:shadow-xl transition-ui duration-300 overflow-hidden"
                    >
                      {/* Featured Image Area */}
                      <div className="aspect-[16/9] bg-gradient-to-br from-brand-50 to-amber-50 overflow-hidden relative">
                        {hasImage ? (
                          <Image
                            src={getImageUrl(blog.featuredImage!)}
                            alt={blog.title}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={handleImageError}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-5xl select-none transition-transform duration-500 group-hover:scale-110">
                              {emoji}
                            </span>
                          </div>
                        )}
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        {/* Category badge */}
                        {blog.category && (
                          <div className="absolute top-4 left-4">
                            <span className="px-2 py-2 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-bold text-brand-700 uppercase tracking-wider shadow-sm">
                              {blog.category}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                          <span className="flex items-center gap-2">
                            <Calendar size={12} />
                            {blog.publishedAt ? formatDate(blog.publishedAt) : formatDate(blog.createdAt)}
                          </span>
                          <span className="flex items-center gap-2">
                            <User size={12} />
                            {blog.author}
                          </span>
                        </div>

                        <h3 className="text-lg font-display font-semibold mb-2 group-hover:text-brand-600 transition-colors line-clamp-2">
                          {blog.title}
                        </h3>

                        {blog.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                            {blog.excerpt}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                          {blog.tags?.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-2 bg-muted text-muted-foreground rounded-full text-xs font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <span className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 group-hover:gap-4 transition-[gap]">
                          Read More
                          <ArrowRight size={14} />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-xl border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={18} />
                </button>
                {generatePageNumbers(page, pagination.totalPages).map((p, i) =>
                  p === "..." ? (
                    <span key={`e${i}`} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "min-w-[40px] h-10 rounded-xl text-sm font-medium transition-ui",
                        page === p
                          ? "bg-brand-500 text-white shadow-md"
                          : "border hover:bg-muted"
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
                  className="p-2 rounded-xl border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="mt-16 rounded-2xl bg-gradient-to-r from-brand-500 via-brand-600 to-spice-gold p-8 md:p-12 text-white text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <Mail size={36} className="mx-auto mb-4 opacity-80" />
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">Stay Inspired</h2>
            <p className="text-white/80 mb-6 max-w-lg mx-auto">
              Subscribe to our newsletter for the latest recipes, blog posts, and exclusive offers.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                aria-label="Email for newsletter"
                className="flex-1 h-12 bg-white/15 border-white/25 text-white placeholder:text-white/60 focus-visible:ring-white/50"
              />
              <Button
                type="submit"
                disabled={subscribing}
                size="lg"
                className="bg-white text-brand-600 hover:bg-white/90 h-12"
              >
                {subscribing ? (
                  "Subscribing..."
                ) : (
                  <>
                    Subscribe
                    <Send size={16} className="ml-2" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
