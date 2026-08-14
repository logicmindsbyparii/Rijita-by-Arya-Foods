"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  MapPin,
  IndianRupee,
  Truck,
  Percent,
  MessageCircle,
  Search,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";
import { orderApi } from "@/lib/api";
import { formatPrice, formatDate, generateWhatsAppUrl, getImageUrl } from "@/lib/utils";
import { Order, OrderStatus, OrderItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700" },
  packed: { label: "Packed", color: "bg-purple-100 text-purple-700" },
  dispatched: { label: "Dispatched", color: "bg-indigo-100 text-indigo-700" },
  "out-for-delivery": { label: "Out for Delivery", color: "bg-orange-100 text-orange-700" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
  returned: { label: "Returned", color: "bg-gray-100 text-gray-700" },
};

function generateOrderWhatsAppMessage(order: Order): string {
  const lines = [
    "*Order Tracking - RIJITA by Arya Foods*",
    "",
    `*Order #${order.orderNumber}*`,
    `*Date:* ${formatDate(order.createdAt)}`,
    `*Status:* ${order.status.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`,
    "",
    "*Items:*",
  ];

  order.items.forEach((item, i) => {
    lines.push(`${i + 1}. ${item.productName} (${item.weight}) x ${item.quantity} = ₹${item.total}`);
  });

  lines.push(
    "",
    `*Total: ₹${order.total}*`,
    "",
    "Thank you for choosing RIJITA by Arya Foods!"
  );

  return lines.join("\n");
}

export default function OrdersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const res = await orderApi.getMyOrders(params);
      const data = res?.data?.orders || res?.data || [];
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "Failed to load orders";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setIsLoading(false);
      setError("Please login to view your orders");
      return;
    }

    loadOrders();
  }, [isAuthenticated, authLoading, statusFilter, loadOrders]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<Order | null>(null);

  const handleTrackOnWhatsApp = (order: Order) => {
    const message = generateOrderWhatsAppMessage(order);
    const url = generateWhatsAppUrl(message);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Cancelling is irreversible, so it keeps a confirmation step — but an
  // in-app one, not the blocking native dialog.
  const confirmCancelOrder = async () => {
    const order = pendingCancel;
    if (!order) return;
    setPendingCancel(null);
    setCancellingId(order._id);
    try {
      await orderApi.cancelOrder(order.orderNumber);
      toast.success("Order cancelled successfully");
      loadOrders();
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel order");
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    if (!pendingCancel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPendingCancel(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pendingCancel]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  if (authLoading) {
    return (
      <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="w-28 h-28 mx-auto mb-6 rounded-full bg-gradient-to-br from-brand-100 to-amber-100 flex items-center justify-center">
            <Package size={52} className="text-brand-400" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-4">
            Login to View Orders
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Please log in to your account to view your order history and track
            your deliveries.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-ui hover:shadow-lg hover:shadow-brand-500/25"
          >
            Login
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold">
              My Orders
            </h1>
            <p className="text-muted-foreground mt-2">
              Track and manage your orders
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {["", "pending", "confirmed", "dispatched", "delivered"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`whitespace-nowrap px-4 py-2 text-xs font-medium rounded-lg border transition-ui ${
                  statusFilter === status
                    ? "bg-brand-500 text-white border-brand-500"
                    : "bg-white text-muted-foreground border-border hover:border-brand-300"
                }`}
              >
                {status ? statusConfig[status as OrderStatus]?.label || status.replace(/-/g, " ") : "All"}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border p-4 shimmer-bg">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-4 w-24 bg-muted rounded" />
                  </div>
                  <div className="h-6 w-20 bg-muted rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle size={36} className="text-red-400" />
            </div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadOrders} variant="outline">
              Try Again
            </Button>
          </motion.div>
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto py-16"
          >
            <div className="w-28 h-28 mx-auto mb-6 rounded-full bg-gradient-to-br from-brand-100 to-amber-100 flex items-center justify-center">
              <ShoppingBag size={52} className="text-brand-400" />
            </div>
            <h2 className="text-2xl font-display font-bold mb-4">
              No Orders Yet
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              You haven&apos;t placed any orders yet. Start exploring our premium
              collection of traditional snacks!
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-ui hover:shadow-lg hover:shadow-brand-500/25"
            >
              Browse Products
            </Link>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <AnimatePresence mode="popLayout">
              {orders.map((order) => {
                const statusInfo = statusConfig[order.status] || statusConfig.pending;
                const isExpanded = expandedId === order._id;

                return (
                  <motion.div
                    key={order._id}
                    layout
                    variants={itemVariants}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white rounded-2xl border overflow-hidden hover:shadow-sm transition-shadow"
                  >
                    <button
                      onClick={() => toggleExpand(order._id)}
                      className="w-full text-left p-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-50 to-amber-50 flex items-center justify-center flex-shrink-0">
                            <Package size={20} className="text-brand-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm tabular-nums">
                              Order #{order.orderNumber}
                            </p>
                            <div className="flex items-center gap-2 mt-0 text-xs text-muted-foreground">
                              <Clock size={12} />
                              {formatDate(order.createdAt)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold tabular-nums">
                              {formatPrice(order.total)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.items.length} {order.items.length === 1 ? "item" : "items"}
                            </p>
                          </div>

                          <div className={`px-4 py-2 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                            {statusInfo.label}
                          </div>

                          {isExpanded ? (
                            <ChevronUp size={18} className="text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronDown size={18} className="text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          <div className="border-t">
                            {/* Order Items */}
                            <div className="p-4 space-y-4">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Items
                              </p>
                              {order.items.map((item, i) => (
                                <div key={i} className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-50 to-amber-50 flex items-center justify-center flex-shrink-0 text-base overflow-hidden relative">
                                    {item.image ? (
                                      <Image
                                        src={getImageUrl(item.image)}
                                        alt={item.productName}
                                        fill
                                        className="object-cover"
                                        sizes="44px"
                                      />
                                    ) : (
                                      <Package size={20} className="text-brand-400" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium line-clamp-2">
                                      {item.productName}
                                    </p>
                                    <p className="text-xs text-muted-foreground tabular-nums">
                                      {item.weight} x {item.quantity}
                                    </p>
                                  </div>
                                  <span className="text-sm font-medium flex-shrink-0 tabular-nums">
                                    {formatPrice(item.total)}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Price Breakdown */}
                            <div className="px-4 pb-4">
                              <div className="border-t pt-4 space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground tabular-nums">Subtotal</span>
                                  <span>{formatPrice(order.subtotal)}</span>
                                </div>
                                {order.discount > 0 && (
                                  <div className="flex items-center justify-between text-green-600">
                                    <span className="flex items-center gap-2">
                                      <Percent size={12} />
                                      Discount
                                    </span>
                                    <span>-{formatPrice(order.discount)}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-2 text-muted-foreground">
                                    <Truck size={12} />
                                    Delivery
                                  </span>
                                  {order.deliveryCharge === 0 ? (
                                    <span className="text-green-600 font-medium tabular-nums">FREE</span>
                                  ) : (
                                    <span>{formatPrice(order.deliveryCharge)}</span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-2 text-muted-foreground">
                                    <IndianRupee size={12} />
                                    GST (5%)
                                  </span>
                                  <span>{formatPrice(order.gstAmount)}</span>
                                </div>
                                <div className="border-t pt-2 flex items-center justify-between font-semibold">
                                  <span>Total</span>
                                  <span className="text-brand-600 tabular-nums">{formatPrice(order.total)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Shipping Address */}
                            <div className="px-4 pb-4">
                              <div className="border-t pt-4">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  Shipping Address
                                </p>
                                <div className="flex items-start gap-2 text-sm">
                                  <MapPin size={14} className="text-muted-foreground mt-0 flex-shrink-0" />
                                  <div>
                                    <p className="font-medium">{order.shippingAddress.fullName}</p>
                                    <p className="text-muted-foreground">
                                      {order.shippingAddress.addressLine1}
                                      {order.shippingAddress.addressLine2 && `, ${order.shippingAddress.addressLine2}`}
                                    </p>
                                    <p className="text-muted-foreground">
                                      {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                                    </p>
                                    <p className="text-muted-foreground">
                                      Phone: {order.shippingAddress.phone}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Notes */}
                            {order.notes && (
                              <div className="px-4 pb-4">
                                <div className="border-t pt-4">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Notes
                                  </p>
                                  <p className="text-sm text-muted-foreground">{order.notes}</p>
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="px-4 pb-4">
                               <div className="border-t pt-4 flex flex-wrap gap-4">
                                 <button
                                   onClick={() => handleTrackOnWhatsApp(order)}
                                   className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-xl transition-ui"
                                 >
                                   <MessageCircle size={16} />
                                   Track on WhatsApp
                                 </button>

                                 <Link
                                   href={`/orders/${order.orderNumber}`}
                                   className="inline-flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted/50 text-sm font-medium rounded-xl transition-ui"
                                   onClick={(e) => e.stopPropagation()}
                                 >
                                   <ExternalLink size={14} />
                                   View Details
                                 </Link>

                                 {["pending", "confirmed", "packed"].includes(order.status) && (
                                   <button
                                     onClick={(e) => { e.stopPropagation(); setPendingCancel(order); }}
                                     disabled={cancellingId === order._id}
                                     className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-xl transition-ui disabled:opacity-50"
                                   >
                                     {cancellingId === order._id ? (
                                       <Loader2 size={14} className="animate-spin" />
                                     ) : (
                                       <X size={14} />
                                     )}
                                     Cancel Order
                                   </button>
                                 )}
                                {order.tracking && order.tracking.length > 0 && (
                                  <div className="w-full mt-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                      Tracking History
                                    </p>
                                    <div className="space-y-2">
                                      {order.tracking.map((entry, i) => (
                                        <div key={i} className="flex items-start gap-4 text-sm">
                                          <div className="w-2 h-2 mt-2 rounded-full bg-brand-500 flex-shrink-0" />
                                          <div>
                                            <p className="font-medium capitalize">
                                              {entry.status.replace(/-/g, " ")}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {formatDate(entry.date)}
                                              {entry.location && ` - ${entry.location}`}
                                            </p>
                                            {entry.note && (
                                              <p className="text-xs text-muted-foreground">
                                                {entry.note}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Cancel confirmation — irreversible action, so it asks first */}
      <AnimatePresence>
        {pendingCancel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm"
            onClick={() => setPendingCancel(null)}
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="cancel-order-title"
              aria-describedby="cancel-order-desc"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md bg-white rounded-2xl border border-border shadow-xl p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPendingCancel(null)}
                aria-label="Close"
                className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:bg-stone-100 hover:text-foreground transition-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
              >
                <X size={16} />
              </button>

              <div className="flex items-start gap-3 pr-8">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h2 id="cancel-order-title" className="text-lg font-display font-bold">
                    Cancel order #<span className="tabular-nums">{pendingCancel.orderNumber}</span>?
                  </h2>
                  <p id="cancel-order-desc" className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    This can&rsquo;t be undone. You&rsquo;ll need to place a new order if you
                    change your mind.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setPendingCancel(null)}>
                  Keep order
                </Button>
                <Button
                  variant="destructive"
                  autoFocus
                  onClick={confirmCancelOrder}
                  loading={cancellingId === pendingCancel._id}
                >
                  Cancel order
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
