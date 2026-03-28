import Link from "next/link";
import { Button, Card, Badge } from "@/components/ui";
import {
  ArrowRightLeft,
  ShieldCheck,
  Zap,
  Coins,
  ArrowRight,
  ChevronRight,
  Globe,
  Lock,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-32 md:pb-40">
        <div className="absolute inset-0 z-0 bg-hero-grid opacity-[0.03] dark:opacity-[0.07]" />
        <div className="absolute -top-[10%] -left-[10%] h-[50%] w-[50%] animate-pulse-glow rounded-full bg-brand-500/10 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] h-[40%] w-[40%] animate-pulse-glow rounded-full bg-indigo-500/10 blur-[120px] delay-1000" />

        <div className="container relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <Badge variant="info" className="mb-6 animate-fade-in py-1 pl-1 pr-3">
              <span className="mr-2 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                Alpha
              </span>
              ChainBridge v0.1 is live on Testnet
            </Badge>

            <h1 className="animate-slide-up text-balance text-5xl font-extrabold tracking-tight text-text-primary sm:text-7xl">
              Cross-Chain Swaps, <br />
              <span className="text-gradient">No Intermediaries.</span>
            </h1>

            <p className="mt-8 max-w-2xl animate-fade-in text-lg leading-relaxed text-text-secondary [animation-delay:200ms]">
              Experience the future of decentralized finance with trustless, atomic swaps powered by
              HTLCs. Securely trade assets between Stellar, Bitcoin, and Ethereum with zero
              counterparty risk.
            </p>

            <div className="mt-10 flex animate-fade-in flex-wrap items-center justify-center gap-4 [animation-delay:400ms]">
              <Link href="/swap">
                <Button size="lg" className="rounded-2xl px-8 shadow-glow-md">
                  Launch Swap Wizard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/protocol">
                <Button variant="outline" size="lg" className="rounded-2xl px-8">
                  Explore Protocol
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="secondary" size="lg" className="rounded-2xl px-8">
                  How it Works
                </Button>
              </Link>
            </div>

            {/* Ecosystem Stats */}
            <div className="mt-20 grid w-full max-w-4xl grid-cols-2 gap-4 md:grid-cols-4 animate-fade-in [animation-delay:600ms]">
              <Stat label="Total Volume" value="$2.4M+" />
              <Stat label="Avg. Speed" value="~1.5m" />
              <Stat label="Chain Support" value="3+" />
              <Stat label="Security Audit" value="Verifying" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-surface/30 py-24">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-text-primary sm:text-4xl">
              Engineered for Sovereignty
            </h2>
            <p className="mt-4 text-text-secondary">
              Non-custodial by design. Built with industry-standard primitives.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <FeatureCard
              icon={<Lock className="h-6 w-6 text-brand-500" />}
              title="Self-Custody"
              description="Your keys never leave your device. All transactions are signed locally using your preferred wallet."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-6 w-6 text-indigo-500" />}
              title="Atomic Guarantees"
              description="Hash Time-Locked Contracts ensure that either both parties receive their assets, or both are refunded."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6 text-amber-500" />}
              title="Ultra Low Fees"
              description="Leverage Stellar's high-speed network for settlement, reducing cross-chain bridging costs by up to 90%."
            />
            <FeatureCard
              icon={<Coins className="h-6 w-6 text-emerald-500" />}
              title="Roadmap Foundations"
              description="Governance, fallback liquidity pools, advanced orders, and referral growth tooling now have dedicated product surfaces."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Card
            variant="glow"
            className="flex flex-col items-center gap-8 overflow-hidden p-8 text-center md:flex-row md:p-12 md:text-left"
          >
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-text-primary">Ready to cross the bridge?</h2>
              <p className="mt-4 text-text-secondary">
                Connect your wallet and start swapping assets instantly across major blockchain
                networks.
              </p>
              <div className="mt-8">
                <Link href="/swap">
                  <Button variant="primary" size="lg" className="rounded-xl">
                    Connect and Swap <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative h-48 w-48 shrink-0 md:h-64 md:w-64">
              <div className="absolute inset-0 animate-spin-slow rounded-full border-2 border-dashed border-brand-500/20" />
              <div className="absolute inset-4 animate-reverse-spin rounded-full border-2 border-dashed border-indigo-500/20" />
              <div className="flex h-full w-full items-center justify-center">
                <ArrowRightLeft className="h-20 w-20 text-brand-500/40" />
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-raised border border-border p-6 text-center">
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-xs font-medium text-text-muted uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card
      variant="glass"
      className="p-8 transition-all hover:border-brand-500/50 hover:shadow-glow-sm"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-overlay border border-border">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-text-primary">{title}</h3>
      <p className="mt-4 text-sm leading-relaxed text-text-secondary">{description}</p>
    </Card>
  );
}
