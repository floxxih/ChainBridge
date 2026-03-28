import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AdvancedOrderType,
  Order,
  OrderBookStore,
  OrderSide,
  OrderStatus,
} from "@/types";
import { useCallback } from "react";

export const DEMO_ORDER_OWNER = "cb-local-trader";

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

  const seedMockOrders = useCallback(
    (ownerAddress: string = DEMO_ORDER_OWNER) => {
      const existingIds = new Set(orders.map((order) => order.id));
      const ownerPrefix = ownerAddress.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "owner";

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
          expiresAt: new Date(Date.now() + 1000 * 60 * 90).toISOString(),
          orderType: AdvancedOrderType.LIMIT,
          allowPartialFills: true,
          amendmentCount: 1,
          minFillAmount: "2,500",
          takerFeeEstimate: "~0.0004 ETH",
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
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
          orderType: AdvancedOrderType.MARKET,
          allowPartialFills: false,
          amendmentCount: 0,
          takerFeeEstimate: "~18 XLM",
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
          expiresAt: new Date(Date.now() + 1000 * 60 * 25).toISOString(),
          orderType: AdvancedOrderType.TWAP,
          allowPartialFills: true,
          amendmentCount: 2,
          minFillAmount: "0.01",
          takerFeeEstimate: "~35 XLM",
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
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
          orderType: AdvancedOrderType.LIMIT,
          allowPartialFills: false,
          amendmentCount: 0,
          takerFeeEstimate: "~0.00008 BTC",
        },
        {
          id: `order_${ownerPrefix}_1`,
          maker: ownerAddress,
          pair: "XLM/ETH",
          side: OrderSide.SELL,
          amount: "4,000",
          price: "0.000046",
          total: "0.184",
          tokenIn: "XLM",
          tokenOut: "ETH",
          chainIn: "Stellar",
          chainOut: "Ethereum",
          status: OrderStatus.OPEN,
          timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
          expiresAt: new Date(Date.now() + 1000 * 60 * 55).toISOString(),
          orderType: AdvancedOrderType.LIMIT,
          allowPartialFills: true,
          amendmentCount: 1,
          minFillAmount: "1,000",
          makerFeeEstimate: "~3 XLM",
        },
        {
          id: `order_${ownerPrefix}_2`,
          maker: ownerAddress,
          pair: "BTC/XLM",
          side: OrderSide.BUY,
          amount: "0.02",
          price: "468,000",
          total: "9,360",
          tokenIn: "BTC",
          tokenOut: "XLM",
          chainIn: "Bitcoin",
          chainOut: "Stellar",
          status: OrderStatus.OPEN,
          timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
          expiresAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          orderType: AdvancedOrderType.STOP_LOSS,
          allowPartialFills: false,
          amendmentCount: 3,
          makerFeeEstimate: "~0.00003 BTC",
        },
      ];

      mocks.filter((order) => !existingIds.has(order.id)).forEach((order) => addOrder(order));
    },
    [orders, addOrder]
  );

  return { seedMockOrders };
};
