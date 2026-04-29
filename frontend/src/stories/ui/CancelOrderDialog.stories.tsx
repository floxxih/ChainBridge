import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  CancelOrderDialog,
  type CancelOrderDialogOrder,
} from "@/components/orders/CancelOrderDialog";

const SAMPLE_ORDER: CancelOrderDialogOrder = {
  id: "ord-7c9d2",
  pair: "XLM/BTC",
  side: "buy",
  amount: "1000",
  price: "0.00001",
  total: "0.01",
  tokenIn: "XLM",
  tokenOut: "BTC",
  chainIn: "Stellar",
  chainOut: "Bitcoin",
};

const meta: Meta<typeof CancelOrderDialog> = {
  title: "Orders/CancelOrderDialog",
  component: CancelOrderDialog,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Confirmation dialog shown before cancelling an order. The destructive " +
          "button is gated behind a confirmation checkbox; initial focus lands on " +
          "the safe 'Keep order' button so accidental Enter keystrokes cannot " +
          "destroy work. Built on the accessible `Modal` primitive (focus trap, " +
          "focus restoration, Esc to dismiss).",
      },
    },
  },
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof meta>;

function StatefulHarness({
  initialOpen = true,
  alwaysFails = false,
  requireConfirmation = true,
}: {
  initialOpen?: boolean;
  alwaysFails?: boolean;
  requireConfirmation?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [loading, setLoading] = useState(false);

  async function onConfirm() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    if (alwaysFails) throw new Error("Network error — please try again.");
    setOpen(false);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {!open && (
        <Button onClick={() => setOpen(true)} variant="destructive">
          Re-open dialog
        </Button>
      )}
      <CancelOrderDialog
        open={open}
        order={SAMPLE_ORDER}
        loading={loading}
        onConfirm={onConfirm}
        onClose={() => setOpen(false)}
        requireConfirmation={requireConfirmation}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <StatefulHarness />,
};

export const WithoutConfirmationGate: Story = {
  render: () => <StatefulHarness requireConfirmation={false} />,
  parameters: {
    docs: {
      description: {
        story:
          "Use `requireConfirmation={false}` only when the surrounding flow already " +
          "includes a separate explicit-confirmation step.",
      },
    },
  },
};

export const ErrorState: Story = {
  render: () => <StatefulHarness alwaysFails />,
  parameters: {
    docs: {
      description: {
        story:
          "If `onConfirm` throws or rejects, the dialog stays open and the inline " +
          "error is announced via a polite live region.",
      },
    },
  },
};
