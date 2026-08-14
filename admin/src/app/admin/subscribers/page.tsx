"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Search,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Subscriber {
  _id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSubscribers();
      setSubscribers(res?.data?.subscribers || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load subscribers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const filtered = subscribers.filter((s) =>
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const header = "Email,Status,Subscribed Date\n";
    const rows = filtered
      .map((s) => `${s.email},${s.isActive ? "Active" : "Inactive"},${s.createdAt}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Subscribers</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage email newsletter subscribers
          </p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="shrink-0">
          <Download size={16} className="mr-2" /> Export CSV
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email..."
          className="w-full pl-10 pr-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-brand-50">
                <Users size={20} className="text-brand-500" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{subscribers.length}</p>
                <p className="text-xs text-muted-foreground">Total Subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-green-50">
                <CheckCircle2 size={20} className="text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">
                  {subscribers.filter((s) => s.isActive).length}
                </p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-red-50">
                <XCircle size={20} className="text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">
                  {subscribers.filter((s) => !s.isActive).length}
                </p>
                <p className="text-xs text-muted-foreground">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-64" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Mail size={40} className="mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium mb-2">No subscribers yet</h3>
          <p className="text-muted-foreground">Subscribers will appear here once people sign up</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((sub, i) => (
            <motion.div
              key={sub._id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <Card className="hover:shadow-sm transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                        <Mail size={16} className="text-brand-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{sub.email}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <Calendar size={10} />
                          {formatDate(sub.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={sub.isActive ? "default" : "secondary"}
                      className={cn(
                        "text-[10px] shrink-0",
                        sub.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}
                    >
                      {sub.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
