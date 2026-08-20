"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bookmark,
  Plus,
  Search,
  Edit3,
  Trash2,
  Image as ImageIcon,
  X,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";
import { adminApi, productApi } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Collection, Product } from "@/types";

export default function AdminCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Collection | null>(null);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getCollections();
      const data = res?.data || res;
      setCollections(data?.collections || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load collections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this collection?")) return;
    try {
      await adminApi.deleteCollection(id);
      toast.success("Collection deleted");
      fetchCollections();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  const filtered = collections.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.slug?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Collections</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage product collections and curated sets
          </p>
        </div>
        <Button
          onClick={() => {
            setEditItem(null);
            setShowModal(true);
          }}
          className="shrink-0"
        >
          <Plus size={16} className="mr-2" />
          Add Collection
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search collections..."
          className="w-full pl-10 pr-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm"
        />
      </div>

      {/* Collections Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-32 w-full rounded-xl mb-4" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Bookmark size={40} className="mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium mb-2">No collections found</h3>
          <p className="text-muted-foreground mb-6">
            {search ? "Try a different search" : "Create your first collection to get started"}
          </p>
          {!search && (
            <Button onClick={() => { setEditItem(null); setShowModal(true); }}>
              <Plus size={16} className="mr-2" /> Create Collection
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((collection, i) => (
            <motion.div
              key={collection._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="group hover:shadow-md transition-all overflow-hidden">
                <div className="relative h-32 bg-gradient-to-br from-brand-50 to-amber-50">
                  {collection.image ? (
                    <Image
                      src={collection.image}
                      alt={collection.name}
                      width={400}
                      height={128}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon size={32} className="text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white font-semibold truncate">{collection.name}</h3>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={collection.isActive ? "default" : "secondary"} className="text-[10px]">
                      {collection.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {(collection.products as any[])?.length || 0} products
                    </span>
                  </div>
                  {collection.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                      {collection.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditItem(collection);
                        setShowModal(true);
                      }}
                      className="text-xs"
                    >
                      <Edit3 size={12} className="mr-2" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(collection._id)}
                      className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={12} className="mr-2" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <CollectionModal
          editItem={editItem}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            fetchCollections();
          }}
        />
      )}
    </div>
  );
}

function CollectionModal({
  editItem,
  onClose,
  onSaved,
}: {
  editItem: Collection | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: editItem?.name || "",
    slug: editItem?.slug || "",
    description: editItem?.description || "",
    isActive: editItem?.isActive ?? true,
    products:
      (editItem?.products as any[])?.map((p) => (typeof p === "string" ? p : (p as Product)?._id)).filter(Boolean) || [],
  });
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  // Load the full product list once for the product picker.
  useEffect(() => {
    let cancelled = false;
    setLoadingProducts(true);
    productApi
      .adminGetProducts({ limit: 100 })
      .then((res) => {
        if (cancelled) return;
        const data = res.data || res;
        const prods = data.products || data || [];
        setAllProducts(Array.isArray(prods) ? prods : []);
      })
      .catch(() => {
        if (!cancelled) setAllProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error("Name is required"); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("slug", form.slug || form.name.toLowerCase().replace(/\s+/g, "-"));
      fd.append("description", form.description);
      fd.append("isActive", String(form.isActive));
      fd.append("products", JSON.stringify(form.products));
      if (imageFile) fd.append("image", imageFile);

      if (editItem) {
        await adminApi.updateCollection(editItem._id, fd);
        toast.success("Collection updated");
      } else {
        await adminApi.createCollection(fd);
        toast.success("Collection created");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save collection");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold font-display">
            {editItem ? "Edit Collection" : "Create Collection"}
          </h2>
          <button onClick={onClose} aria-label="Close collection form" className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Collection name"
              className="w-full px-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Slug</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="collection-slug"
              className="w-full px-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Brief description..."
              className="w-full px-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Products in This Collection</label>
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                {loadingProducts ? (
                  <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading products...
                  </div>
                ) : allProducts.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">No products available.</p>
                ) : (
                  allProducts
                    .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                    .map((p) => {
                      const checked = form.products.includes(p._id);
                      return (
                        <label
                          key={p._id}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted/40 transition-colors",
                            checked && "bg-brand-50/60"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setForm({
                                ...form,
                                products: checked
                                  ? form.products.filter((id) => id !== p._id)
                                  : [...form.products, p._id],
                              })
                            }
                            className="w-4 h-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500 cursor-pointer shrink-0"
                          />
                          <span className="text-sm truncate">{p.name}</span>
                        </label>
                      );
                    })
                )}
              </div>
            </div>
            {form.products.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-2 text-right">
                {form.products.length} product{form.products.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded border-border"
            />
            <label htmlFor="isActive" className="text-sm">Active</label>
          </div>

          <div className="flex gap-4 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              {editItem ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
