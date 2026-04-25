import { render, screen } from "@testing-library/react";
import {
  EmptyStates,
  NoHTLCsEmptyState,
  NoOrdersEmptyState,
  NoSearchResultsEmptyState,
  NoSwapsEmptyState,
  WalletDisconnectedEmptyState,
} from "@/components/ui/empty-state-presets";

describe("Empty state presets", () => {
  it("renders NoSwaps with default CTA", () => {
    render(<NoSwapsEmptyState />);
    expect(screen.getByText("No swaps yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start a swap/i })).toHaveAttribute(
      "href",
      "/swap"
    );
  });

  it("allows overriding the action", () => {
    render(<NoOrdersEmptyState action={{ label: "Custom CTA", href: "/x" }} />);
    expect(screen.getByRole("link", { name: /custom cta/i })).toHaveAttribute(
      "href",
      "/x"
    );
  });

  it("renders NoHTLCs preset", () => {
    render(<NoHTLCsEmptyState />);
    expect(screen.getByText("No HTLC activity yet")).toBeInTheDocument();
  });

  it("renders NoSearchResults without forcing a CTA", () => {
    render(<NoSearchResultsEmptyState />);
    expect(screen.getByText("No matching results")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders WalletDisconnected preset", () => {
    render(<WalletDisconnectedEmptyState />);
    expect(screen.getByText("Connect your wallet")).toBeInTheDocument();
  });

  it("exposes a registry under EmptyStates", () => {
    expect(typeof EmptyStates.NoSwaps).toBe("function");
    expect(typeof EmptyStates.NoOrders).toBe("function");
    expect(typeof EmptyStates.NoHTLCs).toBe("function");
    expect(typeof EmptyStates.NoSearchResults).toBe("function");
    expect(typeof EmptyStates.WalletDisconnected).toBe("function");
    expect(typeof EmptyStates.GenericError).toBe("function");
  });
});
