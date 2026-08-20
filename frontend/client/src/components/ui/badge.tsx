import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    default: "bg-brand-600 text-white",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-red-500 text-white",
    outline: "border border-rule text-ink-2",
    success: "bg-brand-600/10 text-brand-700",
    warning: "bg-gold-500/15 text-gold-800",
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
