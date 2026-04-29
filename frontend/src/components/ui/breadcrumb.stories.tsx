import type { Meta, StoryObj } from "@storybook/react";
import { Breadcrumb } from "./breadcrumb";

const meta = {
  title: "UI/Breadcrumb",
  component: Breadcrumb,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Breadcrumb navigation component for displaying hierarchical page structure. Supports keyboard navigation and ARIA attributes for accessibility.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic breadcrumb with three levels
 */
export const Default: Story = {
  args: {
    items: [
      { label: "Home", href: "/" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Settings", isCurrent: true },
    ],
  },
};

/**
 * Breadcrumb with home icon
 */
export const WithHomeIcon: Story = {
  args: {
    items: [
      { label: "Home", href: "/" },
      { label: "Marketplace", href: "/marketplace" },
      { label: "Order Details", isCurrent: true },
    ],
    showHomeIcon: true,
  },
};

/**
 * Breadcrumb without home icon
 */
export const WithoutHomeIcon: Story = {
  args: {
    items: [
      { label: "Home", href: "/" },
      { label: "Settings", href: "/settings" },
      { label: "Profile", isCurrent: true },
    ],
    showHomeIcon: false,
  },
};

/**
 * Deep navigation hierarchy
 */
export const DeepHierarchy: Story = {
  args: {
    items: [
      { label: "Home", href: "/" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Swaps", href: "/swaps" },
      { label: "Swap Details", href: "/swaps/abc123" },
      { label: "Transaction History", isCurrent: true },
    ],
  },
};

/**
 * Two-level breadcrumb
 */
export const TwoLevels: Story = {
  args: {
    items: [
      { label: "Home", href: "/" },
      { label: "About", isCurrent: true },
    ],
  },
};

/**
 * Single item (current page only)
 */
export const SingleItem: Story = {
  args: {
    items: [{ label: "Dashboard", isCurrent: true }],
  },
};

/**
 * Long labels that might wrap
 */
export const LongLabels: Story = {
  args: {
    items: [
      { label: "Home", href: "/" },
      { label: "Cross-Chain Atomic Swaps", href: "/swaps" },
      { label: "Bitcoin to Ethereum Transaction", href: "/swaps/tx123" },
      { label: "Detailed Transaction History and Analytics", isCurrent: true },
    ],
  },
};

/**
 * Keyboard navigation demonstration
 */
export const KeyboardNavigation: Story = {
  args: {
    items: [
      { label: "Home", href: "/" },
      { label: "Orders", href: "/orders" },
      { label: "Order #12345", isCurrent: true },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          "Use Tab to navigate between breadcrumb links. Each link has visible focus indicators for keyboard users.",
      },
    },
  },
};

/**
 * Empty breadcrumb (renders nothing)
 */
export const Empty: Story = {
  args: {
    items: [],
  },
};
