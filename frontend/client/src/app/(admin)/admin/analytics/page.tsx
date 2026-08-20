"use client";

import Image from "next/image";
import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Users,
  ShoppingBag,
  Package,
  IndianRupee,
  Download,
  CalendarDays,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/lib/admin/api";
import { cn, formatPrice } from "@/lib/admin/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin-ui/card";
import { Badge } from "@/components/admin-ui/badge";
import { Button } from "@/components/admin-ui/button";
import { Skeleton } from "@/components/admin-ui/skeleton";
import type { DashboardStats } from "@/types/admin";

type Period = "daily" | "weekly" | "monthly" | "yearly";

export default function AdminAnalytics() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [customerAnalytics, setCustomerAnalytics] = useState<any>(null);
  const [orderStatusData, setOrderStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("monthly");

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dash, revenue, top, customers, ordersStatus] = await Promise.all([
        adminApi.getDashboard().catch(() => null),
        adminApi.getRevenueReport({ period }).catch(() => null),
        adminApi.getTopProducts(10).catch(() => null),
        adminApi.getCustomerAnalytics().catch(() => null),
        adminApi.getOrderStatusAnalytics().catch(() => null),
      ]);
      if (!dash && !revenue && !top) {
        setError("Failed to load analytics data");
        return;
      }
      const dashPayload = dash?.data || dash;
      setStats(dashPayload?.stats || dashPayload);
      setRevenueData(revenue?.data || revenue);
      setTopProducts(top?.data?.products || top?.data || top?.products || top || []);
      const custPayload = customers?.data || customers;
      setCustomerAnalytics(custPayload?.analytics || custPayload);
      const orderPayload = ordersStatus?.data || ordersStatus;
      setOrderStatusData(orderPayload?.statusAnalytics || orderPayload);
    } catch (err: any) {
      setError(err?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const periods: Period[] = ["daily", "weekly", "monthly", "yearly"];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="p-4 rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <p className="text-lg font-medium">Failed to load analytics</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          onClick={loadAllData}
          className="px-4 py-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const overviewCards = [
    { label: "Total Revenue", value: formatPrice(stats?.totalRevenue ?? 0), icon: IndianRupee, color: "from-emerald-600 to-emerald-700" },
    { label: "Total Orders", value: stats?.totalOrders ?? 0, icon: ShoppingBag, color: "from-amber-500 to-amber-600" },
    { label: "Total Customers", value: stats?.totalCustomers ?? 0, icon: Users, color: "from-blue-600 to-blue-700" },
    { label: "Total Products", value: stats?.totalProducts ?? 0, icon: Package, color: "from-purple-600 to-purple-700" },
    { label: "Month Revenue", value: formatPrice(stats?.monthRevenue ?? 0), icon: TrendingUp, color: "from-teal-600 to-emerald-700" },
    { label: "Month Orders", value: stats?.monthOrders ?? 0, icon: CalendarDays, color: "from-indigo-600 to-blue-700" },
    { label: "Pending Orders", value: stats?.pendingOrders ?? 0, icon: ShoppingBag, color: "from-amber-500 to-orange-600" },
    { label: "Low Stock", value: stats?.lowStockProducts ?? 0, icon: Package, color: "from-rose-500 to-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-emerald-900">Analytics</h1>
          <p className="text-sm text-stone-500 mt-2">Comprehensive business insights and metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-2 bg-muted/50 p-2 rounded-xl">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-medium transition-all capitalize",
                  period === p ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.success("Export feature coming soon")}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="relative overflow-hidden group">
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5", card.color)} />
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                    <p className="text-2xl font-bold font-display">{card.value}</p>
                  </div>
                  <div className={cn("p-4 rounded-2xl bg-gradient-to-br", card.color)}>
                    <card.icon className="h-4 w-4 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-emerald-800">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-[300px] flex items-end justify-between gap-2 px-2 pb-8">
              {(() => {
                const revenueItems = revenueData?.revenue || [];
                const maxRevenue = Math.max(...revenueItems.map((r: any) => r.revenue || 0), 1);
                const periodCount = period === "daily" ? 30 : period === "weekly" ? 12 : 12;
                const labels = period === "daily"
                  ? Array.from({ length: periodCount }, (_, i) => `Day ${i + 1}`)
                  : period === "weekly"
                  ? Array.from({ length: periodCount }, (_, i) => `W${i + 1}`)
                  : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                const data = labels.map((label, i) => {
                  const item = revenueItems.find((r: any) => {
                    if (period === "monthly" || period === "yearly") return r._id?.month === i + 1;
                    if (period === "weekly") return r._id?.week === i + 1;
                    return r._id?.day === i + 1;
                  });
                  return { label, revenue: item?.revenue || 0 };
                });
                return data.map((item, i) => {
                  const height = item.revenue > 0 ? Math.max(5, (item.revenue / maxRevenue) * 100) : 0;
                  return (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.5, delay: i * 0.03 }}
                      className="flex-1 flex flex-col items-center gap-2 group"
                    >
                      <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatPrice(item.revenue)}
                      </span>
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600/80 to-emerald-600/20 hover:from-emerald-600 transition-all cursor-pointer"
                          style={{ height: "100%" }}
                        />
                      <span className="text-[9px] text-muted-foreground mt-2 truncate w-full text-center">
                        {item.label}
                      </span>
                    </motion.div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-emerald-800">
              <ShoppingBag className="h-4 w-4 text-amber-500" />
              Order Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                const totalOrders = stats?.totalOrders || 1;
                const statusColorMap: Record<string, string> = {
                  pending: "bg-yellow-400",
                  confirmed: "bg-blue-400",
                  packed: "bg-orange-400",
                  dispatched: "bg-purple-400",
                  "out-for-delivery": "bg-indigo-400",
                  delivered: "bg-green-400",
                  cancelled: "bg-red-400",
                  returned: "bg-gray-400",
                };
                const statusLabelMap: Record<string, string> = {
                  pending: "Pending",
                  confirmed: "Confirmed",
                  packed: "Packed",
                  dispatched: "Dispatched",
                  "out-for-delivery": "Out for Delivery",
                  delivered: "Delivered",
                  cancelled: "Cancelled",
                  returned: "Returned",
                };
                const items = orderStatusData
                  ? orderStatusData.map((s: any) => ({
                      label: statusLabelMap[s.status] || s.status,
                      value: s.count,
                      percent: totalOrders > 0 ? Math.round((s.count / totalOrders) * 100) : 0,
                      color: statusColorMap[s.status] || "bg-gray-400",
                    }))
                  : [];
                return items.filter((item: any) => item.value > 0).map((item: any) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">{item.value} ({item.percent}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: `${item.percent}%` }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className={`h-full rounded-full ${item.color}`}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-emerald-800">
              <Package className="h-4 w-4 text-amber-500" />
              Top Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-4">
                {topProducts.slice(0, 10).map((product: any, i: number) => (
                  <div key={product._id || i} className="flex items-center gap-4 p-2 rounded-xl hover:bg-muted/30 transition-colors">
                    <span className="text-xs font-bold text-muted-foreground w-4 text-center">{i + 1}</span>
                    <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden shrink-0">
                      {product.images?.[0] || product.image ? (
                        <Image src={product.images?.[0] || product.image} alt={product.name} width={40} height={40} className="h-full w-full object-cover" unoptimized />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
                          <Package className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.totalSold || product.sold || 0} sold</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatPrice(product.revenue || product.totalRevenue || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No product data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-emerald-800">
              <Users className="h-4 w-4 text-amber-500" />
              Customer Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100">
                <p className="text-2xl font-bold font-display text-blue-700">{customerAnalytics?.totalCustomers ?? stats?.totalCustomers ?? 0}</p>
                <p className="text-xs text-blue-600 font-medium">Total Customers</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 border border-green-100">
                <p className="text-2xl font-bold font-display text-green-700">{customerAnalytics?.customersThisMonth ?? stats?.todayCustomers ?? 0}</p>
                <p className="text-xs text-green-600 font-medium">New This Month</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-100">
                <p className="text-2xl font-bold font-display text-purple-700">{customerAnalytics?.repeatRate ?? 0}%</p>
                <p className="text-xs text-purple-600 font-medium">Repeat Rate</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-100">
                <p className="text-2xl font-bold font-display text-gray-700">{customerAnalytics?.inactiveCustomers ?? 0}</p>
                <p className="text-xs text-gray-600 font-medium">Inactive (3mo)</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100/30 border border-brand-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Conversion Rate</span>
                <Badge variant="success">{stats?.conversionRate ? (String(stats.conversionRate).endsWith("%") ? stats.conversionRate : `${stats.conversionRate}%`) : "0%"}</Badge>
              </div>
              <div className="h-2 rounded-full bg-brand-100 overflow-hidden">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: stats?.conversionRate ? (String(stats.conversionRate).endsWith("%") ? stats.conversionRate : `${stats.conversionRate}%`) : "0%" }}
                  transition={{ duration: 1 }}
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-spice-gold"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
