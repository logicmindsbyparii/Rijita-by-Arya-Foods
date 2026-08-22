"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    // Run once on mount: browsers restore scroll position on reload and on
    // back-navigation, so without this the button stays hidden on an
    // already-scrolled page until the user scrolls again.
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className="fixed z-50 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-[calc(2rem+env(safe-area-inset-bottom))] right-4 md:right-8"
      style={{
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <button
        onClick={(e) => {
          e.currentTarget.blur();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className="p-4 rounded-xl bg-brand-600 text-white shadow-lg hover:bg-brand-700 transition-ui shadow-brand-900/25 active:scale-95"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.8)",
          transition: "opacity 300ms ease, transform 300ms ease",
        }}
        tabIndex={visible ? 0 : -1}
        aria-label="Scroll to top"
      >
        <ArrowUp size={18} />
      </button>
    </div>
  );
}
