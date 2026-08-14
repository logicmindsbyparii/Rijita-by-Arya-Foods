"use client";

import Image from "next/image";
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  ImagePlus,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Star,
  TrendingUp,
  Sparkles,
  FileText,
  Layers,
  BarChart3,
  Info,
} from "lucide-react";
import { productApi, categoryApi } from "@/lib/api";
import { cn, formatPrice, truncate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product, Category } from "@/types";

interface ProductFormData {
  name: string;
  description: string;
  shortDescription: string;
  category: string;
  tags: string;
  isActive: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  ingredients: string;
  shelfLife: string;
  storageInstructions: string;
  fssaiLicense: string;
  metaTitle: string;
  metaDescription: string;
  nutritionalInfo: {
    servingSize: string;
    calories: number;
    protein: number;
    totalFat: number;
    saturatedFat: number;
    transFat: number;
    cholesterol: number;
    sodium: number;
    totalCarbohydrates: number;
    dietaryFiber: number;
    sugars: number;
  };
  variants: Array<{
    weight: string;
    weightValue: number;
    weightUnit: string;
    mrp: number;
    sellingPrice: number;
    stock: number;
    sku: string;
  }>;
}

const emptyVariant = () => ({
  weight: "",
  weightValue: 0,
  weightUnit: "g",
  mrp: 0,
  sellingPrice: 0,
  stock: 0,
  sku: "",
});

const defaultForm: ProductFormData = {
  name: "",
  description: "",
  shortDescription: "",
  category: "",
  tags: "",
  isActive: true,
  isFeatured: false,
  isBestSeller: false,
  isNewArrival: false,
  ingredients: "",
  shelfLife: "",
  storageInstructions: "",
  fssaiLicense: "",
  metaTitle: "",
  metaDescription: "",
  nutritionalInfo: {
    servingSize: "100g",
    calories: 0,
    protein: 0,
    totalFat: 0,
    saturatedFat: 0,
    transFat: 0,
    cholesterol: 0,
    sodium: 0,
    totalCarbohydrates: 0,
    dietaryFiber: 0,
    sugars: 0,
  },
  variants: [emptyVariant()],
};

type StatusTab = "all" | "active" | "inactive" | "out_of_stock" | "low_stock";

function ImagePreview({ file, onRemove }: { file: File, onRemove: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;
  return (
    <div className="relative h-16 w-16 rounded-lg overflow-hidden border border-border group/image hover:ring-2 hover:ring-red-400/30 transition-all">
      <Image src={url} alt="" width={64} height={64} className="h-full w-full object-cover" unoptimized />
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); onRemove(); }}
        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4 text-white" />
      </button>
    </div>
  );
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(defaultForm);
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const limit = 10;

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { page, limit, search };
      if (statusTab === "active") params.status = "active";
      else if (statusTab === "inactive") params.status = "inactive";
      else if (statusTab === "out_of_stock") params.status = "out-of-stock";
      else if (statusTab === "low_stock") params.status = "low-stock";
      const res = await productApi.adminGetProducts(params);
      const data = res.data || res;
      setProducts(data.products || data || []);
      setTotalPages(data.totalPages || res.pagination?.totalPages || 1);
      setTotal(data.total || res.pagination?.total || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusTab]);

  const loadCategories = async () => {
    try {
      const res = await categoryApi.getCategories();
      setCategories(res.data?.categories || []);
    } catch {}
  };

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadCategories();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadProducts();
  };

  const openAddForm = () => {
    setEditingProduct(null);
    setFormData(defaultForm);
    setImages([]);
    setExistingImages([]);
    setShowForm(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    const catId = typeof product.category === "object" ? product.category?._id : product.category;
    setFormData({
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription || "",
      category: catId || "",
      tags: (product.tags || []).join(", "),
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      isBestSeller: product.isBestSeller,
      isNewArrival: product.isNewArrival,
      ingredients: product.ingredients || "",
      shelfLife: product.shelfLife || "",
      storageInstructions: product.storageInstructions || "",
      fssaiLicense: product.fssaiLicense || "",
      metaTitle: product.metaTitle || "",
      metaDescription: product.metaDescription || "",
      nutritionalInfo: product.nutritionalInfo ? {
        servingSize: product.nutritionalInfo.servingSize || "100g",
        calories: product.nutritionalInfo.calories || 0,
        protein: product.nutritionalInfo.protein || 0,
        totalFat: product.nutritionalInfo.totalFat || 0,
        saturatedFat: product.nutritionalInfo.saturatedFat || 0,
        transFat: product.nutritionalInfo.transFat || 0,
        cholesterol: product.nutritionalInfo.cholesterol || 0,
        sodium: product.nutritionalInfo.sodium || 0,
        totalCarbohydrates: product.nutritionalInfo.totalCarbohydrates || 0,
        dietaryFiber: product.nutritionalInfo.dietaryFiber || 0,
        sugars: product.nutritionalInfo.sugars || 0,
      } : defaultForm.nutritionalInfo,
      variants: (product.variants || []).map((v) => ({
        weight: v.weight,
        weightValue: v.weightValue,
        weightUnit: v.weightUnit,
        mrp: v.mrp,
        sellingPrice: v.sellingPrice,
        stock: v.stock,
        sku: v.sku,
      })),
    });
    setExistingImages(product.images || []);
    setImages([]);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (formData.variants.length === 0 || !formData.variants[0].sku) {
      toast.error("At least one variant with SKU is required");
      return;
    }
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("description", formData.description);
      fd.append("shortDescription", formData.shortDescription);
      fd.append("category", formData.category);
      fd.append("tags", formData.tags);
      fd.append("isActive", String(formData.isActive));
      fd.append("isFeatured", String(formData.isFeatured));
      fd.append("isBestSeller", String(formData.isBestSeller));
      fd.append("isNewArrival", String(formData.isNewArrival));
      fd.append("ingredients", formData.ingredients);
      fd.append("shelfLife", formData.shelfLife);
      fd.append("storageInstructions", formData.storageInstructions);
      fd.append("fssaiLicense", formData.fssaiLicense);
      fd.append("metaTitle", formData.metaTitle);
      fd.append("metaDescription", formData.metaDescription);
      
      try {
        fd.append("nutritionalInfo", JSON.stringify(formData.nutritionalInfo));
        fd.append("variants", JSON.stringify(formData.variants));
      } catch (jsonErr) {
        throw new Error("Invalid form data schema. Please check variants and nutritional info.");
      }

      for (const img of images) {
        if (img.size > 5 * 1024 * 1024) {
          throw new Error(`Image ${img.name} exceeds 5MB limit`);
        }
        fd.append("images", img);
      }
      
      existingImages.forEach((url) => fd.append("existingImages", url));

      if (editingProduct) {
        await productApi.updateProduct(editingProduct._id, fd);
        toast.success("Product updated successfully");
      } else {
        await productApi.createProduct(fd);
        toast.success("Product created successfully");
      }
      setShowForm(false);
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleting(true);
      await productApi.deleteProduct(id);
      toast.success("Product deleted successfully");
      setDeleteConfirm(null);
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  const addVariant = () => {
    setFormData((prev) => ({ ...prev, variants: [...prev.variants, emptyVariant()] }));
  };

  const removeVariant = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const updateVariant = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) =>
        i === index ? { ...v, [field]: value } : v
      ),
    }));
  };

  const statusTabs: { key: StatusTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "inactive", label: "Inactive" },
    { key: "out_of_stock", label: "Out of Stock" },
    { key: "low_stock", label: "Low Stock" },
  ];

  const totalStock = (p: Product) =>
    p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Products</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {total > 0 ? `${total} product${total !== 1 ? "s" : ""} total` : "Manage your product catalog"}
          </p>
        </div>
        <Button onClick={openAddForm} className="shrink-0 gap-2">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 bg-muted/50 p-2 rounded-xl">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusTab(tab.key); setPage(1); }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                statusTab === tab.key
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
        </form>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-14 w-14 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-red-400" />
            <p className="font-medium text-lg mb-2">Failed to load products</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadProducts} variant="outline">Retry</Button>
          </CardContent>
        </Card>
      ) : products.length === 0 ? (
        <Card className="border-dashed border-2 bg-stone-50/50 shadow-none">
          <CardContent className="p-16 text-center">
            <div className="mx-auto w-20 h-20 bg-white rounded-full shadow-sm border border-stone-100 flex items-center justify-center mb-4">
              <Package className="h-10 w-10 text-stone-400" />
            </div>
            <p className="font-bold text-lg mb-2 text-stone-800">No products found</p>
            <p className="text-sm text-stone-500 mb-6 max-w-sm mx-auto">
              {search ? "Try adjusting your search or filters to find what you're looking for." : "Get started by adding your first product to the catalog."}
            </p>
            {!search && (
              <Button onClick={openAddForm} className="gap-2 shadow-md hover:shadow-lg transition-all">
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {products.map((product, i) => {
              const stock = totalStock(product);
              const minPrice = Math.min(...product.variants.map((v) => v.sellingPrice));
              const maxPrice = Math.max(...product.variants.map((v) => v.sellingPrice));
              return (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="hover:shadow-md transition-all table-row-hover odd:bg-white even:bg-stone-50/35">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-xl bg-muted overflow-hidden shrink-0">
                          {product.images?.[0] ? (
                            <Image
                              src={product.images[0]}
                              alt={product.name}
                              width={56}
                              height={56}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
                              <Package className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">{product.name}</p>
                            {product.isFeatured && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                            {product.isBestSeller && <TrendingUp className="h-4 w-4 text-green-500" />}
                            {product.isNewArrival && <Sparkles className="h-4 w-4 text-blue-500" />}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>
                              {typeof product.category === "object" ? product.category?.name : "Uncategorized"}
                            </span>
                            <span>{product.variants?.length || 0} variant(s)</span>
                            <span>Stock: {stock}</span>
                            <span className="font-medium text-foreground">
                              {formatPrice(minPrice)}{minPrice !== maxPrice ? ` - ${formatPrice(maxPrice)}` : ""}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant={product.isActive ? "success" : "secondary"}
                            className="capitalize"
                          >
                            {product.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditForm(product)}
                            className="h-8 w-8 rounded-lg"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm(product._id)}
                            className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 z-50 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 z-50 h-full w-full max-w-2xl bg-white shadow-2xl overflow-y-auto"
            >
              <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-border flex items-center justify-between p-4">
                <h2 className="text-lg font-bold font-display">
                  {editingProduct ? "Edit Product" : "Add Product"}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-8">
                {/* ── Section: Basic Information ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>
                    <span className="text-xs text-muted-foreground ml-auto">Required fields marked with *</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-2">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Enter product name"
                      />
                      <p className="text-xs text-muted-foreground mt-2">The name displayed on product cards and listings</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-2">Short Description</label>
                      <textarea
                        value={formData.shortDescription}
                        onChange={(e) => setFormData((p) => ({ ...p, shortDescription: e.target.value }))}
                        rows={2}
                        className="flex w-full rounded-xl border border-border bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all placeholder:text-muted-foreground/60"
                        placeholder="Brief description for cards"
                      />
                      <p className="text-xs text-muted-foreground mt-2">Shown on product cards — keep it under 100 characters.</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-2">Full Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                        rows={4}
                        className="flex w-full rounded-xl border border-border bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all placeholder:text-muted-foreground/60"
                        placeholder="Detailed product description including key features and product highlights"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                        className="flex h-12 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all text-muted-foreground/60"
                      >
                        <option value="" disabled hidden>Select a category</option>
                        {categories.map((cat) => (
                          <option key={cat._id} value={cat._id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Tags <span className="text-xs text-muted-foreground font-normal">(comma separated)</span></label>
                      <Input
                        value={formData.tags}
                        onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value }))}
                        placeholder="e.g. spicy, organic, bestseller"
                      />
                      <p className="text-xs text-muted-foreground mt-2">Helps with search and product filtering.</p>
                    </div>
                  </div>
                </div>

                {/* ── Section: Images ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center">
                      <ImagePlus className="h-4 w-4 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Images</h3>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {images.length + existingImages.length} total
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-4 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-brand-400 hover:bg-brand-50/30 cursor-pointer transition-all bg-background group">
                      <ImagePlus className="h-4 w-4 text-muted-foreground group-hover:text-brand-500 transition-colors" />
                      <span className="text-sm text-muted-foreground group-hover:text-brand-600 transition-colors font-medium">Upload Images</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) setImages(Array.from(e.target.files));
                        }}
                      />
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {images.length && images.length > 0 ? `${images.length} new` : ''}
                      {images.length > 0 && existingImages.length > 0 ? ', ' : ''}
                      {existingImages.length > 0 ? `${existingImages.length} existing` : ''}
                    </span>
                  </div>
                  {images.length > 0 || existingImages.length > 0 ? (
                    <div className="flex gap-2 flex-wrap">
                      {existingImages.map((url, i) => (
                        <div key={`e-${i}`} className="relative h-16 w-16 rounded-lg overflow-hidden border border-border group/image hover:ring-2 hover:ring-red-400/30 transition-all">
                          <Image src={url} alt="" width={64} height={64} className="h-full w-full object-cover" unoptimized />
                          <button
                            onClick={() => setExistingImages((p) => p.filter((_, j) => j !== i))}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4 text-white" />
                          </button>
                        </div>
                      ))}
                      {images.map((file, i) => (
                        <ImagePreview key={`n-${i}`} file={file} onRemove={() => setImages((p) => p.filter((_, j) => j !== i))} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No images uploaded yet. Add product images to showcase your item.</p>
                  )}
                </div>

                {/* ── Section: Badges & Status ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Star className="h-4 w-4 text-amber-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Badges & Status</h3>
                    <span className="text-xs text-muted-foreground ml-auto">Mark product visibility and highlights</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {([
                      { key: 'isActive' as const, label: 'Active', desc: 'Visible on the store', color: 'bg-emerald-500' },
                      { key: 'isFeatured' as const, label: 'Featured', desc: 'Shown in featured section', color: 'bg-amber-500' },
                      { key: 'isBestSeller' as const, label: 'Best Seller', desc: 'Badged as top selling', color: 'bg-blue-500' },
                      { key: 'isNewArrival' as const, label: 'New Arrival', desc: 'Badged as newly added', color: 'bg-violet-500' },
                    ] as const).map(({ key, label, desc, color }) => {
                      const isChecked = formData[key];
                      return (
                        <label
                          key={key}
                          className={cn(
                            "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                            isChecked
                              ? "border-brand-200 bg-brand-50/30"
                              : "border-border bg-background hover:border-muted-foreground/30"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded mt-0 flex items-center justify-center shrink-0 transition-all",
                            isChecked
                              ? `${color} shadow-sm`
                              : "bg-muted/50 border border-border"
                          )}>
                            {isChecked && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <span className="text-sm font-medium block leading-tight">{label}</span>
                            <span className="text-[10px] text-muted-foreground block mt-0">{desc}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const updated = { ...formData, [key]: e.target.checked };
                              setFormData(updated as ProductFormData);
                            }}
                            className="sr-only"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* ── Section: Variants ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Layers className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Variants</h3>
                    <Button variant="outline" size="sm" onClick={addVariant} className="gap-2 ml-auto">
                      <Plus className="h-4 w-4" />
                      Add Variant
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">Each variant represents a different weight or package size.</p>
                  {formData.variants.map((v, i) => (
                    <div key={i} className="p-4 rounded-xl border border-border bg-stone-50/30 space-y-4 hover:border-muted-foreground/20 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                          Variant {i + 1}
                        </span>
                        {formData.variants.length > 1 && (
                          <button
                            onClick={() => removeVariant(i)}
                            className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-2 rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-2 font-medium">Weight Label</label>
                          <Input
                            value={v.weight}
                            onChange={(e) => updateVariant(i, "weight", e.target.value)}
                            placeholder="e.g. 500g"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-2 font-medium">Weight Value</label>
                          <Input
                            type="number"
                            value={v.weightValue || ""}
                            onChange={(e) => updateVariant(i, "weightValue", Number(e.target.value))}
                            placeholder="500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-2 font-medium">Unit</label>
                          <select
                            value={v.weightUnit}
                            onChange={(e) => updateVariant(i, "weightUnit", e.target.value)}
                            className="flex h-12 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all"
                          >
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                            <option value="ml">ml</option>
                            <option value="l">l</option>
                            <option value="pcs">pcs</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-2 font-medium">SKU <span className="text-red-500">*</span></label>
                          <Input
                            value={v.sku}
                            onChange={(e) => updateVariant(i, "sku", e.target.value)}
                            placeholder="e.g. RIJ-500-001"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-2 font-medium">MRP (₹)</label>
                          <Input
                            type="number"
                            value={v.mrp || ""}
                            onChange={(e) => updateVariant(i, "mrp", Number(e.target.value))}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-2 font-medium">Selling Price (₹)</label>
                          <Input
                            type="number"
                            value={v.sellingPrice || ""}
                            onChange={(e) => updateVariant(i, "sellingPrice", Number(e.target.value))}
                            placeholder="0"
                          />
                          {v.mrp > 0 && v.sellingPrice > 0 && v.sellingPrice < v.mrp && (
                            <p className="text-[10px] text-emerald-600 mt-2">
                              {Math.round((1 - v.sellingPrice / v.mrp) * 100)}% discount
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-2 font-medium">Stock</label>
                          <Input
                            type="number"
                            value={v.stock || ""}
                            onChange={(e) => updateVariant(i, "stock", Number(e.target.value))}
                            placeholder="0"
                          />
                          {v.stock <= 5 && v.stock > 0 && (
                            <p className="text-[10px] text-amber-600 mt-2">Low stock — consider restocking</p>
                          )}
                          {v.stock === 0 && (
                            <p className="text-[10px] text-red-500 mt-2">Out of stock</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Section: Nutritional Info ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-rose-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Nutritional Info</h3>
                    <span className="text-xs text-muted-foreground ml-auto">Per 100g serving</span>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">Optional nutritional breakdown shown on product detail pages.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { key: "servingSize", label: "Serving Size", type: "text", hint: "e.g. 100g" },
                      { key: "calories", label: "Calories", type: "number", hint: "kcal" },
                      { key: "protein", label: "Protein", type: "number", hint: "g" },
                      { key: "totalFat", label: "Total Fat", type: "number", hint: "g" },
                      { key: "saturatedFat", label: "Saturated Fat", type: "number", hint: "g" },
                      { key: "transFat", label: "Trans Fat", type: "number", hint: "g" },
                      { key: "cholesterol", label: "Cholesterol", type: "number", hint: "mg" },
                      { key: "sodium", label: "Sodium", type: "number", hint: "mg" },
                      { key: "totalCarbohydrates", label: "Carbs", type: "number", hint: "g" },
                      { key: "dietaryFiber", label: "Fiber", type: "number", hint: "g" },
                      { key: "sugars", label: "Sugars", type: "number", hint: "g" },
                    ].map((field) => (
                      <div key={field.key}>
                        <label className="block text-xs text-muted-foreground mb-2 font-medium">{field.label}</label>
                        <div className="relative">
                          <Input
                            type={field.type}
                            value={(formData.nutritionalInfo as any)[field.key] || ""}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                nutritionalInfo: {
                                  ...p.nutritionalInfo,
                                  [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value,
                                },
                              }))
                            }
                            placeholder="0"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                            {field.hint}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Section: Additional Info ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center">
                      <Info className="h-4 w-4 text-stone-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Additional Info</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-2">Ingredients</label>
                      <textarea
                        value={formData.ingredients}
                        onChange={(e) => setFormData((p) => ({ ...p, ingredients: e.target.value }))}
                        rows={3}
                        className="flex w-full rounded-xl border border-border bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all placeholder:text-muted-foreground/60"
                        placeholder="List all ingredients in order of quantity, comma separated"
                      />
                      <p className="text-xs text-muted-foreground mt-2">Required for food products — helps with dietary compliance.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Shelf Life</label>
                      <Input
                        value={formData.shelfLife}
                        onChange={(e) => setFormData((p) => ({ ...p, shelfLife: e.target.value }))}
                        placeholder="e.g. 6 months from manufacture"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Storage Instructions</label>
                      <Input
                        value={formData.storageInstructions}
                        onChange={(e) => setFormData((p) => ({ ...p, storageInstructions: e.target.value }))}
                        placeholder="e.g. Store in cool dry place"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">FSSAI License</label>
                      <Input
                        value={formData.fssaiLicense}
                        onChange={(e) => setFormData((p) => ({ ...p, fssaiLicense: e.target.value }))}
                        placeholder="FSSAI license number"
                      />
                      <p className="text-xs text-muted-foreground mt-2">Required for Indian food products.</p>
                    </div>
                  </div>
                </div>

                {/* ── Section: SEO ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <div className="w-6 h-6 rounded-lg bg-sky-50 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-sky-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">SEO Settings</h3>
                    <span className="text-xs text-muted-foreground ml-auto">Optional — auto-generated if left empty</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-2">Meta Title</label>
                      <Input
                        value={formData.metaTitle}
                        onChange={(e) => setFormData((p) => ({ ...p, metaTitle: e.target.value }))}
                        placeholder="Leave empty to auto-generate from product name"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {formData.metaTitle ? `${formData.metaTitle.length} characters` : 'Will use product name as fallback'}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-2">Meta Description</label>
                      <textarea
                        value={formData.metaDescription}
                        onChange={(e) => setFormData((p) => ({ ...p, metaDescription: e.target.value }))}
                        rows={2}
                        maxLength={160}
                        className="flex w-full rounded-xl border border-border bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all placeholder:text-muted-foreground/60 resize-none"
                        placeholder="Brief summary for search engine results"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {formData.metaDescription.length}/160 characters — <span className={formData.metaDescription.length > 150 ? 'text-amber-500' : 'text-muted-foreground'}>{160 - formData.metaDescription.length} remaining</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-border p-4 flex gap-4 justify-end">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-[120px]">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingProduct ? "Update" : "Create"}
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
                  <h3 className="text-lg font-bold mb-2">Delete Product?</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    This action cannot be undone. The product will be permanently deleted.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
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
    </div>
  );
}
