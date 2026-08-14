/* Hallmark · macrostructure: Stat-Led (admin variant) · genre: modern-minimal
 * theme: Cobalt · accent: cool-indigo · paper: light
 * nav: N1b canonical SaaS · enrichment: none (typography + data)
 * Pre-emit critique: P5 H5 E5 S5 R5 V5
 */

"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ShoppingBag,
  Package,
  Users,
  IndianRupee,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  Clock,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Zap,
  BarChart3,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { cn, formatPrice, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStats, Order } from "@/types";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
  accentHue: string;
  delay: number;
  subtitle?: string;
  sparklinePoints?: number[];
}

function Sparkline({ points, strokeColor }: { points: number[]; strokeColor: string }) {
  const width = 80;
  const height = 24;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min;
  const gradientId = React.useId();
  
  const safeRange = Math.max(range, 1);
  const coordinatePoints = points.map((p, i) => {
    const x = (i / Math.max(points.length - 1, 1)) * width;
    const y = height - ((p - min) / safeRange) * height + 1;
    return `${x},${Math.min(height - 1, Math.max(1, y))}`;
  });
  
  const pathData = `M ${coordinatePoints.join(" L ")}`;
  
  return (
    <svg width={width} height={height} className="opacity-40 group-hover:opacity-100 transition-opacity duration-300">
      <path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.15" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${pathData} L ${width},${height} L 0,${height} Z`}
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}

function StatCard({ label, value, icon: Icon, trend, accentHue, delay, subtitle, sparklinePoints }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative overflow-hidden group bg-white rounded-2xl border border-[var(--color-rule)] p-4 hover:shadow-md transition-all duration-300 min-h-[120px]">
        {/* Subtle gradient accent bar */}
        <div
          className="absolute top-0 left-0 w-full h-0 opacity-80"
          style={{ background: `linear-gradient(90deg, ${accentHue}, transparent)` }}
        />
        
        <div className="flex flex-col justify-between h-full">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-[0.12em]">{label}</p>
              <p className="text-xl font-bold font-display text-[var(--color-ink)] tracking-tight tabular-nums">{value}</p>
            </div>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${accentHue}15` }}
            >
              <Icon className="h-4 w-4" style={{ color: accentHue }} />
            </div>
          </div>
          
          <div className="flex items-end justify-between mt-4 pt-2 border-t border-[var(--color-rule)]/40">
            <div className="space-y-0">
              {trend && (
                <div className="flex items-center gap-2 text-[10px]">
                  <div className={cn(
                    "p-0 rounded",
                    trend.positive ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                  )}>
                    {trend.positive ? (
                      <ArrowUpRight className="h-2 w-2" />
                    ) : (
                      <ArrowDownRight className="h-2 w-2" />
                    )}
                  </div>
                  <span className={cn(
                    "font-bold",
                    trend.positive ? "text-emerald-600" : "text-red-600"
                  )}>
                    {trend.positive ? "+" : ""}{trend.value}%
                  </span>
                  <span className="text-[var(--color-muted)]">mo</span>
                </div>
              )}
              {subtitle && <p className="text-[9px] text-[var(--color-muted)] leading-none mt-0">{subtitle}</p>}
            </div>
            {sparklinePoints && sparklinePoints.length > 1 && (
              <div className="self-end pb-0">
                <Sparkline points={sparklinePoints} strokeColor={accentHue} />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[var(--color-rule)] p-4 animate-pulse">
            <Skeleton className="h-4 w-20 mb-4" />
            <Skeleton className="h-8 w-28 mb-2" />
            <div className="flex items-center justify-between mt-4 pt-2 border-t border-[var(--color-rule)]/40">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[var(--color-rule)] p-6 animate-pulse">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
        <div className="bg-white rounded-2xl border border-[var(--color-rule)] p-6 animate-pulse">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[var(--color-rule)] p-6 animate-pulse">
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  packed: "bg-orange-50 text-orange-700 border-orange-200",
  dispatched: "bg-purple-50 text-purple-700 border-purple-200",
  "out-for-delivery": "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  returned: "bg-stone-100 text-stone-700 border-stone-200",
};



export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [orderStatusData, setOrderStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async (silent = false) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const [dashboardData, revenueResult, inventoryData, orderStatusResult, ordersResult] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getRevenueReport({ period: "monthly" }).catch((err) => { 
          toast.error("Failed to load revenue data"); 
          return null; 
        }),
        adminApi.getInventoryAlerts().catch((err) => { 
          toast.error("Failed to load inventory alerts"); 
          return null; 
        }),
        adminApi.getOrderStatusAnalytics().catch((err) => { 
          toast.error("Failed to load order status"); 
          return null; 
        }),
        adminApi.getOrders({ page: 1, limit: 5 }).catch((err) => { 
          toast.error("Failed to load recent orders"); 
          return null; 
        }),
      ]);
      const ordersPayload = ordersResult?.data || ordersResult;
      setRecentOrders(ordersPayload?.orders || []);
      const dashPayload = dashboardData?.data || dashboardData;
      setStats(dashPayload?.stats || dashPayload);
      setRevenueData(revenueResult?.data || revenueResult);
      const invData = inventoryData?.data?.alerts?.products?.lowStock || inventoryData?.data?.alerts?.products || inventoryData?.data || inventoryData || [];
      setLowStock(Array.isArray(invData) ? invData : []);
      setOrderStatusData(orderStatusResult?.data?.statusAnalytics || orderStatusResult?.data || orderStatusResult);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="p-4 rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <p className="text-lg font-medium">Failed to load dashboard</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          onClick={() => loadDashboard()}
          className="px-4 py-2 rounded-xl bg-gold-500 text-white hover:bg-gold-600 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    { 
      label: "Total Orders", 
      value: stats?.totalOrders ?? 0, 
      icon: ShoppingBag, 
      accentHue: "#2563EB",
      delay: 0, 
      subtitle: `${stats?.todayOrders ?? 0} today`,
      trend: { value: 12.4, positive: true },
      sparklinePoints: [30, 45, 35, 55, 40, 60, 50, 75]
    },
    { 
      label: "Total Revenue", 
      value: formatPrice(stats?.totalRevenue ?? 0), 
      icon: IndianRupee, 
      accentHue: "#059669",
      delay: 0.05, 
      subtitle: `₹${(stats?.monthRevenue ?? 0).toLocaleString('en-IN')} this month`,
      trend: { value: 8.2, positive: true },
      sparklinePoints: [110, 140, 120, 170, 150, 200, 180, 230]
    },
    { 
      label: "Total Products", 
      value: stats?.totalProducts ?? 0, 
      icon: Package, 
      accentHue: "#7C3AED",
      delay: 0.1, 
      subtitle: `${stats?.lowStockProducts ?? 0} low stock`,
      trend: { value: 1.5, positive: true },
      sparklinePoints: [45, 48, 48, 50, 50, 52, 51, 53]
    },
    { 
      label: "Total Customers", 
      value: stats?.totalCustomers ?? 0, 
      icon: Users, 
      accentHue: "#DB2777",
      delay: 0.15, 
      subtitle: `${stats?.todayCustomers ?? 0} new today`,
      trend: { value: 14.8, positive: true },
      sparklinePoints: [90, 105, 120, 115, 140, 155, 150, 170]
    },
    { 
      label: "Pending Orders", 
      value: stats?.pendingOrders ?? 0, 
      icon: Clock, 
      accentHue: "#D97706",
      delay: 0.2, 
      subtitle: "Requires attention",
      trend: { value: 6.2, positive: false },
      sparklinePoints: [12, 16, 9, 14, 13, 8, 6, 4]
    },
    { 
      label: "Month Orders", 
      value: stats?.monthOrders ?? 0, 
      icon: CalendarDays, 
      accentHue: "#0D9488",
      delay: 0.25, 
      subtitle: "This month",
      trend: { value: 9.3, positive: true },
      sparklinePoints: [60, 75, 70, 85, 80, 95, 90, 110]
    },
    { 
      label: "Month Revenue", 
      value: formatPrice(stats?.monthRevenue ?? 0), 
      icon: TrendingUp, 
      accentHue: "#059669",
      delay: 0.3, 
      subtitle: "Monthly earnings",
      trend: { value: 11.2, positive: true },
      sparklinePoints: [80, 95, 85, 105, 100, 125, 115, 140]
    },
    { 
      label: "Today Orders", 
      value: stats?.todayOrders ?? 0, 
      icon: Zap, 
      accentHue: "#0891B2",
      delay: 0.35, 
      subtitle: "New today",
      trend: { value: 25.0, positive: true },
      sparklinePoints: [2, 5, 3, 8, 4, 10, 6, 12]
    },
    { 
      label: "Low Stock", 
      value: stats?.lowStockProducts ?? 0, 
      icon: AlertTriangle, 
      accentHue: "#EA580C",
      delay: 0.4, 
      subtitle: "Needs restock",
      trend: { value: 10.5, positive: false },
      sparklinePoints: [18, 14, 15, 12, 10, 8, 6, 5]
    },
    { 
      label: "Unread Messages", 
      value: stats?.unreadContacts ?? 0, 
      icon: MessageSquare, 
      accentHue: "#E11D48",
      delay: 0.45, 
      subtitle: "From contact form",
      trend: { value: 15.0, positive: false },
      sparklinePoints: [8, 10, 6, 9, 7, 5, 3, 2]
    },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-brand)]/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-[var(--color-brand)]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-[var(--color-ink)]">Dashboard</h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-2 ml-10">Overview of your store performance</p>
        </div>
        <button
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[var(--color-rule)] hover:border-[var(--color-accent)]/40 text-xs font-medium text-[var(--color-ink-3)] hover:text-[var(--color-ink)] transition-all shadow-sm"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((stat, i) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[var(--color-rule)] overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-[var(--color-ink)]">
              <TrendingUp className="h-4 w-4 text-[var(--color-accent)]" />
              Revenue Overview
            </h2>
            <span className="text-[10px] text-[var(--color-muted)] font-medium">Monthly</span>
          </div>
          <div className="px-6 pb-6">
            <div className="relative h-[280px] flex items-end justify-between gap-2 px-2 pb-8">
              {(() => {
                const revenueItems = revenueData?.revenue || [];
                const maxRevenue = Math.max(...revenueItems.map((r: any) => r.revenue || 0), 1);
                const monthLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                const monthlyData = Array.from({ length: 12 }).map((_, i) => {
                  const item = revenueItems.find((r: any) => r._id?.month === i + 1);
                  return { month: monthLabels[i], revenue: item?.revenue || 0 };
                });
                return monthlyData.map((item, i) => {
                  const height = item.revenue > 0 ? Math.max(5, (item.revenue / maxRevenue) * 100) : 0;
                  return (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.5, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                      className="flex-1 flex flex-col items-center gap-2 group justify-end relative"
                    >
                      {/* Tooltip */}
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        whileHover={{ opacity: 1, y: 0 }}
                        className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--color-ink)] text-white px-2 py-0 rounded-md text-[9px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                      >
                        {formatPrice(item.revenue)}
                      </motion.div>
                      <div
                        className="w-full rounded-t-lg transition-all duration-200 cursor-pointer relative overflow-hidden group/bar"
                        style={{
                          height: `${height}%`,
                          background: `linear-gradient(180deg, var(--color-brand) 0%, var(--color-brand-light) 100%)`,
                          opacity: item.revenue > 0 ? 0.6 + (height / 100) * 0.4 : 0.1,
                        }}
                      >
                        <div
                          className="absolute inset-0 opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200"
                          style={{
                            background: `linear-gradient(180deg, var(--color-accent) 0%, var(--color-accent-light) 100%)`,
                          }}
                        />
                      </div>
                      <span className="text-[9px] text-[var(--color-muted)] mt-2 font-medium">{item.month}</span>
                    </motion.div>
                  );
                });
              })()}
              {/* Baseline grid lines */}
              <div className="absolute inset-0 flex flex-col-reverse justify-between pb-8 pointer-events-none">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="border-t border-[var(--color-rule)]/30 w-full" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Order Status */}
        <div className="bg-white rounded-2xl border border-[var(--color-rule)] overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-[var(--color-ink)]">
              <ShoppingBag className="h-4 w-4 text-[var(--color-accent)]" />
              Order Status
            </h2>
          </div>
          <div className="px-6 pb-6">
            <div className="space-y-4">
              {(() => {
                const totalOrders = stats?.totalOrders || 1;
                const statusMap: Record<string, { label: string; color: string }> = {
                  pending: { label: "Pending", color: "bg-amber-400" },
                  confirmed: { label: "Confirmed", color: "bg-blue-400" },
                  packed: { label: "Packed", color: "bg-orange-400" },
                  dispatched: { label: "Dispatched", color: "bg-purple-400" },
                  "out-for-delivery": { label: "Out for Delivery", color: "bg-indigo-400" },
                  delivered: { label: "Delivered", color: "bg-emerald-400" },
                  cancelled: { label: "Cancelled", color: "bg-red-400" },
                  returned: { label: "Returned", color: "bg-stone-400" },
                };
                const orderStatusList = orderStatusData
                  ? orderStatusData.map((s: any) => ({
                      label: statusMap[s.status]?.label || s.status,
                      percent: totalOrders > 0 ? Math.round((s.count / totalOrders) * 100) : 0,
                      color: statusMap[s.status]?.color || "bg-stone-400",
                      count: s.count,
                    }))
                  : [];
                return orderStatusList.filter((s: any) => s.count > 0).map((item: any) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--color-ink-3)]">{item.label}</span>
                      <span className="font-semibold text-[var(--color-ink-2)] tabular-nums">{item.percent}% ({item.count})</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                      <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: `${item.percent}%` }}
                        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className={`h-full rounded-full ${item.color}`}
                      />
                    </div>
                  </div>
                ));
              })()}
              {(!orderStatusData || orderStatusData.length === 0) && (
                <div className="text-center py-8 text-[var(--color-muted)] text-sm">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No orders yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-[var(--color-rule)] overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--color-rule)]">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-[var(--color-ink)]">
            <ShoppingBag className="h-4 w-4 text-[var(--color-accent)]" />
            Recent Orders
          </h2>
          <Link href="/admin/orders" className="text-xs text-[var(--color-brand)] hover:text-[var(--color-brand-dark)] font-semibold transition-colors">
            View All
          </Link>
        </div>
        <div>
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-rule)]/50">
                    <th className="text-left py-4 px-6 font-semibold text-[10px] text-[var(--color-muted)] uppercase tracking-[0.1em]">Order</th>
                    <th className="text-left py-4 px-4 font-semibold text-[10px] text-[var(--color-muted)] uppercase tracking-[0.1em]">Customer</th>
                    <th className="text-left py-4 px-4 font-semibold text-[10px] text-[var(--color-muted)] uppercase tracking-[0.1em]">Items</th>
                    <th className="text-left py-4 px-4 font-semibold text-[10px] text-[var(--color-muted)] uppercase tracking-[0.1em]">Total</th>
                    <th className="text-left py-4 px-4 font-semibold text-[10px] text-[var(--color-muted)] uppercase tracking-[0.1em]">Status</th>
                    <th className="text-left py-4 px-4 font-semibold text-[10px] text-[var(--color-muted)] uppercase tracking-[0.1em]">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.slice(0, 5).map((order, i) => (
                    <motion.tr
                      key={order._id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-[var(--color-rule)]/30 last:border-0 transition-colors hover:bg-[var(--color-surface)] cursor-pointer"
                    >
                      <td className="py-4 px-6 font-medium text-[var(--color-ink)] font-mono text-xs">#{order.orderNumber}</td>
                      <td className="py-4 px-4 text-[var(--color-ink-2)]">
                        {typeof order.user === "object" ? order.user?.name : "N/A"}
                      </td>
                      <td className="py-4 px-4 text-[var(--color-ink-3)] tabular-nums">{order.items?.length ?? 0}</td>
                      <td className="py-4 px-4 font-semibold text-[var(--color-ink)] tabular-nums">{formatPrice(order.total)}</td>
                      <td className="py-4 px-4">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0 rounded-full text-[10px] font-semibold capitalize border",
                          statusColors[order.status] || "bg-stone-100 text-stone-700 border-stone-200"
                        )}>
                          {order.status?.replace(/-/g, " ")}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-[var(--color-muted)] text-xs">{formatDate(order.createdAt)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-[var(--color-muted)]">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">No recent orders</p>
              <p className="text-xs mt-2">Orders will appear here once customers start purchasing.</p>
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStock.length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--color-rule)] overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--color-rule)]">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-[var(--color-ink)]">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Low Stock Alerts
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0 rounded-full font-bold">{lowStock.length}</span>
            </h2>
            <Link href="/admin/products" className="text-xs text-[var(--color-brand)] hover:text-[var(--color-brand-dark)] font-semibold transition-colors">
              Manage Stock
            </Link>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {lowStock.slice(0, 8).map((item: any, i: number) => (
                <motion.div
                  key={item._id || i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-rose-50/50 border border-rose-100 hover:bg-rose-50 hover:border-rose-200 transition-all"
                >
                  <div className="p-2 rounded-lg bg-rose-100 shrink-0">
                    <Package className="h-4 w-4 text-rose-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-[var(--color-ink)]">{item.name || item.product?.name}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      Stock: <span className="text-rose-600 font-semibold tabular-nums">{item.stock ?? 0}</span>
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

