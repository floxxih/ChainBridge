import { render, screen } from "@testing-library/react";
import { Breadcrumb } from "../breadcrumb";
import type { BreadcrumbItem } from "../breadcrumb";

describe("Breadcrumb", () => {
  const mockItems: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings", isCurrent: true },
  ];

  it("renders breadcrumb items correctly", () => {
    render(<Breadcrumb items={mockItems} />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders links for non-current items", () => {
    render(<Breadcrumb items={mockItems} />);

    const homeLink = screen.getByRole("link", { name: /home/i });
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });

    expect(homeLink).toHaveAttribute("href", "/");
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
  });

  it("marks the current page with aria-current", () => {
    render(<Breadcrumb items={mockItems} />);

    const currentItem = screen.getByText("Settings");
    expect(currentItem).toHaveAttribute("aria-current", "page");
  });

  it("does not render a link for the current page", () => {
    render(<Breadcrumb items={mockItems} />);

    const links = screen.getAllByRole("link");
    const linkTexts = links.map((link) => link.textContent);

    expect(linkTexts).not.toContain("Settings");
  });

  it("renders home icon when showHomeIcon is true", () => {
    const { container } = render(<Breadcrumb items={mockItems} showHomeIcon={true} />);

    // Check for the Home icon (lucide-react renders as svg)
    const homeIcons = container.querySelectorAll('svg');
    expect(homeIcons.length).toBeGreaterThan(0);
  });

  it("does not render home icon when showHomeIcon is false", () => {
    const { container } = render(<Breadcrumb items={mockItems} showHomeIcon={false} />);

    // Should still have separator icons but not home icon
    const svgs = container.querySelectorAll('svg');
    // With 3 items, we have 2 separators (ChevronRight icons)
    expect(svgs.length).toBe(2);
  });

  it("renders separators between items", () => {
    const { container } = render(<Breadcrumb items={mockItems} />);

    // Should have 2 separators for 3 items
    const separators = container.querySelectorAll('[aria-hidden="true"]');
    expect(separators.length).toBeGreaterThanOrEqual(2);
  });

  it("renders nothing when items array is empty", () => {
    const { container } = render(<Breadcrumb items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("applies custom className", () => {
    const { container } = render(<Breadcrumb items={mockItems} className="custom-class" />);

    const nav = container.querySelector("nav");
    expect(nav).toHaveClass("custom-class");
  });

  it("has proper ARIA navigation label", () => {
    render(<Breadcrumb items={mockItems} />);

    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(nav).toBeInTheDocument();
  });

  it("handles single item breadcrumb", () => {
    const singleItem: BreadcrumbItem[] = [{ label: "Dashboard", isCurrent: true }];
    render(<Breadcrumb items={singleItem} />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("handles two-level breadcrumb", () => {
    const twoLevels: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
      { label: "About", isCurrent: true },
    ];
    render(<Breadcrumb items={twoLevels} />);

    expect(screen.getByRole("link", { name: /home/i })).toBeInTheDocument();
    expect(screen.getByText("About")).toHaveAttribute("aria-current", "page");
  });

  it("handles deep hierarchy", () => {
    const deepItems: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
      { label: "Level 1", href: "/level1" },
      { label: "Level 2", href: "/level1/level2" },
      { label: "Level 3", href: "/level1/level2/level3" },
      { label: "Current", isCurrent: true },
    ];
    render(<Breadcrumb items={deepItems} />);

    expect(screen.getAllByRole("link")).toHaveLength(4);
    expect(screen.getByText("Current")).toHaveAttribute("aria-current", "page");
  });

  it("treats last item as current if isCurrent is not explicitly set", () => {
    const items: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Settings" }, // No isCurrent, but it's last
    ];
    render(<Breadcrumb items={items} />);

    const settingsItem = screen.getByText("Settings");
    expect(settingsItem).toHaveAttribute("aria-current", "page");
  });
});
