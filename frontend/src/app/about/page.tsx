import { Card, Badge, Button } from "@/components/ui";
import { Info, ShieldCheck, Zap, Globe, Layers, ArrowRight } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 md:py-20 animate-fade-in">
      <div className="text-center mb-16">
        <Badge variant="info" className="mb-4">
          The Protocol
        </Badge>
        <h1 className="text-4xl font-extrabold text-text-primary sm:text-5xl">
          Trustless Interoperability.
        </h1>
        <p className="mt-6 text-lg text-text-secondary leading-relaxed max-w-2xl mx-auto">
          ChainBridge eliminates the need for trusted intermediaries, centralized exchanges, or
          wrapped assets by leveraging Hash Time-Locked Contracts (HTLCs) for direct cross-chain
          settlement.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Layers className="h-6 w-6 text-brand-500" />
            Core Architecture
          </h2>
          <p className="text-text-secondary leading-relaxed">
            The platform acts as a coordinated gateway between multiple blockchains. It uses a
            2-step commitment process to ensure atomicity:
          </p>
          <ul className="space-y-4">
            <Step
              number="1"
              title="Funding"
              text="The initiator locks assets on the source chain with a hash-lock and timelock."
            />
            <Step
              number="2"
              title="Redemption"
              text="The recipient locks assets on the destination chain using the same hash-lock."
            />
            <Step
              number="3"
              title="Completion"
              text="Once the initiator claims the destination funds by revealing the secret, the recipient can claim the source funds."
            />
          </ul>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-brand-500" />
            Security Principles
          </h2>
          <Card className="p-6 space-y-4">
            <div className="flex gap-4">
              <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
                <Zap className="h-4 w-4" />
              </div>
              <p className="text-sm text-text-secondary">
                <span className="font-bold text-text-primary">Atomic Settlement:</span> Either both
                transactions succeed or both timeout and refund.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
                <Globe className="h-4 w-4" />
              </div>
              <p className="text-sm text-text-secondary">
                <span className="font-bold text-text-primary">Network Integration:</span> Native
                support for Stellar Soroban, Bitcoin PSBTs, and Ethereum EVM.
              </p>
            </div>
          </Card>

          <Card variant="glass" className="p-8 text-center border-brand-500/20">
            <h3 className="text-xl font-bold text-text-primary mb-4">Open Source</h3>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              Transparency is at our core. Review our contracts, frontend, and relayer
              implementation on GitHub.
            </p>
            <Button variant="secondary" className="w-full">
              <Globe className="mr-2 h-4 w-4" />
              View Repository
            </Button>
          </Card>
        </section>
      </div>
    </div>
  );
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <li className="flex gap-4">
      <div className="flex h-8 w-8 font-display shrink-0 items-center justify-center rounded-lg bg-surface-overlay border border-border text-xs font-bold text-brand-500">
        {number}
      </div>
      <div>
        <h4 className="font-bold text-text-primary">{title}</h4>
        <p className="text-sm text-text-secondary mt-1">{text}</p>
      </div>
    </li>
  );
}
