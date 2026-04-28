"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowRightLeft, Info, Settings, Share2, Vote, Waves } from "lucide-react";

import { Badge, Button, Card, CardContent, CardFooter, CardHeader, Input } from "@/components/ui";

const QuotePreviewCard = dynamic(
  () => import("@/components/swap/QuotePreviewCard").then((mod) => mod.QuotePreviewCard),
  { loading: () => <div className="h-32 motion-safe:animate-pulse bg-surface-raised rounded-xl" /> }
);

const TimelockConfigurator = dynamic(
  () => import("@/components/swap/TimelockConfigurator").then((mod) => mod.TimelockConfigurator),
  { loading: () => <div className="h-24 motion-safe:animate-pulse bg-surface-raised rounded-xl" /> }
);

const FeeWarningBanner = dynamic(
  () => import("@/components/fees/FeeWarningBanner").then((mod) => mod.FeeWarningBanner),
  { loading: () => <div className="h-12 motion-safe:animate-pulse bg-surface-raised rounded-xl" /> }
);

import { isFeatureEnabled } from "@/lib/featureFlags";
import { formatFiatEstimate, formatTokenAmount } from "@/lib/format";
import { fetchQuotePreview, type QuotePreview } from "@/lib/quoteApi";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useUnifiedWallet } from "@/components/wallet/UnifiedWalletProvider";
import { RiskDisclosureModal, RISK_ACCEPTANCE_KEY } from "@/components/swap/RiskDisclosureModal";
import {
  SlippageExpirationControls,
  SLIPPAGE_DEFAULT,
  SLIPPAGE_MIN,
  SLIPPAGE_MAX,
  EXPIRATION_DEFAULT_MINUTES,
} from "@/components/swap/SlippageExpirationControls";
import { SwapReviewModal } from "@/components/swap/SwapReviewModal";
import { SwapSigningModal } from "@/components/swap/SwapSigningModal";
import { TransactionLifecycle, TransactionStepKey, TransactionStepStatus } from "@/types";

type ChainId = "stellar" | "bitcoin" | "ethereum";

const CHAINS: Array<{ id: ChainId; label: string; tokens: string[] }> = [
  { id: "stellar", label: "Stellar", tokens: ["XLM", "USDC"] },
  { id: "bitcoin", label: "Bitcoin", tokens: ["BTC"] },
  { id: "ethereum", label: "Ethereum", tokens: ["ETH", "USDC"] },
];

function buildSigningLifecycle(
  current: TransactionStepKey,
  signStatus: TransactionStepStatus,
  broadcastStatus: TransactionStepStatus,
  confirmStatus: TransactionStepStatus,
  retryable = false
): TransactionLifecycle {
  const desc = (base: string, active: string, done: string, status: TransactionStepStatus) =>
    status === "active" ? active : status === "completed" ? done : base;

  return {
    currentStep: current,
    retryable,
    steps: [
      {
        key: "sign",
        label: "Sign Transaction",
        status: signStatus,
        description: desc(
          "Sign the transaction in your wallet",
          "Waiting for wallet signature…",
          "Transaction signed",
          signStatus
        ),
      },
      {
        key: "broadcast",
        label: "Broadcast",
        status: broadcastStatus,
        description: desc(
          "Submit transaction to network",
          "Submitting to network…",
          "Transaction broadcast",
          broadcastStatus
        ),
      },
      {
        key: "confirm",
        label: "Confirm",
        status: confirmStatus,
        description: desc(
          "Awaiting on-chain confirmation",
          "Awaiting on-chain confirmation…",
          "Confirmed on-chain",
          confirmStatus
        ),
      },
    ],
  };
}

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

  // Slippage & expiration controls (issue #201)
  const [slippage, setSlippage] = useState(SLIPPAGE_DEFAULT);
  const [expirationMinutes, setExpirationMinutes] = useState(EXPIRATION_DEFAULT_MINUTES);

  // Modal state (issues #165, #203, #204)
  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [signingModalOpen, setSigningModalOpen] = useState(false);
  const [signingLifecycle, setSigningLifecycle] = useState<TransactionLifecycle | null>(null);
  const signingGenRef = useRef(0);

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
    ? formatTokenAmount(quote.rateQuote.to_amount, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      })
    : "";

  const slippageInvalid =
    Number.isNaN(slippage) || slippage < SLIPPAGE_MIN || slippage > SLIPPAGE_MAX;

  // --- Modal flow handlers ---

  const openReviewModal = () => setReviewModalOpen(true);

  /** Called when "Initialize Atomic Swap" is clicked. */
  const handleInitiateSwap = () => {
    let accepted = false;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(RISK_ACCEPTANCE_KEY);
        accepted = stored ? JSON.parse(stored)?.accepted === true : false;
      } catch {
        accepted = false;
      }
    }
    if (!accepted) {
      setRiskModalOpen(true);
    } else {
      openReviewModal();
    }
  };

  /** Called when the user accepts the risk disclosure. */
  const handleRiskAccepted = () => {
    setRiskModalOpen(false);
    openReviewModal();
  };

  /** Runs the simulated signing flow. Uses a generation counter so stale runs self-abort. */
  const runSigningSimulation = async (gen: number) => {
    setSigningLifecycle(buildSigningLifecycle("sign", "active", "idle", "idle"));

    await new Promise<void>((r) => setTimeout(r, 2000));
    if (signingGenRef.current !== gen) return;
    setSigningLifecycle(buildSigningLifecycle("broadcast", "completed", "active", "idle"));

    await new Promise<void>((r) => setTimeout(r, 2000));
    if (signingGenRef.current !== gen) return;
    setSigningLifecycle(buildSigningLifecycle("confirm", "completed", "completed", "active"));

    await new Promise<void>((r) => setTimeout(r, 2000));
    if (signingGenRef.current !== gen) return;
    setSigningLifecycle(buildSigningLifecycle("confirm", "completed", "completed", "completed"));
  };

  /** Called when the user confirms the swap in the review modal. */
  const handleSwapConfirm = async () => {
    setIsConfirming(true);
    await new Promise<void>((r) => setTimeout(r, 400));
    setIsConfirming(false);
    setReviewModalOpen(false);
    setSigningModalOpen(true);
    const gen = ++signingGenRef.current;
    void runSigningSimulation(gen);
  };

  /** Retry: cancel any running simulation and restart. */
  const handleSigningRetry = () => {
    const gen = ++signingGenRef.current;
    void runSigningSimulation(gen);
  };

  /** Cancel signing: abort simulation and close. */
  const handleSigningCancel = () => {
    signingGenRef.current++;
    setSigningModalOpen(false);
    setSigningLifecycle(null);
  };

  const handleSigningClose = () => {
    setSigningModalOpen(false);
    setSigningLifecycle(null);
  };

  const reviewSwapDetails = {
    fromAsset,
    fromChain: sourceInfo?.label ?? sourceChain,
    fromAmount: amount || "0",
    toAsset,
    toChain: destInfo?.label ?? destChain,
    toAmount: toAmount || "~",
    estimatedFees:
      quote?.feeBreakdown.total_usd_estimate != null
        ? `~${formatFiatEstimate(quote.feeBreakdown.total_usd_estimate)}`
        : "See quote preview",
    timelockHours,
    route: `${sourceInfo?.label ?? sourceChain} → ${destInfo?.label ?? destChain}`,
    slippage,
    expirationMinutes,
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 md:py-20 animate-fade-in">
      <FeeWarningBanner chains={[sourceChain, destChain]} />

      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-text-primary">Create Swap</h1>
            {isFeatureEnabled("experimentalSwapUi") && (
              <Badge variant="info" className="text-xs font-semibold">
                Labs
              </Badge>
            )}
          </div>
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

          {/* Slippage & expiration controls (issue #201) */}
          <SlippageExpirationControls
            slippage={slippage}
            expirationMinutes={expirationMinutes}
            onSlippageChange={setSlippage}
            onExpirationChange={setExpirationMinutes}
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
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                    orderType === mode
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
            disabled={!isConnected || !amount || !!quoteError || slippageInvalid}
            onClick={handleInitiateSwap}
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
          <h3 className="font-semibold text-text-primary">Share &amp; Earn</h3>
          <p className="mt-2 text-sm text-text-secondary">
            Generate referral links, QR codes, and performance analytics.
          </p>
        </Link>
      </div>

      {/* Risk disclosure modal — shown before first swap (issue #165) */}
      <RiskDisclosureModal
        open={riskModalOpen}
        onAccept={handleRiskAccepted}
        onClose={() => setRiskModalOpen(false)}
      />

      {/* Swap review modal — confirmation before signing (issue #203) */}
      <SwapReviewModal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onConfirm={() => void handleSwapConfirm()}
        isConfirming={isConfirming}
        swapDetails={reviewSwapDetails}
      />

      {/* Transaction signing modal — progress, timeout, retry (issue #204) */}
      <SwapSigningModal
        open={signingModalOpen}
        onClose={handleSigningClose}
        onCancel={handleSigningCancel}
        onRetry={handleSigningRetry}
        lifecycle={signingLifecycle}
      />
    </div>
  );
}
