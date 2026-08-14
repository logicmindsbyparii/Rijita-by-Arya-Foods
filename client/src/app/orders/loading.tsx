"use client";

export default function OrdersLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-24 min-h-[90vh]">
      {/* Title skeleton */}
      <div className="space-y-2 mb-8">
        <div className="h-8 shimmer-bg rounded-lg w-48" />
        <div className="h-4 shimmer-bg rounded-md w-72" />
      </div>
      
      {/* List skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-stone-200/60 rounded-2xl p-4 bg-white space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-stone-100 pb-4">
              <div className="space-y-2">
                <div className="h-4 shimmer-bg rounded-md w-28" />
                <div className="h-4 shimmer-bg rounded-md w-20" />
              </div>
              <div className="h-6 shimmer-bg rounded-full w-20" />
            </div>
            <div className="flex gap-4">
              <div className="w-16 h-16 shimmer-bg rounded-xl" />
              <div className="flex-1 space-y-2 py-2">
                <div className="h-4 shimmer-bg rounded-md w-1/2" />
                <div className="h-4 shimmer-bg rounded-md w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
