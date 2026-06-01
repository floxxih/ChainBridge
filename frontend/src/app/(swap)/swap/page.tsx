"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowRightLeft, Info, Settings, Share2, Vote, Waves } from "lucide-react";

import { Badge, Button, Card, CardContent, CardFooter, CardHeader, ChainAssetSelector, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Chain as SelectorChain } from "@/components/ui";

const QuotePreviewCard = dynamic(() =>
  import("@/components/swap/QuotePreviewCard").then((mod) => mod.QuotePreviewCard),
  { loading: () => <div className="h-32 motion-safe:animate-pulse bg-surface-raised rounded-xl" /> }
);

const TimelockConfigurator = dynamic(() =>
  import("@/components/swap/TimelockConfigurator").then((mod) => mod.TimelockConfigurator),
  { loading: () => <div className="h-24 motion-safe:animate-pulse bg-surface-raised rounded-xl" /> }
);

const FeeWarningBanner = dynamic(() =>
  import("@/components/fees/FeeWarningBanner").then((mod) => mod.FeeWarningBanner),
  { loading: () => <div className="h-12 motion-safe:animate-pulse bg-surface-raised rounded-xl" /> }
);

import { isFeatureEnabled } from "@/lib/featureFlags";
import { formatFiatEstimate, formatTokenAmount } from "@/lib/format";
import { fetchQuotePreview, type QuotePreview } from "@/lib/quoteApi";
import { track } from "@/lib/analytics";
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
type SwapFailureCategory = "validation" | "quote" | "submission" | "wallet" | "unknown";

const CHAINS: Array<{ id: ChainId; label: string; tokens: string[] }> = [
  { id: "stellar", label: "Stellar", tokens: ["XLM", "USDC"] },
  { id: "bitcoin", label: "Bitcoin", tokens: ["BTC"] },
  { id: "ethereum", label: "Ethereum", tokens: ["ETH", "USDC"] },
];

const TOKEN_NAMES: Record<string, string> = {
  XLM: "Stellar Lumens",
  USDC: "USD Coin",
  BTC: "Bitcoin",
  ETH: "Ethereum",
};

const CHAIN_SELECTOR_DATA: SelectorChain[] = CHAINS.map((c) => ({
  id: c.id,
  name: c.label,
  assets: c.tokens.map((symbol) => ({
    symbol,
    name: TOKEN_NAMES[symbol] ?? symbol,
    chain: c.id,
  })),
}));

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
  const { isConnected, activeChain, balance } = useUnifiedWallet();
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

  const [slippage, setSlippage] = useState(SLIPPAGE_DEFAULT);
  const [expirationMinutes, setExpirationMinutes] = useState(EXPIRATION_DEFAULT_MINUTES);

  const [riskAccepted, setRiskAccepted] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = localStorage.getItem(RISK_ACCEPTANCE_KEY);
      return stored ? JSON.parse(stored).accepted === true : false;
    } catch {
      return false;
    }
  });
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
  const isSameChain = sourceChain === destChain;
  const isAmountValid = Number.isFinite(Number(amount)) && Number(amount) > 0;
  const canSubmit = isConnected && isAmountValid && !quoteLoading && !quoteError && !isSameChain;

  // Validation messages
  const amountError = useMemo(() => {
    if (!amount) return null;
    const parsed = Number(amount);
    if (!Number.isFinite(parsed)) return "Amount must be a valid number";
    if (parsed <= 0) return "Amount must be greater than 0";
    if (walletBalance && parsed > Number(walletBalance)) return "Amount exceeds wallet balance";
    return null;
  }, [amount, walletBalance]);

  const slippageError = useMemo(() => {
    if (Number.isNaN(slippage)) return "Slippage must be a valid number";
    if (slippage < SLIPPAGE_MIN) return `Slippage must be at least ${SLIPPAGE_MIN}%`;
    if (slippage > SLIPPAGE_MAX) return `Slippage cannot exceed ${SLIPPAGE_MAX}%`;
    return null;
  }, [slippage]);

  // Inject wallet balance into the from-chain asset so ChainAssetSelector can display it (#383)
  const fromChainData = useMemo(() => {
    if (!balance || activeChain !== sourceChain) return CHAIN_SELECTOR_DATA;
    return CHAIN_SELECTOR_DATA.map((chain) =>
      chain.id !== activeChain
        ? chain
        : {
            ...chain,
            assets: chain.assets.map((asset) => ({
              ...asset,
              balance: asset.symbol === fromAsset ? balance : undefined,
            })),
          }
    );
  }, [balance, activeChain, sourceChain, fromAsset]);

  // Balance available for quick-amount shortcuts — only when wallet chain matches source chain
  const walletBalance = activeChain === sourceChain ? (balance ?? null) : null;

  const applyQuickAmount = (label: string) => {
    const bal = parseFloat(walletBalance ?? "0");
    if (!bal || bal <= 0) return;
    const multiplier = label === "Max" ? 1 : parseFloat(label) / 100;
    const raw = (bal * multiplier).toFixed(8).replace(/\.?0+$/, "");
    setAmount(raw);
  };

  const submitLabel = !isConnected
    ? "Connect Wallet to Swap"
    : !isAmountValid
      ? "Enter an Amount"
      : isSameChain
        ? "Select Different Chains"
        : quoteLoading
          ? "Fetching Quote…"
          : quoteError
            ? "Quote Unavailable"
            : "Initialize Atomic Swap";

  const handleRiskAccepted = () => {
    setRiskAccepted(true);
    setRiskModalOpen(false);
    setReviewModalOpen(true);
  };

  const handleReviewConfirm = () => {
    setIsConfirming(true);
    setReviewModalOpen(false);
    signingGenRef.current += 1;
    setSigningLifecycle(buildSigningLifecycle("sign", "active", "pending", "pending"));
    setSigningModalOpen(true);
    setIsConfirming(false);
  };

  const handleRetrySign = () => {
    signingGenRef.current += 1;
    setSigningLifecycle(buildSigningLifecycle("sign", "active", "pending", "pending"));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (!riskAccepted) {
      setRiskModalOpen(true);
      return;
    }
    setReviewModalOpen(true);
  };

  const handleSourceSelect = (chain: string, asset: string) => {
    setSourceChain(chain as ChainId);
    setFromAsset(asset);
  };

  const handleDestSelect = (chain: string, asset: string) => {
    setDestChain(chain as ChainId);
    setToAsset(asset);
  };

  useEffect(() => {
    const sourceTokens = sourceInfo?.tokens ?? [];
    if (!sourceTokens.includes(fromAsset)) setFromAsset(sourceTokens[0] ?? "");
  }, [fromAsset, sourceInfo]);

  useEffect(() => {
    const destTokens = destInfo?.tokens ?? [];
    if (!destTokens.includes(toAsset)) setToAsset(destTokens[0] ?? "");
  }, [destInfo, toAsset]);

  const requestQuote = async () => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setQuote(null);
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
      setQuoteError("Failed to fetch quote preview.");
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

  const isQuoteStale = quoteUpdatedAt ? clockMs - quoteUpdatedAt > 30000 : false;

  const toAmount = quote?.rateQuote.to_amount
    ? formatTokenAmount(quote.rateQuote.to_amount, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      })
    : "";

  return (
    <div className="mx-auto max-w-3xl">
      <FeeWarningBanner chains={[sourceChain, destChain]} />

      <Card>
        <CardHeader>
          <h1>Create Swap</h1>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <ChainAssetSelector
              chains={fromChainData}
              selectedChain={sourceChain}
              selectedAsset={fromAsset}
              onSelect={handleSourceSelect}
              label="Source Chain & Asset"
              showBalance={!!walletBalance}
            />
            <ChainAssetSelector
              chains={CHAIN_SELECTOR_DATA}
              selectedChain={destChain}
              selectedAsset={toAsset}
              onSelect={handleDestSelect}
              label="Destination Chain & Asset"
              showBalance={false}
            />
          </div>

          {isSameChain && (
            <p className="flex items-center gap-1.5 text-sm text-amber-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Source and destination chains must be different.
            </p>
          )}

          <div className="space-y-2">
            <Input
              label="Swap Amount"
              placeholder="0.00"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={amountError ?? undefined}
              hint="Enter the amount of tokens you want to swap"
            />
            <div className="flex gap-1.5" role="group" aria-label="Quick amount selectors">
              {(["25%", "50%", "75%", "Max"] as const).map((label) => (
                <button
                  key={label}
                  type="button"
                  disabled={!walletBalance}
                  onClick={() => applyQuickAmount(label)}
                  aria-label={`Set amount to ${label}`}
                  className={cn(
                    "flex-1 rounded-md py-1 text-xs font-medium transition-colors",
                    walletBalance
                      ? "bg-surface-raised text-text-secondary hover:bg-brand-500/10 hover:text-brand-500 cursor-pointer"
                      : "bg-surface text-text-muted opacity-40 cursor-not-allowed"
                  )}
                >
                  {label}
                </button>
              ))}
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
            quotedAt={quoteUpdatedAt}
          />

          <TimelockConfigurator
            sourceChain={sourceChain}
            destChain={destChain}
            timelockHours={timelockHours}
            onTimelockChange={setTimelockHours}
          />

          <SlippageExpirationControls
            slippage={slippage}
            expirationMinutes={expirationMinutes}
            onSlippageChange={setSlippage}
            onExpirationChange={setExpirationMinutes}
          />
        </CardContent>

        <CardFooter className="flex-col gap-2">
          <Button
            className="w-full"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {submitLabel}
          </Button>
          {!isConnected && (
            <p className="text-xs text-text-muted text-center">
              Connect a wallet to continue.
            </p>
          )}
        </CardFooter>
      </Card>

      <RiskDisclosureModal
        open={riskModalOpen}
        onAccept={handleRiskAccepted}
        onClose={() => setRiskModalOpen(false)}
      />

      <SwapReviewModal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onConfirm={handleReviewConfirm}
        isConfirming={isConfirming}
        swapDetails={{
          fromAsset,
          fromChain: sourceChain,
          fromAmount: amount,
          toAsset,
          toChain: destChain,
          toAmount,
          estimatedFees:
            quote?.feeBreakdown?.total_usd_estimate != null
              ? `$${quote.feeBreakdown.total_usd_estimate.toFixed(2)}`
              : "—",
          timelockHours,
          route: `${sourceChain} → ${destChain}`,
          slippage,
          expirationMinutes,
        }}
      />

      <SwapSigningModal
        open={signingModalOpen}
        onClose={() => setSigningModalOpen(false)}
        onCancel={() => setSigningModalOpen(false)}
        onRetry={handleRetrySign}
        lifecycle={signingLifecycle}
      />
    </div>
  );
}