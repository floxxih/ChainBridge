"use client";

import { useState, useMemo, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Transaction, TransactionStatus } from "@/types";
import {
  Search,
  Download,
  RefreshCcw,
  Database,
  CheckCircle2,
  Filter,
  BookmarkPlus,
  Trash2,
} from "lucide-react";
import { Input, Button } from "@/components/ui";
import { TransactionRow } from "./TransactionRow";
import { TransactionDetailModal } from "./TransactionDetailModal";
import { TransactionFeedSkeleton } from "./TransactionFeedSkeleton";
import { useTransactionStore } from "@/hooks/useTransactions";
import {
  buildCompletedLifecycle,
  buildTransactionLifecycle,
  sleep,
} from "@/lib/transactionLifecycle";
import { AdvancedFilterDrawer } from "@/components/filters/AdvancedFilterDrawer";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/useToast";
import { useInfiniteList } from "@/hooks/useInfiniteList";

interface TransactionFeedProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

type TxRange = "all" | "24h" | "7d" | "30d" | "90d";

type TransactionFilterPreset = {
  name: string;
  search: string;
  status: TransactionStatus | "all";
  chain: string;
  asset: string;
  range: TxRange;
};

export function TransactionFeed({ transactions, isLoading }: TransactionFeedProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isHydrated, setIsHydrated] = useState(false);
  const [search, setSearch] = useState(() => searchParams.get("tx_q") ?? "");
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "all">(
    () => (searchParams.get("tx_status") as TransactionStatus | "all") ?? "all"
  );
  const [chainFilter, setChainFilter] = useState<string | "all">(
    () => searchParams.get("tx_chain") ?? "all"
  );
  const [assetFilter, setAssetFilter] = useState<string | "all">(
    () => searchParams.get("tx_asset") ?? "all"
  );
  const [rangeFilter, setRangeFilter] = useState<TxRange>(
    () => (searchParams.get("tx_range") as TxRange) ?? "all"
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [savedPresets, setSavedPresets] = useLocalStorage<TransactionFilterPreset[]>(
    "chainbridge-tx-filter-presets",
    []
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);
  const toast = useToast();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const selectedTx = transactions.find((transaction) => transaction.id === selectedId) ?? null;

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    const now = Date.now();

    const result = transactions.filter((tx) => {
      const searchLower = search.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        tx.hash.toLowerCase().includes(searchLower) ||
        tx.amount.replace(/,/g, "").includes(searchLower.replace(/,/g, "")) ||
        tx.token.toLowerCase().includes(searchLower) ||
        tx.chain.toLowerCase().includes(searchLower);

      const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
      const matchesChain = chainFilter === "all" || tx.chain === chainFilter;
      const matchesAsset = assetFilter === "all" || tx.token === assetFilter;
      const txTime = new Date(tx.timestamp).getTime();

      let matchesRange = true;
      if (!Number.isNaN(txTime)) {
        if (rangeFilter === "24h") matchesRange = now - txTime <= 24 * 60 * 60 * 1000;
        if (rangeFilter === "7d") matchesRange = now - txTime <= 7 * 24 * 60 * 60 * 1000;
        if (rangeFilter === "30d") matchesRange = now - txTime <= 30 * 24 * 60 * 60 * 1000;
        if (rangeFilter === "90d") matchesRange = now - txTime <= 90 * 24 * 60 * 60 * 1000;
      }

      return matchesSearch && matchesStatus && matchesChain && matchesAsset && matchesRange;
    });

    return result;
  }, [transactions, search, statusFilter, chainFilter, assetFilter, rangeFilter]);
  const infinite = useInfiniteList(filteredTransactions.length, 8);
  const visibleTransactions = filteredTransactions.slice(0, infinite.visibleCount);
  const resetInfinite = infinite.reset;

  useEffect(() => {
    setSearch(searchParams.get("tx_q") ?? "");
    setStatusFilter((searchParams.get("tx_status") as TransactionStatus | "all") ?? "all");
    setChainFilter((searchParams.get("tx_chain") as string | "all") ?? "all");
    setAssetFilter((searchParams.get("tx_asset") as string | "all") ?? "all");
    setRangeFilter((searchParams.get("tx_range") as TxRange) ?? "all");
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

    put("tx_q", search.trim(), "");
    put("tx_status", statusFilter, "all");
    put("tx_chain", chainFilter, "all");
    put("tx_asset", assetFilter, "all");
    put("tx_range", rangeFilter, "all");

    const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const target = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;

    if (current !== target) {
      router.replace(target, { scroll: false });
    }
  }, [assetFilter, chainFilter, pathname, rangeFilter, router, search, searchParams, statusFilter]);

  async function retryTransaction(tx: Transaction) {
    updateTransaction(tx.id, {
      status: TransactionStatus.PENDING,
      confirmations: 0,
      failureReason: undefined,
      lifecycle: buildTransactionLifecycle(tx.chain, "approval"),
    });
    await sleep(600);

    updateTransaction(tx.id, {
      lifecycle: buildTransactionLifecycle(tx.chain, "sign"),
    });
    await sleep(700);

    updateTransaction(tx.id, {
      status: TransactionStatus.CONFIRMING,
      lifecycle: buildTransactionLifecycle(tx.chain, "broadcast"),
      hash: tx.hash.startsWith("retry-") ? tx.hash : `retry-${Date.now().toString(16)}`,
    });
    await sleep(900);

    updateTransaction(tx.id, {
      status: TransactionStatus.CONFIRMING,
      confirmations: Math.max(1, tx.requiredConfirmations - 1),
      lifecycle: buildTransactionLifecycle(tx.chain, "confirm"),
    });
    await sleep(1000);

    updateTransaction(tx.id, {
      status: TransactionStatus.COMPLETED,
      confirmations: tx.requiredConfirmations,
      proofVerified: true,
      lifecycle: buildCompletedLifecycle(tx.chain),
    });
  }

  useEffect(() => {
    resetInfinite();
  }, [assetFilter, chainFilter, rangeFilter, resetInfinite, search, statusFilter]);

  if (!isHydrated) {
    return <TransactionFeedSkeleton rows={6} />;
  }

  if (isLoading) {
    return <TransactionFeedSkeleton rows={6} />;
  }

  const chainOptions = Array.from(new Set(transactions.map((tx) => tx.chain))).sort();
  const assetOptions = Array.from(new Set(transactions.map((tx) => tx.token))).sort();

  function clearAdvancedFilters() {
    setStatusFilter("all");
    setChainFilter("all");
    setAssetFilter("all");
    setRangeFilter("all");
  }

  function savePreset() {
    const trimmedName = presetName.trim();
    if (!trimmedName) return;

    const preset: TransactionFilterPreset = {
      name: trimmedName,
      search,
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

  const exportData = (format: "csv" | "json") => {
    if (filteredTransactions.length === 0) {
      toast.info("Nothing to export", "Adjust filters or date range to include transactions.");
      return;
    }

    const data = filteredTransactions.map((tx) => ({
      chain: tx.chain,
      hash: tx.hash,
      amount: tx.amount,
      token: tx.token,
      status: tx.status,
      timestamp_iso: tx.timestamp,
      timestamp_local: new Date(tx.timestamp).toLocaleString(),
      type: tx.type,
    }));

    let blob: Blob;
    let filename: string;

    if (format === "csv") {
      const headers = Object.keys(data[0]).join(",");
      const rows = data.map((item) => Object.values(item).join(",")).join("\n");
      blob = new Blob([`${headers}\n${rows}`], { type: "text/csv" });
      filename = `chainbridge_txs_${Date.now()}.csv`;
    } else {
      blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      filename = `chainbridge_txs_${Date.now()}.json`;
    }

    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      toast.success(
        "Export complete",
        `${filteredTransactions.length} transaction records exported for ${rangeFilter === "all" ? "all time" : rangeFilter}.`
      );
    } catch {
      toast.error("Export failed", "Unable to create file download in this browser session.");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Search by hash, amount, or token..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDrawerOpen(true)}
            icon={<Filter className="h-4 w-4" />}
          >
            Advanced Filters
          </Button>

          <select
            className="h-10 rounded-xl border border-border bg-surface-overlay px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value={TransactionStatus.COMPLETED}>Completed</option>
            <option value={TransactionStatus.CONFIRMING}>Confirming</option>
            <option value={TransactionStatus.PENDING}>Pending</option>
            <option value={TransactionStatus.FAILED}>Failed</option>
          </select>

          <select
            className="h-10 rounded-xl border border-border bg-surface-overlay px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            value={chainFilter}
            onChange={(e) => setChainFilter(e.target.value)}
          >
            <option value="all">All Chains</option>
            <option value="Stellar">Stellar</option>
            <option value="Ethereum">Ethereum</option>
            <option value="Bitcoin">Bitcoin</option>
          </select>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportData("csv")}
            icon={<Download className="h-4 w-4" />}
          >
            Export
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background/50 backdrop-blur-sm overflow-hidden shadow-glow-sm">
        {filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-border/50 bg-surface-overlay/30">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted">
                    Type / Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted">
                    Asset
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted">
                    Hash
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted text-right">
                    Progress
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {visibleTransactions.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} onSelect={() => setSelectedId(tx.id)} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center gap-4 text-center px-4">
            <div className="rounded-full bg-surface-overlay p-4 border border-border">
              <Database className="h-8 w-8 text-text-muted" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">No transactions found</h3>
              <p className="text-sm text-text-secondary mt-1">
                Try adjusting your search or filters.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                clearAdvancedFilters();
              }}
            >
              Clear all filters
            </Button>
          </div>
        )}
      </div>

      {filteredTransactions.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Showing {visibleTransactions.length} of {filteredTransactions.length} matching
            transactions
          </p>
          {infinite.hasMore && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={infinite.showMore}>
                Load more
              </Button>
            </div>
          )}
          <div ref={infinite.sentinelRef} className="h-1" aria-hidden />
        </div>
      )}

      {selectedTx && (
        <TransactionDetailModal
          tx={selectedTx}
          onClose={() => setSelectedId(null)}
          onRetry={
            selectedTx.lifecycle?.retryable ? () => void retryTransaction(selectedTx) : undefined
          }
        />
      )}

      <div className="flex flex-col gap-4 rounded-xl bg-brand-500/5 border border-brand-500/10 p-4 md:flex-row md:items-center md:gap-8">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-text-primary">Verification Status</p>
            <p className="text-[10px] text-text-muted">Proofs are verified in real-time</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
            <RefreshCcw size={16} className="animate-spin-slow" />
          </div>
          <div>
            <p className="text-xs font-bold text-text-primary">Automated Sync</p>
            <p className="text-[10px] text-text-muted">Polling every 15 seconds</p>
          </div>
        </div>
      </div>

      <AdvancedFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onClear={clearAdvancedFilters}
        title="Transaction Filters"
      >
        <div className="space-y-5">
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
              onChange={(event) => setRangeFilter(event.target.value as TxRange)}
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
                      className="text-left text-sm text-text-primary"
                      onClick={() => {
                        setSearch(preset.search);
                        setStatusFilter(preset.status);
                        setChainFilter(preset.chain);
                        setAssetFilter(preset.asset);
                        setRangeFilter(preset.range);
                      }}
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
