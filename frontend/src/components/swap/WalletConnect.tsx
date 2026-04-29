"use client";

import { useState } from "react";
import { useToast } from "@/hooks/useToast";
import { Button, Badge } from "@/components/ui";
import { Wallet, LogOut, AlertTriangle } from "lucide-react";
import { truncateAddress, formatAmount } from "@/lib/utils";
import { ChainType } from "@/types/wallet";
import config from "@/lib/config";
import { WalletConnectionModal } from "@/components/wallet/WalletConnectionModal";
import { useUnifiedWallet } from "@/components/wallet/UnifiedWalletProvider";

function formatNetworkLabel(network: string | null | undefined): string {
  if (!network) return "Network unavailable";

  if (network.startsWith("chain:")) {
    const chainId = Number.parseInt(network.split(":")[1] || "", 10);
    if (chainId === 1) return "Ethereum Mainnet";
    if (chainId === 11155111) return "Sepolia";
    return `Chain ${chainId}`;
  }

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
    error,
  } = useUnifiedWallet();
  const [isOpen, setIsOpen] = useState(false);
  const toast = useToast();

  const networkLabel = formatNetworkLabel(network);
  const expectedNetworkLabel = formatNetworkLabel(config.stellar.network);
  const expectedEthereumLabel =
    config.ethereum.network === "mainnet" ? "Ethereum Mainnet" : "Sepolia";

  const handleConnect = async (targetChain: ChainType) => {
    try {
      await connectByChain(targetChain);

      if (isUnsupportedNetwork) {
        toast.warning(
          targetChain === "stellar"
            ? "Unsupported Stellar network"
            : "Unsupported Ethereum network",
          targetChain === "stellar"
            ? `Switch Freighter to ${expectedNetworkLabel} to continue with ChainBridge.`
            : `Switch MetaMask to ${expectedEthereumLabel} to continue with ChainBridge.`
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
      toast.error("Wallet connection failed", e instanceof Error ? e.message : "Please try again.");
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
            {activeChain === "ethereum" && (
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
        {activeChain === "ethereum" && isUnsupportedNetwork && (
          <div className="flex max-w-xs items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              MetaMask is connected to {networkLabel}. Switch to {expectedEthereumLabel} to use
              ChainBridge on the supported Ethereum network.
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

      <WalletConnectionModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        isConnecting={isConnecting}
        onConnect={handleConnect}
      />
      {error && (
        <p className="mt-2 max-w-xs text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
