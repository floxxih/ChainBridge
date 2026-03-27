"use client";

import { useState } from "react";
import { useWalletStore } from "@/hooks/useWallet";
import { Button, Modal, Badge, Card } from "@/components/ui";
import { Wallet, LogOut, ChevronRight, ShieldCheck } from "lucide-react";
import { truncateAddress, CHAIN_BG } from "@/lib/utils";
import { ChainType } from "@/types/wallet";

export function WalletConnect() {
  const { address, chain, isConnected, isConnecting, connect, disconnect, balance } =
    useWalletStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleConnect = async (targetChain: ChainType) => {
    try {
      await connect(targetChain);
      setIsOpen(false);
    } catch (e) {
      console.error("Connection failed", e);
    }
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden flex-col items-end sm:flex">
          <span className="text-xs font-medium text-text-primary">
            {balance ? `${parseFloat(balance).toFixed(4)} ${chain?.toUpperCase()}` : "..."}
          </span>
          <span className="text-[10px] text-text-muted">{truncateAddress(address)}</span>
        </div>
        <Badge variant="chain" chain={chain || ""}>
          {chain?.toUpperCase()}
        </Badge>
        <Button
          variant="secondary"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={disconnect}
          title="Disconnect Wallet"
        >
          <LogOut className="h-4 w-4" />
        </Button>
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
            description="Stellar Network"
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
