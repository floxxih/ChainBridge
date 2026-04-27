"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowRightLeft, Info, Settings, Share2, Vote, Waves } from "lucide-react";

import { Badge, Button, Card, CardContent, CardFooter, CardHeader, Input } from "@/components/ui";

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

  const [slippage, setSlippage] = useState(SLIPPAGE_DEFAULT);
  const [expirationMinutes, setExpirationMinutes] = useState(EXPIRATION_DEFAULT_MINUTES);

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

  const isQuoteStale = quoteUpdatedAt ? clockMs - quoteUpdatedAt > 30000 : false;

  const toAmount = quote?.rateQuote.to_amount
    ? formatTokenAmount(quote.rateQuote.to_amount, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      })
    : "";

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <FeeWarningBanner chains={[sourceChain, destChain]} />

      <Card>
        <CardHeader>
          <h1>Create Swap</h1>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            placeholder="0.00"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

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

          <SlippageExpirationControls
            slippage={slippage}
            expirationMinutes={expirationMinutes}
            onSlippageChange={setSlippage}
            onExpirationChange={setExpirationMinutes}
          />
        </CardContent>

        <CardFooter>
          <Button className="w-full">Initialize Atomic Swap</Button>
        </CardFooter>
      </Card>
    </div>
  );
}