import { usePathname } from "next/navigation";
import { useMemo } from "react";
import type { BreadcrumbItem } from "@/components/ui/breadcrumb";

/**
 * Route label mappings for common paths.
 * Customize these to provide user-friendly labels for your routes.
 */
const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  swap: "Swap",
  swaps: "Swap History",
  marketplace: "Marketplace",
  market: "Market",
  orders: "Orders",
  htlcs: "HTLCs",
  settings: "Settings",
  protocol: "Protocol",
  transactions: "Transactions",
  explorer: "Explorer",
  about: "About",
  admin: "Admin",
  analytics: "Analytics",
  notifications: "Notifications",
  browse: "Browse",
  tracking: "Tracking",
  examples: "Examples",
  components: "Components",
};

/**
 * Hook to automatically generate breadcrumb items from the current route.
 * 
 * @param customLabels - Optional custom labels to override default route labels
 * @returns Array of breadcrumb items based on the current pathname
 * 
 * @example
 * ```tsx
 * const breadcrumbs = useBreadcrumbs();
 * return <Breadcrumb items={breadcrumbs} />;
 * ```
 * 
 * @example
 * ```tsx
 * // With custom labels
 * const breadcrumbs = useBreadcrumbs({
 *   "user-123": "John Doe",
 *   "settings": "User Settings"
 * });
 * ```
 */
export function useBreadcrumbs(customLabels?: Record<string, string>): BreadcrumbItem[] {
  const pathname = usePathname();

  return useMemo(() => {
    // Home page - no breadcrumbs needed
    if (!pathname || pathname === "/") {
      return [];
    }

    // Split pathname into segments and filter out empty strings
    const segments = pathname.split("/").filter(Boolean);

    // Build breadcrumb items
    const items: BreadcrumbItem[] = [];

    // Add home/root
    items.push({
      label: "Home",
      href: "/",
    });

    // Build breadcrumbs for each segment
    let currentPath = "";
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;

      // Get label from custom labels, route labels, or format the segment
      let label = customLabels?.[segment] || ROUTE_LABELS[segment];
      
      if (!label) {
        // Format segment: replace hyphens/underscores with spaces and capitalize
        label = segment
          .replace(/[-_]/g, " ")
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }

      items.push({
        label,
        href: isLast ? undefined : currentPath,
        ...(isLast && { isCurrent: true }),
      });
    });

    return items;
  }, [pathname, customLabels]);
}

/**
 * Hook to create custom breadcrumbs with manual control.
 * Useful when you need to override the automatic breadcrumb generation.
 * 
 * @param items - Array of breadcrumb items
 * @returns The provided breadcrumb items
 * 
 * @example
 * ```tsx
 * const breadcrumbs = useCustomBreadcrumbs([
 *   { label: "Dashboard", href: "/dashboard" },
 *   { label: "User Profile", href: "/dashboard/profile" },
 *   { label: "Edit", isCurrent: true }
 * ]);
 * ```
 */
export function useCustomBreadcrumbs(items: BreadcrumbItem[]): BreadcrumbItem[] {
  return items;
}
