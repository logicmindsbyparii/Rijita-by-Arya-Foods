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
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-brand-600 text-white shadow-lg hover:bg-brand-700 transition-ui shadow-brand-900/25"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none", transform: visible ? "scale(1)" : "scale(0.8)" }}
      // Hidden here means opacity:0 — the element still occupies the tab order
      // and the accessibility tree, so keyboard and screen-reader users would
      // otherwise land on an invisible button.
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      aria-label="Scroll to top"
    >
      <ArrowUp size={18} />
    </button>
  );
}
