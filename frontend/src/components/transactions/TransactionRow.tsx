"use client";

import { useMemo } from "react";
import { Transaction, TransactionStatus } from "@/types";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Badge, Button, TruncatedHash } from "@/components/ui";
import { clsx } from "clsx";

interface TransactionRowProps {
  tx: Transaction;
  onSelect: () => void;
}

export function TransactionRow({ tx, onSelect }: TransactionRowProps) {
  const statusIcon = useMemo(() => {
    switch (tx.status) {
      case TransactionStatus.COMPLETED:
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case TransactionStatus.CONFIRMING:
        return <Clock className="h-5 w-5 text-brand-500 animate-pulse" />;
      case TransactionStatus.FAILED:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-text-muted" />;
    }
  }, [tx.status]);

  const progress = useMemo(() => {
    if (tx.status === TransactionStatus.COMPLETED) return 100;
    if (tx.requiredConfirmations === 0) return 0;
    return Math.min(Math.round((tx.confirmations / tx.requiredConfirmations) * 100), 99);
  }, [tx.confirmations, tx.requiredConfirmations, tx.status]);

  const explorerUrl = useMemo(() => {
    switch (tx.chain.toLowerCase()) {
      case "stellar":
        return `https://stellar.expert/explorer/testnet/tx/${tx.hash}`;
      case "ethereum":
        return `https://sepolia.etherscan.io/tx/${tx.hash}`;
      case "bitcoin":
        return `https://mempool.space/testnet/tx/${tx.hash}`;
      default:
        return "#";
    }
  }, [tx.chain, tx.hash]);

  return (
    <tr
      onClick={onSelect}
      className="group border-b border-border/50 bg-surface/30 transition hover:bg-surface-overlay/30 first:rounded-t-2xl last:rounded-b-2xl last:border-0 block md:table-row cursor-pointer"
    >
      {/* Type & Status */}
      <td className="px-4 py-4 md:px-6 block md:table-cell">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-overlay border border-border shadow-sm">
            {statusIcon}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted md:hidden">
              Status
            </span>
            <span className="text-sm font-semibold text-text-primary capitalize">
              {tx.type.replace("_", " ")}
            </span>
            <span className="text-[10px] text-text-muted">
              {new Date(tx.timestamp).toLocaleString([], {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
          </div>
        </div>
      </td>

      {/* Asset */}
      <td className="px-4 py-2 md:px-6 block md:table-cell">
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted md:hidden">
            Asset
          </span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-text-primary">
              {tx.amount} {tx.token}
            </span>
            <Badge variant="default" className="text-[10px] uppercase tracking-tighter shrink-0">
              {tx.chain}
            </Badge>
          </div>
        </div>
      </td>

      {/* Hash */}
      <td className="px-4 py-2 md:px-6 block md:table-cell">
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted md:hidden">
            Hash
          </span>
          <div className="flex items-center gap-2 text-text-secondary">
            <TruncatedHash hash={tx.hash} label="transaction hash" shortenOptions={{ prefixLength: 8, suffixLength: 6 }} />
          </div>
        </div>
      </td>

      {/* Progress */}
      <td className="px-4 py-2 md:px-6 block md:table-cell text-right">
        <div className="flex flex-col md:items-end gap-1.5 min-w-[120px]">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted md:hidden text-left">
            Progress
          </span>
          <div className="flex justify-between w-full md:w-auto md:gap-4 text-[10px] font-bold uppercase tracking-wider text-text-muted">
            <span className="md:hidden">Confirms</span>
            <span>
              {tx.confirmations} / {tx.requiredConfirmations}
            </span>
          </div>
          <div className="h-1.5 w-full md:w-32 overflow-hidden rounded-full bg-surface-overlay border border-border/50">
            <div
              className={clsx(
                "h-full transition-all duration-500",
                tx.status === TransactionStatus.COMPLETED ? "bg-emerald-500" : "bg-brand-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-4 md:px-6 block md:table-cell text-right">
        <div className="flex items-center justify-end gap-2">
          {tx.proofVerified !== undefined && (
            <div
              className={clsx(
                "flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold",
                tx.proofVerified
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-text-muted/10 text-text-muted"
              )}
            >
              <ShieldCheck className="h-3 w-3" />
              <span className="hidden lg:inline">{tx.proofVerified ? "VERIFIED" : "WAITING"}</span>
            </div>
          )}
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-2 text-text-muted hover:bg-brand-500/10 hover:text-brand-500 transition shadow-sm"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <Button
            variant="ghost"
            size="sm"
            className="hidden h-8 w-8 p-0 group-hover:flex items-center justify-center"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
