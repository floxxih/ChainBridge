import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OrderBookList } from "@/components/marketplace/OrderBookList";
import { Order, OrderSide, OrderStatus } from "@/types";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock UnifiedWalletProvider
jest.mock("@/components/wallet/UnifiedWalletProvider", () => ({
  useUnifiedWallet: () => ({ activeAddress: "0x123" }),
}));

const mockOrders: Order[] = [
  {
    id: "1",
    pair: "BTC/ETH",
    side: OrderSide.BUY,
    amount: "1.0",
    price: "15.5",
    total: "15.5",
    tokenIn: "BTC",
    tokenOut: "ETH",
    chainIn: "Bitcoin",
    chainOut: "Ethereum",
    maker: "0xabc",
    status: OrderStatus.OPEN,
    timestamp: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    allowPartialFills: false,
  },
  {
    id: "2",
    pair: "ETH/USDC",
    side: OrderSide.SELL,
    amount: "10.0",
    price: "2000",
    total: "20000",
    tokenIn: "ETH",
    tokenOut: "USDC",
    chainIn: "Ethereum",
    chainOut: "Stellar",
    maker: "0xdef",
    status: OrderStatus.OPEN,
    timestamp: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    allowPartialFills: true,
  },
  {
    id: "3",
    pair: "SOL/USDC",
    side: OrderSide.BUY,
    amount: "100.0",
    price: "50",
    total: "5000",
    tokenIn: "SOL",
    tokenOut: "USDC",
    chainIn: "Solana",
    chainOut: "Stellar",
    maker: "0xghi",
    status: OrderStatus.OPEN,
    timestamp: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    allowPartialFills: false,
  },
];

describe("OrderBookList Filtering", () => {
  const mockReplace = jest.fn();
  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace });
    (usePathname as jest.Mock).mockReturnValue("/marketplace");
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  it("renders all orders by default", () => {
    render(<OrderBookList orders={mockOrders} onTakeOrder={jest.fn()} />);
    expect(screen.getByText("BTC/ETH")).toBeInTheDocument();
    expect(screen.getByText("ETH/USDC")).toBeInTheDocument();
    expect(screen.getByText("SOL/USDC")).toBeInTheDocument();
  });

  it("filters orders by search query", async () => {
    render(<OrderBookList orders={mockOrders} onTakeOrder={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText("Search pair or address...");
    fireEvent.change(searchInput, { target: { value: "BTC" } });

    await waitFor(() => {
      expect(screen.getByText("BTC/ETH")).toBeInTheDocument();
      expect(screen.queryByText("SOL/USDC")).not.toBeInTheDocument();
    });
  });

  it("filters orders by side (buy/sell)", async () => {
    render(<OrderBookList orders={mockOrders} onTakeOrder={jest.fn()} />);

    const buysButton = screen.getByText("Buys");
    fireEvent.click(buysButton);

    await waitFor(() => {
      expect(screen.getByText("BTC/ETH")).toBeInTheDocument();
      expect(screen.getByText("SOL/USDC")).toBeInTheDocument();
      expect(screen.queryByText("ETH/USDC")).not.toBeInTheDocument();
    });
  });

  it("filters orders by chain pair", async () => {
    render(<OrderBookList orders={mockOrders} onTakeOrder={jest.fn()} />);

    const chainSelect = screen.getByDisplayValue("All routes");
    fireEvent.change(chainSelect, { target: { value: "Ethereum → Stellar" } });

    await waitFor(() => {
      expect(screen.getByText("ETH/USDC")).toBeInTheDocument();
      expect(screen.queryByText("BTC/ETH")).not.toBeInTheDocument();
    });
  });

  it("filters orders by asset", async () => {
    render(<OrderBookList orders={mockOrders} onTakeOrder={jest.fn()} />);

    const assetSelect = screen.getByDisplayValue("All assets");
    fireEvent.change(assetSelect, { target: { value: "USDC" } });

    await waitFor(() => {
      expect(screen.getByText("ETH/USDC")).toBeInTheDocument();
      expect(screen.getByText("SOL/USDC")).toBeInTheDocument();
      expect(screen.queryByText("BTC/ETH")).not.toBeInTheDocument();
    });
  });

  it("combines multiple filters", async () => {
    render(<OrderBookList orders={mockOrders} onTakeOrder={jest.fn()} />);

    // Filter by asset USDC
    const assetSelect = screen.getByDisplayValue("All assets");
    fireEvent.change(assetSelect, { target: { value: "USDC" } });

    // Filter by side BUY
    const buysButton = screen.getByText("Buys");
    fireEvent.click(buysButton);

    await waitFor(() => {
      expect(screen.getByText("SOL/USDC")).toBeInTheDocument();
      expect(screen.queryByText("ETH/USDC")).not.toBeInTheDocument();
      expect(screen.queryByText("BTC/ETH")).not.toBeInTheDocument();
    });
  });

  it("shows reset button when filters are active", async () => {
    render(<OrderBookList orders={mockOrders} onTakeOrder={jest.fn()} />);

    // Initially no reset button
    expect(screen.queryByText("Reset")).not.toBeInTheDocument();

    // Apply a filter
    const searchInput = screen.getByPlaceholderText("Search pair or address...");
    fireEvent.change(searchInput, { target: { value: "BTC" } });

    // Reset button should appear
    await waitFor(() => {
      expect(screen.getByText("Reset")).toBeInTheDocument();
    });
  });

  it("resets all filters when reset button is clicked", async () => {
    render(<OrderBookList orders={mockOrders} onTakeOrder={jest.fn()} />);

    // Apply multiple filters
    const searchInput = screen.getByPlaceholderText("Search pair or address...");
    fireEvent.change(searchInput, { target: { value: "BTC" } });

    const buysButton = screen.getByText("Buys");
    fireEvent.click(buysButton);

    // Click reset
    const resetButton = await screen.findByText("Reset");
    fireEvent.click(resetButton);

    // All orders should be visible again
    await waitFor(() => {
      expect(screen.getByText("BTC/ETH")).toBeInTheDocument();
      expect(screen.getByText("ETH/USDC")).toBeInTheDocument();
      expect(screen.getByText("SOL/USDC")).toBeInTheDocument();
    });
  });

  it("updates URL params when filters change", async () => {
    render(<OrderBookList orders={mockOrders} onTakeOrder={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText("Search pair or address...");
    fireEvent.change(searchInput, { target: { value: "BTC" } });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining("search=BTC"),
        expect.any(Object)
      );
    });
  });

  it("reads filters from URL params on mount", () => {
    const searchParams = new URLSearchParams("search=ETH&side=sell");
    (useSearchParams as jest.Mock).mockReturnValue(searchParams);

    render(<OrderBookList orders={mockOrders} onTakeOrder={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText(
      "Search pair or address..."
    ) as HTMLInputElement;
    expect(searchInput.value).toBe("ETH");
  });

  it("shows empty state when no orders match filters", async () => {
    render(<OrderBookList orders={mockOrders} onTakeOrder={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText("Search pair or address...");
    fireEvent.change(searchInput, { target: { value: "NONEXISTENT" } });

    await waitFor(() => {
      expect(screen.getByText("No active orders matching filters.")).toBeInTheDocument();
      expect(screen.getByText("Clear Filters")).toBeInTheDocument();
    });
  });
});
