"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useWalletStore } from "@/hooks/useWallet";
import { ChainType } from "@/types/wallet";

type WalletChainSnapshot = {
  address: string | null;
  isConnected: boolean;
};

type UnifiedWalletContextValue = {
  activeChain: ChainType | null;
  activeAddress: string | null;
  isConnected: boolean;
  chains: Record<ChainType, WalletChainSnapshot>;
  isConnecting: boolean;
  isUnsupportedNetwork: boolean;
  network: string | null;
  walletName: string | null;
  balance: string | null;
  error: string | null;
  connectByChain: (chain: ChainType) => Promise<void>;
  disconnectActiveWallet: () => Promise<void>;
};

const WalletContext = createContext<UnifiedWalletContextValue | null>(null);

export function UnifiedWalletProvider({ children }: { children: ReactNode }) {
  const wallet = useWalletStore();

  useEffect(() => {
    if (!wallet.isConnected || !wallet.chain) return;
    void wallet.connect(wallet.chain).catch(() => {
      // Session restore is best-effort and should not block app hydration.
    });
    // Restore once on mount from persisted values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<UnifiedWalletContextValue>(
    () => ({
      activeChain: wallet.chain,
      activeAddress: wallet.address,
      isConnected: wallet.isConnected,
      chains: {
        stellar: {
          address: wallet.chain === "stellar" ? wallet.address : null,
          isConnected: wallet.chain === "stellar" && wallet.isConnected,
        },
        ethereum: {
          address: wallet.chain === "ethereum" ? wallet.address : null,
          isConnected: wallet.chain === "ethereum" && wallet.isConnected,
        },
        bitcoin: {
          address: wallet.chain === "bitcoin" ? wallet.address : null,
          isConnected: wallet.chain === "bitcoin" && wallet.isConnected,
        },
      },
      isConnecting: wallet.isConnecting,
      isUnsupportedNetwork: wallet.isUnsupportedNetwork,
      network: wallet.network,
      walletName: wallet.walletName,
      balance: wallet.balance,
      error: wallet.error,
      connectByChain: wallet.connect,
      disconnectActiveWallet: wallet.disconnect,
    }),
    [wallet]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useUnifiedWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useUnifiedWallet must be used within UnifiedWalletProvider");
  }
  return context;
}
