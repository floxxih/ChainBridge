"use client";

import { useState, useMemo, useEffect } from "react";

import { Transaction, TransactionStatus } from "@/types";
import {
  Search,
  Download,
  RefreshCcw,
  Database,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Input, Button, Badge, Spinner } from "@/components/ui";
import { TransactionRow } from "./TransactionRow";
import { TransactionDetailModal } from "./TransactionDetailModal";
import { useTransactionStore } from "@/hooks/useTransactions";
import {
  buildCompletedLifecycle,
  buildTransactionLifecycle,
  sleep,
} from "@/lib/transactionLifecycle";

interface TransactionFeedProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

export function TransactionFeed({ transactions, isLoading }: TransactionFeedProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "all">("all");
  const [chainFilter, setChainFilter] = useState<string | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const selectedTx =
    transactions.find((transaction) => transaction.id === selectedId) ?? null;

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

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

      return matchesSearch && matchesStatus && matchesChain;
    });

    return result;
  }, [transactions, search, statusFilter, chainFilter]);

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

  if (!isHydrated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const exportData = (format: "csv" | "json") => {
    const data = filteredTransactions.map((tx) => ({
      date: new Date(tx.timestamp).toLocaleString(),
      chain: tx.chain,
      hash: tx.hash,
      type: tx.type,
      amount: tx.amount,
      token: tx.token,
      status: tx.status,
      confirmations: `${tx.confirmations}/${tx.requiredConfirmations}`,
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
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4">
            <Spinner size="lg" />
            <p className="text-sm text-text-secondary">Syncing with history nodes...</p>
          </div>
        ) : filteredTransactions.length > 0 ? (
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
                {filteredTransactions.map((tx) => (
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
                setStatusFilter("all");
                setChainFilter("all");
              }}
            >
              Clear all filters
            </Button>
          </div>
        )}
      </div>

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
    </div>
  );
}
