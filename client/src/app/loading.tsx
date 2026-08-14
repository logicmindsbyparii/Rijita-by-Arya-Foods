"use client";

import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center gap-4 bg-stone-50/50">
      <div className="p-4 rounded-2xl bg-white shadow-sm border border-stone-100">
        <Loader2 className="h-8 w-8 text-emerald-700 animate-spin" />
      </div>
      <p className="text-xs text-stone-500 font-semibold tracking-wide uppercase shimmer-bg rounded-lg px-2 py-0">Loading RIJITA...</p>
    </div>
  );
}
