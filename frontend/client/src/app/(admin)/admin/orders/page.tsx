"use client";

import Image from "next/image";
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  ShoppingBag,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Package,
  MapPin,
  Phone,
  User,
  FileText,
  MessageSquare,
  MessageCircle,
  X,
  CheckCircle2,
  Clock,
  Truck,
  IndianRupee,
  TrendingUp,
  FilterX,
  CheckSquare,
  Square,
  Layers,
  RefreshCw,
  Rocket,
  Printer,
  Receipt,
  ClipboardList,
  ExternalLink,
  Ban,
  PlugZap,
} from "lucide-react";
import { orderApi, shippingApi } from "@/lib/admin/api";
import { cn, formatPrice, formatDate, generateWhatsAppUrl } from "@/lib/admin/utils";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import { Card, CardContent } from "@/components/admin-ui/card";
import { Badge } from "@/components/admin-ui/badge";
import { Skeleton } from "@/components/admin-ui/skeleton";
import type { Order, CourierOption, ShiprocketStatus } from "@/types/admin";

/* Hallmark · component: admin-orders-page · genre: modern-minimal
 * macrostructure: Query (list) · accent: cool-indigo
 * Pre-emit critique: P5 H4 E5 S4 R5 V5
 */

const statusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-300/30",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-300/30",
  packed: "bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-300/30",
  dispatched: "bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-300/30",
  "out-for-delivery": "bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-300/30",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-300/30",
  cancelled: "bg-red-50 text-red-700 border-red-200 ring-1 ring-red-300/30",
  returned: "bg-stone-100 text-stone-700 border-stone-200 ring-1 ring-stone-300/30",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-600 border-amber-200 ring-1 ring-amber-300/20",
  completed: "bg-emerald-50 text-emerald-600 border-emerald-200 ring-1 ring-emerald-300/20",
  failed: "bg-red-50 text-red-600 border-red-200 ring-1 ring-red-300/20",
  refunded: "bg-violet-50 text-violet-600 border-violet-200 ring-1 ring-violet-300/20",
};

const statusSteps = [
  "pending",
  "confirmed",
  "packed",
  "dispatched",
  "out-for-delivery",
  "delivered",
];

const statuses = [...statusSteps, "cancelled", "returned"];

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  confirmed: CheckCircle2,
  packed: Package,
  dispatched: Truck,
  "out-for-delivery": Truck,
  delivered: CheckCircle2,
  cancelled: X,
  returned: RefreshCw,
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [trackingNote, setTrackingNote] = useState("");
  const [addingNote, setAddingNote] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [summary, setSummary] = useState({ total: 0, pending: 0, delivered: 0, revenue: 0 });

  // Shiprocket
  const [shiprocket, setShiprocket] = useState<ShiprocketStatus | null>(null);
  const [courierOptions, setCourierOptions] = useState<{ weight: number; couriers: CourierOption[] } | null>(null);
  const [loadingCouriers, setLoadingCouriers] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState("");
  const [shipAction, setShipAction] = useState<string | null>(null);

  const limit = 15;

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { page, limit };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (paymentFilter) params.paymentStatus = paymentFilter;
      if (dateFrom) params.fromDate = dateFrom;
      if (dateTo) params.toDate = dateTo;
      const res = await orderApi.adminGetOrders(params);
      const data = res.data || res;
      setOrders(data.orders || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotal(res.pagination?.total || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, paymentFilter, dateFrom, dateTo]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Load summary
  useEffect(() => {
    const loadSummary = async () => {
      try {
        const res = await orderApi.getOrderAnalytics();
        const analytics = res?.data?.analytics || res?.analytics || {};
        setSummary({
          total: analytics.totalOrders || 0,
          pending: analytics.pendingOrders || 0,
          delivered: analytics.completedOrders || 0,
          revenue: analytics.totalRevenue || 0,
        });
      } catch {}
    };
    loadSummary();
  }, []);

  // Debounced search — only trigger API after 400ms of no typing
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Shiprocket connection status — drives whether the shipping panel is usable
  useEffect(() => {
    shippingApi
      .getStatus()
      .then((res) => setShiprocket(res?.data ?? null))
      .catch(() => setShiprocket(null));
  }, []);

  const expandedOrder = orders.find((o) => o._id === expandedId) || null;
  const expandedAwb = expandedOrder?.shipping?.awbCode || "";
  const expandedStatus = expandedOrder?.status || "";

  // Fetch live courier rates for the expanded order, but only while an AWB is
  // still to be assigned — that is the only screen where the picker is shown.
  useEffect(() => {
    setCourierOptions(null);
    setSelectedCourier("");

    if (!expandedId || !shiprocket?.connected) return;
    if (expandedAwb) return;
    if (["cancelled", "returned"].includes(expandedStatus)) return;

    let cancelled = false;
    setLoadingCouriers(true);
    shippingApi
      .getCourierOptions(expandedId)
      .then((res) => { if (!cancelled) setCourierOptions(res?.data ?? null); })
      .catch(() => { if (!cancelled) setCourierOptions(null); })
      .finally(() => { if (!cancelled) setLoadingCouriers(false); });

    return () => { cancelled = true; };
  }, [expandedId, expandedAwb, expandedStatus, shiprocket?.connected]);

  const runShipAction = async (key: string, fn: () => Promise<any>, fallbackMessage: string) => {
    try {
      setShipAction(key);
      const res = await fn();
      toast.success(res?.message || fallbackMessage);
      await loadOrders();
      return res;
    } catch (err: any) {
      toast.error(err.message || "Shiprocket request failed");
      return null;
    } finally {
      setShipAction(null);
    }
  };

  const handleCreateShipment = async (order: Order) => {
    const res = await runShipAction(
      "create",
      () => shippingApi.createShipment(order._id, {
        courierId: selectedCourier || undefined,
        autoAssignAwb: true,
      }),
      "Order pushed to Shiprocket"
    );
    if (res?.data?.awbError) toast.error(`AWB not assigned: ${res.data.awbError}`);
  };

  const handleOpenDocument = async (key: string, request: () => Promise<any>, field: string, label: string) => {
    const res = await runShipAction(key, request, `${label} generated`);
    const url = res?.data?.[field];
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCancelShipment = async (order: Order) => {
    if (!window.confirm(
      `Cancel the Shiprocket shipment for order #${order.orderNumber}? The courier pickup will be called off.`
    )) return;
    await runShipAction(
      "cancel",
      () => shippingApi.cancelShipment(order._id, { cancelOrder: true }),
      "Shipment cancelled"
    );
  };

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete order #${orderNumber}? This cannot be undone.`)) return;
    try {
      setUpdatingStatus(orderId);
      await orderApi.deleteOrder(orderId);
      toast.success(`Order #${orderNumber} deleted`);
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete order");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("");
    setPaymentFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const hasFilters = search || statusFilter || paymentFilter || dateFrom || dateTo;

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingStatus(orderId);
      await orderApi.updateOrderStatus(orderId, { status: newStatus });
      toast.success(`Order status updated to ${newStatus.replace(/-/g, " ")}`);
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleMarkPaid = async (order: Order) => {
    if (!window.confirm(`Confirm that payment for order #${order.orderNumber} has actually been received?`)) return;
    try {
      setUpdatingStatus(order._id);
      await orderApi.verifyPayment(order.orderNumber);
      toast.success("Payment marked as received");
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || "Failed to mark payment as received");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleAddNote = async (orderId: string) => {
    if (!trackingNote.trim()) { toast.error("Please enter a note"); return; }
    try {
      setUpdatingStatus(orderId);
      const currentOrder = orders.find((o) => o._id === orderId);
      await orderApi.updateOrderStatus(orderId, {
        status: currentOrder?.status || "pending",
        note: trackingNote,
      });
      toast.success("Note added successfully");
      setTrackingNote("");
      setAddingNote(null);
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || "Failed to add note");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleNotifyCustomer = (order: Order) => {
    if (!order.shippingAddress?.phone) {
      toast.error("No phone number available for this customer.");
      return;
    }
    const trackingUrl = `${window.location.origin}/orders/${order.orderNumber}`;
    const text = `Hello ${order.shippingAddress.fullName || ""}!\n\nYour order *#${order.orderNumber}* from RIJITA by Arya Foods has been updated to: *${order.status.replace(/-/g, " ").toUpperCase()}*.\n\nTrack your order here: ${trackingUrl}`;
    const url = generateWhatsAppUrl(text, order.shippingAddress.phone);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Bulk selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(orders.map((o) => o._id)));
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    try {
      setBulkUpdating(true);
      await orderApi.bulkUpdateStatus({
        orderIds: Array.from(selectedIds),
        status: bulkStatus,
        note: `Bulk update to ${bulkStatus}`,
      });
      toast.success(`${selectedIds.size} orders updated to ${bulkStatus.replace(/-/g, " ")}`);
      setSelectedIds(new Set());
      setBulkStatus("");
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || "Bulk update failed");
    } finally {
      setBulkUpdating(false);
    }
  };

  const summaryCards = [
    { label: "Total Orders", value: summary.total, icon: ShoppingBag, color: "bg-blue-50 text-blue-600" },
    { label: "Pending", value: summary.pending, icon: Clock, color: "bg-amber-50 text-amber-600" },
    { label: "Delivered", value: summary.delivered, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
    { label: "Total Revenue", value: `₹${summary.revenue.toLocaleString("en-IN")}`, icon: IndianRupee, color: "bg-violet-50 text-violet-600" },
  ];

  const quickFilters = [
    { label: "Today", getValue: () => new Date().toISOString().split("T")[0] },
    { label: "This Week", getValue: () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split("T")[0]; } },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display">Orders</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {total > 0 ? `${total} order${total !== 1 ? "s" : ""} total` : "Manage customer orders"}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl border border-border bg-white hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                <div className={cn("p-2 rounded-lg", card.color)}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-xl font-bold font-display">{card.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Shiprocket connection banner — only when something needs attention */}
      {shiprocket && (!shiprocket.configured || !shiprocket.connected || !shiprocket.webhookConfigured) && (
        <div
          className={cn(
            "p-4 rounded-2xl border text-sm flex items-start gap-4",
            shiprocket.configured && shiprocket.connected
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-red-50 border-red-200 text-red-800"
          )}
        >
          <PlugZap className="h-4 w-4 mt-0 shrink-0" />
          <div>
            {!shiprocket.configured ? (
              <p>
                Shiprocket is not configured — set <code className="font-mono text-xs">SHIPROCKET_EMAIL</code>,{" "}
                <code className="font-mono text-xs">SHIPROCKET_PASSWORD</code> and{" "}
                <code className="font-mono text-xs">SHIPROCKET_PICKUP_PINCODE</code> in the server environment.
              </p>
            ) : !shiprocket.connected ? (
              <p>Shiprocket credentials were rejected{shiprocket.error ? `: ${shiprocket.error}` : "."}</p>
            ) : (
              <p>
                Shiprocket is connected, but the status webhook is not set up. Add{" "}
                <code className="font-mono text-xs">SHIPROCKET_WEBHOOK_TOKEN</code> and point Shiprocket at{" "}
                <code className="font-mono text-xs">/api/shipping/webhook/shiprocket</code> for real-time updates.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by order number, customer name, phone..."
                className="pl-8"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="flex h-12 rounded-xl border border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all"
              >
                <option value="">All Status</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>{s.replace(/-/g, " ")}</option>
                ))}
              </select>
              <select
                value={paymentFilter}
                onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
                className="flex h-12 rounded-xl border border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all"
              >
                <option value="">All Payment</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex h-12 rounded-xl border border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex h-12 rounded-xl border border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all"
              />
            </div>
          </div>

          {/* Quick filters + filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Quick:</span>
            {quickFilters.map((qf) => (
              <button
                key={qf.label}
                onClick={() => {
                  setDateFrom(qf.getValue());
                  setDateTo(new Date().toISOString().split("T")[0]);
                  setPage(1);
                }}
                className="px-4 py-2 rounded-lg text-xs font-medium border border-border hover:border-brand-400 hover:text-brand-600 transition-all"
              >
                {qf.label}
              </button>
            ))}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 rounded-lg text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-all flex items-center gap-2"
              >
                <FilterX className="h-4 w-4" /> Clear
              </button>
            )}
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              {search && (
                <span className="inline-flex items-center gap-2 px-2 py-0 rounded-md bg-brand-50 text-brand-700 text-[10px] font-medium">
                  Search: &quot;{search}&quot;
                  <button onClick={() => { setSearchInput(""); setSearch(""); }}><X className="h-4 w-4" /></button>
                </span>
              )}
              {statusFilter && (
                <span className="inline-flex items-center gap-2 px-2 py-0 rounded-md bg-blue-50 text-blue-700 text-[10px] font-medium capitalize">
                  {statusFilter.replace(/-/g, " ")}
                  <button onClick={() => setStatusFilter("")}><X className="h-4 w-4" /></button>
                </span>
              )}
              {paymentFilter && (
                <span className="inline-flex items-center gap-2 px-2 py-0 rounded-md bg-amber-50 text-amber-700 text-[10px] font-medium capitalize">
                  Payment: {paymentFilter}
                  <button onClick={() => setPaymentFilter("")}><X className="h-4 w-4" /></button>
                </span>
              )}
              {dateFrom && (
                <span className="inline-flex items-center gap-2 px-2 py-0 rounded-md bg-purple-50 text-purple-700 text-[10px] font-medium">
                  <CalendarDays className="h-4 w-4" /> {dateFrom} — {dateTo || "now"}
                  <button onClick={() => { setDateFrom(""); setDateTo(""); }}><X className="h-4 w-4" /></button>
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardContent></Card>
          ))}
        </div>
      ) : error ? (
        <Card><CardContent className="p-12 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-red-400" />
          <p className="font-medium text-lg mb-2">Failed to load orders</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadOrders} variant="outline">Retry</Button>
        </CardContent></Card>
      ) : orders.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="font-medium text-lg mb-2">No orders found</p>
          <p className="text-sm text-muted-foreground">{hasFilters ? "Try different filters" : "No orders have been placed yet"}</p>
        </CardContent></Card>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order, i) => {
              const OrderIcon = statusIcons[order.status] || Package;
              return (
                <motion.div
                  key={order._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    selectedIds.has(order._id) && "ring-2 ring-brand-400/30 rounded-2xl"
                  )}
                >
                   <Card
                    className={cn(
                      "hover:shadow-md transition-all cursor-pointer table-row-hover",
                      expandedId === order._id ? "ring-2 ring-brand-500/20" : "odd:bg-white even:bg-stone-50/35"
                    )}
                    onClick={() => setExpandedId(expandedId === order._id ? null : order._id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Checkbox */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleSelect(order._id)}
                            className="p-0 rounded hover:bg-muted transition-colors"
                          >
                            {selectedIds.has(order._id) ? (
                              <CheckSquare className="h-4 w-4 text-brand-600" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground/50" />
                            )}
                          </button>
                        </div>

                        <div className="flex-1 flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold">#{order.orderNumber}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                            <User className="h-4 w-4 shrink-0" />
                            <span className="truncate">{typeof order.user === "object" ? order.user?.name : order.shippingAddress?.fullName || "N/A"}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""}
                          </span>
                          <span className="text-sm font-semibold">{formatPrice(order.total)}</span>

                          {/* Status badges */}
                          <div className="flex items-center gap-2">
                            <Badge className={cn(
                              "capitalize inline-flex items-center gap-2",
                              statusColors[order.status] || "bg-gray-100 text-gray-700"
                            )}>
                              <OrderIcon className="h-4 w-4" />
                              {order.status?.replace(/-/g, " ")}
                            </Badge>
                            <Badge className={cn(
                              "text-[10px] capitalize",
                              paymentStatusColors[order.paymentStatus] || "bg-gray-100 text-gray-700"
                            )}>
                              {order.paymentStatus}
                            </Badge>
                            {order.paymentMethod && (
                              <Badge variant="outline" className="text-[10px] capitalize bg-slate-50 text-slate-600 border-slate-200">
                                {order.paymentMethod.replace('-', ' ')}
                              </Badge>
                            )}
                          </div>

                          <span className="text-xs text-muted-foreground flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            {formatDate(order.createdAt)}
                          </span>
                        </div>

                        <div className="shrink-0 text-muted-foreground">
                          {expandedId === order._id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedId === order._id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t border-border space-y-4">
                              {/* Status Stepper */}
                              <div className="p-4 rounded-xl bg-gradient-to-br from-muted/30 to-transparent border border-border">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4" />
                                  Order Progress
                                </h4>
                                <div className="flex items-start gap-0 overflow-x-auto pb-2">
                                  {statusSteps.map((step, idx) => {
                                    const currentIdx = statusSteps.indexOf(order.status);
                                    const isCancelled = order.status === "cancelled" || order.status === "returned";
                                    const isCompleted = idx <= currentIdx && !isCancelled;
                                    const isCurrent = idx === currentIdx && !isCancelled;
                                    const StepIcon = statusIcons[step];
                                    return (
                                      <div key={step} className="flex items-center min-w-0">
                                        <div className="flex flex-col items-center min-w-[60px]">
                                          <div className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300",
                                            isCompleted ? "bg-brand-600 text-white shadow-sm" : isCancelled && idx === 0 ? "bg-red-100 text-red-500" : "bg-muted text-muted-foreground",
                                            isCurrent && "ring-2 ring-brand-300 ring-offset-2"
                                          )}>
                                            {isCompleted ? (
                                              <CheckCircle2 className="h-4 w-4" />
                                            ) : (
                                              <StepIcon className="h-4 w-4" />
                                            )}
                                          </div>
                                          <span className={cn(
                                            "text-[9px] font-medium mt-2 text-center leading-tight max-w-[60px]",
                                            isCompleted ? "text-brand-700" : isCancelled && idx === 0 ? "text-red-600" : "text-muted-foreground"
                                          )}>
                                            {step.replace(/-/g, "\n")}
                                          </span>
                                        </div>
                                        {idx < statusSteps.length - 1 && (
                                          <div className={cn(
                                            "h-0 w-8 mx-2 mt-[-20px] rounded-full transition-colors duration-300",
                                            isCompleted && idx < currentIdx ? "bg-brand-400" : isCompleted && idx === currentIdx ? "bg-brand-300" : "bg-border"
                                          )} />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Order Items
                                  </h4>
                                  <div className="space-y-2">
                                    {order.items?.map((item, j) => (
                                      <div key={j} className="flex items-center gap-4 p-2 rounded-lg bg-muted/30">
                                        {item.image && (
                                          <Image src={item.image} alt="" width={40} height={40} className="h-10 w-10 rounded-lg object-cover shrink-0" unoptimized />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">{item.productName}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {item.weight} x {item.quantity} = {formatPrice(item.total)}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Subtotal</span>
                                      <span>{formatPrice(order.subtotal)}</span>
                                    </div>
                                    {order.discount > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Discount</span>
                                        <span className="text-green-600">-{formatPrice(order.discount)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Delivery</span>
                                      <span>{order.deliveryCharge > 0 ? formatPrice(order.deliveryCharge) : "Free"}</span>
                                    </div>
                                    {order.gstAmount > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">GST</span>
                                        <span>{formatPrice(order.gstAmount)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between font-bold pt-2 border-t border-border">
                                      <span>Total</span>
                                      <span>{formatPrice(order.total)}</span>
                                    </div>
                                    {order.coupon && (
                                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        Coupon: {order.coupon}
                                      </div>
                                    )}
                                    {order.notes && (
                                      <div className="text-xs text-muted-foreground flex items-start gap-2 mt-2 p-2 rounded-lg bg-muted/20">
                                        <FileText className="h-4 w-4 mt-0 shrink-0" />
                                        <span>{order.notes}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      Shipping Address
                                    </h4>
                                    <div className="p-4 rounded-lg bg-muted/30 text-sm space-y-2">
                                      <p className="font-medium">{order.shippingAddress?.fullName}</p>
                                      <p className="flex items-center gap-2 text-muted-foreground">
                                        <Phone className="h-4 w-4" />
                                        {order.shippingAddress?.phone}
                                      </p>
                                      <p className="text-muted-foreground">
                                        {order.shippingAddress?.addressLine1}
                                        {order.shippingAddress?.addressLine2 && `, ${order.shippingAddress.addressLine2}`}
                                      </p>
                                      <p className="text-muted-foreground">
                                        {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}
                                      </p>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                      <Layers className="h-4 w-4" />
                                      Update Status
                                    </h4>
                                    <div className="flex gap-2 flex-wrap">
                                      {statuses.map((s) => {
                                        const SIcon = statusIcons[s];
                                        return (
                                          <button
                                            key={s}
                                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(order._id, s); }}
                                            disabled={updatingStatus === order._id || order.status === s}
                                            className={cn(
                                              "px-4 py-2 rounded-lg text-xs font-medium transition-all border inline-flex items-center gap-2",
                                              order.status === s
                                                ? "border-brand-500 bg-brand-50 text-brand-700"
                                                : "border-border hover:border-brand-500/50 text-muted-foreground hover:text-foreground"
                                            )}
                                          >
                                            {updatingStatus === order._id ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <SIcon className="h-4 w-4" />
                                            )}
                                            {s.replace(/-/g, " ")}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {order.paymentStatus !== "completed" && (
                                    <div>
                                      <Button
                                        size="sm"
                                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                        disabled={updatingStatus === order._id}
                                        onClick={(e) => { e.stopPropagation(); handleMarkPaid(order); }}
                                      >
                                        {updatingStatus === order._id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="h-4 w-4" />
                                        )}
                                        Mark Payment as Received
                                      </Button>
                                    </div>
                                  )}

                                  <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                      <FileText className="h-4 w-4" />
                                      Tracking Timeline
                                    </h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                      {(order.tracking || []).length > 0 ? (
                                        order.tracking.map((t, j) => {
                                          const TIcon = statusIcons[t.status] || Package;
                                          return (
                                            <div key={j} className="flex items-start gap-4">
                                              <div className="flex flex-col items-center">
                                                <div className={cn(
                                                  "h-6 w-6 rounded-full flex items-center justify-center",
                                                  statusColors[t.status]?.split(" ")[0] || "bg-gray-100"
                                                )}>
                                                  <TIcon className="h-4 w-4" />
                                                </div>
                                                {j < (order.tracking?.length || 0) - 1 && (
                                                  <div className="w-px h-4 bg-border" />
                                                )}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm capitalize font-medium">{t.status?.replace(/-/g, " ")}</p>
                                                {t.note && <p className="text-xs text-muted-foreground">{t.note}</p>}
                                                <p className="text-[10px] text-muted-foreground mt-0">{formatDate(t.date)}</p>
                                              </div>
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <p className="text-sm text-muted-foreground">No tracking updates yet</p>
                                      )}
                                    </div>
                                  </div>

                                  <div>
                                    {addingNote === order._id ? (
                                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                        <Input
                                          value={trackingNote}
                                          onChange={(e) => setTrackingNote(e.target.value)}
                                          placeholder="Enter tracking note..."
                                          className="flex-1"
                                        />
                                        <Button variant="outline" size="sm"
                                          onClick={() => { setAddingNote(null); setTrackingNote(""); }}>
                                          <X className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleAddNote(order._id); }}
                                          disabled={updatingStatus === order._id}>
                                          {updatingStatus === order._id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : "Add"}
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex flex-wrap gap-2">
                                        <Button variant="outline" size="sm" className="gap-2"
                                          onClick={(e) => { e.stopPropagation(); setAddingNote(order._id); }}>
                                          <MessageSquare className="h-4 w-4" />
                                          Add Tracking Note
                                        </Button>
                                        <Button variant="outline" size="sm" className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                          onClick={(e) => { e.stopPropagation(); handleNotifyCustomer(order); }}>
                                          <MessageCircle className="h-4 w-4" />
                                          Notify via WhatsApp
                                        </Button>
                                        <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                          onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order._id, order.orderNumber); }}
                                          disabled={updatingStatus === order._id}
                                        >
                                          {updatingStatus === order._id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <X className="h-4 w-4" />
                                          )}
                                          Delete
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Shiprocket */}
                              <div
                                className="p-4 rounded-xl border border-border bg-gradient-to-br from-indigo-50/50 to-transparent"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Rocket className="h-4 w-4" />
                                    Shiprocket
                                  </h4>
                                  {order.shipping?.status && (
                                    <Badge className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 capitalize">
                                      {order.shipping.status.toLowerCase()}
                                    </Badge>
                                  )}
                                </div>

                                {!shiprocket?.configured ? (
                                  <p className="text-sm text-muted-foreground flex items-start gap-2">
                                    <PlugZap className="h-4 w-4 mt-0 shrink-0" />
                                    Shiprocket is not configured. Add <code className="font-mono text-xs">SHIPROCKET_EMAIL</code> and{" "}
                                    <code className="font-mono text-xs">SHIPROCKET_PASSWORD</code> to the server environment.
                                  </p>
                                ) : !shiprocket?.connected ? (
                                  <p className="text-sm text-red-600 flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 mt-0 shrink-0" />
                                    Could not connect to Shiprocket{shiprocket?.error ? `: ${shiprocket.error}` : "."}
                                  </p>
                                ) : (
                                  <div className="space-y-4">
                                    {/* Shipment details */}
                                    {order.shipping?.shipmentId && (
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                        <div>
                                          <p className="text-xs text-muted-foreground">AWB</p>
                                          <p className="font-mono text-xs font-medium mt-0 tabular-nums">
                                            {order.shipping.awbCode || "Not assigned"}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Courier</p>
                                          <p className="font-medium mt-0 truncate">{order.shipping.courierName || "—"}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Billed weight</p>
                                          <p className="font-medium mt-0 tabular-nums">
                                            {order.shipping.appliedWeight ? `${order.shipping.appliedWeight} kg` : "—"}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Pickup</p>
                                          <p className="font-medium mt-0">
                                            {order.shipping.pickupScheduledDate || "Not scheduled"}
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {order.shipping?.error && (
                                      <p className="text-xs text-red-600 flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 mt-0 shrink-0" />
                                        {order.shipping.error}
                                      </p>
                                    )}

                                    {/* Courier picker — shown until an AWB exists */}
                                    {!order.shipping?.awbCode && !["cancelled", "returned"].includes(order.status) && (
                                      <div className="flex flex-wrap items-center gap-2">
                                        <select
                                          value={selectedCourier}
                                          onChange={(e) => setSelectedCourier(e.target.value)}
                                          disabled={loadingCouriers || !courierOptions?.couriers?.length}
                                          className="flex h-10 rounded-xl border border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all disabled:opacity-50 max-w-full"
                                        >
                                          <option value="">
                                            {loadingCouriers
                                              ? "Loading couriers..."
                                              : courierOptions?.couriers?.length
                                              ? "Cheapest available courier"
                                              : "No courier rates available"}
                                          </option>
                                          {courierOptions?.couriers?.map((c) => (
                                            <option key={c.id} value={String(c.id)}>
                                              {c.name} — {formatPrice(Number(c.rate) || 0)}
                                              {c.estimatedDays ? ` · ${c.estimatedDays}d` : ""}
                                            </option>
                                          ))}
                                        </select>
                                        {courierOptions?.weight && (
                                          <span className="text-xs text-muted-foreground tabular-nums">
                                            Parcel weight {courierOptions.weight} kg
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-2">
                                      {!order.shipping?.shipmentId || order.shipping?.cancelledAt ? (
                                        <Button
                                          size="sm"
                                          className="gap-2"
                                          disabled={
                                            shipAction !== null ||
                                            ["cancelled", "returned"].includes(order.status)
                                          }
                                          onClick={() => handleCreateShipment(order)}
                                        >
                                          {shipAction === "create" ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Rocket className="h-4 w-4" />
                                          )}
                                          Push to Shiprocket
                                        </Button>
                                      ) : (
                                        <>
                                          {!order.shipping.awbCode && (
                                            <Button
                                              size="sm"
                                              className="gap-2"
                                              disabled={shipAction !== null}
                                              onClick={() =>
                                                runShipAction(
                                                  "awb",
                                                  () => shippingApi.assignAwb(order._id, selectedCourier || undefined),
                                                  "AWB assigned"
                                                )
                                              }
                                            >
                                              {shipAction === "awb" ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <Truck className="h-4 w-4" />
                                              )}
                                              Assign AWB
                                            </Button>
                                          )}

                                          {order.shipping.awbCode && !order.shipping.pickupScheduledDate && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="gap-2"
                                              disabled={shipAction !== null}
                                              onClick={() =>
                                                runShipAction(
                                                  "pickup",
                                                  () => shippingApi.schedulePickup(order._id),
                                                  "Pickup scheduled"
                                                )
                                              }
                                            >
                                              {shipAction === "pickup" ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <Package className="h-4 w-4" />
                                              )}
                                              Schedule Pickup
                                            </Button>
                                          )}

                                          {order.shipping.awbCode && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="gap-2"
                                              disabled={shipAction !== null}
                                              onClick={() =>
                                                handleOpenDocument(
                                                  "label",
                                                  () => shippingApi.generateLabel(order._id),
                                                  "labelUrl",
                                                  "Label"
                                                )
                                              }
                                            >
                                              {shipAction === "label" ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <Printer className="h-4 w-4" />
                                              )}
                                              Label
                                            </Button>
                                          )}

                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-2"
                                            disabled={shipAction !== null}
                                            onClick={() =>
                                              handleOpenDocument(
                                                "invoice",
                                                () => shippingApi.generateInvoice(order._id),
                                                "invoiceUrl",
                                                "Invoice"
                                              )
                                            }
                                          >
                                            {shipAction === "invoice" ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <Receipt className="h-4 w-4" />
                                            )}
                                            Invoice
                                          </Button>

                                          {order.shipping.awbCode && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="gap-2"
                                              disabled={shipAction !== null}
                                              onClick={() =>
                                                handleOpenDocument(
                                                  "manifest",
                                                  () => shippingApi.generateManifest(order._id),
                                                  "manifestUrl",
                                                  "Manifest"
                                                )
                                              }
                                            >
                                              {shipAction === "manifest" ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <ClipboardList className="h-4 w-4" />
                                              )}
                                              Manifest
                                            </Button>
                                          )}

                                          {order.shipping.awbCode && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="gap-2"
                                              disabled={shipAction !== null}
                                              onClick={() =>
                                                runShipAction(
                                                  "track",
                                                  () => shippingApi.refreshTracking(order._id),
                                                  "Tracking refreshed"
                                                )
                                              }
                                            >
                                              {shipAction === "track" ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <RefreshCw className="h-4 w-4" />
                                              )}
                                              Refresh Tracking
                                            </Button>
                                          )}

                                          {order.shipping.trackUrl && (
                                            <a
                                              href={order.shipping.trackUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-xs font-medium hover:border-brand-400 hover:text-brand-600 transition-all"
                                            >
                                              <ExternalLink className="h-4 w-4" />
                                              Courier Page
                                            </a>
                                          )}

                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                            disabled={shipAction !== null}
                                            onClick={() => handleCancelShipment(order)}
                                          >
                                            {shipAction === "cancel" ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <Ban className="h-4 w-4" />
                                            )}
                                            Cancel Shipment
                                          </Button>
                                        </>
                                      )}
                                    </div>

                                    {/* Courier scan history */}
                                    {(order.shipping?.scans?.length || 0) > 0 && (
                                      <div className="pt-4 border-t border-border space-y-2 max-h-40 overflow-y-auto">
                                        {order.shipping?.scans?.map((scan, k) => (
                                          <div key={k} className="flex items-start gap-4 text-xs">
                                            <div
                                              className={cn(
                                                "w-2 h-2 mt-2 rounded-full shrink-0",
                                                k === 0 ? "bg-indigo-500" : "bg-border"
                                              )}
                                            />
                                            <div className="min-w-0">
                                              <p className="font-medium capitalize">
                                                {(scan.status || scan.activity || "Update").toLowerCase()}
                                              </p>
                                              <p className="text-muted-foreground">
                                                {scan.date}
                                                {scan.location && ` — ${scan.location}`}
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))} className="gap-2">
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)} className="gap-2">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-border px-4 py-4 flex items-center gap-4 min-w-[400px] max-w-[600px]">
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={toggleSelectAll} aria-label="Toggle select all orders" className="p-0 rounded hover:bg-muted transition-colors">
                  <CheckSquare className="h-4 w-4 text-brand-600" />
                </button>
                <span className="text-sm font-medium">
                  {selectedIds.size} selected
                </span>
                <button onClick={() => setSelectedIds(new Set())}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="h-6 w-px bg-border" />
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="flex h-10 rounded-xl border border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all"
              >
                <option value="">Update status...</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>{s.replace(/-/g, " ")}</option>
                ))}
              </select>
              <Button
                onClick={handleBulkUpdate}
                disabled={!bulkStatus || bulkUpdating}
                size="sm"
                className="gap-2 shrink-0"
              >
                {bulkUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Layers className="h-4 w-4" />
                )}
                Apply
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
