import type { Metadata } from "next";
import { Wrench, Clock, ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Under Maintenance | ChainBridge",
  description: "ChainBridge is temporarily down for scheduled maintenance. We'll be back shortly.",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center"
      aria-labelledby="maintenance-heading"
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-[20%] left-1/2 -translate-x-1/2 h-[40%] w-[60%] rounded-full bg-brand-500/10 blur-[140px]"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Icon */}
        <div
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-brand-500/30 bg-brand-500/10 text-brand-500"
          aria-hidden="true"
        >
          <Wrench className="h-10 w-10" />
        </div>

        {/* Status badge */}
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1 text-xs font-semibold uppercase tracking-widest text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" aria-hidden="true" />
          Scheduled Maintenance
        </span>

        <h1
          id="maintenance-heading"
          className="text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl"
        >
          We&apos;ll Be Right Back
        </h1>

        <p className="mt-4 max-w-md text-base leading-relaxed text-text-secondary">
          ChainBridge is undergoing scheduled maintenance to improve reliability and add new
          features. All funds are safe and contracts remain on-chain.
        </p>

        {/* Timeline */}
        <div className="mt-8 flex items-center gap-2 rounded-xl border border-border bg-surface-overlay px-5 py-3 text-sm text-text-secondary">
          <Clock className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
          <span>Expected downtime: under 2 hours</span>
        </div>

        {/* External status link */}
        <a
          href="https://status.chainbridge.io"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Check live status
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </main>
  );
}
