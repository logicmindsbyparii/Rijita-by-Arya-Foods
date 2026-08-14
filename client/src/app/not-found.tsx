import Link from "next/link";
import { ArrowRight, Home, Leaf } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-paper text-ink p-4 relative overflow-hidden">
      {/* Ambient light washes */}

      <div className="relative text-center max-w-md mx-auto">
        <div className="inline-flex items-center gap-4 text-xs font-bold uppercase tracking-[0.22em] text-brand-700 mb-8">
          <span className="h-px w-10 bg-brand-600/40" />
          <Leaf size={14} className="text-brand-600" />
          RIJITA by Arya Foods
          <span className="h-px w-10 bg-brand-600/40" />
        </div>

        <p className="font-display font-extrabold text-[7rem] sm:text-[9rem] leading-none text-brand-800 tracking-tight select-none">
          404
        </p>

        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink mt-6 [text-wrap:balance]">
          This page wandered off.
        </h1>

        <p className="text-ink-2 mt-4 leading-relaxed [text-wrap:pretty]">
          The page you&apos;re looking for was either moved, renamed, or never existed. The namkeen, however, is exactly where you left it.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm transition-ui shadow-lg shadow-brand-700/20 active:scale-[0.98] focus-ring"
          >
            <Home size={16} />
            Back to Home
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white border border-ink-mid hover:border-brand-600 hover:text-brand-700 text-ink font-bold text-sm transition-ui active:scale-[0.98] focus-ring"
          >
            Browse Products
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
