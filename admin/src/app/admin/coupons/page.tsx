/* Hallmark · macrostructure: Query (list) · genre: modern-minimal
 * theme: Cobalt (admin variant) · accent: cool-indigo
 * Pre-emit critique: P5 H5 E5 S5 R5 V5
 */

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  TicketPercent,
  Plus,
  Edit3,
  Trash2,
  Loader2,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Percent,
  IndianRupee,
  Search,
  CalendarDays,
  Tag,
  Gauge,
  Clock,
  CheckCircle2,
  Info,
  Timer,
  Zap,
  FileText,
  BarChart3,
  Hash,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { cn, formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Coupon } from "@/types";

interface CouponForm {
  code: string;
  description: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderAmount: number;
  maxDiscount: number;
  usageLimit: number;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
}

const defaultForm: CouponForm = {
  code: "",
  description: "",
  type: "percentage",
  value: 0,
  minOrderAmount: 0,
  maxDiscount: 0,
  usageLimit: 100,
  startsAt: "",
  expiresAt: "",
  isActive: true,
};

type StatusFilter = "all" | "active" | "inactive" | "expired";

function getCouponStatus(coupon: Coupon): { label: string; color: string; variant: "success" | "secondary" | "destructive" | "warning" } {
  const now = new Date();
  const expiresAt = new Date(coupon.expiresAt);
  const startsAt = new Date(coupon.startsAt);

  if (!coupon.isActive) return { label: "Inactive", color: "bg-stone-100 text-stone-600", variant: "secondary" };
  if (now > expiresAt) return { label: "Expired", color: "bg-red-50 text-red-600", variant: "destructive" };
  if (now < startsAt) return { label: "Scheduled", color: "bg-blue-50 text-blue-600", variant: "secondary" };

  // Expiring within 7 days
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry <= 7) return { label: "Expiring soon", color: "bg-amber-50 text-amber-600", variant: "warning" };

  return { label: "Active", color: "bg-emerald-50 text-emerald-600", variant: "success" };
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<CouponForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0 });

  const limit = 15;

  const loadCoupons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { page, limit };
      if (search) params.search = search;
      if (statusFilter === "active") params.status = "active";
      else if (statusFilter === "inactive") params.status = "inactive";
      else if (statusFilter === "expired") params.status = "expired";
      const res = await adminApi.getCoupons(params);
      const data = res.data || res;
      setCoupons(data.coupons || data || []);
      setTotalPages(data.totalPages || res.pagination?.totalPages || 1);
      setTotal(data.total || res.pagination?.total || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  // Calculate stats from loaded coupons
  useEffect(() => {
    const now = new Date();
    const active = coupons.filter(c => {
      if (!c.isActive) return false;
      const expires = new Date(c.expiresAt);
      const starts = new Date(c.startsAt);
      return now >= starts && now <= expires;
    }).length;
    const expired = coupons.filter(c => new Date(c.expiresAt) < now).length;
    setStats({ total: total, active, expired });
  }, [coupons, total]);

  const openAddForm = () => {
    setEditing(null);
    setFormData({
      ...defaultForm,
      startsAt: new Date().toISOString().split("T")[0],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });
    setShowForm(true);
  };

  const openEditForm = (coupon: Coupon) => {
    setEditing(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || "",
      type: coupon.type,
      value: coupon.value,
      minOrderAmount: coupon.minOrderAmount,
      maxDiscount: coupon.maxDiscount || 0,
      usageLimit: coupon.usageLimit,
      startsAt: new Date(coupon.startsAt).toISOString().split("T")[0],
      expiresAt: new Date(coupon.expiresAt).toISOString().split("T")[0],
      isActive: coupon.isActive,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim()) {
      toast.error("Coupon code is required");
      return;
    }
    if (formData.code.trim().length < 3) {
      toast.error("Coupon code must be at least 3 characters");
      return;
    }
    if (formData.value <= 0) {
      toast.error("Discount value must be greater than 0");
      return;
    }
    if (formData.type === "percentage" && formData.value > 100) {
      toast.error("Percentage cannot exceed 100%");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...formData,
        code: formData.code.toUpperCase(),
        startsAt: new Date(formData.startsAt).toISOString(),
        expiresAt: new Date(formData.expiresAt).toISOString(),
      };
      if (editing) {
        await adminApi.updateCoupon(editing._id, payload);
        toast.success("Coupon updated successfully");
      } else {
        await adminApi.createCoupon(payload);
        toast.success("Coupon created successfully");
      }
      setShowForm(false);
      loadCoupons();
    } catch (err: any) {
      toast.error(err.message || "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleting(true);
      await adminApi.deleteCoupon(id);
      toast.success("Coupon deleted successfully");
      setDeleteConfirm(null);
      loadCoupons();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete coupon");
    } finally {
      setDeleting(false);
    }
  };

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "inactive", label: "Inactive" },
    { key: "expired", label: "Expired" },
  ];

  const quickStats = [
    { label: "Total Coupons", value: stats.total, icon: Tag, accent: "text-blue-600" },
    { label: "Active", value: stats.active, icon: CheckCircle2, accent: "text-emerald-600" },
    { label: "Expired", value: stats.expired, icon: Timer, accent: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <TicketPercent className="h-4 w-4 text-amber-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-[var(--color-ink)]">Coupons</h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-2 ml-10">
            {total > 0 ? `${total} coupon${total !== 1 ? "s" : ""} total` : "Manage discount coupons"}
          </p>
        </div>
        <Button onClick={openAddForm} className="shrink-0 gap-2">
          <Plus className="h-4 w-4" />
          Add Coupon
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-[var(--color-rule)] p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-[0.12em]">{stat.label}</span>
                <Icon className={cn("h-4 w-4", stat.accent)} />
              </div>
              <p className="text-xl font-bold font-display text-[var(--color-ink)] tabular-nums">{stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 bg-[var(--color-surface-2)] p-2 rounded-xl">
          {statusTabs.map((tab) => (
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
            placeholder="Search coupons by code..."
            className="flex h-12 w-full rounded-xl border-2 border-[var(--color-rule)] bg-white px-4 pl-8 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] transition-all focus-visible:outline-none focus-visible:border-[var(--color-accent)] focus-visible:shadow-[0_0_0_3px_var(--color-focus)]"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[var(--color-rule)] p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-[var(--color-rule)] p-12 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-red-400" />
          <p className="font-medium text-lg mb-2">Failed to load coupons</p>
          <p className="text-sm text-[var(--color-muted)] mb-4">{error}</p>
          <Button onClick={loadCoupons} variant="outline">Retry</Button>
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-[var(--color-rule)] p-16 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <TicketPercent className="h-10 w-10 text-amber-400" />
          </div>
          <p className="font-bold text-lg mb-2 text-[var(--color-ink)]">
            {search ? "No coupons found" : "No coupons yet"}
          </p>
          <p className="text-sm text-[var(--color-muted)] mb-6 max-w-sm mx-auto">
            {search
              ? "Try a different search term"
              : "Create your first coupon to offer discounts and promotions to your customers."}
          </p>
          {!search && (
            <Button onClick={openAddForm} className="gap-2 shadow-md hover:shadow-lg transition-all">
              <Plus className="h-4 w-4" />
              Add Coupon
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {coupons.map((coupon, i) => {
              const status = getCouponStatus(coupon);
              const usedPercent = coupon.usageLimit > 0
                ? Math.min(100, Math.round(((coupon.usedCount || 0) / coupon.usageLimit) * 100))
                : 0;
              const isExpiring = status.label === "Expiring soon";
              const isExpired = status.label === "Expired";

              return (
                <motion.div
                  key={coupon._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className={cn(
                    "bg-white rounded-2xl border border-[var(--color-rule)] p-4 hover:shadow-md transition-all",
                    isExpiring && "ring-1 ring-amber-300/40",
                    isExpired && "opacity-70"
                  )}>
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className={cn(
                        "p-4 rounded-xl shrink-0",
                        isExpired ? "bg-stone-100 text-stone-400" : "bg-brand-50 text-brand-600"
                      )}>
                        {coupon.type === "percentage" ? (
                          <Percent className="h-4 w-4" />
                        ) : (
                          <IndianRupee className="h-4 w-4" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className={cn(
                            "px-2 py-0 rounded-md font-mono text-sm font-bold tracking-wider",
                            isExpired ? "bg-stone-100 text-stone-500" : "bg-muted text-[var(--color-ink)]"
                          )}>
                            {coupon.code}
                          </code>
                          <span className={cn(
                            "text-base font-bold font-display",
                            isExpired ? "text-stone-400" : "text-[var(--color-ink)]"
                          )}>
                            {coupon.type === "percentage" ? `${coupon.value}%` : formatPrice(coupon.value)}
                          </span>
                          <span className={cn(
                            "inline-flex items-center px-2 py-0 rounded-full text-[10px] font-semibold capitalize border",
                            status.color
                          )}>
                            {status.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-muted)] flex-wrap">
                          <span className="flex items-center gap-2">
                            <IndianRupee className="h-4 w-4" />
                            Min: {formatPrice(coupon.minOrderAmount)}
                          </span>
                          {coupon.maxDiscount != null && coupon.maxDiscount > 0 && (
                            <span className="flex items-center gap-2">
                              <Gauge className="h-4 w-4" />
                              Max: {formatPrice(coupon.maxDiscount)}
                            </span>
                          )}
                          <span className="flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            Used: {coupon.usedCount || 0}/{coupon.usageLimit}
                          </span>
                          <span className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            {formatDate(coupon.startsAt)} — {formatDate(coupon.expiresAt)}
                          </span>
                        </div>

                        {coupon.description && (
                          <p className="text-xs text-[var(--color-muted)] mt-2">{coupon.description}</p>
                        )}

                        {/* Usage progress bar */}
                        <div className="mt-2 max-w-xs">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                              <motion.div
                                initial={{ width: "0%" }}
                                animate={{ width: `${usedPercent}%` }}
                                transition={{ duration: 0.5, delay: i * 0.05 }}
                                className={cn(
                                  "h-full rounded-full",
                                  usedPercent >= 80 ? "bg-red-400" :
                                  usedPercent >= 50 ? "bg-amber-400" :
                                  "bg-emerald-400"
                                )}
                              />
                            </div>
                            <span className={cn(
                              "text-[10px] font-medium tabular-nums",
                              usedPercent >= 80 ? "text-red-500" : "text-[var(--color-muted)]"
                            )}>
                              {usedPercent}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditForm(coupon)}
                          className="h-8 w-8 rounded-lg"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm(coupon._id)}
                          className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-[var(--color-muted)]">Page {page} of {totalPages}</p>
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

      {/* ── Coupon Form Slide-over ── */}
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
              className="fixed top-0 right-0 z-50 h-full w-full max-w-xl bg-white shadow-2xl overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-[var(--color-rule)] flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                    <TicketPercent className="h-4 w-4 text-amber-600" />
                  </div>
                  <h2 className="text-lg font-bold font-display text-[var(--color-ink)]">
                    {editing ? "Edit Coupon" : "Add Coupon"}
                  </h2>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors">
                  <X className="h-4 w-4 text-[var(--color-ink-3)]" />
                </button>
              </div>

              <div className="p-6 space-y-8">
                {/* ── Section: Coupon Code ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-rule)]">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Tag className="h-4 w-4 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--color-ink)]">Coupon Details</h3>
                    <span className="text-xs text-[var(--color-muted)] ml-auto">Required fields marked with *</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Coupon Code <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') }))}
                      placeholder="e.g. SAVE20, FESTIVE25"
                      className="font-mono uppercase tracking-wider"
                    />
                    <p className="text-xs text-[var(--color-muted)] mt-2">
                      {formData.code.length} characters — use letters, numbers, hyphens, and underscores only.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                      placeholder="e.g. 20% off on all namkeen products"
                    />
                    <p className="text-xs text-[var(--color-muted)] mt-2">Shown to customers when they view or apply this coupon.</p>
                  </div>
                </div>

                {/* ── Section: Discount Details ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-rule)]">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--color-ink)]">Discount Settings</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Discount Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value as "percentage" | "fixed" }))}
                        className="flex h-12 w-full rounded-xl border-2 border-[var(--color-rule)] bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-[var(--color-accent)] focus-visible:shadow-[0_0_0_3px_var(--color-focus)] transition-all"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {formData.type === "percentage" ? "Discount %" : "Discount Amount (₹)"} <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={formData.type === "percentage" ? 100 : undefined}
                        value={formData.value || ""}
                        onChange={(e) => setFormData((p) => ({ ...p, value: Number(e.target.value) }))}
                        placeholder={formData.type === "percentage" ? "e.g. 20" : "e.g. 100"}
                      />
                      {formData.type === "percentage" && formData.value > 0 && (
                        <p className={cn(
                          "text-[10px] mt-2",
                          formData.value > 100 ? "text-red-500" : "text-[var(--color-muted)]"
                        )}>
                          {formData.value > 100 ? "Cannot exceed 100%" : "Max 100% off"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Min Order Amount (₹)</label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.minOrderAmount || ""}
                        onChange={(e) => setFormData((p) => ({ ...p, minOrderAmount: Number(e.target.value) }))}
                        placeholder="0 = no minimum"
                      />
                      <p className="text-xs text-[var(--color-muted)] mt-2">Minimum cart value to apply this coupon.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Max Discount (₹)</label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.maxDiscount || ""}
                        onChange={(e) => setFormData((p) => ({ ...p, maxDiscount: Number(e.target.value) }))}
                        placeholder="0 = no limit"
                      />
                      <p className="text-xs text-[var(--color-muted)] mt-2">Applies only to percentage discounts.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Usage Limit</label>
                      <Input
                        type="number"
                        min={1}
                        value={formData.usageLimit || ""}
                        onChange={(e) => setFormData((p) => ({ ...p, usageLimit: Number(e.target.value) }))}
                      />
                      <p className="text-xs text-[var(--color-muted)] mt-2">Total number of times this coupon can be used.</p>
                    </div>
                  </div>
                </div>

                {/* ── Section: Validity ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-rule)]">
                    <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-rose-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--color-ink)]">Validity Period</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Start Date</label>
                      <Input
                        type="date"
                        value={formData.startsAt}
                        onChange={(e) => setFormData((p) => ({ ...p, startsAt: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Expiry Date</label>
                      <Input
                        type="date"
                        value={formData.expiresAt}
                        onChange={(e) => setFormData((p) => ({ ...p, expiresAt: e.target.value }))}
                      />
                    </div>
                  </div>

                  {formData.startsAt && formData.expiresAt && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                      <div className="flex items-center gap-2 text-xs text-amber-700">
                        <Info className="h-4 w-4 shrink-0" />
                        <span>
                          Coupon valid for {Math.max(0, Math.ceil((new Date(formData.expiresAt).getTime() - new Date(formData.startsAt).getTime()) / (1000 * 60 * 60 * 24)))} days
                          {new Date(formData.expiresAt) < new Date() && (
                            <span className="text-red-500"> — Expiry date is in the past!</span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Section: Status ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-rule)]">
                    <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-stone-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--color-ink)]">Status</h3>
                  </div>

                  <label className={cn(
                    "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    formData.isActive
                      ? "border-emerald-200 bg-emerald-50/30"
                      : "border-[var(--color-rule)] bg-background hover:border-stone-300"
                  )}>
                    <div className={cn(
                      "w-4 h-4 rounded mt-0 flex items-center justify-center shrink-0 transition-all",
                      formData.isActive ? "bg-emerald-500 shadow-sm" : "bg-muted/50 border border-[var(--color-rule)]"
                    )}>
                      {formData.isActive && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-medium block leading-tight">Active</span>
                      <span className="text-[10px] text-[var(--color-muted)] block mt-0">
                        {formData.isActive
                          ? "Coupon is live and customers can apply it at checkout."
                          : "Coupon is disabled and won't be available to customers."}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-[var(--color-rule)] p-4 flex gap-4 justify-end">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-[120px]">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? "Update Coupon" : "Create Coupon"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-[var(--color-rule)] overflow-hidden">
                <div className="p-6 text-center">
                  <div className="p-4 rounded-2xl bg-red-50 w-fit mx-auto mb-4">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--color-ink)] mb-2">Delete Coupon?</h3>
                  <p className="text-sm text-[var(--color-muted)] mb-6">
                    This coupon will be permanently deleted. Users will no longer be able to use it.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)} disabled={deleting} className="gap-2">
                      {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Delete Coupon
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
