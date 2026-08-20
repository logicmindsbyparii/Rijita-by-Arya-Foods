"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";import Image from "next/image";
import { ChevronRight, Calendar, User, ArrowLeft, Link as LinkIcon, BookOpen, AlertTriangle, RefreshCw, Facebook, Twitter, MessageCircle, } from "lucide-react";
import { contentApi } from "@/lib/api";
import { formatDate, getImageUrl, handleImageError } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Blog } from "@/types";
import toast from "react-hot-toast";

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["blog", slug],
    queryFn: () => contentApi.getBlogBySlug(slug),
    enabled: !!slug,
  });

  const blog: Blog | undefined = data?.data?.blog || data?.data;

  const { data: allBlogsData } = useQuery({
    queryKey: ["blogs", "related"],
    queryFn: () => contentApi.getBlogs({ page: 1 }),
    enabled: !!blog,
  });

  const allBlogs: Blog[] = allBlogsData?.data?.blogs || allBlogsData?.data || [];
  const relatedPosts = blog
    ? allBlogs.filter((b) => b._id !== blog._id).slice(0, 3)
    : [];

  const handleShare = async (platform?: string) => {
    const url = window.location.href;
    const title = blog?.title || "";
    if (platform === "facebook") {
      window.open(
        `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        "_blank"
      );
    } else if (platform === "twitter") {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
        "_blank"
      );
    } else if (platform === "whatsapp") {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`,
        "_blank"
      );
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      } catch {
        toast.error("Failed to copy link");
      }
    }
  };

  if (isLoading) {
    return <BlogDetailSkeleton />;
  }

  if (isError) {
    const is404 = (error as any)?.status === 404;
    return (
      <div className="min-h-screen pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          {is404 ? (
            <>
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-brand-50 flex items-center justify-center">
                <BookOpen size={44} className="text-brand-500" />
              </div>
              <h1 className="text-2xl font-display font-bold mb-2">Post Not Found</h1>
              <p className="text-muted-foreground mb-8">
                The blog post you are looking for does not exist or may have been removed.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => router.back()} variant="outline" size="lg">
                  Go Back
                </Button>
                <Button onClick={() => router.push("/blog")} size="lg">
                  Browse Blog
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle size={44} className="text-red-500" />
              </div>
              <h1 className="text-2xl font-display font-bold mb-2">Something Went Wrong</h1>
              <p className="text-muted-foreground mb-8">
                {(error as any)?.message || "Failed to load blog post."}
              </p>
              <Button onClick={() => router.refresh()} size="lg">
                <RefreshCw size={18} className="mr-2" />
                Try Again
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <BookOpen size={44} className="text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">Post Not Found</h1>
          <p className="text-muted-foreground mb-8">This blog post could not be found.</p>
          <Button onClick={() => router.push("/blog")} size="lg">Browse Blog</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-muted-foreground mb-6 pt-4"
        >
          <Link href="/" className="hover:text-brand-600 transition-colors">
            Home
          </Link>
          <ChevronRight size={14} />
          <Link href="/blog" className="hover:text-brand-600 transition-colors">
            Blog
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium truncate max-w-[250px]">
            {blog.title}
          </span>
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-600 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Blog
          </Link>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          <motion.div variants={fadeInUp}>
            <div className="aspect-[2/1] rounded-2xl bg-gradient-to-br from-brand-50 via-cream to-amber-50 overflow-hidden relative flex items-center justify-center mb-6">
              {blog.featuredImage ? (
                <Image
                  src={getImageUrl(blog.featuredImage)}
                  alt={blog.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"
                  className="object-cover"
                  onError={handleImageError}
                />
              ) : (
                <span className="text-7xl select-none">📖</span>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-2">
                <Calendar size={14} />
                {blog.publishedAt ? formatDate(blog.publishedAt) : formatDate(blog.createdAt)}
              </span>
              <span className="flex items-center gap-2">
                <User size={14} />
                {blog.author}
              </span>
              {blog.category && (
                <Badge variant="secondary" className="text-xs">
                  {blog.category}
                </Badge>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold leading-tight mb-4">
              {blog.title}
            </h1>

            {blog.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {blog.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-4 py-2 bg-muted text-muted-foreground rounded-full text-xs font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="prose prose-stone max-w-none text-muted-foreground leading-relaxed"
          >
            {blog.content}
          </motion.div>

          <motion.div variants={fadeInUp} className="pt-4 border-t border-border">
            <p className="text-sm font-semibold mb-4">Share this post</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleShare("facebook")}
                className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                aria-label="Share on Facebook"
              >
                <Facebook size={18} />
              </button>
              <button
                onClick={() => handleShare("twitter")}
                className="p-2 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors"
                aria-label="Share on Twitter"
              >
                <Twitter size={18} />
              </button>
              <button
                onClick={() => handleShare("whatsapp")}
                className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                aria-label="Share on WhatsApp"
              >
                <MessageCircle size={18} />
              </button>
              <button
                onClick={() => handleShare()}
                className="p-2 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                aria-label="Copy link"
              >
                <LinkIcon size={18} />
              </button>
            </div>
          </motion.div>

          {relatedPosts.length > 0 && (
            <motion.div variants={fadeInUp} className="pt-8">
              <h2 className="text-2xl font-display font-bold mb-6">Related Posts</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {relatedPosts.map((post) => (
                  <Link
                    key={post._id}
                    href={`/blog/${post.slug}`}
                    className="group p-4 rounded-2xl border border-border bg-white hover:shadow-md hover:border-brand-200 transition-ui duration-300"
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Calendar size={12} />
                      {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
                    </div>
                    <h3 className="text-sm font-semibold group-hover:text-brand-600 transition-colors line-clamp-2 mb-2">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function BlogDetailSkeleton() {
  return (
    <div className="min-h-screen pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 mb-6 pt-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-6">
          <Skeleton className="aspect-[2/1] rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
