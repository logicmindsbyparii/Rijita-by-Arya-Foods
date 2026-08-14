import { Skeleton } from "@/components/ui/skeleton";

export default function FaqLoading() {
  return (
    <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-10 w-1/3 rounded-lg" />
        <Skeleton className="h-4 w-2/3 rounded-md" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2 p-4 border rounded-xl">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
