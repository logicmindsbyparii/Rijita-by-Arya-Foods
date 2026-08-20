"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      router.push("/");
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
      login({ accessToken, refreshToken, user });
      toast.success(`Welcome back, ${user.name}!`);
      router.push("/");
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Invalid credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-600" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="relative min-h-dvh flex items-center justify-center bg-paper p-4 overflow-hidden">
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-brand-600/5 blur-3xl pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <div className="bg-paper-2 rounded-2xl shadow-xl shadow-ink/5 border border-rule p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gold-500 flex items-center justify-center shadow-lg shadow-gold-500/30">
              <span className="font-serif italic font-bold text-3xl text-brand-950">R</span>
            </div>
            <h1 className="text-3xl font-display font-black text-ink">
              Welcome Back
            </h1>
            <p className="text-sm text-ink-2 mt-2">Sign in to your account</p>
          </div>

            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-semibold text-ink-2 mb-2">Email</label>
              <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  className="w-full h-12 px-4 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-ui text-sm"
                  autoFocus
                />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-semibold text-ink-2 mb-2">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full h-12 px-4 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-ui text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors"
                  aria-label="Toggle password"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end text-xs">
              <Link
                href="/auth/forgot-password"
                className="text-brand-600 hover:text-brand-700 transition-colors font-semibold"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-600/60 text-white rounded-xl font-bold transition-ui flex items-center justify-center gap-2 shadow-lg shadow-brand-700/20"
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
            <Link href="/auth/register" className="text-xs text-ink-2 hover:text-brand-700 transition-colors font-medium">
              Don&apos;t have an account? Register
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
