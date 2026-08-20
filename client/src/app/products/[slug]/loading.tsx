import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2 mb-8">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Gallery skeleton */}
          <div className="space-y-4 lg:sticky lg:top-28 self-start">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="flex gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-16 rounded-xl" />
              ))}
            </div>
          </div>

          {/* Info skeleton */}
          <div className="space-y-6">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-8 w-3/4 rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-16 rounded ml-2" />
            </div>
            <Skeleton className="h-4 w-3/4 rounded" />
            <div className="flex items-baseline gap-4">
              <Skeleton className="h-8 w-24 rounded" />
              <Skeleton className="h-6 w-16 rounded" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-20 w-24 rounded-xl" />
              <Skeleton className="h-20 w-24 rounded-xl" />
              <Skeleton className="h-20 w-24 rounded-xl" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-32 rounded-xl" />
              <Skeleton className="h-12 flex-1 rounded-xl" />
            </div>
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
