import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

/**
 * Button variant options
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "outline";

/**
 * Button size options
 */
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The visual style of the button */
  variant?: ButtonVariant;
  /** The size of the button */
  size?: ButtonSize;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Optional icon to display before children */
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 shadow-glow-sm hover:shadow-glow-md active:bg-brand-700 focus-visible:ring-brand-500",
  secondary:
    "bg-surface-raised border border-border text-text-primary hover:bg-surface-overlay hover:border-brand-500/50 active:bg-surface-overlay focus-visible:ring-text-secondary",
  ghost: 
    "text-text-secondary hover:text-text-primary hover:bg-surface-raised active:bg-surface-overlay focus-visible:ring-text-muted",
  destructive:
    "bg-status-error/10 text-status-error border border-status-error/20 hover:bg-status-error/20 hover:border-status-error/40 active:bg-status-error/30 focus-visible:ring-status-error",
  outline: 
    "border border-brand-500/50 text-brand-500 hover:bg-brand-500/10 active:bg-brand-500/20 focus-visible:ring-brand-500",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
  icon: "h-10 w-10 p-0",
};

/**
 * Reusable Button component with multiple variants and sizes.
 * Supports loading states and prefix icons.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium",
          "transition-all duration-[var(--motion-fast)] ease-[var(--easing-emphasized)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:opacity-50 disabled:pointer-events-none disabled:grayscale-[0.5]",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
