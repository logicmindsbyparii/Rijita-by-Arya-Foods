"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Search,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Trash2,
  Eye,
  Calendar,
  Reply,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/lib/admin/api";
import { cn, formatDate } from "@/lib/admin/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin-ui/card";
import { Badge } from "@/components/admin-ui/badge";
import { Button } from "@/components/admin-ui/button";
import { Skeleton } from "@/components/admin-ui/skeleton";
import type { Contact } from "@/types/admin";

const contactTypeColors: Record<string, string> = {
  general: "bg-blue-100 text-blue-700",
  "bulk-order": "bg-purple-100 text-purple-700",
  corporate: "bg-indigo-100 text-indigo-700",
  wholesale: "bg-teal-100 text-teal-700",
  distributor: "bg-amber-100 text-amber-700",
  dealer: "bg-orange-100 text-orange-700",
  career: "bg-pink-100 text-pink-700",
  support: "bg-green-100 text-green-700",
};

export default function AdminContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterType) params.type = filterType;
      const res = await adminApi.getContacts(params);
      setContacts(res?.data?.contacts || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleMarkRead = async (id: string) => {
    try {
      await adminApi.markContactRead(id);
      toast.success("Marked as read");
      fetchContacts();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this contact message?")) return;
    try {
      await adminApi.deleteContact(id);
      toast.success("Contact deleted");
      fetchContacts();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  const filtered = contacts.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.subject?.toLowerCase().includes(search.toLowerCase())
  );

  const types = ["general", "bulk-order", "wholesale", "distributor", "corporate", "support", "career"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Contacts</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Manage customer inquiries and messages
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-sm"
        >
          <option value="">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>{t.replace("-", " ")}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/3 mb-4" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare size={40} className="mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium mb-2">No contacts found</h3>
          <p className="text-muted-foreground">No messages match your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((contact, i) => (
            <motion.div
              key={contact._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card
                className={cn(
                  "hover:shadow-md transition-all cursor-pointer",
                  !contact.isRead && "border-l-4 border-l-brand-500"
                )}
                onClick={() => setExpandedId(expandedId === contact._id ? null : contact._id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{contact.name}</span>
                        {!contact.isRead && (
                          <span className="w-2 h-2 rounded-full bg-brand-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-2"><Mail size={12} /> {contact.email}</span>
                        <span className="flex items-center gap-2"><Phone size={12} /> {contact.phone}</span>
                        <span className="flex items-center gap-2"><Calendar size={12} /> {formatDate(contact.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={cn("text-[10px]", contactTypeColors[contact.type] || "bg-muted")}>
                        {contact.type}
                      </Badge>
                      {expandedId === contact._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-medium">{contact.subject}</p>
                    {expandedId === contact._id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 space-y-4"
                      >
                        <p className="text-sm text-muted-foreground leading-relaxed">{contact.message}</p>
                        <div className="flex items-center gap-2 pt-4 border-t border-border">
                          {!contact.isRead && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleMarkRead(contact._id); }}
                              className="text-xs"
                            >
                              <Eye size={12} className="mr-2" /> Mark Read
                            </Button>
                          )}
                          <a
                            href={`mailto:${contact.email}?subject=Re: ${encodeURIComponent(contact.subject || 'Your Inquiry')}&body=Dear ${encodeURIComponent(contact.name || 'Customer')},`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs rounded-md border border-border bg-background hover:bg-muted transition-colors font-medium"
                          >
                            <Reply size={12} /> Reply via Email
                          </a>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleDelete(contact._id); }}
                            className="text-xs text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={12} className="mr-2" /> Delete
                          </Button>
                        </div>
                      </motion.div>
                    )}
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
