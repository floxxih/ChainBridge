import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Order, OrderBookStore, OrderSide, OrderStatus } from "@/types";
import { useCallback } from "react";

export const useOrderBookStore = create<OrderBookStore>()(
  persist(
    (set) => ({
      orders: [],

      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders].slice(0, 500),
        })),

      updateOrder: (id, updates) =>
        set((state) => ({
          orders: state.orders.map((o) => (o.id === id ? { ...o, ...updates } : o)),
        })),

      removeOrder: (id) =>
        set((state) => ({
          orders: state.orders.filter((o) => o.id !== id),
        })),
    }),
    {
      name: "chainbridge-orderbook",
    }
  )
);

export const useMockOrders = () => {
  const { orders, addOrder } = useOrderBookStore();

  const seedMockOrders = useCallback(() => {
    if (orders.length > 0) return;

    const mocks: Order[] = [
      {
        id: "order_1",
        maker: "G...ABC",
        pair: "XLM/ETH",
        side: OrderSide.SELL,
        amount: "10,000",
        price: "0.000045",
        total: "0.45",
        tokenIn: "XLM",
        tokenOut: "ETH",
        chainIn: "Stellar",
        chainOut: "Ethereum",
        status: OrderStatus.OPEN,
        timestamp: new Date().toISOString(),
      },
      {
        id: "order_2",
        maker: "0x...f21",
        pair: "ETH/XLM",
        side: OrderSide.BUY,
        amount: "0.85",
        price: "22,500",
        total: "19,125",
        tokenIn: "ETH",
        tokenOut: "XLM",
        chainIn: "Ethereum",
        chainOut: "Stellar",
        status: OrderStatus.OPEN,
        timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      },
      {
        id: "order_3",
        maker: "bc1...qwe",
        pair: "BTC/XLM",
        side: OrderSide.SELL,
        amount: "0.05",
        price: "450,000",
        total: "22,500",
        tokenIn: "BTC",
        tokenOut: "XLM",
        chainIn: "Bitcoin",
        chainOut: "Stellar",
        status: OrderStatus.OPEN,
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
      {
        id: "order_4",
        maker: "bc1...asd",
        pair: "XLM/BTC",
        side: OrderSide.BUY,
        amount: "50,000",
        price: "0.0000021",
        total: "0.105",
        tokenIn: "XLM",
        tokenOut: "BTC",
        chainIn: "Stellar",
        chainOut: "Bitcoin",
        status: OrderStatus.OPEN,
        timestamp: new Date().toISOString(),
      },
    ];

    mocks.forEach((o) => addOrder(o));
  }, [orders.length, addOrder]);

  return { seedMockOrders };
};
