"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, UserPlus, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (pw: string): { score: number; label: string; color: string; icon: any; tip: string } => {
    let score = 0;
    if (pw.length >= 6) score += 1;
    if (pw.length >= 10) score += 1;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
    if (/\d/.test(pw)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pw)) score += 1;
    
    if (score <= 1) return { score, label: "Weak", color: "bg-rose-500", icon: ShieldAlert, tip: 'Try adding numbers & symbols' };
    if (score <= 2) return { score, label: "Fair", color: "bg-gold-500", icon: Shield, tip: 'Add uppercase & special chars' };
    if (score <= 3) return { score, label: "Good", color: "bg-brand-500", icon: Shield, tip: 'Getting better!' };
    return { score, label: "Strong", color: "bg-brand-700", icon: ShieldCheck, tip: 'Great password!' };
  };

  const pwStrength = password ? getPasswordStrength(password) : null;
  const StrengthIcon = pwStrength?.icon || Shield;

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (phone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await authApi.register({ name, email, phone, password });
      const { accessToken, refreshToken, user } = res.data || res;
      login({ accessToken, refreshToken, user });
      toast.success(`Welcome, ${user.name}!`);
      router.push("/");
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Registration failed");
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
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gold-500 flex items-center justify-center shadow-lg shadow-gold-500/30">
              <span className="font-serif italic font-bold text-3xl text-brand-950">R</span>
            </div>
            <h1 className="text-3xl font-display font-black text-ink">Create Account</h1>
            <p className="text-sm text-ink-2 mt-2">Join RIJITA by Arya Foods</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="block text-sm font-semibold text-ink-2 mb-2">Full Name</label>
              <input
                id="reg-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full h-12 px-4 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-ui text-sm"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-sm font-semibold text-ink-2 mb-2">Email</label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full h-12 px-4 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-ui text-sm"
              />
            </div>

            <div>
              <label htmlFor="reg-phone" className="block text-sm font-semibold text-ink-2 mb-2">Phone Number</label>
              <input
                id="reg-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
                className="w-full h-12 px-4 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-ui text-sm"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-semibold text-ink-2 mb-2">Password</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full h-12 px-4 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-ui text-sm pr-10"
                  aria-describedby={password ? "pw-strength" : undefined}
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
              {/* Password Strength Indicator */}
              {password && pwStrength && (() => {
                const tipColors: Record<string, string> = {
                  Weak: 'text-rose-500',
                  Fair: 'text-gold-700',
                  Good: 'text-brand-700',
                  Strong: 'text-brand-800',
                };
                const Icon = pwStrength.icon;
                return (
                  <div id="pw-strength" className="mt-2 space-y-2" role="status" aria-live="polite">
                    <div className="flex gap-2" aria-hidden="true">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-2 flex-1 rounded-full transition-ui duration-300 ${
                            level <= pwStrength.score ? pwStrength.color : 'bg-rule'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon size={12} className={tipColors[pwStrength.label]} aria-hidden="true" />
                      <span className={`text-xs font-medium ${tipColors[pwStrength.label]}`}>
                        {pwStrength.label}
                      </span>
                      <span className="text-xs text-ink-3">
                        {pwStrength.tip}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div>
              <label htmlFor="reg-confirm-password" className="block text-sm font-semibold text-ink-2 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full h-12 px-4 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-ui text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors"
                  aria-label="Toggle confirm password"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-rose-500 mt-2">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-600/60 text-white rounded-xl font-bold transition-ui flex items-center justify-center gap-2 shadow-lg shadow-brand-700/20"
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <UserPlus size={18} />
              )}
              {isSubmitting ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-rule text-center">
            <p className="text-sm text-ink-2">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-brand-600 hover:text-brand-700 font-semibold">
                Sign In
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link href="/" className="text-xs text-ink-2 hover:text-brand-700 transition-colors font-medium">
              ← Back to website
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
