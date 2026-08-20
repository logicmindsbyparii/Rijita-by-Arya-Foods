"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Users,
  Search,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  X,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  Trash2,
  ShieldCheck,
  UserCog,
  Ban,
  CheckCircle2,
  UserPlus,
  MoreHorizontal,
  KeyRound,
} from "lucide-react";
import { adminApi } from "@/lib/admin/api";
import { useAuth } from "@/lib/admin/auth-context";
import { cn, formatDate, getInitials } from "@/lib/admin/utils";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import { Card, CardContent } from "@/components/admin-ui/card";
import { Badge } from "@/components/admin-ui/badge";
import { Skeleton } from "@/components/admin-ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/admin-ui/avatar";
import type { User } from "@/types/admin";

interface UserFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "customer" | "admin" | "superadmin";
  isActive: boolean;
}

const defaultForm: UserFormData = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "customer",
  isActive: true,
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal / Drawer state
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(defaultForm);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // The server refuses to let an admin deactivate or delete their own account
  // (it would end the session mid-request, and for a lone superadmin lock the
  // panel for good). Hide the actions rather than offering them and failing.
  const { user: currentUser } = useAuth();
  const isSelf = (u: User) => !!currentUser && u._id === currentUser._id;

  // Close delete dropdown on outside click
  useEffect(() => {
    if (!confirmDelete) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setConfirmDelete(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [confirmDelete]);

  const limit = 15;

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { page, limit };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const res = await adminApi.getUsers(params);
      const data = res.data || res;
      setUsers(data.users || data || []);
      setTotalPages(data.totalPages || res.pagination?.totalPages || 1);
      setTotal(data.total || res.pagination?.total || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData(defaultForm);
    setShowUserModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: "",
      role: user.role,
      isActive: user.isActive,
    });
    setShowUserModal(true);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mirror the server's 6-character floor. Without this the only feedback is
    // the raw 422 body ("String should have at least 6 characters"), which
    // does not name the field it came from.
    const needsPassword = !editingUser || !!formData.password;
    if (needsPassword && formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    try {
      setSaving(true);
      if (editingUser) {
        const payload: any = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          isActive: formData.isActive,
        };
        if (formData.password) payload.password = formData.password;
        await adminApi.updateUser(editingUser._id, payload);
        toast.success("User updated successfully");
      } else {
        await adminApi.createUser(formData);
        toast.success("User created successfully");
      }
      setShowUserModal(false);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await adminApi.deleteUser(id);
      toast.success("User deleted");
      setConfirmDelete(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await adminApi.updateUser(user._id, { isActive: !user.isActive });
      toast.success(`User ${user.isActive ? "deactivated" : "activated"}`);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user status");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "superadmin":
        return (
          <Badge variant="destructive" className="text-[10px] capitalize gap-2">
            <ShieldCheck className="h-4 w-4" /> {role}
          </Badge>
        );
      case "admin":
        return (
          <Badge variant="default" className="text-[10px] capitalize gap-2">
            <UserCog className="h-4 w-4" /> {role}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-[10px] capitalize">
            {role}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Users</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {total > 0 ? `${total} user${total !== 1 ? "s" : ""} total` : "Manage all users and admins"}
          </p>
        </div>
        <Button onClick={openCreateModal} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email or phone..."
            className="flex h-12 w-full rounded-xl border-2 border-[var(--color-rule)] bg-white px-4 pl-8 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] transition-all focus-visible:outline-none focus-visible:border-[var(--color-accent)] focus-visible:shadow-[0_0_0_3px_var(--color-focus)]"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="flex h-12 rounded-xl border border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all"
        >
          <option value="">All Roles</option>
          <option value="customer">Customer</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Super Admin</option>
        </select>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-red-400" />
            <p className="font-medium text-lg mb-2">Failed to load users</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadUsers} variant="outline">Retry</Button>
          </CardContent>
        </Card>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="font-medium text-lg mb-2">No users found</p>
            <p className="text-sm text-muted-foreground">
              {search ? "Try a different search term" : (
                <>
                  Start by{" "}
                  <button onClick={openCreateModal} className="text-brand-600 hover:underline font-medium">
                    adding a user
                  </button>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* User Cards */}
          <div className="space-y-4">
            {users.map((user, i) => (
              <motion.div
                key={user._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className={cn(
                  "hover:shadow-md transition-all",
                  !user.isActive && "opacity-60"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 ring-2 ring-brand-500/10">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-brand-100 text-brand-700">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{user.name}</p>
                          {getRoleBadge(user.role)}
                          <Badge
                            variant={user.isActive ? "success" : "secondary"}
                            className="text-[10px]"
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {user.email}
                          </span>
                          {user.phone && (
                            <span className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              {user.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground hidden sm:block">
                        <p>Joined {formatDate(user.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(user)}
                          className="h-8 w-8 rounded-lg shrink-0"
                          title="Edit user"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedUser(user)}
                          className="h-8 w-8 rounded-lg shrink-0"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <div className="relative" ref={dropdownRef}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setConfirmDelete(confirmDelete === user._id ? null : user._id)}
                            className="h-8 w-8 rounded-lg shrink-0 hover:text-red-500"
                            title="More actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          <AnimatePresence>
                            {confirmDelete === user._id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 top-full mt-2 z-40 bg-white rounded-xl border border-border shadow-xl p-2 min-w-[160px]"
                              >
                                {isSelf(user) ? (
                                  <p className="px-4 py-2 text-xs text-muted-foreground leading-snug">
                                    You can&apos;t deactivate or delete your own account.
                                  </p>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleToggleStatus(user)}
                                      className="flex items-center gap-2 w-full px-4 py-2 text-xs rounded-lg hover:bg-muted transition-colors text-left"
                                    >
                                      {user.isActive ? (
                                        <><Ban className="h-4 w-4 text-orange-500" /> Deactivate</>
                                      ) : (
                                        <><CheckCircle2 className="h-4 w-4 text-green-500" /> Activate</>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(user._id)}
                                      className="flex items-center gap-2 w-full px-4 py-2 text-xs rounded-lg hover:bg-red-50 transition-colors text-left text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4" /> Delete
                                    </button>
                                  </>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
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
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create / Edit User Modal */}
      <AnimatePresence>
        {showUserModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUserModal(false)}
              className="fixed inset-0 z-50 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-border flex items-center justify-between p-4">
                  <h2 className="text-lg font-bold font-display flex items-center gap-2">
                    {editingUser ? (
                      <><Edit3 className="h-4 w-4 text-brand-500" /> Edit User</>
                    ) : (
                      <><UserPlus className="h-4 w-4 text-brand-500" /> Add User</>
                    )}
                  </h2>
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={handleSubmitUser} className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Phone</label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="+91 9876543210"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-muted-foreground" />
                      {editingUser ? "New Password (leave blank to keep current)" : "Password"}
                    </label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                      placeholder={editingUser ? "Leave blank to keep current" : "Min 6 characters"}
                      required={!editingUser}
                      minLength={editingUser ? 0 : 6}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Role</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData((f) => ({ ...f, role: e.target.value as any }))}
                        disabled={!!editingUser && isSelf(editingUser)}
                        className="flex h-12 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <option value="customer">Customer</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                      {!!editingUser && isSelf(editingUser) && (
                        <p className="text-[11px] text-muted-foreground mt-2">
                          You can&apos;t change your own role.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Status</label>
                      <div className="flex h-12 items-center gap-4 px-4 rounded-xl border border-border">
                        <button
                          type="button"
                          onClick={() => setFormData((f) => ({ ...f, isActive: !f.isActive }))}
                          className={cn(
                            "relative inline-flex h-4 w-8 items-center rounded-full transition-colors shrink-0",
                            formData.isActive ? "bg-green-500" : "bg-gray-300"
                          )}
                        >
                          <span className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            formData.isActive ? "translate-x-[18px]" : "translate-x-[2px]"
                          )} />
                        </button>
                        <span className="text-sm">{formData.isActive ? "Active" : "Inactive"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowUserModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving} className="flex-1 gap-2">
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : editingUser ? (
                        <><Edit3 className="h-4 w-4" /> Update</>
                      ) : (
                        <><UserPlus className="h-4 w-4" /> Create</>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* User Detail Slide-out Panel */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="fixed inset-0 z-50 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl overflow-y-auto"
            >
              <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-border flex items-center justify-between p-4 z-10">
                <h2 className="text-lg font-bold font-display">User Details</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(null);
                      openEditModal(selectedUser);
                    }}
                    className="gap-2"
                  >
                    <Edit3 className="h-4 w-4" /> Edit
                  </Button>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 ring-4 ring-brand-500/10">
                    <AvatarImage src={selectedUser.avatar} />
                    <AvatarFallback className="bg-brand-100 text-brand-700 text-lg">
                      {getInitials(selectedUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold font-display">{selectedUser.name}</h3>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {getRoleBadge(selectedUser.role)}
                      <Badge variant={selectedUser.isActive ? "success" : "secondary"} className="capitalize text-[10px]">
                        {selectedUser.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <p className="text-2xl font-bold font-display text-blue-700">-</p>
                    <p className="text-xs text-blue-600">Orders</p>
                    <p className="text-[10px] text-blue-400">Coming soon</p>
                  </div>
                  <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                    <p className="text-2xl font-bold font-display text-green-700">-</p>
                    <p className="text-xs text-green-600">Total Spent</p>
                    <p className="text-[10px] text-green-400">Coming soon</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedUser.email}</span>
                    </div>
                    {selectedUser.phone && (
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedUser.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Joined {formatDate(selectedUser.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Addresses ({selectedUser.addresses?.length || 0})
                  </h4>
                  {selectedUser.addresses?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedUser.addresses.map((addr, i) => (
                        <div key={i} className="p-4 rounded-xl border border-border">
                          <div className="flex items-start gap-4">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0" />
                            <div>
                              <p className="text-sm font-medium">{addr.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {addr.addressLine1}
                                {addr.addressLine2 && `, ${addr.addressLine2}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {addr.city}, {addr.state} - {addr.pincode}
                              </p>
                              <p className="text-xs text-muted-foreground">{addr.fullName} · {addr.phone}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No addresses saved</p>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleToggleStatus(selectedUser);
                        setSelectedUser(null);
                      }}
                      className={cn(
                        "gap-2",
                        selectedUser.isActive ? "text-orange-600 border-orange-200 hover:bg-orange-50" : "text-green-600 border-green-200 hover:bg-green-50"
                      )}
                    >
                      {selectedUser.isActive ? (
                        <><Ban className="h-4 w-4" /> Deactivate</>
                      ) : (
                        <><CheckCircle2 className="h-4 w-4" /> Activate</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        handleDeleteUser(selectedUser._id);
                        setSelectedUser(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
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
