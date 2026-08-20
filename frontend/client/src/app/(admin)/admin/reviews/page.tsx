"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Star,
  Search,
  Trash2,
  ThumbsUp,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Filter,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/lib/admin/api";
import { cn, formatDate } from "@/lib/admin/utils";
import { Card, CardContent } from "@/components/admin-ui/card";
import { Badge } from "@/components/admin-ui/badge";
import { Button } from "@/components/admin-ui/button";
import { Skeleton } from "@/components/admin-ui/skeleton";
import type { Review } from "@/types/admin";

export default function AdminReviews() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [approving, setApproving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const limit = 15;

  // Store the raw API data before client-side filtering
  const [rawReviews, setRawReviews] = useState<Review[]>([]);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (filter === "approved") params.isApproved = true;
      if (filter === "pending") params.isApproved = false;
      if (search) params.search = search;
      const res = await adminApi.getReviews(params);
      const data = res.data || res;
      setRawReviews(data.reviews || []);
      setTotalPages(data.totalPages || res.pagination?.totalPages || 1);
      setTotal(data.total || res.pagination?.total || 0);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Apply client-side rating filter without re-fetching
  const reviews = ratingFilter > 0
    ? rawReviews.filter((r) => r.rating === ratingFilter)
    : rawReviews;

  const handleApprove = async (id: string) => {
    try {
      setApproving(id);
      await adminApi.approveReview(id);
      toast.success("Review approved");
      fetchReviews();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve");
    } finally {
      setApproving(null);
    }
  };

  const handleDelete = async (id: string) => {
    // Was a single unguarded click, and it sits right next to Approve in the
    // moderation row — the two easiest actions to mix up. Deleting also
    // recomputes the product's rating, so a misclick silently moves the star
    // average on the storefront with no way back.
    if (!window.confirm("Delete this review permanently? This cannot be undone.")) return;
    try {
      setDeleting(id);
      await adminApi.deleteReview(id);
      toast.success("Review deleted");
      fetchReviews();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  // Compute stats from raw data (before rating filter)
  const pendingCount = rawReviews.filter((r) => !r.isApproved).length;

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0">
      {Array.from({ length: 5 }).map((_, s) => (
        <Star
          key={s}
          size={14}
          className={cn(
            s < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"
          )}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display">Reviews</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {total > 0 ? `${total} review${total !== 1 ? "s" : ""} total` : "Manage customer reviews and ratings"}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search reviews..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm"
          />
        </div>
        <div className="flex gap-2">
          {[
            { value: "all" as const, label: "All" },
            { value: "pending" as const, label: `Pending (${pendingCount})` },
            { value: "approved" as const, label: "Approved" },
          ].map((opt) => (
            <Button
              key={opt.value}
              variant={filter === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => { setFilter(opt.value); setPage(1); }}
              className="text-xs"
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <Filter size={14} className="text-muted-foreground" />
          {[0, 5, 4, 3, 2, 1].map((r) => (
            <button
              key={r}
              onClick={() => { setRatingFilter(ratingFilter === r ? 0 : r); setPage(1); }}
              className={cn(
                "px-2 py-2 rounded-lg text-xs font-medium transition-all",
                ratingFilter === r
                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              )}
            >
              {r === 0 ? "All" : renderStars(r)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Star size={40} className="mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-2">No reviews found</h3>
            <p className="text-muted-foreground">
              {search ? "Try a different search" : "No reviews match your current filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Review Cards */}
          <div className="space-y-4">
            {reviews.map((review, i) => (
              <motion.div
                key={review._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className={cn(
                  "hover:shadow-md transition-all",
                  !review.isApproved && "border-l-4 border-l-amber-400"
                )}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {review.userName?.[0] || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{review.userName}</span>
                              {renderStars(review.rating)}
                              <span className="text-xs text-muted-foreground">{review.rating}/5</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0 text-xs text-muted-foreground">
                              <span>{formatDate(review.createdAt)}</span>
                              {review.title && (
                                <>
                                  <span>·</span>
                                  <span className="font-medium text-foreground">&ldquo;{review.title}&rdquo;</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={review.isApproved ? "success" : "secondary"}
                            className={cn(
                              "text-[10px] shrink-0",
                              review.isApproved ? "" : "bg-amber-100 text-amber-700 border-amber-200"
                            )}
                          >
                            {review.isApproved ? "Approved" : "Pending"}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mt-4 leading-relaxed bg-muted/20 p-4 rounded-xl italic">
                          &ldquo;{review.comment}&rdquo;
                        </p>

                        {review.product && (
                          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                            <MessageSquare size={12} />
                            <span>Product:</span>
                            <span className="font-medium text-foreground">
                              {(review.product as any)?.name || "Unknown Product"}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                          {!review.isApproved && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(review._id)}
                              disabled={approving === review._id}
                              className="text-xs text-green-600 hover:bg-green-50 hover:text-green-700 border-green-200 gap-2"
                            >
                              {approving === review._id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <ThumbsUp size={12} />
                              )}
                              Approve
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(review._id)}
                            disabled={deleting === review._id}
                            className="text-xs text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200 gap-2"
                          >
                            {deleting === review._id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                            Delete
                          </Button>
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
    </div>
  );
}
