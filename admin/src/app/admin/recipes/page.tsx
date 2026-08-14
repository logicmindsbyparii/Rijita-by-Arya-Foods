/* Hallmark · macrostructure: Bento Grid · genre: modern-minimal
 * theme: Cobalt (admin variant) · accent: cool-indigo
 * Pre-emit critique: P5 H5 E5 S5 R5 V5
 */

"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed,
  Plus,
  Search,
  Edit3,
  Trash2,
  Loader2,
  X,
  Clock,
  Users,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ChefHat,
  Timer,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Zap,
  Info,
  BarChart3,
  Tag,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Recipe } from "@/types";

const difficultyConfig: Record<string, { label: string; color: string }> = {
  easy: { label: "Easy", color: "bg-green-100 text-green-700 border-green-200" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700 border-amber-200" },
  hard: { label: "Hard", color: "bg-red-100 text-red-700 border-red-200" },
};

interface RecipeForm {
  title: string;
  slug: string;
  description: string;
  ingredients: string;
  instructions: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: "easy" | "medium" | "hard";
  tags: string;
  metaTitle: string;
  metaDescription: string;
  isPublished: boolean;
}

const defaultForm: RecipeForm = {
  title: "",
  slug: "",
  description: "",
  ingredients: "",
  instructions: "",
  prepTime: 10,
  cookTime: 20,
  servings: 4,
  difficulty: "easy",
  tags: "",
  metaTitle: "",
  metaDescription: "",
  isPublished: true,
};

export default function AdminRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Recipe | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

  const limit = 12;

  const fetchRecipes = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (search) params.search = search;
      if (difficultyFilter !== "all") params.difficulty = difficultyFilter;
      const res = await adminApi.getRecipes(params);
      const data = res.data || res;
      setRecipes(data.recipes || []);
      setTotalPages(data.totalPages || res.pagination?.totalPages || 1);
      setTotal(data.total || res.pagination?.total || 0);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load recipes");
    } finally {
      setLoading(false);
    }
  }, [page, search, difficultyFilter]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const handleDelete = async (id: string) => {
    try {
      setDeleting(id);
      await adminApi.deleteRecipe(id);
      toast.success("Recipe deleted");
      fetchRecipes();
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
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
              <UtensilsCrossed className="h-4 w-4 text-rose-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-[var(--color-ink)]">Recipes</h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-2 ml-10">
            {total > 0 ? `${total} recipe${total !== 1 ? "s" : ""} total` : "Manage recipes that use your products"}
          </p>
        </div>
        <Button onClick={() => { setEditItem(null); setShowModal(true); }} className="shrink-0 gap-2">
          <Plus className="h-4 w-4" /> New Recipe
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Recipes", value: total, icon: BookOpen, accent: "text-rose-600" },
          { label: "Published", value: recipes.filter(r => r.isPublished).length, icon: CheckCircle2, accent: "text-emerald-600" },
          { label: "Total Time", value: recipes.reduce((sum, r) => sum + (r.prepTime || 0) + (r.cookTime || 0), 0), icon: Zap, accent: "text-amber-600" },
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
            { key: "easy", label: "Easy" },
            { key: "medium", label: "Medium" },
            { key: "hard", label: "Hard" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setDifficultyFilter(tab.key); setPage(1); }}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-medium transition-all",
                difficultyFilter === tab.key
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
            placeholder="Search recipes by title..."
            className="flex h-12 w-full rounded-xl border-2 border-[var(--color-rule)] bg-white px-4 pl-8 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] transition-all focus-visible:outline-none focus-visible:border-[var(--color-accent)] focus-visible:shadow-[0_0_0_3px_var(--color-focus)]"
          />
        </div>
      </div>

      {/* Loading */}
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
      ) : recipes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <UtensilsCrossed size={40} className="mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-2">No recipes found</h3>
            <p className="text-muted-foreground mb-4">
              {search ? "Try a different search" : "Create your first recipe to share with your audience"}
            </p>
            {!search && (
              <Button onClick={() => { setEditItem(null); setShowModal(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Create Recipe
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Recipe Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map((recipe, i) => {
              const diff = difficultyConfig[recipe.difficulty] || difficultyConfig.easy;
              return (
                <motion.div
                  key={recipe._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="group hover:shadow-lg transition-all overflow-hidden">
                    <div className="relative h-36 bg-gradient-to-br from-emerald-50 to-green-50">
                      {recipe.featuredImage ? (
                        <Image src={recipe.featuredImage} alt={recipe.title} width={400} height={144} className="w-full h-full object-cover" unoptimized />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ChefHat size={36} className="text-muted-foreground/20" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge className={cn("text-[10px] font-medium border", diff.color)}>
                          {diff.label}
                        </Badge>
                      </div>
                      {!recipe.isPublished && (
                        <div className="absolute bottom-2 left-2">
                          <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">
                            Draft
                          </Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-brand-600 transition-colors">
                        {recipe.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-4 h-8">
                        {recipe.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                        <span className="flex items-center gap-2">
                          <Timer size={12} /> {recipe.prepTime + recipe.cookTime} min
                        </span>
                        <span className="flex items-center gap-2">
                          <Users size={12} /> {recipe.servings} servings
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-4 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditItem(recipe); setShowModal(true); }}
                          className="gap-2 text-xs"
                        >
                          <Edit3 size={12} /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleDelete(recipe._id)}
                          disabled={deleting === recipe._id}
                        >
                          {deleting === recipe._id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="gap-2">
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="gap-2">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Recipe Modal */}
      <AnimatePresence>
        {showModal && (
          <RecipeModal
            editItem={editItem}
            onClose={() => setShowModal(false)}
            onSaved={() => { setShowModal(false); fetchRecipes(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function RecipeModal({
  editItem,
  onClose,
  onSaved,
}: {
  editItem: Recipe | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<RecipeForm>(
    editItem
      ? {
          title: editItem.title || "",
          slug: editItem.slug || "",
          description: editItem.description || "",
          ingredients: editItem.ingredients?.join("\n") || "",
          instructions: editItem.instructions?.join("\n") || "",
          prepTime: editItem.prepTime || 10,
          cookTime: editItem.cookTime || 20,
          servings: editItem.servings || 4,
          difficulty: editItem.difficulty || "easy",
          tags: editItem.tags?.join(", ") || "",
          metaTitle: (editItem as any)?.metaTitle || "",
          metaDescription: (editItem as any)?.metaDescription || "",
          isPublished: editItem.isPublished ?? true,
        }
      : defaultForm
  );
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description) {
      toast.error("Title and description are required");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("slug", form.slug || generateSlug(form.title));
      fd.append("description", form.description);
      fd.append("ingredients", JSON.stringify(form.ingredients.split("\n").filter(Boolean)));
      fd.append("instructions", JSON.stringify(form.instructions.split("\n").filter(Boolean)));
      fd.append("prepTime", String(form.prepTime));
      fd.append("cookTime", String(form.cookTime));
      fd.append("servings", String(form.servings));
      fd.append("difficulty", form.difficulty);
      fd.append("tags", JSON.stringify(form.tags.split(",").map((t: string) => t.trim()).filter(Boolean)));
      fd.append("isPublished", String(form.isPublished));
      if (editItem) {
        fd.append("metaTitle", form.metaTitle);
        fd.append("metaDescription", form.metaDescription);
      }
      if (imageFile) fd.append("image", imageFile);

      if (editItem) {
        await adminApi.updateRecipe(editItem._id, fd);
        toast.success("Recipe updated successfully");
      } else {
        await adminApi.createRecipe(fd);
        toast.success("Recipe created successfully");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save recipe");
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
              <UtensilsCrossed className="h-4 w-4 text-brand-500" />
              {editItem ? "Edit Recipe" : "New Recipe"}
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value, slug: editItem ? form.slug : generateSlug(e.target.value) })}
                placeholder="Recipe title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="flex w-full rounded-xl border border-border bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all resize-none"
                placeholder="Brief description of the recipe"
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-2">Prep (min)</label>
                <Input type="number" value={form.prepTime || ""} onChange={(e) => setForm({ ...form, prepTime: Number(e.target.value) })}
                  className="h-10 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-2">Cook (min)</label>
                <Input type="number" value={form.cookTime || ""} onChange={(e) => setForm({ ...form, cookTime: Number(e.target.value) })}
                  className="h-10 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-2">Servings</label>
                <Input type="number" value={form.servings || ""} onChange={(e) => setForm({ ...form, servings: Number(e.target.value) })}
                  className="h-10 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-2">Difficulty</label>
                <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as any })}
                  className="flex h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ingredients (one per line)</label>
              <textarea
                value={form.ingredients}
                onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                rows={5}
                className="flex w-full rounded-xl border border-border bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all resize-none font-mono"
                placeholder="1 cup ingredient&#10;2 tbsp spice&#10;..."
              />
              <p className="text-[10px] text-muted-foreground mt-2 text-right">
                {form.ingredients.split("\n").filter(Boolean).length} ingredients
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Instructions (one step per line)</label>
              <textarea
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                rows={5}
                className="flex w-full rounded-xl border border-border bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all resize-none font-mono"
                placeholder="Step 1: ...&#10;Step 2: ..."
              />
              <p className="text-[10px] text-muted-foreground mt-2 text-right">
                {form.instructions.split("\n").filter(Boolean).length} steps
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="tag1, tag2" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Featured Image</label>
              <label className="flex items-center gap-4 px-4 py-4 rounded-xl border border-dashed border-border hover:border-brand-500 cursor-pointer transition-colors bg-background">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{imageFile ? imageFile.name : "Click to upload image"}</p>
                  <p className="text-[10px] text-muted-foreground mt-0">PNG, JPG, WebP up to 5MB</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              </label>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="sr-only peer" />
                <div className="w-8 h-4 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600" />
              </label>
              <div>
                <span className="text-sm font-medium">{form.isPublished ? "Published" : "Draft"}</span>
                <p className="text-[10px] text-muted-foreground">
                  {form.isPublished ? "Visible to visitors" : "Only visible to admins"}
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1 gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editItem ? <><Edit3 className="h-4 w-4" /> Update</> : <><Plus className="h-4 w-4" /> Create</>}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}
