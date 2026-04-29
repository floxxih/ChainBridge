import { renderHook } from "@testing-library/react";
import { useBreadcrumbs, useCustomBreadcrumbs } from "../useBreadcrumbs";
import type { BreadcrumbItem } from "@/components/ui/breadcrumb";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

const { usePathname } = require("next/navigation");

describe("useBreadcrumbs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty array for home page", () => {
    usePathname.mockReturnValue("/");
    const { result } = renderHook(() => useBreadcrumbs());
    expect(result.current).toEqual([]);
  });

  it("generates breadcrumbs for single-level route", () => {
    usePathname.mockReturnValue("/dashboard");
    const { result } = renderHook(() => useBreadcrumbs());

    expect(result.current).toEqual([
      { label: "Home", href: "/" },
      { label: "Dashboard", href: undefined, isCurrent: true },
    ]);
  });

  it("generates breadcrumbs for multi-level route", () => {
    usePathname.mockReturnValue("/dashboard/settings");
    const { result } = renderHook(() => useBreadcrumbs());

    expect(result.current).toEqual([
      { label: "Home", href: "/" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Settings", href: undefined, isCurrent: true },
    ]);
  });

  it("generates breadcrumbs for deep hierarchy", () => {
    usePathname.mockReturnValue("/dashboard/settings/profile");
    const { result } = renderHook(() => useBreadcrumbs());

    expect(result.current).toEqual([
      { label: "Home", href: "/" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Settings", href: "/dashboard/settings" },
      { label: "Profile", href: undefined, isCurrent: true },
    ]);
  });

  it("uses predefined route labels", () => {
    usePathname.mockReturnValue("/marketplace");
    const { result } = renderHook(() => useBreadcrumbs());

    expect(result.current).toEqual([
      { label: "Home", href: "/" },
      { label: "Marketplace", href: undefined, isCurrent: true },
    ]);
  });

  it("formats unknown segments with proper capitalization", () => {
    usePathname.mockReturnValue("/custom-page");
    const { result } = renderHook(() => useBreadcrumbs());

    expect(result.current).toEqual([
      { label: "Home", href: "/" },
      { label: "Custom Page", href: undefined, isCurrent: true },
    ]);
  });

  it("handles segments with underscores", () => {
    usePathname.mockReturnValue("/user_profile");
    const { result } = renderHook(() => useBreadcrumbs());

    expect(result.current).toEqual([
      { label: "Home", href: "/" },
      { label: "User Profile", href: undefined, isCurrent: true },
    ]);
  });

  it("applies custom labels when provided", () => {
    usePathname.mockReturnValue("/users/john-doe");
    const customLabels = {
      users: "Team Members",
      "john-doe": "John Doe",
    };
    const { result } = renderHook(() => useBreadcrumbs(customLabels));

    expect(result.current).toEqual([
      { label: "Home", href: "/" },
      { label: "Team Members", href: "/users" },
      { label: "John Doe", href: undefined, isCurrent: true },
    ]);
  });

  it("custom labels override predefined route labels", () => {
    usePathname.mockReturnValue("/dashboard");
    const customLabels = {
      dashboard: "My Custom Dashboard",
    };
    const { result } = renderHook(() => useBreadcrumbs(customLabels));

    expect(result.current).toEqual([
      { label: "Home", href: "/" },
      { label: "My Custom Dashboard", href: undefined, isCurrent: true },
    ]);
  });

  it("handles trailing slash", () => {
    usePathname.mockReturnValue("/dashboard/");
    const { result } = renderHook(() => useBreadcrumbs());

    expect(result.current).toEqual([
      { label: "Home", href: "/" },
      { label: "Dashboard", href: undefined, isCurrent: true },
    ]);
  });

  it("handles null pathname", () => {
    usePathname.mockReturnValue(null);
    const { result } = renderHook(() => useBreadcrumbs());
    expect(result.current).toEqual([]);
  });

  it("memoizes result when pathname doesn't change", () => {
    usePathname.mockReturnValue("/dashboard");
    const { result, rerender } = renderHook(() => useBreadcrumbs());

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });

  it("updates when pathname changes", () => {
    usePathname.mockReturnValue("/dashboard");
    const { result, rerender } = renderHook(() => useBreadcrumbs());

    expect(result.current[1].label).toBe("Dashboard");

    usePathname.mockReturnValue("/settings");
    rerender();

    expect(result.current[1].label).toBe("Settings");
  });
});

describe("useCustomBreadcrumbs", () => {
  it("returns the provided items unchanged", () => {
    const customItems: BreadcrumbItem[] = [
      { label: "Custom Home", href: "/" },
      { label: "Custom Page", href: "/custom" },
      { label: "Details", isCurrent: true },
    ];

    const { result } = renderHook(() => useCustomBreadcrumbs(customItems));
    expect(result.current).toEqual(customItems);
  });

  it("handles empty array", () => {
    const { result } = renderHook(() => useCustomBreadcrumbs([]));
    expect(result.current).toEqual([]);
  });
});
