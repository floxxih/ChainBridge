"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock3, Search, ShoppingBag } from "lucide-react";

import { Button, PaginationControls, ToastContainer } from "@/components/ui";
import { OrderTakeModal } from "@/components/marketplace/OrderTakeModal";

import { useMockOrders, useOrderBookStore } from "@/hooks/useOrderBook";
import { Order, OrderStatus } from "@/types";
import { usePagination } from "@/hooks/usePagination";
import { OrderFilterBar, FilterStatus, RangeFilter } from "@/components/marketplace/OrderFilterBar";
import { OrderTable } from "@/components/marketplace/OrderTable";
import { useUnifiedWallet } from "@/components/wallet/UnifiedWalletProvider";
import { useTransactionStore } from "@/hooks/useTransactions";
import { getExplorerUrl } from "@/lib/explorers";
import {
  buildCompletedLifecycle,
  buildTransactionLifecycle,
  sleep,
} from "@/lib/transactionLifecycle";
import { TransactionStatus } from "@/types";

const PAGE_SIZE = 8;

export default function BrowseOrdersPage() {
  const searchParams = useSearchParams();
  const { activeAddress: address } = useUnifiedWallet();
  const { seedMockOrders } = useMockOrders();
  const orders = useOrderBookStore((state) => state.orders);
  const updateOrder = useOrderBookStore((state) => state.updateOrder);
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>(
    () => (searchParams.get("status") as FilterStatus) ?? "all"
  );
  const [chainFilter, setChainFilter] = useState(() => searchParams.get("chain") ?? "all");
  const [assetFilter, setAssetFilter] = useState(() => searchParams.get("asset") ?? "all");
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>(
    () => (searchParams.get("range") as RangeFilter) ?? "all"
  );

  const [sortConfig, setSortConfig] = useState<{
    key: "price" | "amount" | "timestamp";
    direction: "asc" | "desc";
  }>({ key: "timestamp", direction: "desc" });

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toasts, setToasts] = useState<
    { id: string; type: "success" | "error" | "info"; title: string; message?: string }[]
  >([]);

  useEffect(() => {
    seedMockOrders(address ?? undefined);
  }, [address, seedMockOrders]);

  const filtered = useMemo(() => {
    const lowered = query.toLowerCase().trim();
    const now = Date.now();

    return orders
      .filter((order) => {
        const matchesQuery =
          !lowered ||
          order.pair.toLowerCase().includes(lowered) ||
          order.tokenIn.toLowerCase().includes(lowered) ||
          order.tokenOut.toLowerCase().includes(lowered) ||
          order.chainIn.toLowerCase().includes(lowered) ||
          order.chainOut.toLowerCase().includes(lowered) ||
          order.maker.toLowerCase().includes(lowered);

        if (!matchesQuery) return false;

        const statusMatches =
          statusFilter === "all" ||
          (statusFilter === "active" && order.status === OrderStatus.OPEN) ||
          (statusFilter === "filled" && order.status === OrderStatus.FILLED) ||
          (statusFilter === "cancelled" && order.status === OrderStatus.CANCELLED);
        // Expired calculation simplified here for parity with My Orders

        if (!statusMatches) return false;

        const chainMatches =
          chainFilter === "all" || order.chainIn === chainFilter || order.chainOut === chainFilter;
        if (!chainMatches) return false;

        const assetMatches =
          assetFilter === "all" || order.tokenIn === assetFilter || order.tokenOut === assetFilter;
        if (!assetMatches) return false;

        if (rangeFilter === "all") return true;

        const orderTime = new Date(order.timestamp).getTime();
        if (Number.isNaN(orderTime)) return false;
        if (rangeFilter === "24h") return now - orderTime <= 24 * 60 * 60 * 1000;
        if (rangeFilter === "7d") return now - orderTime <= 7 * 24 * 60 * 60 * 1000;
        if (rangeFilter === "30d") return now - orderTime <= 30 * 24 * 60 * 60 * 1000;
        return now - orderTime <= 90 * 24 * 60 * 60 * 1000;
      })
      .sort((a, b) => {
        const direction = sortConfig.direction === "asc" ? 1 : -1;
        if (sortConfig.key === "timestamp") {
          return (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * direction;
        }
        const valA = parseFloat(a[sortConfig.key].toString().replace(/,/g, ""));
        const valB = parseFloat(b[sortConfig.key].toString().replace(/,/g, ""));
        return (valA - valB) * direction;
      });
  }, [orders, query, statusFilter, chainFilter, assetFilter, rangeFilter, sortConfig]);

  const pagination = usePagination(filtered.length, PAGE_SIZE);
  const visibleOrders = filtered.slice(pagination.offset, pagination.limit);

  const chainOptions = useMemo(
    () => Array.from(new Set(orders.flatMap((order) => [order.chainIn, order.chainOut]))).sort(),
    [orders]
  );

  const assetOptions = useMemo(
    () => Array.from(new Set(orders.flatMap((order) => [order.tokenIn, order.tokenOut]))).sort(),
    [orders]
  );

  const handleSort = (key: "price" | "amount" | "timestamp") => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  const handleTakeOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const confirmTakeOrder = async (order: Order) => {
    const chain = order.side === "buy" ? order.chainOut : order.chainIn;
    const txId = `match-${order.id}`;
    const hash = `0x${Date.now().toString(16)}${order.id.slice(-4)}`;

    addTransaction({
      id: txId,
      hash: "pending",
      chain,
      type: "swap_lock",
      amount: order.side === "buy" ? order.total : order.amount,
      token: order.side === "buy" ? order.tokenOut : order.tokenIn,
      status: TransactionStatus.PENDING,
      confirmations: 0,
      requiredConfirmations: 1,
      timestamp: new Date().toISOString(),
      counterparty: order.maker,
      explorerUrl: getExplorerUrl(chain, hash),
      lifecycle: buildTransactionLifecycle(chain, "approval"),
    });

    try {
      await sleep(600);
      updateTransaction(txId, { lifecycle: buildTransactionLifecycle(chain, "sign") });
      await sleep(800);
      updateTransaction(txId, {
        hash,
        status: TransactionStatus.CONFIRMING,
        lifecycle: buildTransactionLifecycle(chain, "broadcast"),
      });
      await sleep(900);
      updateTransaction(txId, {
        status: TransactionStatus.CONFIRMING,
        lifecycle: buildTransactionLifecycle(chain, "confirm"),
      });
      await sleep(1100);
      updateTransaction(txId, {
        status: TransactionStatus.COMPLETED,
        confirmations: 1,
        proofVerified: true,
        lifecycle: buildCompletedLifecycle(chain),
      });

      updateOrder(order.id, { status: OrderStatus.FILLED });
      setToasts([
        {
          id: Date.now().toString(),
          type: "success",
          title: "Order Executed",
          message: `Successfully swapped ${order.pair}`,
        },
      ]);
    } catch (e) {
      setToasts([
        {
          id: Date.now().toString(),
          type: "error",
          title: "Execution Failed",
          message: "Transaction could not be completed.",
        },
      ]);
    } finally {
      setIsModalOpen(false);
      setSelectedOrder(null);
    }
  };

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setChainFilter("all");
    setAssetFilter("all");
    setRangeFilter("all");
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 md:py-20 animate-fade-in">
      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">
            Market Discovery
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl">
            Browse Orders
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-7 text-text-secondary">
            Discover and execute cross-chain liquidity across all supported networks. Filter by
            asset, chain, or status to find the best swap opportunities.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/marketplace">
            <Button variant="secondary" icon={<ShoppingBag className="h-4 w-4" />}>
              Market Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-8">
        <OrderFilterBar
          query={query}
          onQueryChange={setQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          chainFilter={chainFilter}
          onChainChange={setChainFilter}
          assetFilter={assetFilter}
          onAssetChange={setAssetFilter}
          rangeFilter={rangeFilter}
          onRangeChange={setRangeFilter}
          chainOptions={chainOptions}
          assetOptions={assetOptions}
          onClear={clearFilters}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <Search className="h-4 w-4 text-brand-500" />
              <span>Found {filtered.length} matching orders</span>
            </div>
          </div>

          <OrderTable
            orders={visibleOrders}
            onTakeOrder={handleTakeOrder}
            sortKey={sortConfig.key}
            sortDirection={sortConfig.direction}
            onSort={handleSort}
          />

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <Clock3 className="h-4 w-4 text-brand-500" />
              <span>Showing {visibleOrders.length} orders per page</span>
            </div>
            <PaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              hasPrevious={pagination.hasPrevious}
              hasNext={pagination.hasNext}
              onPageChange={pagination.setPage}
            />
          </div>
        </div>
      </div>

      <OrderTakeModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrder(null);
        }}
        onConfirm={confirmTakeOrder}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((current) => current.filter((t) => t.id !== id))}
      />
    </div>
  );
}
