"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle size={40} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-display font-bold mb-4">Something went wrong</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          An unexpected error occurred. Please try again or return to the homepage.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium transition-ui hover:shadow-lg"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-4 border border-border hover:bg-muted rounded-xl font-medium transition-ui"
          >
            <Home size={16} />
            Go Home
          </Link>
        </div>
        {error.digest && (
          <p className="text-xs text-muted-foreground mt-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
