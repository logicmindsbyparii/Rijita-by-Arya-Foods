"use client";

import Link from "next/link";
import { AlertTriangle, ChevronLeft, RotateCcw } from "lucide-react";

export default function ProductDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16 bg-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center ring-1 ring-red-100">
          <AlertTriangle size={36} className="text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-stone-800 mb-2">
          Failed to Load Product
        </h1>
        <p className="text-sm text-stone-500 mb-2 leading-relaxed">
          Something went wrong while loading this product. It may have been removed
          or there could be a temporary issue.
        </p>
        <p className="text-xs text-stone-400 mb-8 font-mono bg-stone-50 px-4 py-2 rounded-lg inline-block">
          {error.message || "Unknown error"}
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-bold hover:bg-stone-800 transition-colors"
          >
            <RotateCcw size={14} />
            Try Again
          </button>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            <ChevronLeft size={14} />
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  );
}
