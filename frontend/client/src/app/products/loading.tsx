import { Skeleton, ProductGridSkeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 min-h-[90vh]">
      {/* Title skeleton */}
      <div className="space-y-2 mb-8">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </div>
      
      {/* Grid skeleton */}
      <ProductGridSkeleton count={8} />
    </div>
  );
}
