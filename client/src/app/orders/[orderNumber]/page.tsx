"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Package,
  ArrowLeft,
  Clock,
  MapPin,
  IndianRupee,
  Truck,
  Percent,
  MessageCircle,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import QRCode from "react-qr-code";
import { useQuery } from "@tanstack/react-query";
import { orderApi, contentApi } from "@/lib/api";
import { formatPrice, formatDate, generateWhatsAppUrl, getImageUrl } from "@/lib/utils";
import { Order, OrderStatus } from "@/types";

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

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderNumber = params?.orderNumber as string;

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => contentApi.getSiteSettings(),
  });
  const settings = settingsData?.data?.settings;
  const upiId = settings?.payment?.upiId || "merchant@upi";
  const upiName = settings?.payment?.upiName || "RIJITA Store";

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrder = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await orderApi.getOrderByNumber(orderNumber);
      const data = res?.data?.order || res?.order || res?.data;
      setOrder(data || null);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "Failed to load order";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    if (!orderNumber) return;
    loadOrder();
  }, [orderNumber, loadOrder]);

  const whatsappNumber = settings?.whatsapp?.number || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210";

  const handleTrackOnWhatsApp = () => {
    if (!order) return;
    
    let lines = [];
    if (order.status === "pending") {
      lines = [
        `Hello, I have placed Order #${order.orderNumber} for ₹${order.total}.`,
        `Attached is my payment screenshot. Please confirm.`
      ];
    } else {
      lines = [
        `*Order #${order.orderNumber}*`,
        `*Status:* ${order.status.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`,
        "",
        "*Items:*",
        ...order.items.map(
          (item, i) =>
            `${i + 1}. ${item.productName} (${item.weight}) x ${item.quantity} = ₹${item.total}`
        ),
        "",
        `*Total: ₹${order.total}*`,
      ];
    }
    
    const url = generateWhatsAppUrl(lines.join("\n"), whatsappNumber);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const getUpiUrl = () => {
    if (!order) return "";
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${order.total}&cu=INR`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={36} className="text-red-400" />
          </div>
          <h2 className="text-xl font-display font-bold mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={loadOrder} className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-ui">
              Try Again
            </button>
            <Link
              href="/orders"
              className="px-4 py-2 border rounded-xl text-sm font-medium hover:bg-muted transition-ui"
            >
              My Orders
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!order) return null;

  const statusInfo = statusConfig[order.status] || statusConfig.pending;

  return (
    <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/orders"))}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold tabular-nums">
                Order #{order.orderNumber}
              </h1>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Clock size={14} />
                {formatDate(order.createdAt)}
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-semibold ${statusInfo.color}`}>
              {statusInfo.label}
            </div>
          </div>

          <div className="bg-white rounded-2xl border overflow-hidden mb-6">
            <div className="p-4 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Items
              </p>
              <div className="space-y-4">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-50 to-amber-50 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                      {item.image ? (
                        <Image
                          src={getImageUrl(item.image)}
                          alt={item.productName}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <Package size={20} className="text-brand-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {item.weight} x {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-medium tabular-nums">{formatPrice(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Price Details
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground tabular-nums">Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex items-center justify-between text-green-600">
                    <span className="flex items-center gap-2 tabular-nums"><Percent size={12} />Discount</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground"><Truck size={12} />Delivery</span>
                  {order.deliveryCharge === 0 ? (
                    <span className="text-green-600 font-medium tabular-nums">FREE</span>
                  ) : (
                    <span>{formatPrice(order.deliveryCharge)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground tabular-nums"><IndianRupee size={12} />GST (5%)</span>
                  <span>{formatPrice(order.gstAmount)}</span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-brand-600 tabular-nums">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
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
                  <p className="text-muted-foreground">Phone: {order.shippingAddress.phone}</p>
                </div>
              </div>
            </div>

            {order.notes && (
              <div className="p-4 border-b">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </div>
            )}

            {order.tracking && order.tracking.length > 0 && (
              <div className="p-4 border-b">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Tracking</p>
                <div className="space-y-4">
                  {order.tracking.map((entry, i) => (
                    <div key={i} className="flex items-start gap-4 text-sm">
                      <div className="w-2 h-2 mt-2 rounded-full bg-brand-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium capitalize">{entry.status.replace(/-/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(entry.date)}
                          {entry.location && ` - ${entry.location}`}
                        </p>
                        {entry.note && <p className="text-xs text-muted-foreground">{entry.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4">
              {order.paymentStatus === "completed" && (
                <div className="mb-6 p-6 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-900 mb-2">Payment Successful</h3>
                    <p className="text-sm text-emerald-800 tabular-nums">
                      Your payment of {formatPrice(order.total)} via {order.paymentMethod === 'demo-online' || order.paymentMethod === 'online' ? 'Online Payment' : order.paymentMethod} was successful. Your order is confirmed!
                    </p>
                  </div>
                </div>
              )}

              {order.status === "pending" && order.paymentStatus !== "completed" && (
                <div className="mb-6 p-6 rounded-xl bg-amber-50 border border-amber-200">
                  <h3 className="text-lg font-semibold text-amber-900 mb-2">Payment Required</h3>
                  <p className="text-sm text-amber-800 mb-4 tabular-nums">
                    Please pay {formatPrice(order.total)} to confirm your order. Your order will be cancelled if payment is not received within 2 hours.
                  </p>
                  
                  <div className="flex flex-col md:flex-row gap-8 items-center justify-center bg-white p-6 rounded-xl shadow-sm mb-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-2 bg-white border-2 border-brand-100 rounded-2xl shadow-sm">
                        <QRCode value={getUpiUrl()} size={150} level="M" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mt-2">Scan to Pay via any UPI App</p>
                      <p className="text-xs text-muted-foreground font-semibold">{upiId}</p>
                    </div>

                    <div className="hidden md:block w-px h-32 bg-border"></div>

                    <div className="flex flex-col items-center gap-4 w-full md:w-auto">
                      <a
                        href={getUpiUrl()}
                        className="w-full inline-flex justify-center items-center gap-2 px-4 py-4 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-ui shadow-sm"
                      >
                        <IndianRupee size={18} />
                        Pay via UPI App
                      </a>
                      <button
                        onClick={handleTrackOnWhatsApp}
                        className="w-full inline-flex justify-center items-center gap-2 px-4 py-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-ui shadow-sm"
                      >
                        <MessageCircle size={18} />
                        I have Paid - Send Screenshot
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-amber-700 text-center">
                    Our team will confirm your payment and update this order shortly after you send the screenshot.
                  </p>{" "}
                </div>
              )}

              {order.status !== "pending" && (
                <button
                  onClick={handleTrackOnWhatsApp}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-xl transition-ui"
                >
                  <MessageCircle size={16} />
                  Track on WhatsApp
                </button>
              )}
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/orders"
              className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
            >
              View all orders
            </Link>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
