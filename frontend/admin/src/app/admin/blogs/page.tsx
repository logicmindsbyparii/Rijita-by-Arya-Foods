/* Hallmark · macrostructure: Query (list) · genre: modern-minimal
 * theme: Cobalt (admin variant) · accent: cool-indigo
 * Pre-emit critique: P5 H5 E5 S5 R5 V5
 */

"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Loader2,
  User,
  Calendar,
  Image as ImageIcon,
  Tag,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Globe,
  BookOpen,
  BarChart3,
  Clock,
  CheckCircle2,
  PenLine,
  Info,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Blog } from "@/types";

interface BlogForm {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: string;
  category: string;
  tags: string;
  metaTitle: string;
  metaDescription: string;
  isPublished: boolean;
}

const defaultForm: BlogForm = {
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  author: "",
  category: "",
  tags: "",
  metaTitle: "",
  metaDescription: "",
  isPublished: false,
};

export default function AdminBlogs() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Blog | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchBlogs = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 9 };
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await adminApi.getBlogs(params);
      const data = res.data || res;
      setBlogs(data.blogs || []);
      setTotalPages(data.totalPages || res.pagination?.totalPages || 1);
      setTotal(data.total || res.pagination?.total || 0);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load blogs");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  const handleDelete = async (id: string) => {
    // Deleting was a single unguarded click here, unlike every other admin list
    // (products, users, categories, coupons, collections, contacts, orders all
    // confirm first). The server hard-deletes with no soft-delete or undo, so a
    // misclick permanently destroyed an authored post.
    if (!window.confirm("Delete this blog post permanently? This cannot be undone.")) return;
    try {
      setDeleting(id);
      await adminApi.deleteBlog(id);
      toast.success("Blog deleted");
      fetchBlogs();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center">
              <FileText className="h-4 w-4 text-sky-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-[var(--color-ink)]">Blogs</h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-2 ml-10">
            {total > 0 ? `${total} post${total !== 1 ? "s" : ""} total` : "Manage blog posts and articles"}
          </p>
        </div>
        <Button onClick={() => { setEditItem(null); setShowModal(true); }} className="shrink-0 gap-2">
          <Plus className="h-4 w-4" /> New Post
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Posts", value: total, icon: FileText, accent: "text-sky-600" },
          { label: "Published", value: blogs.filter(b => b.isPublished).length, icon: CheckCircle2, accent: "text-emerald-600" },
          { label: "Drafts", value: blogs.filter(b => !b.isPublished).length, icon: Clock, accent: "text-amber-600" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-2xl border border-[var(--color-rule)] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-[0.12em]">{stat.label}</span>
                <Icon className={cn("h-4 w-4", stat.accent)} />
              </div>
              <p className="text-xl font-bold font-display text-[var(--color-ink)] tabular-nums">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 bg-[var(--color-surface-2)] p-2 rounded-xl">
          {[
            { key: "all", label: "All" },
            { key: "published", label: "Published" },
            { key: "draft", label: "Drafts" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setPage(1); }}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-medium transition-all",
                statusFilter === tab.key
                  ? "bg-white text-[var(--color-ink)] shadow-sm"
                  : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by title or author..."
            className="flex h-12 w-full rounded-xl border-2 border-[var(--color-rule)] bg-white px-4 pl-8 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] transition-all focus-visible:outline-none focus-visible:border-[var(--color-accent)] focus-visible:shadow-[0_0_0_3px_var(--color-focus)]"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="h-24 w-24 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText size={40} className="mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-2">No blog posts yet</h3>
            <p className="text-muted-foreground mb-4">
              {search ? "Try a different search" : "Create your first blog post to share with your audience"}
            </p>
            {!search && (
              <Button onClick={() => { setEditItem(null); setShowModal(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Create Blog Post
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Blog Cards */}
          <div className="space-y-4">
            {blogs.map((blog, i) => (
              <motion.div
                key={blog._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="hover:shadow-md transition-all group">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-brand-50 to-amber-50 overflow-hidden shrink-0 hidden sm:block border border-border">
                        {blog.featuredImage ? (
                          <Image src={blog.featuredImage} alt="" width={96} height={96} className="w-full h-full object-cover" unoptimized />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <BookOpen size={28} className="text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate group-hover:text-brand-600 transition-colors">
                              {blog.title}
                            </h3>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-2">
                                <User size={12} /> {blog.author || "Anonymous"}
                              </span>
                              <span className="flex items-center gap-2">
                                <Calendar size={12} /> {formatDate(blog.createdAt)}
                              </span>
                              {blog.category && (
                                <span className="flex items-center gap-2">
                                  <Tag size={12} /> {blog.category}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant={blog.isPublished ? "success" : "secondary"}
                              className={cn(
                                "text-[10px] gap-2",
                                blog.isPublished ? "" : "bg-amber-100 text-amber-700"
                              )}
                            >
                              {blog.isPublished ? (
                                <><Eye className="h-4 w-4" /> Published</>
                              ) : (
                                <><EyeOff className="h-4 w-4" /> Draft</>
                              )}
                            </Badge>
                          </div>
                        </div>
                        {blog.excerpt && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {blog.excerpt}
                          </p>
                        )}
                        {blog.tags && blog.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {blog.tags.slice(0, 4).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0 bg-muted text-[10px] rounded-md text-muted-foreground"
                              >
                                #{tag}
                              </span>
                            ))}
                            {blog.tags.length > 4 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{blog.tags.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setEditItem(blog); setShowModal(true); }}
                            className="gap-2 text-xs"
                          >
                            <Edit3 className="h-4 w-4" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(blog._id)}
                            disabled={deleting === blog._id}
                            className="gap-2 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                          >
                            {deleting === blog._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Delete
                          </Button>
                          {blog.publishedAt && (
                            <span className="ml-auto text-[10px] text-muted-foreground">
                              Published {formatDate(blog.publishedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="gap-2"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Blog Modal */}
      <AnimatePresence>
        {showModal && (
          <BlogModal
            editItem={editItem}
            onClose={() => setShowModal(false)}
            onSaved={() => {
              setShowModal(false);
              fetchBlogs();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function BlogModal({
  editItem,
  onClose,
  onSaved,
}: {
  editItem: Blog | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<BlogForm>(
    editItem
      ? {
          title: editItem.title || "",
          slug: editItem.slug || "",
          content: editItem.content || "",
          excerpt: editItem.excerpt || "",
          author: editItem.author || "",
          category: editItem.category || "",
          tags: (editItem.tags as string[])?.join(", ") || "",
          metaTitle: editItem.metaTitle || "",
          metaDescription: editItem.metaDescription || "",
          isPublished: editItem.isPublished ?? false,
        }
      : defaultForm
  );
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

  const handleTitleChange = (title: string) => {
    setForm((f) => ({
      ...f,
      title,
      slug: editItem ? f.slug : generateSlug(title),
    }));
  };

  const handleSlugEdit = (slug: string) => {
    setForm((f) => ({ ...f, slug: generateSlug(slug) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) {
      toast.error("Title and content are required");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("slug", form.slug || generateSlug(form.title));
      fd.append("content", form.content);
      fd.append("excerpt", form.excerpt);
      fd.append("author", form.author);
      fd.append("category", form.category);
      fd.append(
        "tags",
        JSON.stringify(
          form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        )
      );
      fd.append("metaTitle", form.metaTitle);
      fd.append("metaDescription", form.metaDescription);
      fd.append("isPublished", String(form.isPublished));
      if (imageFile) {
        fd.append("featuredImage", imageFile);
        fd.append("image", imageFile);
      }

      if (editItem) {
        await adminApi.updateBlog(editItem._id, fd);
        toast.success("Blog updated successfully");
      } else {
        await adminApi.createBlog(fd);
        toast.success("Blog created successfully");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save blog");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-border flex items-center justify-between p-4 z-10">
            <h2 className="text-lg font-bold font-display flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-500" />
              {editItem ? "Edit Blog Post" : "New Blog Post"}
            </h2>
            <button onClick={onClose} aria-label="Close blog form" className="p-2 rounded-lg hover:bg-muted transition-colors">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <Input
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter blog post title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Slug
              </label>
              <Input
                value={form.slug}
                onChange={(e) => handleSlugEdit(e.target.value)}
                placeholder="blog-post-slug"
                className="font-mono text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-2">
                URL: /blog/{form.slug || "your-slug"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Author</label>
                <Input
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  placeholder="Author name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Recipes, News"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Excerpt</label>
              <textarea
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                rows={2}
                maxLength={300}
                className="flex w-full rounded-xl border border-border bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all resize-none"
                placeholder="Brief summary for preview cards"
              />
              <p className="text-[10px] text-muted-foreground mt-2 text-right">
                {form.excerpt.length}/300
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Content *</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={10}
                className="flex w-full rounded-xl border border-border bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all resize-none font-mono leading-relaxed"
                placeholder="Write your blog content here... (HTML supported)"
              />
              <p className="text-[10px] text-muted-foreground mt-2 text-right">
                {form.content.length} characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="tag1, tag2, tag3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Featured Image</label>
              <div className="space-y-2">
                {(imageFile || editItem?.featuredImage) && (
                  <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-border group bg-muted/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageFile ? URL.createObjectURL(imageFile) : editItem?.featuredImage}
                      alt="Blog Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageFile(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <label className="flex items-center gap-4 px-4 py-4 rounded-xl border border-dashed border-border hover:border-brand-500 cursor-pointer transition-colors bg-background">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-ink)]">
                      {imageFile ? imageFile.name : editItem?.featuredImage ? "Change featured image" : "Click to upload image"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0">
                      PNG, JPG, WebP up to 5MB
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                SEO Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Meta Title</label>
                  <Input
                    value={form.metaTitle}
                    onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                    placeholder="SEO title (auto-generated if empty)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Meta Description</label>
                  <textarea
                    value={form.metaDescription}
                    onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                    rows={2}
                    maxLength={160}
                    className="flex w-full rounded-xl border border-border bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all resize-none"
                    placeholder="Brief description for search engines"
                  />
                  <p className="text-[10px] text-muted-foreground mt-2 text-right">
                    {form.metaDescription.length}/160
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600" />
              </label>
              <div>
                <span className="text-sm font-medium">{form.isPublished ? "Published" : "Draft"}</span>
                <p className="text-[10px] text-muted-foreground">
                  {form.isPublished
                    ? "Visible to visitors on the blog"
                    : "Only visible to admins"}
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 gap-2">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editItem ? (
                  <><Edit3 className="h-4 w-4" /> Update</>
                ) : (
                  <><FileText className="h-4 w-4" /> Create</>
                )}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}
