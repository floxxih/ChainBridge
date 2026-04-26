"use client";

import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";

import { Card } from "@/components/ui";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function TrackingPage() {
  const { localizePath } = useI18n();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 md:py-20">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">
          Tracking Flow
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl">
          Swap Tracking
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary">
          This route group hosts transaction tracking pages and execution visibility for active swaps.
        </p>
      </div>

      <Card variant="raised" className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-brand-500/10 p-2 text-brand-500">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Open Transaction Explorer</h2>
              <p className="mt-1 text-sm text-text-secondary">
                View confirmation progress, proofs, and lifecycle events for each swap.
              </p>
            </div>
          </div>
          <Link
            href={localizePath("/transactions")}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-overlay px-4 py-2 text-sm font-medium text-text-primary transition hover:border-brand-500/40"
          >
            Go to explorer
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
