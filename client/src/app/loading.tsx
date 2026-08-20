"use client";

import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-paper-2/50">
      <div className="p-4 rounded-2xl bg-paper shadow-sm border border-rule">
        <Loader2 className="h-8 w-8 text-brand-600 animate-spin" />
      </div>
      <p className="text-xs text-ink-3 font-semibold tracking-wide uppercase shimmer-bg rounded-lg px-2 py-0">Loading RIJITA...</p>
    </div>
  );
}
