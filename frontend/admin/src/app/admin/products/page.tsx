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
import { cn, formatPrice, getImageUrl } from "@/lib/utils";
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
  countryOfOrigin: string;
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
    _id?: string;
    weight: string;
    weightValue: number;
    weightUnit: string;
    mrp: number;
    sellingPrice: number;
    stock: number;
    discount: number;
    sku: string;
    isActive: boolean;
  }>;
}

const emptyVariant = () => ({
  _id: undefined,
  weight: "",
  weightValue: 0,
  weightUnit: "g",
  mrp: 0,
  sellingPrice: 0,
  stock: 0,
  discount: 0,
  sku: "",
  isActive: true,
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
  countryOfOrigin: "India",
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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [limit, setLimit] = useState<number>(25);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const loadProducts = useCallback(async () => {
    // Selection is scoped to the current page — drop it whenever the list
    // reloads (filter/search/page change) so we never bulk-delete items that
    // aren't visible on screen.
    setSelectedProducts([]);
    try {
      setLoading(true);
      setError(null);
      const params: any = { page, limit, search };
      if (selectedCategory && selectedCategory !== "all") params.category = selectedCategory;
      if (statusTab === "active") params.status = "active";
      else if (statusTab === "inactive") params.status = "inactive";
      else if (statusTab === "out_of_stock") params.status = "out-of-stock";
      else if (statusTab === "low_stock") params.status = "low-stock";
      const res = await productApi.adminGetProducts(params);
      const data = res.data || res;
      const prods = data.products || data || [];
      setProducts(Array.isArray(prods) ? prods : []);
      setTotalPages(res.pagination?.pages || res.pagination?.totalPages || data.totalPages || 1);
      setTotal(res.pagination?.total ?? data.total ?? (Array.isArray(prods) ? prods.length : 0));
    } catch (err: any) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, selectedCategory, statusTab]);

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

  const toggleProductStatus = async (product: Product) => {
    try {
      const fd = new FormData();
      fd.append("isActive", String(!product.isActive));
      await productApi.updateProduct(product._id, fd);
      toast.success(`Product set to ${!product.isActive ? "Active" : "Inactive"}`);
      loadProducts();
    } catch (err: any) {
      toast.error("Failed to update status");
    }
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
    const catId = typeof product.category === "object" ? String(product.category?._id || "") : String(product.category || "");
    setFormData({
      name: product.name || "",
      description: product.description || "",
      shortDescription: product.shortDescription || "",
      category: catId || "",
      tags: (product.tags || []).join(", "),
      isActive: product.isActive ?? true,
      isFeatured: product.isFeatured ?? false,
      isBestSeller: product.isBestSeller ?? false,
      isNewArrival: product.isNewArrival ?? false,
      ingredients: product.ingredients || "",
      shelfLife: product.shelfLife || "",
      storageInstructions: product.storageInstructions || "",
      fssaiLicense: product.fssaiLicense || "",
      countryOfOrigin: product.countryOfOrigin || "India",
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
      variants: (product.variants && product.variants.length > 0) ? product.variants.map((v, idx) => ({
        _id: (v as any)?._id,
        weight: v.weight || `${v.weightValue || 100}${v.weightUnit || 'g'}`,
        weightValue: Number(v.weightValue) || 0,
        weightUnit: v.weightUnit || "g",
        mrp: Number(v.mrp) || 0,
        sellingPrice: Number(v.sellingPrice) || 0,
        stock: Number(v.stock) || 0,
        discount: Number(v.discount) || 0,
        sku: v.sku || `SKU-${idx + 1}`,
        isActive: v.isActive !== false,
      })) : [emptyVariant()],
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
    if (!formData.description.trim()) {
      toast.error("Product description is required");
      return;
    }
    if (!formData.category) {
      toast.error("Please select a product category");
      return;
    }
    if (formData.variants.length === 0) {
      toast.error("At least one variant is required");
      return;
    }

    // Auto-fix SKUs and validate variant numbers
    const processedVariants = formData.variants.map((v, idx) => {
      let sku = v.sku.trim();
      if (!sku) {
        const cleanName = formData.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const prefix = cleanName.substring(0, 3) || "PRD";
        const wTag = (v.weight || `${v.weightValue || 100}${v.weightUnit || 'g'}`).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        sku = `RIJ-${prefix}-${wTag}-${idx + 1}`;
      }
      const mrp = Number(v.mrp) || 0;
      const sellingPrice = Number(v.sellingPrice) || 0;
      return {
        ...v,
        sku,
        weightValue: Number(v.weightValue) || 0,
        mrp,
        sellingPrice,
        stock: Number(v.stock) || 0,
        // Preserve any stored discount; otherwise derive it from the prices
        // so editing a product never silently zeroes out discounts.
        discount: Number(v.discount) > 0
          ? Number(v.discount)
          : mrp > 0 && sellingPrice > 0 && sellingPrice < mrp
            ? Math.round(((mrp - sellingPrice) / mrp) * 100)
            : 0,
      };
    });

    // Reject invalid variant data before hitting the API
    const pricedVariants = processedVariants.filter((v) => v.sellingPrice > 0);
    if (pricedVariants.length === 0) {
      toast.error("At least one variant must have a selling price");
      return;
    }
    const overpriced = processedVariants.find((v) => v.mrp > 0 && v.sellingPrice > v.mrp);
    if (overpriced) {
      toast.error(`Selling price exceeds MRP for variant "${overpriced.sku || overpriced.weight}"`);
      return;
    }
    const skus = processedVariants.map((v) => v.sku.toUpperCase());
    if (new Set(skus).size !== skus.length) {
      toast.error("Each variant needs a unique SKU");
      return;
    }

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("name", formData.name.trim());
      fd.append("description", formData.description.trim());
      fd.append("shortDescription", formData.shortDescription.trim());
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
      fd.append("countryOfOrigin", formData.countryOfOrigin);
      fd.append("metaTitle", formData.metaTitle);
      fd.append("metaDescription", formData.metaDescription);
      
      try {
        fd.append("nutritionalInfo", JSON.stringify(formData.nutritionalInfo));
        fd.append("variants", JSON.stringify(processedVariants));
      } catch (jsonErr) {
        throw new Error("Invalid form schema for variants or nutritional info.");
      }

      for (const img of images) {
        if (img.size > 5 * 1024 * 1024) {
          throw new Error(`Image ${img.name} exceeds 5MB limit`);
        }
        fd.append("images", img);
      }
      
      existingImages.forEach((url) => fd.append("existingImages", url));
      fd.append("hasImageUpdate", "true");

      if (editingProduct) {
        await productApi.updateProduct(editingProduct._id, fd);
        toast.success("Product updated successfully");
      } else {
        await productApi.createProduct(fd);
        toast.success("Product created successfully");
      }
      setShowForm(false);
      setImages([]);
      setExistingImages([]);
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
      setSelectedProducts((prev) => prev.filter((pId) => pId !== id));
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setIsBulkDeleting(true);
      const results = await Promise.allSettled(
        selectedProducts.map((id) => productApi.deleteProduct(id))
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;
      setSelectedProducts([]);
      setShowBulkDeleteConfirm(false);
      loadProducts();
      if (failed === 0) {
        toast.success(
          `${succeeded} product${succeeded !== 1 ? "s" : ""} deleted successfully`
        );
      } else if (succeeded > 0) {
        toast.error(
          `${succeeded} deleted, ${failed} could not be deleted`
        );
      } else {
        toast.error("None of the selected products could be deleted");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete products");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === products.length && products.length > 0) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map((p) => p._id));
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const addVariant = () => {
    const nextIdx = formData.variants.length + 1;
    const cleanName = (formData.name || "PRD").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const prefix = cleanName.substring(0, 3) || "PRD";
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          _id: undefined,
          weight: "500g",
          weightValue: 500,
          weightUnit: "g",
          mrp: 150,
          sellingPrice: 130,
          stock: 50,
          discount: Math.round(((150 - 130) / 150) * 100),
          sku: `RIJ-${prefix}-500G-0${nextIdx}`,
          isActive: true,
        },
      ],
    }));
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
        <div className="flex items-center gap-3">
          {selectedProducts.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="gap-2 shrink-0 animate-fade-in shadow-sm"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedProducts.length})
            </Button>
          )}
          <Button onClick={openAddForm} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-1.5 bg-brand-50/50 p-1.5 rounded-xl border border-brand-100/50">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusTab(tab.key); setPage(1); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                statusTab === tab.key
                  ? "bg-white text-brand-700 shadow-sm font-bold border border-brand-100/50"
                  : "text-muted-foreground hover:text-brand-600 hover:bg-white/50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            className="h-10 rounded-xl border border-brand-200/60 bg-white px-3 text-xs font-medium text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all shadow-sm"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="h-10 rounded-xl border border-brand-200/60 bg-white px-3 text-xs font-medium text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all shadow-sm"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>

          <form onSubmit={handleSearch} className="relative flex-1 md:w-64">
            <Input
              icon={<Search className="h-4 w-4 text-brand-400" />}
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 text-xs border-brand-200/60 shadow-sm bg-white focus-visible:ring-brand-500/30 pr-10"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </form>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-brand-100/50 shadow-sm">
              <CardContent className="p-3.5">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-14 w-14 rounded-xl bg-brand-50" />
                  <div className="flex-1 space-y-2.5">
                    <Skeleton className="h-4 w-48 bg-stone-100" />
                    <div className="flex gap-2">
                      <Skeleton className="h-4 w-20 bg-stone-100" />
                      <Skeleton className="h-4 w-24 bg-stone-100" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full bg-stone-100" />
                  <Skeleton className="h-8 w-8 rounded-lg bg-stone-100" />
                  <Skeleton className="h-8 w-8 rounded-lg bg-stone-100" />
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
        <Card className="border-dashed border-2 border-brand-200 bg-brand-50/20 shadow-none">
          <CardContent className="p-20 text-center flex flex-col items-center justify-center">
            <div className="mx-auto w-24 h-24 bg-brand-100 rounded-full flex items-center justify-center mb-6 shadow-sm border border-brand-200">
              <Package className="h-10 w-10 text-brand-600" />
            </div>
            <p className="font-bold font-display text-2xl mb-2 text-brand-900">No products found</p>
            <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
              {search || selectedCategory !== "all" || statusTab !== "all"
                ? "We couldn't find any products matching your current filters. Try adjusting your search, category, or status."
                : "Your catalog is empty. Get started by adding your first premium product."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {(search || selectedCategory !== "all" || statusTab !== "all") && (
                <Button
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("all");
                    setStatusTab("all");
                    setPage(1);
                    loadProducts();
                  }}
                  variant="outline"
                  className="gap-2 px-6 py-3 rounded-xl"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
              {!search && (
                <Button onClick={openAddForm} className="gap-2 shadow-md hover:shadow-lg transition-all bg-brand-800 hover:bg-brand-900 text-white px-8 py-6 rounded-xl text-md font-medium">
                  <Plus className="h-5 w-5" />
                  Add New Product
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {products.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 bg-stone-50 rounded-xl mb-3 border border-stone-200/60">
              <input
                type="checkbox"
                checked={selectedProducts.length === products.length && products.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-stone-600">Select All on this page</span>
            </div>
          )}
          <div className="space-y-3">
            {products.map((product, i) => {
              const stock = totalStock(product);
              const variants = product.variants || [];
              const validPrices = variants.map((v) => Number(v.sellingPrice) || 0).filter((p) => p > 0);
              const minPrice = validPrices.length ? Math.min(...validPrices) : (product.minPrice || 0);
              const maxPrice = validPrices.length ? Math.max(...validPrices) : (product.minPrice || 0);
              const catName = typeof product.category === "object" && product.category?.name
                ? product.category.name
                : "Uncategorized";

              return (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <Card className={cn(
                    "hover:shadow-lg transition-all bg-white shadow-sm overflow-hidden group",
                    selectedProducts.includes(product._id) ? "border-brand-500 ring-1 ring-brand-500" : "border-brand-200/40"
                  )}>
                    <CardContent className="p-3.5">
                      <div className="flex items-center gap-4">
                        <div className="shrink-0 flex items-center pr-2">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product._id)}
                            onChange={() => toggleSelectProduct(product._id)}
                            className="w-4 h-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          />
                        </div>
                        <div className="h-14 w-14 rounded-xl bg-stone-50 overflow-hidden shrink-0 border border-brand-100 group-hover:scale-105 transition-transform duration-300">
                          {product.images?.[0] ? (
                            <Image
                              src={getImageUrl(product.images[0])}
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
                            <p className="font-semibold text-sm truncate text-foreground">{product.name}</p>
                            {product.isFeatured && <span title="Featured"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /></span>}
                            {product.isBestSeller && <span title="Bestseller"><TrendingUp className="h-3.5 w-3.5 text-green-500" /></span>}
                            {product.isNewArrival && <span title="New Arrival"><Sparkles className="h-3.5 w-3.5 text-blue-500" /></span>}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-stone-100 font-medium text-stone-700">
                              {catName}
                            </span>
                            <span>{variants.length} variant(s)</span>
                            <span className={cn("font-medium", stock <= 0 ? "text-red-500 font-bold" : stock <= 10 ? "text-amber-600 font-semibold" : "")}>
                              Stock: {stock}
                            </span>
                            <span className="font-semibold text-brand-700">
                              {formatPrice(minPrice)}{minPrice !== maxPrice ? ` - ${formatPrice(maxPrice)}` : ""}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleProductStatus(product)}
                            className="cursor-pointer"
                            title="Click to toggle status"
                          >
                            <Badge
                              variant={product.isActive ? "success" : "secondary"}
                              className="capitalize hover:opacity-80 transition-opacity"
                            >
                              {product.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </button>
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {total === 0 ? 0 : (page - 1) * limit + 1}-{Math.min(page * limit, total)}
                </span>{" "}
                of <span className="font-semibold text-foreground tabular-nums">{total}</span> products
              </p>
              <div className="flex items-center gap-1.5">
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
                {generatePageNumbers(page, totalPages).map((p, i) =>
                  p === "..." ? (
                    <span key={`e${i}`} className="px-1.5 text-xs text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      aria-label={`Page ${p}`}
                      aria-current={p === page ? "page" : undefined}
                      className={cn(
                        "min-w-[36px] h-9 px-2 rounded-lg text-xs font-semibold transition-all tabular-nums",
                        p === page
                          ? "bg-brand-600 text-white shadow-sm"
                          : "border border-brand-200/60 bg-white text-muted-foreground hover:border-brand-400 hover:text-brand-700"
                      )}
                    >
                      {p}
                    </button>
                  )
                )}
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
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xl border-b border-brand-100 flex items-center justify-between px-6 py-5 shadow-sm">
                <h2 className="text-xl font-bold font-display text-brand-900">
                  {editingProduct ? "Edit Product" : "Add Product"}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 rounded-lg bg-stone-50 hover:bg-red-50 hover:text-red-600 transition-colors border border-transparent hover:border-red-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-10">
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
                        maxLength={100}
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
                    <label className="flex items-center justify-center flex-col gap-2 w-full max-w-sm py-8 rounded-xl border-2 border-dashed border-brand-200 hover:border-brand-400 hover:bg-brand-50/50 cursor-pointer transition-all bg-stone-50/30 group">
                      <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ImagePlus className="h-5 w-5 text-brand-600" />
                      </div>
                      <span className="text-sm text-brand-700 font-semibold mt-2">Click to Upload Images</span>
                      <span className="text-xs text-muted-foreground">PNG, JPG up to 5MB</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const newFiles = Array.from(e.target.files);
                            setImages((prev) => [...prev, ...newFiles]);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                    <span className="text-xs text-muted-foreground font-medium">
                      {images.length > 0 ? `${images.length} new selected` : ''}
                      {images.length > 0 && existingImages.length > 0 ? ' • ' : ''}
                      {existingImages.length > 0 ? `${existingImages.length} saved` : ''}
                    </span>
                  </div>
                  {images.length > 0 || existingImages.length > 0 ? (
                    <div className="flex gap-3 flex-wrap pt-1">
                      {existingImages.map((url, i) => (
                        <div key={`e-${i}`} className="relative h-20 w-20 rounded-xl overflow-hidden border border-border group/image hover:ring-2 hover:ring-red-400/50 shadow-sm transition-all">
                          <Image src={url} alt="" width={80} height={80} className="h-full w-full object-cover" unoptimized />
                          <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                            {i === 0 ? "Main" : `#${i + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setExistingImages((p) => p.filter((_, j) => j !== i));
                            }}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity text-white hover:bg-red-600/80"
                            title="Remove image"
                          >
                            <X className="h-5 w-5 text-white" />
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
                    <div key={i} className="p-5 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/30 to-transparent space-y-5 hover:border-brand-300 hover:shadow-md transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold flex items-center gap-2 text-brand-900">
                          <span className="w-5 h-5 rounded-full bg-brand-200 text-brand-800 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                          Variant {i + 1}
                        </span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={v.isActive}
                              onChange={(e) => updateVariant(i, "isActive", e.target.checked)}
                              className="w-4 h-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                            />
                            <span className="text-xs text-muted-foreground">Active</span>
                          </label>
                          {formData.variants.length > 1 && (
                            <button
                              onClick={() => removeVariant(i)}
                              className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-2 rounded-lg transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>
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
                            value={v.weightValue ?? ""}
                            onChange={(e) => updateVariant(i, "weightValue", e.target.value === "" ? 0 : Number(e.target.value))}
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
                            value={v.mrp ?? ""}
                            onChange={(e) => updateVariant(i, "mrp", e.target.value === "" ? 0 : Number(e.target.value))}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-2 font-medium">Selling Price (₹)</label>
                          <Input
                            type="number"
                            value={v.sellingPrice ?? ""}
                            onChange={(e) => updateVariant(i, "sellingPrice", e.target.value === "" ? 0 : Number(e.target.value))}
                            placeholder="0"
                          />
                          {v.mrp > 0 && v.sellingPrice > 0 && v.sellingPrice < v.mrp && (
                            <p className="text-[10px] text-emerald-600 mt-2">
                              {Math.round((1 - v.sellingPrice / v.mrp) * 100)}% discount
                            </p>
                          )}
                          {v.mrp > 0 && v.sellingPrice > v.mrp && (
                            <p className="text-[10px] text-red-500 mt-2">
                              Selling price exceeds MRP
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-2 font-medium">Stock</label>
                          <Input
                            type="number"
                            value={v.stock ?? ""}
                            onChange={(e) => updateVariant(i, "stock", e.target.value === "" ? 0 : Number(e.target.value))}
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
                            value={(formData.nutritionalInfo as any)[field.key] ?? ""}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                nutritionalInfo: {
                                  ...p.nutritionalInfo,
                                  [field.key]: field.type === "number" ? (e.target.value === "" ? 0 : Number(e.target.value)) : e.target.value,
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
                    <div>
                      <label className="block text-sm font-medium mb-2">Country of Origin</label>
                      <Input
                        value={formData.countryOfOrigin}
                        onChange={(e) => setFormData((p) => ({ ...p, countryOfOrigin: e.target.value }))}
                        placeholder="e.g. India"
                      />
                      <p className="text-xs text-muted-foreground mt-2">Shown on the product detail page.</p>
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
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Delete {selectedProducts.length} Products?</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    This action cannot be undone. All selected products will be permanently deleted.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}>Cancel</Button>
                    <Button
                      variant="destructive"
                      onClick={handleBulkDelete}
                      disabled={isBulkDeleting}
                      className="gap-2"
                    >
                      {isBulkDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Delete All
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
