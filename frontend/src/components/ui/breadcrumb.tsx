import { cn } from "@/lib/utils";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

export interface BreadcrumbItem {
  /** Display label for the breadcrumb */
  label: string;
  /** URL path for the breadcrumb link */
  href?: string;
  /** Whether this is the current/active page */
  isCurrent?: boolean;
}

export interface BreadcrumbProps {
  /** Array of breadcrumb items to display */
  items: BreadcrumbItem[];
  /** Optional className for the container */
  className?: string;
  /** Whether to show a home icon for the first item */
  showHomeIcon?: boolean;
}

/**
 * Breadcrumb navigation component for displaying hierarchical page structure.
 * Supports keyboard navigation and ARIA attributes for accessibility.
 * 
 * @example
 * ```tsx
 * <Breadcrumb
 *   items={[
 *     { label: "Dashboard", href: "/dashboard" },
 *     { label: "Settings", href: "/settings" },
 *     { label: "Profile", isCurrent: true }
 *   ]}
 * />
 * ```
 */
export function Breadcrumb({ items, className, showHomeIcon = true }: BreadcrumbProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-sm", className)}
    >
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === items.length - 1;
          const isCurrent = item.isCurrent || isLast;

          return (
            <Fragment key={`${item.href}-${index}`}>
              {/* Separator */}
              {!isFirst && (
                <li aria-hidden="true" className="flex items-center">
                  <ChevronRight className="h-4 w-4 text-text-muted" />
                </li>
              )}

              {/* Breadcrumb Item */}
              <li className="flex items-center">
                {isCurrent ? (
                  <span
                    className="inline-flex items-center gap-1.5 font-medium text-text-primary"
                    aria-current="page"
                  >
                    {isFirst && showHomeIcon && (
                      <Home className="h-4 w-4" aria-hidden="true" />
                    )}
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href || "#"}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 -mx-2",
                      "text-text-secondary hover:text-text-primary hover:bg-surface-raised",
                      "transition-colors duration-[var(--motion-fast)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    )}
                  >
                    {isFirst && showHomeIcon && (
                      <Home className="h-4 w-4" aria-hidden="true" />
                    )}
                    {item.label}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
