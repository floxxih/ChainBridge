"use client";

import { useState } from "react";
import { useToast } from "@/hooks/useToast";
import { Button, Modal, Badge, Card } from "@/components/ui";
import { Wallet, LogOut, ChevronRight, ShieldCheck, AlertTriangle } from "lucide-react";
import { truncateAddress, CHAIN_BG, formatAmount } from "@/lib/utils";
import { ChainType } from "@/types/wallet";
import config from "@/lib/config";
import { useUnifiedWallet } from "@/components/wallet/UnifiedWalletProvider";

function formatNetworkLabel(network: string | null | undefined): string {
  if (!network) return "Network unavailable";

  switch (network) {
    case "mainnet":
      return "Mainnet";
    case "testnet":
      return "Testnet";
    case "futurenet":
      return "Futurenet";
    default:
      return network.charAt(0).toUpperCase() + network.slice(1);
  }
}

export function WalletConnect() {
  const {
    activeAddress,
    activeChain,
    network,
    walletName,
    isUnsupportedNetwork,
    isConnected,
    isConnecting,
    connectByChain,
    disconnectActiveWallet,
    balance,
  } = useUnifiedWallet();
  const [isOpen, setIsOpen] = useState(false);
  const toast = useToast();

  const networkLabel = formatNetworkLabel(network);
  const expectedNetworkLabel = formatNetworkLabel(config.stellar.network);

  const handleConnect = async (targetChain: ChainType) => {
    try {
      await connectByChain(targetChain);

      if (targetChain === "stellar" && isUnsupportedNetwork) {
        toast.warning(
          "Unsupported Stellar network",
          `Switch Freighter to ${expectedNetworkLabel} to continue with ChainBridge.`
        );
      } else {
        toast.success(
          "Wallet connected",
          targetChain === "stellar"
            ? `${walletName || "Freighter"} connected on ${formatNetworkLabel(network)}.`
            : "Your wallet is ready to use."
        );
      }

      setIsOpen(false);
    } catch (e) {
      console.error("Connection failed", e);
      toast.error(
        "Wallet connection failed",
        e instanceof Error ? e.message : "Please try again."
      );
    }
  };

  if (isConnected && activeAddress) {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <div className="hidden flex-col items-end sm:flex">
            <span className="text-xs font-medium text-text-primary">
              {balance ? `${formatAmount(balance, 4)} ${activeChain?.toUpperCase()}` : "..."}
            </span>
            <span className="text-[10px] text-text-muted">
              {`${walletName || activeChain?.toUpperCase()} | ${truncateAddress(activeAddress)}`}
            </span>
            {activeChain === "stellar" && (
              <span className="text-[10px] text-text-muted">Network: {networkLabel}</span>
            )}
          </div>
          <Badge variant="chain" chain={activeChain || ""}>
            {activeChain?.toUpperCase()}
          </Badge>
          {activeChain === "stellar" && (
            <Badge variant={isUnsupportedNetwork ? "warning" : "info"}>{networkLabel}</Badge>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => void disconnectActiveWallet()}
            title="Disconnect Wallet"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {activeChain === "stellar" && isUnsupportedNetwork && (
          <div className="flex max-w-xs items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Freighter is connected to {networkLabel}. Switch to {expectedNetworkLabel} to use
              ChainBridge on the supported Stellar network.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        loading={isConnecting}
        icon={<Wallet className="h-4 w-4" />}
        size="sm"
      >
        Connect Wallet
      </Button>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Connect Wallet"
        description="Select a network to connect your preferred wallet."
        size="sm"
      >
        <div className="grid gap-3">
          <WalletOption
            chain="stellar"
            name="Freighter"
            description={`Stellar ${expectedNetworkLabel}`}
            onClick={() => handleConnect("stellar")}
          />
          <WalletOption
            chain="ethereum"
            name="MetaMask"
            description="Ethereum & L2s"
            onClick={() => handleConnect("ethereum")}
          />
          <WalletOption
            chain="bitcoin"
            name="Xverse / Leather"
            description="Bitcoin Network"
            onClick={() => handleConnect("bitcoin")}
          />
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl bg-surface-overlay p-3 text-[11px] text-text-secondary">
          <ShieldCheck className="h-4 w-4 shrink-0 text-brand-500" />
          <p>
            ChainBridge is non-custodial. Your keys never leave your wallet, and transactions are
            signed locally.
          </p>
        </div>
      </Modal>
    </>
  );
}

function WalletOption({
  chain,
  name,
  description,
  onClick,
}: {
  chain: string;
  name: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <Card
      variant="default"
      hover
      className="flex items-center justify-between p-4"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${CHAIN_BG[chain]}`}>
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-text-primary">{name}</h4>
          <p className="text-xs text-text-secondary">{description}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-text-muted" />
    </Card>
  );
}
