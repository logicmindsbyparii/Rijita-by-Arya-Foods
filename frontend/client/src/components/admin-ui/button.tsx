/* Hallmark · component: button · genre: editorial · theme: curated (brand-green + gold)
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (40–41)
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/admin/utils";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold",
    "transition-[background-color,color,border-color,box-shadow,transform] duration-short ease-out-custom",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-55 disabled:cursor-not-allowed",
    "active:scale-[0.97]",
    "min-h-[44px]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-accent)] text-white border border-[var(--color-accent-dark)] " +
          "hover:bg-[var(--color-accent-dark)] hover:border-[var(--color-accent-dark)] " +
          "focus-visible:bg-[var(--color-accent-dark)]",
        brand:
          "bg-[var(--color-brand)] text-white border border-[var(--color-brand-dark)] " +
          "hover:bg-[var(--color-brand-dark)] hover:border-[var(--color-brand-dark)] " +
          "focus-visible:bg-[var(--color-brand-dark)]",
        destructive:
          "bg-[var(--color-error)] text-white border border-[var(--color-error)] " +
          "hover:brightness-90 focus-visible:brightness-90",
        outline:
          "border-2 border-[var(--color-rule)] bg-transparent text-[var(--color-ink)] " +
          "hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-accent)] " +
          "focus-visible:bg-[var(--color-surface-hover)] focus-visible:border-[var(--color-accent)]",
        secondary:
          "bg-[var(--color-surface-2)] text-[var(--color-ink-2)] border border-[var(--color-rule)] " +
          "hover:bg-[var(--color-surface-hover)] " +
          "focus-visible:bg-[var(--color-surface-hover)]",
        ghost:
          "bg-transparent text-[var(--color-ink)] border border-transparent " +
          "hover:bg-[var(--color-surface-hover)] " +
          "focus-visible:bg-[var(--color-surface-hover)]",
        link:
          "text-[var(--color-brand)] underline-offset-4 hover:underline " +
          "focus-visible:underline bg-transparent border-none",
        whatsapp:
          "bg-[#25D366] text-white border border-[#20BD5C] " +
          "hover:bg-[#20BD5C] hover:border-[#1AA94A] " +
          "focus-visible:bg-[#20BD5C]",
      },
      size: {
        default: "h-12 px-4 py-2 text-sm",
        sm: "h-8 rounded-lg px-4 text-xs min-h-[36px]",
        lg: "h-12 rounded-xl px-8 text-base min-h-[48px]",
        xl: "h-14 rounded-xl px-10 text-lg min-h-[56px]",
        icon: "h-12 w-12 rounded-full p-0 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  error?: boolean;
  success?: boolean;
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      error = false,
      success = false,
      icon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          loading && "pointer-events-none",
          error && "border-[var(--color-error)] ring-1 ring-[var(--color-error)]",
          success && "border-[var(--color-success)]"
        )}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            {children}
          </span>
        ) : error ? (
          <span className="flex items-center gap-2">
            <AlertCircle size={16} />
            {children}
          </span>
        ) : success ? (
          <span className="flex items-center gap-2">
            <CheckCircle size={16} className="text-inherit" />
            {children}
          </span>
        ) : icon ? (
          <span className="flex items-center gap-2">
            {icon}
            {children}
          </span>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
