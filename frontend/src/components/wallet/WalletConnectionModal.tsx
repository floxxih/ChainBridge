"use client";

import { useMemo } from "react";
import { AlertTriangle, ChevronRight, ShieldCheck, Wallet } from "lucide-react";
import { Badge, Card, Modal } from "@/components/ui";
import { CHAIN_BG } from "@/lib/utils";
import { ChainType } from "@/types/wallet";

interface WalletConnectionModalProps {
  open: boolean;
  onClose: () => void;
  isConnecting: boolean;
  onConnect: (chain: ChainType) => void;
}

type WalletOption = {
  chain: ChainType;
  name: string;
  description: string;
  installUrl: string;
  installed: boolean;
};

function getWalletInstallState(): Record<ChainType, boolean> {
  if (typeof window === "undefined") {
    return { stellar: true, ethereum: true, bitcoin: true };
  }
  const hasFreighter = Boolean((window as any).freighterApi);
  const hasEthereum = Boolean((window as any).ethereum);
  const hasBitcoin = Boolean(
    (window as any).LeatherProvider ||
      (window as any).XverseProviders ||
      (window as any).BitcoinProvider,
  );
  return {
    stellar: hasFreighter,
    ethereum: hasEthereum,
    bitcoin: hasBitcoin,
  };
}

export function WalletConnectionModal({
  open,
  onClose,
  isConnecting,
  onConnect,
}: WalletConnectionModalProps) {
  const installState = useMemo(getWalletInstallState, [open]);
  const options: WalletOption[] = [
    {
      chain: "stellar",
      name: "Freighter",
      description: "Stellar network wallet",
      installUrl: "https://freighter.app/",
      installed: installState.stellar,
    },
    {
      chain: "ethereum",
      name: "MetaMask",
      description: "Ethereum & L2s",
      installUrl: "https://metamask.io/",
      installed: installState.ethereum,
    },
    {
      chain: "bitcoin",
      name: "Xverse / Leather",
      description: "Bitcoin wallet extensions",
      installUrl: "https://www.xverse.app/",
      installed: installState.bitcoin,
    },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Connect Wallet"
      description="Connect one wallet per chain from a single modal."
      size="sm"
    >
      <div className="grid gap-3">
        {options.map((option) => (
          <Card
            key={option.chain}
            variant="default"
            hover={option.installed}
            className="flex items-center justify-between p-4"
            onClick={() => option.installed && !isConnecting && onConnect(option.chain)}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${CHAIN_BG[option.chain]}`}
              >
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-text-primary">{option.name}</h4>
                <p className="text-xs text-text-secondary">{option.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={option.installed ? "success" : "warning"}>
                {option.installed ? "Installed" : "Missing"}
              </Badge>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </div>
          </Card>
        ))}
      </div>

      {options.some((option) => !option.installed) && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Missing wallet extension detected</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {options
                  .filter((option) => !option.installed)
                  .map((option) => (
                    <li key={option.chain}>
                      Install{" "}
                      <a
                        href={option.installUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {option.name}
                      </a>
                      .
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-start gap-3 rounded-xl bg-surface-overlay p-3 text-[11px] text-text-secondary">
        <ShieldCheck className="h-4 w-4 shrink-0 text-brand-500" />
        <p>
          ChainBridge is non-custodial. Keys remain in your wallet and every action is signed
          locally.
        </p>
      </div>
    </Modal>
  );
}
