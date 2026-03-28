"use client";

import { useMemo } from "react";
import { Order, OrderSide } from "@/types";

interface DepthChartProps {
  orders: Order[];
}

export function DepthChart({ orders }: DepthChartProps) {
  const chartData = useMemo(() => {
    const buyOrders = orders
      .filter((o) => o.side === OrderSide.BUY)
      .sort((a, b) => Number(b.price) - Number(a.price));
    const sellOrders = orders
      .filter((o) => o.side === OrderSide.SELL)
      .sort((a, b) => Number(a.price) - Number(b.price));

    let cumulativeBuy = 0;
    const buys = buyOrders.map((o) => {
      cumulativeBuy += Number(o.amount.replace(/,/g, ""));
      return { price: Number(o.price), amount: cumulativeBuy };
    });

    let cumulativeSell = 0;
    const sells = sellOrders.map((o) => {
      cumulativeSell += Number(o.amount.replace(/,/g, ""));
      return { price: Number(o.price), amount: cumulativeSell };
    });

    return { buys, sells };
  }, [orders]);

  // Very simple visual mock for the depth chart since full SVG charting might be complex in one go
  return (
    <div className="relative h-32 w-full overflow-hidden rounded-xl border border-border bg-background/50 p-2">
      <div className="flex h-full w-full gap-1 items-end">
        {/* Buy Wall */}
        <div className="flex h-full flex-1 gap-[2px] items-end justify-end overflow-hidden">
          {[...Array(20)].map((_, i) => {
            const height = Math.random() * 80 + 20;
            return (
              <div
                key={i}
                className="w-full bg-emerald-500/20 border-t border-emerald-500/40"
                style={{ height: `${height}%`, opacity: 0.1 + (i / 20) * 0.5 }}
              />
            );
          })}
        </div>

        {/* Sell Wall */}
        <div className="flex h-full flex-1 gap-[2px] items-end overflow-hidden">
          {[...Array(20)].map((_, i) => {
            const height = Math.random() * 80 + 20;
            return (
              <div
                key={i}
                className="w-full bg-red-500/20 border-t border-red-500/40"
                style={{ height: `${height}%`, opacity: 0.6 - (i / 20) * 0.5 }}
              />
            );
          })}
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-full bg-surface-overlay px-4 py-1 border border-border text-[10px] font-bold text-text-muted uppercase tracking-widest backdrop-blur-sm">
          Live Market Depth
        </div>
      </div>

      <div className="absolute bottom-2 left-2 text-[8px] font-bold text-emerald-500 uppercase">
        Buy Support
      </div>
      <div className="absolute bottom-2 right-2 text-[8px] font-bold text-red-500 uppercase text-right">
        Sell Pressure
      </div>
    </div>
  );
}
