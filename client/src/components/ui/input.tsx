/* Hallmark · component: input · genre: editorial · theme: curated (brand-green + gold)
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 * contrast: pass (40–41)
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
  success?: boolean;
  label?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, error, success, label, helperText, id, ...props }, ref) => {
    const reactId = React.useId();
    const inputId = id || `input-${reactId}`;

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-bold text-ink-2 tracking-wide"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            className={cn(
              // Base styles — crisp contrast
              "flex h-12 w-full rounded-xl border-2 bg-paper text-sm text-ink font-medium",
              "px-4 py-2",
              "placeholder:text-ink-3 placeholder:opacity-80",
              // Border-color transitions
              "border-rule",
              "transition-[background-color,border-color,box-shadow] duration-short ease-out-custom",
              // States: outline for focus
              "focus-visible:outline-none focus-visible:border-brand-600 focus-visible:bg-paper",
              "focus-visible:shadow-[0_0_0_3px_rgba(27,110,42,0.15)]",
              // Hover
              "hover:border-brand-300",
              // Disabled
              "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-paper-2 disabled:border-rule",
              // Error
              error && "border-[var(--color-error)] hover:border-[var(--color-error)] focus-visible:border-[var(--color-error)] focus-visible:shadow-[0_0_0_3px_oklch(55%_0.18_30/0.3)]",
              // Success
              success && "border-[var(--color-success)] focus-visible:border-[var(--color-success)] focus-visible:shadow-[0_0_0_3px_oklch(60%_0.14_140/0.3)]",
              // Has icon
              icon && "pl-12",
              className
            )}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />

          {/* Right icon indicators */}
          {error && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-error)] pointer-events-none" aria-hidden="true">
              <AlertCircle size={16} />
            </div>
          )}
          {success && !error && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-success)] pointer-events-none" aria-hidden="true">
              <CheckCircle size={16} />
            </div>
          )}
        </div>

        {/* Helper / Error text — reserve space to prevent layout shift */}
        <div className="min-h-[1lh] flex items-start">
          {error ? (
            <p id={`${inputId}-error`} className="text-xs text-[var(--color-error)]" role="alert">
              {error}
            </p>
          ) : helperText ? (
            <p id={`${inputId}-helper`} className="text-xs text-[var(--color-ink-3)]">
              {helperText}
            </p>
          ) : null}
        </div>
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
