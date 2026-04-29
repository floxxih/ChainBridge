import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  CancelOrderDialog,
  type CancelOrderDialogOrder,
} from "@/components/orders/CancelOrderDialog";

const SAMPLE_ORDER: CancelOrderDialogOrder = {
  id: "ord-12345",
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

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof CancelOrderDialog>> = {},
) {
  const onConfirm = jest.fn().mockResolvedValue(undefined);
  const onClose = jest.fn();
  const utils = render(
    <CancelOrderDialog
      open={true}
      order={SAMPLE_ORDER}
      onConfirm={onConfirm}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { ...utils, onConfirm, onClose };
}

describe("CancelOrderDialog", () => {
  test("renders title, description, order summary, and irreversibility callout", () => {
    renderDialog();
    expect(screen.getByRole("dialog", { name: /cancel this order\?/i })).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    expect(screen.getByText(/irreversible action/i)).toBeInTheDocument();
    // Order summary content
    expect(screen.getByText("XLM/BTC")).toBeInTheDocument();
    expect(screen.getByText("BUY")).toBeInTheDocument();
    expect(screen.getByText(/ord-12345/i)).toBeInTheDocument();
  });

  test("dialog is labelled and described for assistive tech", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby");
    expect(dialog).toHaveAttribute("aria-describedby");
  });

  test("initial focus lands on the safe 'Keep order' button (not the destructive one)", async () => {
    renderDialog();
    await waitFor(() => {
      expect(screen.getByTestId("cancel-order-keep")).toHaveFocus();
    });
  });

  test("destructive button is disabled until the user ticks the confirmation checkbox", async () => {
    const user = userEvent.setup();
    renderDialog();
    const confirm = screen.getByTestId("cancel-order-confirm");
    expect(confirm).toBeDisabled();
    await user.click(screen.getByTestId("cancel-order-confirm-checkbox"));
    expect(confirm).toBeEnabled();
  });

  test("requireConfirmation=false enables the destructive button immediately", () => {
    renderDialog({ requireConfirmation: false });
    expect(screen.getByTestId("cancel-order-confirm")).toBeEnabled();
    expect(
      screen.queryByTestId("cancel-order-confirm-checkbox"),
    ).not.toBeInTheDocument();
  });

  test("calling confirm invokes onConfirm with the order", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();
    await user.click(screen.getByTestId("cancel-order-confirm-checkbox"));
    await user.click(screen.getByTestId("cancel-order-confirm"));
    expect(onConfirm).toHaveBeenCalledWith(SAMPLE_ORDER);
  });

  test("'Keep order' calls onClose without confirming", async () => {
    const user = userEvent.setup();
    const { onClose, onConfirm } = renderDialog();
    await user.click(screen.getByTestId("cancel-order-keep"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test("Escape key closes the dialog", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  test("loading state disables both buttons and exposes aria-busy", () => {
    renderDialog({ loading: true });
    expect(screen.getByTestId("cancel-order-confirm")).toBeDisabled();
    expect(screen.getByTestId("cancel-order-keep")).toBeDisabled();
    // aria-busy lives on the action row
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  test("confirm error is announced via a live region and dialog stays open", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn().mockRejectedValue(new Error("Boom"));
    const onClose = jest.fn();
    render(
      <CancelOrderDialog
        open={true}
        order={SAMPLE_ORDER}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByTestId("cancel-order-confirm-checkbox"));
    await user.click(screen.getByTestId("cancel-order-confirm"));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/boom/i);
    expect(onClose).not.toHaveBeenCalled();
  });

  test("clicking the disabled destructive button does not invoke onConfirm", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();
    const confirm = screen.getByTestId("cancel-order-confirm");
    expect(confirm).toBeDisabled();
    // userEvent respects the disabled state and doesn't dispatch the click.
    await user.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test("checkbox can be toggled with the Space key", async () => {
    const user = userEvent.setup();
    renderDialog();
    const checkbox = screen.getByTestId("cancel-order-confirm-checkbox") as HTMLInputElement;
    checkbox.focus();
    await user.keyboard(" ");
    expect(checkbox.checked).toBe(true);
    expect(screen.getByTestId("cancel-order-confirm")).toBeEnabled();
  });

  test("does not render anything when open is false", () => {
    render(
      <CancelOrderDialog
        open={false}
        order={SAMPLE_ORDER}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
