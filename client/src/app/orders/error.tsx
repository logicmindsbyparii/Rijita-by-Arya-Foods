"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function OrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Orders error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-display font-bold mb-2">Failed to load orders</h2>
        <p className="text-muted-foreground mb-6">
          Something went wrong. Please try again.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium transition-ui"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted rounded-xl font-medium transition-ui"
          >
            My Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
