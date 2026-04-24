"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRightLeft, Info, Settings, Share2, Vote, Waves } from "lucide-react";

import { Badge, Button, Card, CardContent, CardFooter, CardHeader, Input } from "@/components/ui";

const QuotePreviewCard = dynamic(() =>
  import("@/components/swap/QuotePreviewCard").then(mod => mod.QuotePreviewCard),
  { loading: () => <div className="h-32 animate-pulse bg-surface-raised rounded-xl" /> }
);

const TimelockConfigurator = dynamic(() =>
  import("@/components/swap/TimelockConfigurator").then(mod => mod.TimelockConfigurator),
  { loading: () => <div className="h-24 animate-pulse bg-surface-raised rounded-xl" /> }
);

const FeeWarningBanner = dynamic(() =>
  import("@/components/fees/FeeWarningBanner").then(mod => mod.FeeWarningBanner),
  { loading: () => <div className="h-12 animate-pulse bg-surface-raised rounded-xl" /> }
);

import { fetchQuotePreview, type QuotePreview } from "@/lib/quoteApi";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useUnifiedWallet } from "@/components/wallet/UnifiedWalletProvider";

type ChainId = "stellar" | "bitcoin" | "ethereum";

const CHAINS: Array<{ id: ChainId; label: string; tokens: string[] }> = [
  { id: "stellar", label: "Stellar", tokens: ["XLM", "USDC"] },
  { id: "bitcoin", label: "Bitcoin", tokens: ["BTC"] },
  { id: "ethereum", label: "Ethereum", tokens: ["ETH", "USDC"] },
];

export default function SwapPage() {
  const { isConnected } = useUnifiedWallet();
  const { localizePath } = useI18n();
  const [amount, setAmount] = useState("");
  const [orderType, setOrderType] = useState<"market" | "limit" | "twap">("limit");
  const [sourceChain, setSourceChain] = useState<ChainId>("stellar");
  const [destChain, setDestChain] = useState<ChainId>("bitcoin");
  const [fromAsset, setFromAsset] = useState("XLM");
  const [toAsset, setToAsset] = useState("BTC");
  const [timelockHours, setTimelockHours] = useState(24);
  const [quote, setQuote] = useState<QuotePreview | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteUpdatedAt, setQuoteUpdatedAt] = useState<number | null>(null);
  const [clockMs, setClockMs] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setClockMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const sourceInfo = useMemo(() => CHAINS.find((chain) => chain.id === sourceChain), [sourceChain]);
  const destInfo = useMemo(() => CHAINS.find((chain) => chain.id === destChain), [destChain]);

  useEffect(() => {
    const sourceTokens = sourceInfo?.tokens ?? [];
    if (!sourceTokens.includes(fromAsset)) {
      setFromAsset(sourceTokens[0] ?? "");
    }
  }, [fromAsset, sourceInfo]);

  useEffect(() => {
    const destTokens = destInfo?.tokens ?? [];
    if (!destTokens.includes(toAsset)) {
      setToAsset(destTokens[0] ?? "");
    }
  }, [destInfo, toAsset]);

  const requestQuote = async () => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !fromAsset || !toAsset) {
      setQuote(null);
      setQuoteUpdatedAt(null);
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const nextQuote = await fetchQuotePreview({
        fromAsset,
        toAsset,
        fromAmount: parsedAmount,
        sourceChain,
        destChain,
      });
      setQuote(nextQuote);
      setQuoteUpdatedAt(Date.now());
    } catch (error: any) {
      setQuote(null);
      setQuoteUpdatedAt(null);
      setQuoteError(error?.response?.data?.detail ?? "Failed to fetch quote preview.");
    } finally {
      setQuoteLoading(false);
    }
  };

  useEffect(() => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setQuote(null);
      setQuoteError(null);
      setQuoteUpdatedAt(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      void requestQuote();
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [amount, destChain, fromAsset, sourceChain, toAsset]);

  const isQuoteStale = quoteUpdatedAt ? clockMs - quoteUpdatedAt > 30_000 : false;

  const toAmount = quote?.rateQuote.to_amount
    ? quote.rateQuote.to_amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    })
    : "";

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 md:py-20 animate-fade-in">
      <FeeWarningBanner chains={[sourceChain, destChain]} />

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Create Swap</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Configure your cross-chain atomic swap.
          </p>
        </div>
        <Button variant="ghost" size="sm" icon={<Settings className="h-4 w-4" />}>
          Settings
        </Button>
      </div>

      <Card variant="raised" className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-surface-overlay/50 py-4">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Swap Configuration
          </span>
          <Badge variant="info">HTLC Enabled</Badge>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-secondary">From</label>
              <span className="text-xs text-text-muted">Balance: 0.00</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_170px_130px]">
              <Input
                placeholder="0.00"
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              <select
                value={sourceChain}
                onChange={(event) => {
                  const nextSource = event.target.value as ChainId;
                  setSourceChain(nextSource);
                  if (nextSource === destChain) {
                    const fallback = CHAINS.find((chain) => chain.id !== nextSource)?.id;
                    if (fallback) setDestChain(fallback);
                  }
                }}
                className="rounded-xl border border-border bg-surface-raised px-3 text-sm text-text-primary"
              >
                {CHAINS.map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.label}
                  </option>
                ))}
              </select>
              <select
                value={fromAsset}
                onChange={(event) => setFromAsset(event.target.value)}
                className="rounded-xl border border-border bg-surface-raised px-3 text-sm text-text-primary"
              >
                {(sourceInfo?.tokens ?? []).map((token) => (
                  <option key={token} value={token}>
                    {token}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-center -my-3">
            <button
              type="button"
              className="z-10 rounded-full bg-background p-1 shadow-sm border border-border"
              onClick={() => {
                setSourceChain(destChain);
                setDestChain(sourceChain);
                setFromAsset(toAsset);
                setToAsset(fromAsset);
              }}
            >
              <span className="block rounded-full bg-surface-overlay p-2 text-brand-500 hover:bg-brand-500 hover:text-white transition cursor-pointer">
                <ArrowRightLeft className="h-5 w-5" />
              </span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">To (Estimated)</label>
            <div className="grid gap-2 sm:grid-cols-[1fr_170px_130px]">
              <Input
                placeholder="0.00"
                type="text"
                readOnly
                value={toAmount}
                className="bg-surface/50"
              />
              <select
                value={destChain}
                onChange={(event) => {
                  const nextDest = event.target.value as ChainId;
                  setDestChain(nextDest);
                  if (nextDest === sourceChain) {
                    const fallback = CHAINS.find((chain) => chain.id !== nextDest)?.id;
                    if (fallback) setSourceChain(fallback);
                  }
                }}
                className="rounded-xl border border-border bg-surface-raised px-3 text-sm text-text-primary"
              >
                {CHAINS.filter((chain) => chain.id !== sourceChain).map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.label}
                  </option>
                ))}
              </select>
              <select
                value={toAsset}
                onChange={(event) => setToAsset(event.target.value)}
                className="rounded-xl border border-border bg-surface-raised px-3 text-sm text-text-primary"
              >
                {(destInfo?.tokens ?? []).map((token) => (
                  <option key={token} value={token}>
                    {token}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <QuotePreviewCard
            quote={quote}
            fromAsset={fromAsset}
            toAsset={toAsset}
            isLoading={quoteLoading}
            isStale={isQuoteStale}
            error={quoteError}
            onRefresh={() => void requestQuote()}
          />

          <TimelockConfigurator
            sourceChain={sourceChain}
            destChain={destChain}
            timelockHours={timelockHours}
            onTimelockChange={setTimelockHours}
          />

          <div className="rounded-xl border border-border bg-background/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">Advanced Execution</span>
              <Badge variant="info">Issue #78</Badge>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {["limit", "market", "twap"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setOrderType(mode as "market" | "limit" | "twap")}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${orderType === mode
                    ? "border-brand-500 bg-brand-500/10 text-brand-500"
                    : "border-border bg-surface-overlay/30 text-text-secondary"
                    }`}
                >
                  {mode === "twap" ? "TWAP schedule" : `${mode} order`}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-text-muted">
              Configure triggers, partial fills, and expiry windows from the protocol workspace.
            </p>
          </div>

          {!isConnected && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-[13px] text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>Please connect your wallet to initiate a cross-chain swap.</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="bg-surface-overlay/30">
          <Button
            className="w-full h-12 rounded-xl text-lg font-bold"
            disabled={!isConnected || !amount || !!quoteError}
          >
            {isConnected ? "Initialize Atomic Swap" : "Connect Wallet to Swap"}
          </Button>
        </CardFooter>
      </Card>

      <div className="mt-8 flex items-start gap-3 rounded-2xl bg-brand-500/5 border border-brand-500/10 p-6 text-sm text-text-secondary">
        <Info className="h-5 w-5 shrink-0 text-brand-500 mt-0.5" />
        <div>
          <h4 className="font-semibold text-text-primary mb-1">How it works?</h4>
          <p>
            Your assets are locked in a smart contract (HTLC) and can only be released if the
            recipient provides a secret hash. This ensures both parties either receive their funds
            or get a full refund if the swap expires.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link
          href={localizePath("/protocol")}
          className="rounded-2xl border border-border bg-surface-overlay/30 p-5 transition hover:border-brand-500/40"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
            <Vote className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-text-primary">Governance</h3>
          <p className="mt-2 text-sm text-text-secondary">
            Review proposals, delegation, and queued executions.
          </p>
        </Link>
        <Link
          href={localizePath("/protocol")}
          className="rounded-2xl border border-border bg-surface-overlay/30 p-5 transition hover:border-brand-500/40"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
            <Waves className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-text-primary">Liquidity Pools</h3>
          <p className="mt-2 text-sm text-text-secondary">
            Inspect fallback AMM routes and LP rewards before submission.
          </p>
        </Link>
        <Link
          href={localizePath("/protocol")}
          className="rounded-2xl border border-border bg-surface-overlay/30 p-5 transition hover:border-brand-500/40"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
            <Share2 className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-text-primary">Share & Earn</h3>
          <p className="mt-2 text-sm text-text-secondary">
            Generate referral links, QR codes, and performance analytics.
          </p>
        </Link>
      </div>
    </div>
  );
}
