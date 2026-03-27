import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ChainType, WalletStore } from "@/types/wallet";
import { getAdapter } from "../lib/wallets";

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      address: null,
      publicKey: null,
      chain: null,
      isConnected: false,
      isConnecting: false,
      balance: null,
      error: null,

      connect: async (chain: ChainType) => {
        set({ isConnecting: true, error: null });
        try {
          const adapter = getAdapter(chain);
          const { address, publicKey } = await adapter.connect();
          const balance = await adapter.getBalance(address);

          set({
            address,
            publicKey,
            chain,
            isConnected: true,
            isConnecting: false,
            balance,
          });
        } catch (error: any) {
          set({
            error: error.message || "Failed to connect wallet",
            isConnecting: false,
          });
          throw error;
        }
      },

      disconnect: () => {
        set({
          address: null,
          publicKey: null,
          chain: null,
          isConnected: false,
          balance: null,
          error: null,
        });
      },

      setBalance: (balance: string) => set({ balance }),
      setError: (error: string | null) => set({ error }),
    }),
    {
      name: "chainbridge-wallet",
      partialize: (state) => ({
        address: state.address,
        publicKey: state.publicKey,
        chain: state.chain,
        isConnected: state.isConnected,
      }),
    }
  )
);
