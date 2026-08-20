"use client";

export default function BlogLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 min-h-[90vh]">
      {/* Title skeleton */}
      <div className="space-y-2 mb-8">
        <div className="h-8 shimmer-bg rounded-lg w-48" />
        <div className="h-4 shimmer-bg rounded-md w-72" />
      </div>
      
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-stone-200/60 rounded-2xl overflow-hidden bg-white">
            <div className="aspect-[16/9] shimmer-bg w-full" />
            <div className="p-4 space-y-4">
              <div className="h-4 shimmer-bg rounded-md w-1/4" />
              <div className="h-4 shimmer-bg rounded-md w-5/6" />
              <div className="h-4 shimmer-bg rounded-md w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
