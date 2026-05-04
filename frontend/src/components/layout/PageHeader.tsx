"use client";

import { ReactNode } from "react";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode[];
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs = [],
  primaryAction,
  secondaryActions = [],
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "border-b border-border bg-background/50 backdrop-blur-sm",
        className
      )}
      aria-labelledby="page-title"
    >
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6 sm:py-8">
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="mb-4">
              <Breadcrumb items={breadcrumbs} />
            </div>
          )}

          {/* Title and Subtitle */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1
                id="page-title"
                className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary"
              >
                {title}
              </h1>
              {subtitle && (
                <p className="mt-2 text-base text-text-secondary max-w-3xl">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4 sm:mt-0">
              {secondaryActions.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {secondaryActions.map((action, index) => (
                    <div key={index}>{action}</div>
                  ))}
                </div>
              )}
              {primaryAction && <div>{primaryAction}</div>}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
