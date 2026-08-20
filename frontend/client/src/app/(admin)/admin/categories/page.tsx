"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Tags,
  Plus,
  Edit3,
  Trash2,
  ImagePlus,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";
import Image from "next/image";
import { categoryApi } from "@/lib/admin/api";
import { cn, generateSlug, getImageUrl, handleImageError } from "@/lib/admin/utils";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import { Card, CardContent } from "@/components/admin-ui/card";
import { Badge } from "@/components/admin-ui/badge";
import { Skeleton } from "@/components/admin-ui/skeleton";
import type { Category } from "@/types/admin";

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  parent: string;
  order: number;
  isActive: boolean;
}

const defaultForm: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  parent: "",
  order: 0,
  isActive: true,
};

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryForm>(defaultForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await categoryApi.adminGetCategories();
      setCategories(res.data?.categories || []);
    } catch (err: any) {
      setError(err.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openAddForm = () => {
    setEditing(null);
    setFormData(defaultForm);
    setImageFile(null);
    setImagePreview(null);
    setShowForm(true);
  };

  const openEditForm = (cat: Category) => {
    setEditing(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      parent: typeof cat.parent === "object" ? cat.parent?._id || "" : cat.parent || "",
      order: cat.order || 0,
      isActive: cat.isActive,
    });
    setImageFile(null);
    setImagePreview(cat.image ? cat.image : null);
    setShowForm(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("slug", formData.slug || generateSlug(formData.name));
      fd.append("description", formData.description);
      fd.append("parent", formData.parent);
      fd.append("order", String(formData.order));
      fd.append("isActive", String(formData.isActive));
      if (imageFile) fd.append("image", imageFile);
      if (!imageFile && !imagePreview) fd.append("removeImage", "true");

      if (editing) {
        await categoryApi.updateCategory(editing._id, fd);
        toast.success("Category updated successfully");
      } else {
        await categoryApi.createCategory(fd);
        toast.success("Category created successfully");
      }
      setShowForm(false);
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleting(true);
      await categoryApi.deleteCategory(id);
      toast.success("Category deleted successfully");
      setDeleteConfirm(null);
      setSelectedCategories((prev) => prev.filter((cId) => cId !== id));
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setIsBulkDeleting(true);
      const results = await Promise.allSettled(
        selectedCategories.map((id) => categoryApi.deleteCategory(id))
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;
      setSelectedCategories([]);
      setShowBulkDeleteConfirm(false);
      loadCategories();
      if (failed === 0) {
        toast.success(
          `${succeeded} categor${succeeded !== 1 ? "ies" : "y"} deleted successfully`
        );
      } else if (succeeded > 0) {
        toast.error(
          `${succeeded} deleted, ${failed} skipped — categories with products or subcategories cannot be deleted`
        );
      } else {
        toast.error(
          "None of the selected categories could be deleted — they may contain products or subcategories"
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete categories");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedCategories.length === categories.length && categories.length > 0) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(categories.map((c) => c._id));
    }
  };

  const toggleSelectCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id]
    );
  };

  const rootCategories = categories.filter((c) => !c.parent);
  const getChildren = (parentId: string) => categories.filter((c) => {
    const parent = typeof c.parent === "object" ? c.parent?._id : c.parent;
    return parent === parentId;
  });

  const renderCategory = (cat: Category, depth = 0) => {
    const children = getChildren(cat._id);
    return (
      <div key={cat._id}>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-muted/30",
              depth > 0 && "ml-8",
              selectedCategories.includes(cat._id) && "bg-brand-50/60"
            )}
          >
            <input
              type="checkbox"
              checked={selectedCategories.includes(cat._id)}
              onChange={() => toggleSelectCategory(cat._id)}
              aria-label={`Select ${cat.name}`}
              className="w-4 h-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500 cursor-pointer shrink-0"
            />
            <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden shrink-0">
              {cat.image ? (
                <Image src={getImageUrl(cat.image)} alt={cat.name} width={40} height={40} className="h-full w-full object-cover" unoptimized />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground/40">
                  <Tags className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{cat.name}</p>
                <span className="text-xs text-muted-foreground">/ {cat.slug}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0">
                <span>{cat.productCount || 0} products</span>
                <span>Order: {cat.order || 0}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={cat.isActive ? "success" : "secondary"}>
                {cat.isActive ? "Active" : "Inactive"}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openEditForm(cat)}
                className="h-8 w-8 rounded-lg"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteConfirm(cat._id)}
                className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
        {children.map((child) => renderCategory(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Categories</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {categories.length > 0 ? `${categories.length} categor${categories.length !== 1 ? "ies" : "y"} total` : "Manage product categories"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedCategories.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="gap-2 shrink-0 animate-fade-in shadow-sm"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedCategories.length})
            </Button>
          )}
          <Button onClick={openAddForm} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-16 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-red-400" />
            <p className="font-medium text-lg mb-2">Failed to load categories</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadCategories} variant="outline">Retry</Button>
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Tags className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="font-medium text-lg mb-2">No categories yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create your first category to organize products</p>
            <Button onClick={openAddForm} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-2">
            <div className="flex items-center gap-3 px-4 py-2 bg-stone-50 rounded-xl mb-1 border border-stone-200/60">
              <input
                type="checkbox"
                checked={selectedCategories.length === categories.length && categories.length > 0}
                onChange={toggleSelectAll}
                aria-label="Select all categories"
                className="w-4 h-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-stone-600">Select all categories</span>
              {selectedCategories.length > 0 && (
                <span className="ml-auto text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-100">
                  {selectedCategories.length} selected
                </span>
              )}
            </div>
            {rootCategories.map((cat) => renderCategory(cat))}
          </CardContent>
        </Card>
      )}

      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[450px] z-50 bg-background shadow-2xl border-l border-border flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-border shrink-0 bg-muted/10">
                <div>
                  <h2 className="text-xl font-bold font-display">
                    {editing ? "Edit Category" : "Add Category"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    {editing ? "Update category details below" : "Create a new category for your products"}
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Name <span className="text-red-500">*</span></label>
                  <Input
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData((p) => ({
                        ...p,
                        name,
                        slug: editing ? p.slug : (p.slug || generateSlug(name)),
                      }));
                    }}
                    placeholder="e.g. Traditional Namkeen"
                    className="h-12 rounded-xl"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Slug</label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-") }))}
                    onBlur={(e) => setFormData((p) => ({ ...p, slug: generateSlug(e.target.value) }))}
                    placeholder="traditional-namkeen"
                    className="h-12 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">Used for the category URL.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    rows={4}
                    className="flex w-full rounded-xl border border-border bg-background px-4 py-4 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all resize-none"
                    placeholder="Write a short description..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Parent Category</label>
                  <select
                    value={formData.parent}
                    onChange={(e) => setFormData((p) => ({ ...p, parent: e.target.value }))}
                    className="flex h-12 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all"
                  >
                    <option value="">None (Top Level)</option>
                    {(() => {
                      const excludeIds = new Set<string>();
                      if (editing) {
                        excludeIds.add(editing._id);
                        const collectDescendants = (parentId: string) => {
                          categories.forEach((c) => {
                            const pid = typeof c.parent === "object" ? c.parent?._id : c.parent;
                            if (pid === parentId && !excludeIds.has(c._id)) {
                              excludeIds.add(c._id);
                              collectDescendants(c._id);
                            }
                          });
                        };
                        collectDescendants(editing._id);
                      }
                      return categories
                        .filter((c) => !excludeIds.has(c._id))
                        .map((cat) => (
                          <option key={cat._id} value={cat._id}>{cat.name}</option>
                        ));
                    })()}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Display Order</label>
                    <Input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData((p) => ({ ...p, order: Number(e.target.value) }))}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Status</label>
                    <div className="flex items-center h-12">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.isActive}
                          onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                        />
                        <div className="w-12 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500"></div>
                        <span className="ml-4 text-sm font-medium">{formData.isActive ? "Active" : "Inactive"}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Category Image</label>
                  {imagePreview ? (
                    <div className="relative group rounded-xl overflow-hidden border border-border">
                      <Image
                        src={imagePreview.startsWith("blob:") ? imagePreview : getImageUrl(imagePreview)}
                        alt="Preview"
                        width={200}
                        height={160}
                        className="h-40 w-full object-cover transition-transform group-hover:scale-105"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500/90 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm backdrop-blur-sm font-medium"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove Image
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 rounded-xl border-2 border-dashed border-border hover:border-brand-500 hover:bg-brand-50/50 cursor-pointer transition-all bg-muted/20">
                      <div className="flex flex-col items-center justify-center pt-4 pb-6 text-muted-foreground group-hover:text-brand-600">
                        <ImagePlus className="h-8 w-8 mb-4 opacity-50" />
                        <p className="text-sm font-medium mb-2">Click to upload image</p>
                        <p className="text-xs opacity-70">SVG, PNG, JPG or WEBP</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 p-6 border-t border-border shrink-0 bg-background">
                <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving} className="rounded-xl px-6 h-12">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="rounded-xl px-8 h-12 gap-2 shadow-sm min-w-[140px]">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? "Save Changes" : "Create Category"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="fixed inset-0 z-50 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            >
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="p-4 rounded-2xl bg-red-50 w-fit mx-auto mb-4">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Delete Category?</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    This will permanently delete this category. Categories with products or subcategories cannot be deleted.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deleting}>Cancel</Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(deleteConfirm)}
                      disabled={deleting}
                      className="gap-2"
                    >
                      {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBulkDeleteConfirm(false)}
              className="fixed inset-0 z-50 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            >
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="p-4 rounded-2xl bg-red-50 w-fit mx-auto mb-4">
                    <Trash2 className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">
                    Delete {selectedCategories.length} categor{selectedCategories.length !== 1 ? "ies" : "y"}?
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    This will permanently delete the {selectedCategories.length} selected categor{selectedCategories.length !== 1 ? "ies" : "y"}. Categories with products or subcategories will be skipped.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)} disabled={isBulkDeleting}>Cancel</Button>
                    <Button
                      variant="destructive"
                      onClick={handleBulkDelete}
                      disabled={isBulkDeleting}
                      className="gap-2"
                    >
                      {isBulkDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {isBulkDeleting ? "Deleting..." : `Delete ${selectedCategories.length}`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
