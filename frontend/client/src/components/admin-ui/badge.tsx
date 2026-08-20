import * as React from "react";
import { cn } from "@/lib/admin/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    default: "bg-brand-600 text-white",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-red-500 text-white",
    outline: "border border-border text-foreground",
    success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0 text-xs font-semibold transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
