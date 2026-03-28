"use client";

import { Badge, Button, Card, CardContent, CardHeader } from "@/components/ui";
import type { GovernanceProposal, LiquidityPool, ReferralCampaign } from "@/types";
import { Coins, Gauge, GitBranchPlus, Share2, Vote } from "lucide-react";
import type { ReactNode } from "react";

const PROPOSALS: GovernanceProposal[] = [
  {
    id: "GP-80",
    title: "Move protocol parameters under DAO control",
    proposer: "0x8e4a...1f19",
    status: "active",
    participation: "24.8%",
    executableAt: "In 2 days",
  },
  {
    id: "GP-81",
    title: "Lower routing fee for deep pools",
    proposer: "0x4bd2...98c1",
    status: "succeeded",
    participation: "38.2%",
    executableAt: "Queued",
  },
];

const POOLS: LiquidityPool[] = [
  { id: "1", pair: "XLM/USDC", tvl: "$1.24M", apr: "14.2%", feeTier: "0.30%", utilization: "68%" },
  { id: "2", pair: "BTC/ETH", tvl: "$860K", apr: "17.8%", feeTier: "0.50%", utilization: "54%" },
];

const REFERRALS: ReferralCampaign[] = [
  { code: "FROST", referrals: 18, rewards: "$412", conversionRate: "22%" },
  { code: "BRIDGEUP", referrals: 9, rewards: "$177", conversionRate: "16%" },
];

const ORDER_MODES = [
  "Limit orders with conditional execution",
  "TWAP scheduling for large swaps",
  "Partial fill controls and amendments",
  "Expiry windows and stop-loss triggers",
];

export default function ProtocolPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="info" className="mb-3">
            Roadmap Foundations
          </Badge>
          <h1 className="text-3xl font-bold text-text-primary md:text-5xl">
            Protocol Control Room
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-text-secondary md:text-base">
            Governance, liquidity routing, advanced order controls, and referral growth surfaces in
            a single operator view.
          </p>
        </div>
        <div className="flex gap-3">
          <Button className="rounded-xl">Launch Governance</Button>
          <Button variant="secondary" className="rounded-xl">
            Create Referral Campaign
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <MetricCard
          icon={<Vote className="h-5 w-5" />}
          label="Active Proposals"
          value="2"
          detail="1 queued for execution"
        />
        <MetricCard
          icon={<Coins className="h-5 w-5" />}
          label="Pool TVL"
          value="$2.10M"
          detail="Across instant-routing pools"
        />
        <MetricCard
          icon={<GitBranchPlus className="h-5 w-5" />}
          label="Order Modes"
          value="4"
          detail="Limit, TWAP, stop, partial fill"
        />
        <MetricCard
          icon={<Share2 className="h-5 w-5" />}
          label="Referral Revenue"
          value="$589"
          detail="This epoch from tracked swaps"
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card variant="raised">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Governance Queue</h2>
              <p className="text-sm text-text-secondary">
                Token holders can propose, delegate, vote, and execute passed changes.
              </p>
            </div>
            <Badge variant="success">DAO Ready</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {PROPOSALS.map((proposal) => (
              <div
                key={proposal.id}
                className="rounded-2xl border border-border bg-surface-overlay/40 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{proposal.title}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      {proposal.id} by {proposal.proposer}
                    </p>
                  </div>
                  <Badge variant={proposal.status === "active" ? "info" : "success"}>
                    {proposal.status}
                  </Badge>
                </div>
                <div className="mt-3 flex gap-6 text-xs text-text-secondary">
                  <span>Participation: {proposal.participation}</span>
                  <span>Execution: {proposal.executableAt}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <h2 className="text-xl font-semibold text-text-primary">Advanced Order Stack</h2>
            <p className="text-sm text-text-secondary">
              Extend the existing swap flow with richer execution intent.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {ORDER_MODES.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-border bg-background/50 px-4 py-3 text-sm text-text-secondary"
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card variant="raised">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Liquidity Routing</h2>
              <p className="text-sm text-text-secondary">
                Fallback AMM pools backstop the order book when direct liquidity thins out.
              </p>
            </div>
            <Gauge className="h-5 w-5 text-brand-500" />
          </CardHeader>
          <CardContent className="space-y-3">
            {POOLS.map((pool) => (
              <div
                key={pool.id}
                className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface-overlay/40 p-4 text-sm md:grid-cols-5"
              >
                <span className="font-semibold text-text-primary">{pool.pair}</span>
                <span className="text-text-secondary">TVL {pool.tvl}</span>
                <span className="text-text-secondary">APR {pool.apr}</span>
                <span className="text-text-secondary">Fee {pool.feeTier}</span>
                <span className="text-text-secondary">Utilization {pool.utilization}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <h2 className="text-xl font-semibold text-text-primary">Referral Analytics</h2>
            <p className="text-sm text-text-secondary">
              Shareable swap links, tracked conversions, and reward visibility for growth loops.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {REFERRALS.map((campaign) => (
              <div
                key={campaign.code}
                className="flex items-center justify-between rounded-2xl border border-border bg-background/50 px-4 py-4"
              >
                <div>
                  <p className="font-semibold text-text-primary">{campaign.code}</p>
                  <p className="text-xs text-text-muted">
                    {campaign.referrals} successful referrals
                  </p>
                </div>
                <div className="text-right text-sm text-text-secondary">
                  <p>{campaign.rewards}</p>
                  <p>{campaign.conversionRate} conversion</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card variant="glass" className="p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-text-primary">{value}</p>
      <p className="mt-2 text-sm text-text-secondary">{detail}</p>
    </Card>
  );
}
