"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/admin/auth-context";
import { authApi } from "@/lib/admin/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (user.role === "admin" || user.role === "superadmin") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await authApi.login({ email, password });
      const { accessToken, refreshToken, user } = res.data || res;
      if (user.role !== "admin" && user.role !== "superadmin") {
        toast.error("This account does not have admin access");
        return;
      }
      login({ accessToken, refreshToken, user });
      toast.success(`Welcome back, ${user.name}!`);
      router.push("/admin");
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Invalid credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-950">
        <Loader2 size={32} className="animate-spin text-emerald-400" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-950">
        <Loader2 size={32} className="animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-950 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-emerald-800 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-amber-900 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative"
      >
        <div className="bg-emerald-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-emerald-800 p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="text-white font-display font-bold text-2xl">R</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-white">Admin Panel</h1>
            <p className="text-sm text-emerald-400 mt-2">Staff access only</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-emerald-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@rijita.com"
                autoComplete="email"
                className="w-full px-4 py-2 rounded-xl border border-emerald-700 bg-emerald-800/50 text-white placeholder:text-emerald-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-sm"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-4 py-2 rounded-xl border border-emerald-700 bg-emerald-800/50 text-white placeholder:text-emerald-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-300"
                  aria-label="Toggle password"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <LogIn size={18} />
              )}
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a href="/" className="text-xs text-emerald-500 hover:text-emerald-300 transition-colors">
              Back to store
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
