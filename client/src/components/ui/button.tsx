/* Hallmark · component: button · genre: editorial · theme: curated (brand-green + gold)
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (40–41)
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
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
          "bg-brand-800 text-white border border-brand-900 font-bold " +
          "hover:bg-brand-900 hover:border-brand-950 shadow-sm hover:shadow-md " +
          "focus-visible:bg-brand-900",
        brand:
          "bg-brand-700 text-white border border-brand-800 font-bold " +
          "hover:bg-brand-800 hover:border-brand-900 shadow-sm " +
          "focus-visible:bg-brand-800",
        gold:
          "bg-amber-400 text-brand-950 border border-amber-500 font-extrabold " +
          "hover:bg-amber-500 hover:text-brand-950 shadow-sm " +
          "focus-visible:bg-amber-500",
        destructive:
          "bg-red-600 text-white border border-red-700 font-bold " +
          "hover:bg-red-700 focus-visible:bg-red-700",
        outline:
          "border-2 border-stone-300 bg-white text-stone-800 font-bold " +
          "hover:bg-stone-100 hover:border-brand-600 hover:text-brand-900 " +
          "focus-visible:bg-stone-100 focus-visible:border-brand-600",
        secondary:
          "bg-stone-100 text-stone-800 border border-stone-200 font-semibold " +
          "hover:bg-stone-200 hover:text-stone-900 " +
          "focus-visible:bg-stone-200",
        ghost:
          "bg-transparent text-stone-700 font-semibold border border-transparent " +
          "hover:bg-stone-100 hover:text-stone-900 " +
          "focus-visible:bg-stone-100",
        link:
          "text-brand-700 font-bold underline-offset-4 hover:underline " +
          "focus-visible:underline bg-transparent border-none",
        whatsapp:
          "bg-whatsapp text-white font-bold border border-whatsapp-600 shadow-sm " +
          "hover:bg-whatsapp-600 hover:border-whatsapp-700 " +
          "focus-visible:bg-whatsapp-600",
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
