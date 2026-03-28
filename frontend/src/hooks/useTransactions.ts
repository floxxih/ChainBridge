import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Transaction, TransactionStore, TransactionStatus } from "@/types";
import { useCallback } from "react";

import {
  buildCompletedLifecycle,
  buildTransactionLifecycle,
} from "@/lib/transactionLifecycle";
import { getExplorerUrl } from "@/lib/explorers";

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set) => ({
      transactions: [],

      addTransaction: (tx) =>
        set((state) => ({
          transactions: [tx, ...state.transactions].slice(0, 100),
        })),

      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx)),
        })),

      removeTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.id !== id),
        })),
    }),
    {
      name: "chainbridge-transactions",
    }
  )
);

// Helper to mock some initial data for testing if empty
export const useMockTransactions = () => {
  const { transactions, addTransaction } = useTransactionStore();

  const seedMockData = useCallback(() => {
    if (transactions.length > 0) return;

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

    mocks.forEach((tx) => addTransaction(tx));
  }, [transactions.length, addTransaction]);

  return { seedMockData };
};
