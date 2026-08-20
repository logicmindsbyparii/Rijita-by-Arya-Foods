"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Search,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  AlertCircle,
  Loader2,
  ChevronRight,
  ShoppingBag,
  IndianRupee,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { orderApi, contentApi, shippingApi } from "@/lib/api";
import { cn, formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Order, ShipmentTracking } from "@/types";

const statusSteps = [
  { key: "pending", label: "Order Placed", icon: ShoppingBag },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "packed", label: "Packed", icon: Package },
  { key: "dispatched", label: "Dispatched", icon: Truck },
  { key: "out-for-delivery", label: "Out for Delivery", icon: MapPin },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

const cancelledStatuses = ["cancelled", "returned"];

function getActiveStep(status: string): number {
  const index = statusSteps.findIndex((s) => s.key === status);
  return index >= 0 ? index : -1;
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [shipment, setShipment] = useState<ShipmentTracking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const { data: settingsData } = useQuery({ queryKey: ["settings"], queryFn: () => contentApi.getSiteSettings(), staleTime: 10 * 60 * 1000 });
  const whatsappNumber = settingsData?.data?.settings?.whatsapp?.number || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210";

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) {
      setError("Please enter an order number");
      return;
    }
    setLoading(true);
    setError("");
    setOrder(null);
    setShipment(null);
    setSearched(true);
    const lookupNumber = orderNumber.trim().toUpperCase();
    try {
      const res = await orderApi.getOrderByNumber(lookupNumber);
      const found: Order | null = res?.data?.order || res?.data || null;
      setOrder(found);

      // Live courier tracking is a bonus — a failure must not break the lookup
      if (found?.shipping?.awbCode || found?.shipping?.shipmentId) {
        try {
          const tracked = await shippingApi.trackShipment(lookupNumber);
          setShipment(tracked?.data?.tracking ?? null);
        } catch {
          setShipment(null);
        }
      }
    } catch (err: any) {
      setError(err?.data?.message || err?.message || "Order not found. Please check your order number.");
    } finally {
      setLoading(false);
    }
  };

  const isCancelled = order && cancelledStatuses.includes(order.status);
  const activeStep = order && !isCancelled ? getActiveStep(order.status) : -1;

  return (
    <div className="min-h-screen pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-100 rounded-full text-brand-700 text-sm font-medium mb-4">
            <Truck size={16} />
            Track Order
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Track Your <span className="text-brand-600">Order</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Enter your order number to check the current status and delivery progress
            of your order. You can find the order number in your WhatsApp confirmation.
          </p>
        </motion.div>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border p-6 mb-8"
        >
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Package size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => { setOrderNumber(e.target.value.toUpperCase()); setError(""); }}
                placeholder="Enter order number (e.g. RIJ-...)"
                className="w-full pl-10 pr-4 py-4 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-ui text-sm uppercase"
              />
            </div>
            <Button type="submit" disabled={loading} size="lg">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              <span className="hidden sm:inline ml-2">Track</span>
            </Button>
          </form>
          {error && (
            <p className="text-sm text-red-500 mt-4 flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </p>
          )}
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <Loader2 size={40} className="mx-auto mb-4 text-brand-500 animate-spin" />
              <p className="text-muted-foreground">Looking up your order...</p>
            </motion.div>
          )}

          {!loading && order && (
            <motion.div
              key="order"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Order Header */}
              <div className="bg-white rounded-2xl border p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Order Number</p>
                    <h2 className="text-xl font-bold font-display tabular-nums">{order.orderNumber}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-2">Status</p>
                    <span className={cn(
                      "inline-flex items-center px-4 py-2 rounded-full text-xs font-medium capitalize",
                      isCancelled
                        ? "bg-red-100 text-red-700"
                        : order.status === "delivered"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    )}>
                      {order.status.replace(/-/g, " ")}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm font-medium mt-0">{formatDate(order.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Items</p>
                    <p className="text-sm font-medium mt-0">{order.items?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-sm font-bold text-brand-600 mt-0 tabular-nums">{formatPrice(order.total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment</p>
                    <p className="text-sm font-medium capitalize mt-0">{order.paymentStatus}</p>
                  </div>
                </div>
              </div>

              {/* Tracking Timeline */}
              {isCancelled ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
                  <AlertCircle size={40} className="mx-auto mb-4 text-red-500" />
                  <h3 className="text-xl font-display font-bold text-red-800 mb-2">
                    Order {order.status === "cancelled" ? "Cancelled" : "Returned"}
                  </h3>
                  <p className="text-red-700/80 text-sm">
                    This order has been {order.status}. For any questions, please contact us.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border p-6">
                  <h3 className="font-display font-bold text-lg mb-6">Order Progress</h3>
                  <div className="relative">
                    {statusSteps.map((step, i) => {
                      const Icon = step.icon;
                      const isActive = i <= activeStep;
                      const isCurrent = i === activeStep;
                      return (
                        <div key={step.key} className="flex items-start gap-4 pb-6 last:pb-0 relative">
                          {/* Connector line */}
                          {i < statusSteps.length - 1 && (
                            <div className={cn(
                              "absolute left-4 top-10 w-0 h-[calc(100%+0.5rem)] -translate-x-1/2",
                              isActive ? "bg-brand-500" : "bg-muted"
                            )} />
                          )}
                          {/* Icon */}
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative z-10",
                            isActive ? "bg-brand-500 text-white" : "bg-muted text-muted-foreground"
                          )}>
                            <Icon size={14} />
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0 pt-2">
                            <p className={cn("text-sm font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
                              {step.label}
                            </p>
                            {isCurrent && order.tracking?.find((t) => t.status === step.key) && (
                              <p className="text-xs text-brand-600 mt-0">
                                {order.tracking.find((t) => t.status === step.key)?.note}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Courier Shipment */}
              {(order.shipping?.awbCode || shipment?.awb) && (
                <div className="bg-white rounded-2xl border p-6">
                  <h3 className="font-display font-bold text-lg mb-4">Courier Shipment</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Courier</p>
                      <p className="font-medium mt-0">
                        {shipment?.courierName || order.shipping?.courierName || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tracking number</p>
                      <p className="font-mono text-xs font-medium mt-0 tabular-nums">
                        {shipment?.awb || order.shipping?.awbCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expected delivery</p>
                      <p className="font-medium mt-0">
                        {shipment?.expectedDeliveryDate || order.shipping?.expectedDeliveryDate || "—"}
                      </p>
                    </div>
                  </div>

                  {(shipment?.trackUrl || order.shipping?.trackUrl) && (
                    <a
                      href={shipment?.trackUrl || order.shipping?.trackUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
                    >
                      Track on courier website
                      <ExternalLink size={14} />
                    </a>
                  )}

                  {shipment?.scans && shipment.scans.length > 0 && (
                    <div className="mt-6 pt-4 border-t space-y-4">
                      {shipment.scans.map((scan, i) => (
                        <div key={i} className="flex items-start gap-4 text-sm">
                          <div
                            className={cn(
                              "w-2 h-2 mt-2 rounded-full flex-shrink-0",
                              i === 0 ? "bg-brand-500" : "bg-border"
                            )}
                          />
                          <div>
                            <p className="font-medium capitalize">
                              {(scan.status || scan.activity || "Update").toLowerCase()}
                            </p>
                            <p className="text-xs text-muted-foreground">
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

              {/* Order Items */}
              <div className="bg-white rounded-2xl border p-6">
                <h3 className="font-display font-bold text-lg mb-4">Order Items</h3>
                <div className="space-y-4">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-50 to-amber-50 flex items-center justify-center flex-shrink-0">
                          <Package size={20} className="text-brand-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.productName}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">{item.weight} x {item.quantity}</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium tabular-nums">{formatPrice(item.total)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <span className="text-sm font-semibold">Order Total</span>
                  <span className="text-lg font-bold text-brand-600 tabular-nums">{formatPrice(order.total)}</span>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white rounded-2xl border p-6">
                <h3 className="font-display font-bold text-lg mb-4">Shipping Address</h3>
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p className="text-foreground font-medium">{order.shippingAddress?.fullName}</p>
                  <p>{order.shippingAddress?.addressLine1}</p>
                  {order.shippingAddress?.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                  <p>{order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}</p>
                  <p>Phone: {order.shippingAddress?.phone}</p>
                </div>
              </div>

              {/* Need Help */}
              <div className="bg-cream rounded-2xl p-6 border text-center">
                <p className="text-sm text-muted-foreground mb-4">Need help with your order?</p>
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
                >
                  Contact us on WhatsApp
                </a>
              </div>
            </motion.div>
          )}

          {!loading && searched && !order && !error && (
            <motion.div
              key="not-found"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <Package size={48} className="mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-medium mb-2">Order Not Found</h3>
              <p className="text-muted-foreground">Check your order number and try again</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
