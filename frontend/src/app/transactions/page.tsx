"use client";

import { useEffect } from "react";
import { TransactionFeed } from "@/components/transactions/TransactionFeed";
import { useTransactionStore } from "@/hooks/useTransactions";
import { Transaction, TransactionStatus } from "@/types";
import { Activity, ShieldCheck, Zap } from "lucide-react";

import { Badge } from "@/components/ui";
import {
  buildCompletedLifecycle,
  buildTransactionLifecycle,
} from "@/lib/transactionLifecycle";
import { getExplorerUrl } from "@/lib/explorers";

export default function TransactionsPage() {
  const transactions = useTransactionStore((state) => state.transactions);
  const addTransaction = useTransactionStore((state) => state.addTransaction);

  // Seed mock data on mount ONLY if empty
  useEffect(() => {
    if (transactions.length === 0) {
      const mocks: Transaction[] = [
        {
          id: "tx_001",
          hash: "GC...3X4",
          chain: "Stellar",
          type: "swap_lock",
          amount: "1,250",
          token: "XLM",
          status: TransactionStatus.COMPLETED,
          confirmations: 1,
          requiredConfirmations: 1,
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          proofVerified: true,
          explorerUrl: getExplorerUrl("stellar", "GC...3X4"),
          lifecycle: buildCompletedLifecycle("Stellar"),
        },
        {
          id: "tx_002",
          hash: "0x7a...f21",
          chain: "Ethereum",
          type: "swap_redeem",
          amount: "0.45",
          token: "ETH",
          status: TransactionStatus.CONFIRMING,
          confirmations: 6,
          requiredConfirmations: 12,
          timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
          proofVerified: false,
          explorerUrl: getExplorerUrl("ethereum", "0x7a...f21"),
          lifecycle: buildTransactionLifecycle("Ethereum", "confirm"),
        },
        {
          id: "tx_003",
          hash: "bc1...qwe",
          chain: "Bitcoin",
          type: "inbound",
          amount: "0.0024",
          token: "BTC",
          status: TransactionStatus.FAILED,
          confirmations: 0,
          requiredConfirmations: 3,
          timestamp: new Date().toISOString(),
          explorerUrl: getExplorerUrl("bitcoin", "bc1...qwe"),
          lifecycle: buildTransactionLifecycle("Bitcoin", "approval", {
            failedStep: "broadcast",
            errorMessage: "Bitcoin broadcast failed: mempool rejected the transaction fee rate.",
            retryable: true,
          }),
          failureReason: "Bitcoin broadcast failed: mempool rejected the transaction fee rate.",
        },
      ];
      mocks.forEach((t) => addTransaction(t));
    }
  }, [addTransaction, transactions.length]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 md:py-20 animate-fade-in">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="info" className="bg-brand-500/10 text-brand-500 border-brand-500/20">
              Live Monitor
            </Badge>
          </div>
          <h1 className="text-4xl font-extrabold text-text-primary tracking-tight sm:text-5xl">
            Transaction Explorer
          </h1>
          <p className="mt-4 text-lg text-text-secondary leading-relaxed max-w-2xl">
            Real-time monitoring of your cross-chain atomic swaps and native asset transfers. All
            proofs are verified against chain state.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:flex">
          <StatCard
            label="Total Swaps"
            value={transactions.length.toString()}
            icon={<Zap className="h-4 w-4 text-brand-500" />}
          />
          <StatCard
            label="Verified Proofs"
            value={transactions.filter((t) => t.proofVerified).length.toString()}
            icon={<ShieldCheck className="h-4 w-4 text-emerald-500" />}
          />
        </div>
      </div>

      <TransactionFeed transactions={transactions} />
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-surface-overlay/50 border border-border p-4 min-w-[140px]">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-black text-text-primary">{value}</div>
    </div>
  );
}
