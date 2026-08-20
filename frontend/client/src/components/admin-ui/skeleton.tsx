import { cn } from "@/lib/admin/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("shimmer-bg rounded-xl bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
