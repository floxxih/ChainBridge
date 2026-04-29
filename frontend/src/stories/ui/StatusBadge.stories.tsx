import type { Meta, StoryObj } from "@storybook/react";
import { StatusBadge } from "@/components/ui/StatusBadge";

const meta: Meta<typeof StatusBadge> = {
  title: "UI/StatusBadge",
  component: StatusBadge,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Status badge component for displaying transaction and swap states in ChainBridge.",
      },
    },
  },
  argTypes: {
    status: {
      control: "select",
      options: ["pending", "completed", "failed", "expired", "cancelled"],
      description: "Status type to display",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size of the badge",
    },
    showIcon: {
      control: "boolean",
      description: "Whether to show status icon",
    },
    children: {
      control: "text",
      description: "Custom text to override status label",
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Default status badge
export const Default: Story = {
  args: {
    status: "pending",
  },
};

// All statuses
export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <StatusBadge status="pending" />
      <StatusBadge status="completed" />
      <StatusBadge status="failed" />
      <StatusBadge status="expired" />
      <StatusBadge status="cancelled" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "All available status types for different transaction states.",
      },
    },
  },
};

// Different sizes
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <StatusBadge status="completed" size="sm" />
      <StatusBadge status="completed" size="md" />
      <StatusBadge status="completed" size="lg" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Different badge sizes for various UI contexts.",
      },
    },
  },
};

// With custom text
export const CustomText: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <StatusBadge status="pending">Awaiting Counterparty</StatusBadge>
      <StatusBadge status="completed">Swap Successful</StatusBadge>
      <StatusBadge status="failed">Insufficient Funds</StatusBadge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Status badges with custom text for specific scenarios.",
      },
    },
  },
};

// Without icons
export const WithoutIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <StatusBadge status="pending" showIcon={false} />
      <StatusBadge status="completed" showIcon={false} />
      <StatusBadge status="failed" showIcon={false} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Status badges without icons for minimal design.",
      },
    },
  },
};

// ChainBridge specific examples
export const ChainBridgeExamples: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <div className="flex items-center justify-between p-4 border rounded">
        <span className="text-sm font-medium">XLM → BTC Swap</span>
        <StatusBadge status="pending" size="sm" />
      </div>
      <div className="flex items-center justify-between p-4 border rounded">
        <span className="text-sm font-medium">ETH → XLM Swap</span>
        <StatusBadge status="completed" size="sm" />
      </div>
      <div className="flex items-center justify-between p-4 border rounded">
        <span className="text-sm font-medium">SOL → ETH Swap</span>
        <StatusBadge status="failed" size="sm" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Real-world ChainBridge examples showing status badges in context.",
      },
    },
  },
};
