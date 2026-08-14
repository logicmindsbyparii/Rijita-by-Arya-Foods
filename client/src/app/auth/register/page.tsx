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
    
    if (score <= 1) return { score, label: "Weak", color: "bg-red-500", icon: ShieldAlert, tip: 'Try adding numbers & symbols' };
    if (score <= 2) return { score, label: "Fair", color: "bg-orange-500", icon: Shield, tip: 'Add uppercase & special chars' };
    if (score <= 3) return { score, label: "Good", color: "bg-yellow-500", icon: Shield, tip: 'Getting better!' };
    return { score, label: "Strong", color: "bg-green-500", icon: ShieldCheck, tip: 'Great password!' };
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-cream to-amber-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand-500 to-spice-gold flex items-center justify-center shadow-lg shadow-brand-500/20">
              <span className="text-white font-display font-bold text-2xl">R</span>
            </div>
            <h1 className="text-2xl font-display font-bold">Create Account</h1>
            <p className="text-sm text-muted-foreground mt-2">Join RIJITA by Arya Foods</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-ui text-sm"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-ui text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
                className="w-full px-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-ui text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-ui text-sm pr-10"
                  aria-describedby={password ? "pw-strength" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Toggle password"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Password Strength Indicator */}
              {password && pwStrength && (() => {
                const tipColors: Record<string, string> = {
                  Weak: 'text-red-500',
                  Fair: 'text-orange-500',
                  Good: 'text-yellow-500',
                  Strong: 'text-green-500',
                };
                const Icon = pwStrength.icon;
                return (
                  <div id="pw-strength" className="mt-2 space-y-2" role="status" aria-live="polite">
                    <div className="flex gap-2" aria-hidden="true">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-2 flex-1 rounded-full transition-ui duration-300 ${
                            level <= pwStrength.score ? pwStrength.color : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon size={12} className={tipColors[pwStrength.label]} aria-hidden="true" />
                      <span className={`text-xs font-medium ${tipColors[pwStrength.label]}`}>
                        {pwStrength.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {pwStrength.tip}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div>
              <label htmlFor="reg-confirm-password" className="block text-sm font-medium mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full px-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-ui text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Toggle confirm password"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-2">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white rounded-xl font-medium transition-ui flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <UserPlus size={18} />
              )}
              {isSubmitting ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-brand-600 hover:text-brand-700 font-medium">
                Sign In
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link href="/" className="text-xs text-muted-foreground hover:text-brand-600 transition-colors">
              ← Back to website
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
