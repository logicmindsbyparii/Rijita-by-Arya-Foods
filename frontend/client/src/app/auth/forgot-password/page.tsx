"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(email);
    } catch {
    } finally {
      setSent(true);
      toast.success("Password reset link sent to your email");
      setIsSubmitting(false);
    }
  };

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
            <h1 className="text-3xl font-display font-black text-ink">Reset Password</h1>
            <p className="text-sm text-ink-2 mt-2">
              {sent ? "Check your email for the reset link" : "Enter your email to receive a reset link"}
            </p>
          </div>

          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 mx-auto mb-4 rounded-full bg-brand-600/10 flex items-center justify-center"
              >
                <Mail size={32} className="text-brand-700" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-display font-bold text-ink mb-2"
              >
                Check your email
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-ink-2 mb-6"
              >
                If an account exists with that email, we&apos;ve sent a password reset link.
                Please check your inbox and spam folder.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 px-6 py-4 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-ui shadow-sm"
                >
                  <ArrowLeft size={16} />
                  Back to login
                </Link>
              </motion.div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-semibold text-ink-2 mb-2">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full h-12 px-4 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-ui text-sm"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-600/60 text-white rounded-xl font-bold transition-ui flex items-center justify-center gap-2 shadow-lg shadow-brand-700/20"
              >
                {isSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Mail size={18} />
                )}
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </button>

              <div className="text-center">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 text-sm text-ink-2 hover:text-brand-700 transition-colors font-medium"
                >
                  <ArrowLeft size={14} />
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
