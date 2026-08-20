"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "rijita-cookie-consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Small delay so the banner doesn't fight the hero entrance
        const t = setTimeout(() => setVisible(true), 1800);
        return () => clearTimeout(t);
      }
      setChoice(stored);
    } catch {
      setVisible(true);
    }
  }, []);

  const decide = (value: "accepted" | "declined") => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* storage unavailable — just hide */
    }
    setChoice(value);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && !choice && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          role="region"
          aria-label="Cookie consent"
          className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm z-[var(--z-toast)] bg-white border border-ink-soft rounded-2xl shadow-[0_24px_60px_-24px_rgba(26,20,10,0.35)] p-4"
        >
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-xl bg-brand-600/10 text-brand-700 flex items-center justify-center shrink-0">
              <Cookie size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">We respect your privacy</p>
              <p className="text-xs text-ink-2 leading-relaxed mt-2 [text-wrap:pretty]">
                We use a small amount of cookies to keep this store running and to understand how visitors use it. No ad tracking, no data resale.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => decide("accepted")}
              className="flex-1 px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition-ui active:scale-[0.98] focus-ring"
            >
              Accept
            </button>
            <button
              onClick={() => decide("declined")}
              className="flex-1 px-4 py-2 rounded-xl bg-white border border-ink-mid hover:border-brand-600 hover:text-brand-700 text-ink text-xs font-bold transition-ui active:scale-[0.98] focus-ring"
            >
              Decline
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
