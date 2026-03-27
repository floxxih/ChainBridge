"use client";

import { useEffect, useState } from "react";
import { OrderBookList } from "@/components/marketplace/OrderBookList";
import { OrderTakeModal } from "@/components/marketplace/OrderTakeModal";
import { DepthChart } from "@/components/marketplace/DepthChart";
import { useOrderBookStore, useMockOrders } from "@/hooks/useOrderBook";
import { Order, OrderStatus } from "@/types";
import { Badge, Button } from "@/components/ui";
import { ShoppingBag, TrendingUp, Info, Plus } from "lucide-react";

export default function MarketplacePage() {
  const { orders, updateOrder } = useOrderBookStore();
  const { seedMockOrders } = useMockOrders();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    seedMockOrders();
  }, [seedMockOrders]);

  const handleTakeOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const confirmTakeOrder = (order: Order) => {
    // In a real app, this would initiate the HTLC lock transaction
    updateOrder(order.id, { status: OrderStatus.FILLED });
    setIsModalOpen(false);
    // Redirect or show success (omitted for brevity, assume success toast)
    console.log(`Executing order ${order.id}`);
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 md:py-20 animate-fade-in">
      <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-4 flex items-center gap-2">
            <Badge
              variant="info"
              className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
            >
              P2P Marketplace
            </Badge>
          </div>
          <h1 className="text-4xl font-extrabold text-text-primary tracking-tight sm:text-6xl">
            Order Book
          </h1>
          <p className="mt-6 text-xl text-text-secondary leading-relaxed">
            Browse active cross-chain swap offers or create your own. All trades are protected by
            trustless hash-timelock contracts.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button variant="secondary" className="h-12 px-6">
            My Orders
          </Button>
          <Button variant="primary" className="h-12 px-6 shadow-glow-md" icon={<Plus size={18} />}>
            Create Order
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-8">
          <OrderBookList orders={orders} onTakeOrder={handleTakeOrder} />
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface-overlay/30 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted">
                Market Liquidity
              </h3>
              <TrendingUp size={16} className="text-brand-500" />
            </div>
            <DepthChart orders={orders} />
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase">24h Vol</p>
                <p className="text-lg font-black text-text-primary">$1.2M</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase">Active</p>
                <p className="text-lg font-black text-text-primary">
                  {orders.filter((o) => o.status === OrderStatus.OPEN).length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-brand-500/5 p-6 border-dashed">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                <Info size={20} />
              </div>
              <div>
                <h4 className="font-bold text-text-primary">How it works</h4>
                <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                  Taking an order creates an atomic swap. You'll lock funds on the source chain
                  first, then the maker will lock on the destination.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 px-0 text-brand-500 hover:bg-transparent h-auto"
                >
                  Learn more about HTLCs →
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <OrderTakeModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmTakeOrder}
      />
    </div>
  );
}
