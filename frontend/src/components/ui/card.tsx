import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "raised" | "glass" | "glow";
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", hover = false, children, ...props }, ref) => {
    const variantStyles = {
      default: "bg-surface border border-border",
      raised: "bg-surface-raised border border-border shadow-card dark:shadow-card-dark",
      glass: "glass",
      glow: "bg-surface-raised border border-brand-500/20 shadow-glow-sm",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl",
          variantStyles[variant],
          hover &&
            "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow-sm hover:border-brand-500/40 cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

export const CardHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 pb-3", className)} {...props} />
);

export const CardContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-6 pb-6", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex items-center gap-3 border-t border-border px-6 py-4", className)}
    {...props}
  />
);
