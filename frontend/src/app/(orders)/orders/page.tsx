"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  Clock3,
  Filter,
  History,
  LayoutGrid,
  Rows3,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

import { Button, Card, EmptyState, Input, Spinner, ToastContainer } from "@/components/ui";
import { WalletConnect } from "@/components/swap/WalletConnect";
import { DEMO_ORDER_OWNER, useMockOrders, useOrderBookStore } from "@/hooks/useOrderBook";
import { Order, OrderAmendmentEntry, OrderStatus } from "@/types";
import { cn } from "@/lib/utils";
import { shortenHash } from "@/lib/format";
import { AdvancedFilterDrawer } from "@/components/filters/AdvancedFilterDrawer";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useUnifiedWallet } from "@/components/wallet/UnifiedWalletProvider";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui";
import { CancelOrderDialog } from "@/components/orders/CancelOrderDialog";

const PAGE_SIZE = 4;

type FilterStatus = "all" | "active" | "expired" | "cancelled" | "filled";
type RangeFilter = "all" | "24h" | "7d" | "30d" | "90d";
type ToastMessage = {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message?: string;
};

type OrderFilterPreset = {
  name: string;
  query: string;
  status: FilterStatus;
  chain: string;
  asset: string;
  range: RangeFilter;
};

function deriveStatus(order: Order): OrderStatus {
  if (order.status !== OrderStatus.OPEN) return order.status;
  if (order.expiresAt && new Date(order.expiresAt).getTime() < Date.now()) {
    return OrderStatus.EXPIRED;
  }
  return OrderStatus.OPEN;
}

function shortAddress(value: string) {
  return shortenHash(value, { prefixLength: 8, suffixLength: 6 });
}

export default function OrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { localizePath } = useI18n();

  const { activeAddress: address } = useUnifiedWallet();
  const ownerAddress = address ?? DEMO_ORDER_OWNER;
  const { seedMockOrders } = useMockOrders();
  const orders = useOrderBookStore((state) => state.orders);
  const updateOrder = useOrderBookStore((state) => state.updateOrder);

  const [query, setQuery] = useState(() => searchParams.get("ord_q") ?? "");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>(
    () => (searchParams.get("ord_status") as FilterStatus) ?? "all"
  );
  const [chainFilter, setChainFilter] = useState(() => searchParams.get("ord_chain") ?? "all");
  const [assetFilter, setAssetFilter] = useState(() => searchParams.get("ord_asset") ?? "all");
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>(
    () => (searchParams.get("ord_range") as RangeFilter) ?? "all"
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [savedPresets, setSavedPresets] = useLocalStorage<OrderFilterPreset[]>(
    "chainbridge-order-filter-presets",
    []
  );
  // Issue #398 — persisted comfortable/compact list density.
  const [density, setDensity] = useLocalStorage<"comfortable" | "compact">(
    "chainbridge-orders-density",
    "comfortable"
  );
  const orderCardPaddingClass = density === "compact" ? "p-3" : "p-5";
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [expandedAmendmentId, setExpandedAmendmentId] = useState<string | null>(null);

  useEffect(() => {
    seedMockOrders(ownerAddress);
  }, [ownerAddress, seedMockOrders]);

  const myOrders = useMemo(() => {
    return orders
      .filter((order) => order.maker === ownerAddress)
      .map((order) => ({ ...order, derivedStatus: deriveStatus(order) }))
      .sort((left, right) => {
        return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
      });
  }, [orders, ownerAddress]);

  const filtered = useMemo(() => {
    const lowered = query.toLowerCase().trim();
    const now = Date.now();

    return myOrders.filter((order) => {
      const matchesQuery =
        !lowered ||
        order.pair.toLowerCase().includes(lowered) ||
        order.tokenIn.toLowerCase().includes(lowered) ||
        order.tokenOut.toLowerCase().includes(lowered) ||
        order.chainIn.toLowerCase().includes(lowered) ||
        order.chainOut.toLowerCase().includes(lowered);

      if (!matchesQuery) return false;

      const statusMatches =
        statusFilter === "all" ||
        (statusFilter === "active" && order.derivedStatus === OrderStatus.OPEN) ||
        (statusFilter === "expired" && order.derivedStatus === OrderStatus.EXPIRED) ||
        (statusFilter === "cancelled" && order.derivedStatus === OrderStatus.CANCELLED) ||
        (statusFilter === "filled" && order.derivedStatus === OrderStatus.FILLED);

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
    });
  }, [assetFilter, chainFilter, myOrders, query, rangeFilter, statusFilter]);

  useEffect(() => {
    setQuery(searchParams.get("ord_q") ?? "");
    setStatusFilter((searchParams.get("ord_status") as FilterStatus) ?? "all");
    setChainFilter(searchParams.get("ord_chain") ?? "all");
    setAssetFilter(searchParams.get("ord_asset") ?? "all");
    setRangeFilter((searchParams.get("ord_range") as RangeFilter) ?? "all");
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    const put = (key: string, value: string, defaultValue: string) => {
      if (!value || value === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    };

    put("ord_q", query.trim(), "");
    put("ord_status", statusFilter, "all");
    put("ord_chain", chainFilter, "all");
    put("ord_asset", assetFilter, "all");
    put("ord_range", rangeFilter, "all");

    const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const target = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;

    if (current !== target) {
      router.replace(target, { scroll: false });
    }
  }, [assetFilter, chainFilter, pathname, query, rangeFilter, router, searchParams, statusFilter]);

  const pagination = usePagination(filtered.length, PAGE_SIZE);
  const visibleOrders = filtered.slice(pagination.offset, pagination.limit);
  const hasAnyOrders = myOrders.length > 0;

  const chainOptions = useMemo(
    () => Array.from(new Set(myOrders.flatMap((order) => [order.chainIn, order.chainOut]))).sort(),
    [myOrders]
  );

  const assetOptions = useMemo(
    () => Array.from(new Set(myOrders.flatMap((order) => [order.tokenIn, order.tokenOut]))).sort(),
    [myOrders]
  );

  function pushToast(toast: Omit<ToastMessage, "id">) {
    setToasts((current) => [...current, { id: `${Date.now()}-${Math.random()}`, ...toast }]);
  }

  function requestCancel(order: Order) {
    setOrderToCancel(order);
  }

  function dismissCancelDialog() {
    setOrderToCancel(null);
  }

  async function confirmCancel(order: { id: string; pair: string }) {
    setPendingCancelId(order.id);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      updateOrder(order.id, { status: OrderStatus.CANCELLED });
      pushToast({
        type: "success",
        title: "Order cancelled",
        message: `${order.pair} has been removed from the open book.`,
      });
      setOrderToCancel(null);
    } catch (err) {
      pushToast({
        type: "error",
        title: "Cancel failed",
        message: "The order could not be cancelled. Please try again.",
      });
      // Re-throw so the dialog renders the inline error and stays open.
      throw err instanceof Error
        ? err
        : new Error("The order could not be cancelled. Please try again.");
    } finally {
      setPendingCancelId(null);
    }
  }

  const activeCount = myOrders.filter((order) => order.derivedStatus === OrderStatus.OPEN).length;
  const expiredCount = myOrders.filter(
    (order) => order.derivedStatus === OrderStatus.EXPIRED
  ).length;

  function clearAdvancedFilters() {
    setStatusFilter("all");
    setChainFilter("all");
    setAssetFilter("all");
    setRangeFilter("all");
  }

  function savePreset() {
    const trimmedName = presetName.trim();
    if (!trimmedName) return;

    const preset: OrderFilterPreset = {
      name: trimmedName,
      query,
      status: statusFilter,
      chain: chainFilter,
      asset: assetFilter,
      range: rangeFilter,
    };

    setSavedPresets((current) => [
      preset,
      ...current.filter((item) => item.name.toLowerCase() !== trimmedName.toLowerCase()),
    ]);
    setPresetName("");
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 md:py-20">
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">
            Order Management
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl">
            My Orders
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary">
            Review active and expired orders, filter by status, and cancel outstanding liquidity
            with direct feedback.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Active" value={String(activeCount)} />
          <StatCard label="Expired" value={String(expiredCount)} />
        </div>
      </div>

      {/* Issue #400 — explicit demo-mode banner when no wallet is connected.
          The previous tiny helper text was easy to miss; the banner uses the
          existing surface tokens, keeps copy short, and offers the in-place
          WalletConnect CTA so users can switch out of demo mode without
          leaving the page. Disappears the moment `address` is non-null. */}
      {!address && (
        <Card
          variant="raised"
          className="flex flex-col gap-3 border-amber-500/30 bg-amber-500/5 p-4 md:flex-row md:items-center md:justify-between"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <Wallet className="mt-0.5 h-5 w-5 flex-none text-amber-400" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-text-primary">Demo mode</p>
              <p className="mt-1 text-xs text-text-secondary">
                You are viewing the local demo portfolio. Connect a wallet to
                see and manage your real orders.
              </p>
            </div>
          </div>
          <div className="md:flex-none">
            <WalletConnect />
          </div>
        </Card>
      )}

      <Card variant="raised" className="p-5">
        <div className="grid gap-3 md:grid-cols-[1.3fr_auto_auto_auto]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pair or token"
            leftElement={<Search className="h-4 w-4" />}
          />
          <Button
            variant="secondary"
            icon={<Filter className="h-4 w-4" />}
            onClick={() => setDrawerOpen(true)}
          >
            Advanced Filters
          </Button>
          {/* Issue #398 — density toggle. Single button that flips the
              persisted preference; icon switches to mirror current state. */}
          <Button
            variant="secondary"
            icon={
              density === "comfortable" ? (
                <Rows3 className="h-4 w-4" />
              ) : (
                <LayoutGrid className="h-4 w-4" />
              )
            }
            onClick={() =>
              setDensity((current) =>
                current === "comfortable" ? "compact" : "comfortable"
              )
            }
            aria-pressed={density === "compact"}
            aria-label={
              density === "comfortable"
                ? "Switch to compact list density"
                : "Switch to comfortable list density"
            }
          >
            {density === "comfortable" ? "Compact" : "Comfortable"}
          </Button>
          <Link href={localizePath("/marketplace")}>
            <Button variant="secondary" className="w-full">
              Browse Market
            </Button>
          </Link>
        </div>
      </Card>

      {/* Issue #397: Saved presets row */}
      {savedPresets.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="shrink-0 text-xs text-text-muted">Presets:</span>
          {savedPresets.map((preset) => (
            <div
              key={preset.name}
              className="inline-flex items-center overflow-hidden rounded-full border border-border bg-surface-raised"
            >
              <button
                type="button"
                onClick={() => {
                  setQuery(preset.query);
                  setStatusFilter(preset.status);
                  setChainFilter(preset.chain);
                  setAssetFilter(preset.asset);
                  setRangeFilter(preset.range);
                }}
                className="px-3 py-1 text-xs text-text-primary hover:bg-surface-overlay"
              >
                {preset.name}
              </button>
              <button
                type="button"
                onClick={() =>
                  setSavedPresets((curr) => curr.filter((p) => p.name !== preset.name))
                }
                aria-label={`Delete ${preset.name} preset`}
                className="px-2 py-1 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Issue #396: Active filter chips */}
      {(query || statusFilter !== "all" || chainFilter !== "all" || assetFilter !== "all" || rangeFilter !== "all") && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {query && (
            <FilterChip label={`Search: ${query}`} onRemove={() => setQuery("")} />
          )}
          {statusFilter !== "all" && (
            <FilterChip label={`Status: ${statusFilter}`} onRemove={() => setStatusFilter("all")} />
          )}
          {chainFilter !== "all" && (
            <FilterChip label={`Chain: ${chainFilter}`} onRemove={() => setChainFilter("all")} />
          )}
          {assetFilter !== "all" && (
            <FilterChip label={`Asset: ${assetFilter}`} onRemove={() => setAssetFilter("all")} />
          )}
          {rangeFilter !== "all" && (
            <FilterChip label={`Range: ${rangeFilter}`} onRemove={() => setRangeFilter("all")} />
          )}
          <button
            type="button"
            onClick={() => { setQuery(""); clearAdvancedFilters(); }}
            className="text-xs text-text-muted underline-offset-2 hover:text-text-primary hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {visibleOrders.length === 0 ? (
          <EmptyState
            icon={<Search className="h-7 w-7" />}
            title={hasAnyOrders ? "No matching orders" : "No orders created yet"}
            description={
              hasAnyOrders
                ? "No orders match the selected status and search query. Clear filters to see all orders."
                : "You have not created any orders for this profile yet. Start from the marketplace to post your first order."
            }
            action={
              hasAnyOrders
                ? {
                    label: "Clear Filters",
                    variant: "secondary",
                    onClick: () => {
                      setQuery("");
                      clearAdvancedFilters();
                    },
                  }
                : { label: "Browse Market", href: localizePath("/marketplace") }
            }
          />
        ) : (
          visibleOrders.map((order) => {
            const isAmendmentExpanded = expandedAmendmentId === order.id;
            const hasAmendments = (order.amendmentCount ?? 0) > 0;
            return (
              <Card
                key={order.id}
                variant="glass"
                className={cn(orderCardPaddingClass)}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xl font-bold text-text-primary">{order.pair}</span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                          order.derivedStatus === OrderStatus.OPEN &&
                            "bg-emerald-500/10 text-emerald-400",
                          order.derivedStatus === OrderStatus.EXPIRED &&
                            "bg-amber-500/10 text-amber-400",
                          order.derivedStatus === OrderStatus.CANCELLED &&
                            "bg-red-500/10 text-red-300",
                          order.derivedStatus === OrderStatus.FILLED &&
                            "bg-brand-500/10 text-brand-400"
                        )}
                      >
                        {order.derivedStatus}
                      </span>
                      {hasAmendments && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-400">
                          <History className="h-3 w-3" />
                          {order.amendmentCount} {order.amendmentCount === 1 ? "amendment" : "amendments"}
                        </span>
                      )}
                      {pendingCancelId === order.id && (
                        <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
                          <Spinner size="sm" />
                          <span>Cancelling</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
                      <p>Maker: {shortAddress(order.maker)}</p>
                      <p>
                        Chain Route: {order.chainIn} to {order.chainOut}
                      </p>
                      <p>
                        Size: {order.amount} {order.tokenIn}
                      </p>
                      <p>
                        Total: {order.total} {order.tokenOut}
                      </p>
                      <p>
                        Expires:{" "}
                        {order.expiresAt ? new Date(order.expiresAt).toLocaleString() : "Not set"}
                      </p>
                      <p>Created: {new Date(order.timestamp).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="min-w-[220px] space-y-3">
                    <div className="rounded-2xl border border-border bg-surface-raised p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                        Order Summary
                      </p>
                      <p className="mt-3 text-sm text-text-secondary">
                        Type: <span className="text-text-primary">{order.orderType ?? "limit"}</span>
                      </p>
                      <p className="mt-2 text-sm text-text-secondary">
                        Partial fills:{" "}
                        <span className="text-text-primary">
                          {order.allowPartialFills ? "Enabled" : "Disabled"}
                        </span>
                      </p>
                      {hasAmendments && (
                        <p className="mt-2 text-sm text-text-secondary">
                          Last amended:{" "}
                          <span className="text-text-primary">
                            {new Date(
                              order.amendmentLog![order.amendmentLog!.length - 1].amended_at
                            ).toLocaleString()}
                          </span>
                        </p>
                      )}
                    </div>

                    {hasAmendments && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAmendmentId(isAmendmentExpanded ? null : order.id)
                        }
                        className="flex w-full items-center justify-between rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs font-medium text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
                        aria-expanded={isAmendmentExpanded}
                      >
                        <span className="flex items-center gap-1.5">
                          <History className="h-3.5 w-3.5" />
                          Amendment History
                        </span>
                        {isAmendmentExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}

                    <Button
                      variant="destructive"
                      className="w-full"
                      icon={<XCircle className="h-4 w-4" />}
                      loading={pendingCancelId === order.id}
                      disabled={order.derivedStatus !== OrderStatus.OPEN}
                      onClick={() => requestCancel(order)}
                      aria-haspopup="dialog"
                      aria-label={`Cancel order ${order.pair} (${order.id})`}
                    >
                      Cancel Order
                    </Button>
                  </div>
                </div>

                {isAmendmentExpanded && order.amendmentLog && order.amendmentLog.length > 0 && (
                  <AmendmentHistory entries={order.amendmentLog} />
                )}
              </Card>
            );
          })
        )}
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-3 text-sm text-text-secondary">
          <Clock3 className="h-4 w-4 text-brand-500" />
          <span>
            Showing {visibleOrders.length} of {filtered.length} filtered orders
          </span>
        </div>
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          hasPrevious={pagination.hasPrevious}
          hasNext={pagination.hasNext}
          onPageChange={pagination.setPage}
        />
      </div>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }}
      />

      <CancelOrderDialog
        open={orderToCancel !== null}
        order={orderToCancel}
        loading={pendingCancelId !== null && pendingCancelId === orderToCancel?.id}
        onConfirm={confirmCancel}
        onClose={dismissCancelDialog}
      />

      <AdvancedFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onClear={clearAdvancedFilters}
        title="Order History Filters"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as FilterStatus)}
              className="h-10 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm text-text-primary"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
              <option value="filled">Filled</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Chain
            </label>
            <select
              value={chainFilter}
              onChange={(event) => setChainFilter(event.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm text-text-primary"
            >
              <option value="all">All chains</option>
              {chainOptions.map((chain) => (
                <option key={chain} value={chain}>
                  {chain}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Asset
            </label>
            <select
              value={assetFilter}
              onChange={(event) => setAssetFilter(event.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm text-text-primary"
            >
              <option value="all">All assets</option>
              {assetOptions.map((asset) => (
                <option key={asset} value={asset}>
                  {asset}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Time range
            </label>
            <select
              value={rangeFilter}
              onChange={(event) => setRangeFilter(event.target.value as RangeFilter)}
              className="h-10 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm text-text-primary"
            >
              <option value="all">All time</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-surface-overlay/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Saved presets
            </p>
            <div className="flex gap-2">
              <Input
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                placeholder="Preset name"
              />
              <Button
                variant="secondary"
                icon={<BookmarkPlus className="h-4 w-4" />}
                onClick={savePreset}
              >
                Save
              </Button>
            </div>
            <div className="space-y-2">
              {savedPresets.length === 0 ? (
                <p className="text-xs text-text-muted">No saved presets yet.</p>
              ) : (
                savedPresets.map((preset) => (
                  <div
                    key={preset.name}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(preset.query);
                        setStatusFilter(preset.status);
                        setChainFilter(preset.chain);
                        setAssetFilter(preset.asset);
                        setRangeFilter(preset.range);
                      }}
                      className="text-left text-sm text-text-primary"
                    >
                      {preset.name}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSavedPresets((current) =>
                          current.filter((item) => item.name !== preset.name)
                        )
                      }
                      className="rounded-md border border-border p-1.5 text-text-muted transition hover:bg-surface-overlay hover:text-text-primary"
                      aria-label={`Delete ${preset.name} preset`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </AdvancedFilterDrawer>
    </div>
  );
}

const FIELD_LABELS: Record<string, string> = {
  from_amount: "Send amount",
  to_amount: "Receive amount",
  min_fill_amount: "Min fill",
  expiry: "Expiry",
};

function AmendmentHistory({ entries }: { entries: OrderAmendmentEntry[] }) {
  const sorted = [...entries].sort((a, b) => b.sequence - a.sequence);
  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface-overlay/30 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
        <History className="h-3.5 w-3.5" />
        Amendment History
      </p>
      <ol className="space-y-3">
        {sorted.map((entry, index) => (
          <li key={entry.sequence} className="flex gap-3 text-sm">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  index === 0
                    ? "bg-brand-500/20 text-brand-400"
                    : "bg-surface-raised text-text-muted"
                )}
              >
                {entry.sequence}
              </span>
              {index < sorted.length - 1 && (
                <div className="mt-1 w-px flex-1 bg-border" />
              )}
            </div>
            <div className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-text-muted">
                  {new Date(entry.amended_at).toLocaleString()}
                </span>
                {index === 0 && (
                  <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-semibold text-brand-400">
                    Latest
                  </span>
                )}
              </div>
              <ul className="mt-1.5 space-y-1">
                {Object.entries(entry.changes).map(([field, change]) => (
                  <li key={field} className="text-xs text-text-secondary">
                    <span className="font-medium text-text-primary">
                      {FIELD_LABELS[field] ?? field}
                    </span>
                    {": "}
                    <span className="line-through text-text-muted">
                      {change.before ?? "—"}
                    </span>{" "}
                    →{" "}
                    <span className="font-medium text-text-primary">{change.after}</span>
                  </li>
                ))}
              </ul>
              {entry.note && (
                <p className="mt-1 text-xs italic text-text-muted">&ldquo;{entry.note}&rdquo;</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-overlay/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-black text-text-primary">{value}</p>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1 text-xs text-text-primary">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="text-text-muted hover:text-text-primary"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
