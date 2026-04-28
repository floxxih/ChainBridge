import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ChainType, WalletStore } from "@/types/wallet";
import { getAdapter } from "../lib/wallets";
import config from "@/lib/config";

const EXPECTED_ETH_CHAIN_ID = config.ethereum.network === "mainnet" ? 1 : 11155111;

let ethereumAccountsListener: ((accounts: string[]) => void) | null = null;
let ethereumChainListener: ((chainIdHex: string) => void) | null = null;
let ethereumDisconnectListener: ((info: { reason: string }) => void) | null = null;
let unisatAccountsListener: ((accounts: string[]) => void) | null = null;

function detachEthereumListeners() {
  if (typeof window === "undefined" || !window.ethereum) return;
  if (ethereumAccountsListener) {
    window.ethereum.removeListener?.("accountsChanged", ethereumAccountsListener);
    ethereumAccountsListener = null;
  }
  if (ethereumChainListener) {
    window.ethereum.removeListener?.("chainChanged", ethereumChainListener);
    ethereumChainListener = null;
  }
  if (ethereumDisconnectListener) {
    window.ethereum.removeListener?.("disconnect", ethereumDisconnectListener);
    ethereumDisconnectListener = null;
  }
}

function detachUnisatListeners() {
  if (typeof window === "undefined" || !window.unisat) return;
  if (unisatAccountsListener) {
    window.unisat.removeListener?.("accountsChanged", unisatAccountsListener);
    unisatAccountsListener = null;
  }
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      address: null,
      publicKey: null,
      chain: null,
      network: null,
      walletName: null,
      isUnsupportedNetwork: false,
      isConnected: false,
      isConnecting: false,
      balance: null,
      error: null,

      connect: async (chain: ChainType) => {
        set({ isConnecting: true, error: null });
        try {
          if (chain === "ethereum") {
            detachEthereumListeners();
          }
          if (chain === "bitcoin") {
            detachUnisatListeners();
          }

          const adapter = getAdapter(chain);
          const { address, publicKey, network, walletName, isUnsupportedNetwork } =
            await adapter.connect();
          const balance = await adapter.getBalance(address);

          set({
            address,
            publicKey,
            chain,
            network: network ?? null,
            walletName: walletName ?? null,
            isUnsupportedNetwork: Boolean(isUnsupportedNetwork),
            isConnected: true,
            isConnecting: false,
            balance,
          });

          if (chain === "ethereum" && typeof window !== "undefined" && window.ethereum) {
            ethereumAccountsListener = (accounts: string[]) => {
              const currentState = useWalletStore.getState();
              const nextAddress = accounts[0] ?? null;

              if (!nextAddress) {
                void useWalletStore.getState().disconnect();
                return;
              }

              if (currentState.address && currentState.address !== nextAddress) {
                void useWalletStore.getState().disconnect();
                return;
              }

              set({
                address: nextAddress,
                publicKey: nextAddress,
              });
              void adapter
                .getBalance(nextAddress)
                .then((nextBalance) => set({ balance: nextBalance }))
                .catch(() => {
                  // No-op to avoid forcing disconnect on transient RPC failures.
                });
            };

            ethereumChainListener = (chainIdHex: string) => {
              const chainId = Number.parseInt(chainIdHex, 16);
              set({
                network: `chain:${chainId}`,
                isUnsupportedNetwork: chainId !== EXPECTED_ETH_CHAIN_ID,
              });
            };

            ethereumDisconnectListener = (info: { reason: string }) => {
              void useWalletStore.getState().disconnect();
            };

            window.ethereum.on?.("accountsChanged", ethereumAccountsListener);
            window.ethereum.on?.("chainChanged", ethereumChainListener);
            window.ethereum.on?.("disconnect", ethereumDisconnectListener);
          }

          if (chain === "bitcoin" && typeof window !== "undefined" && window.unisat) {
            unisatAccountsListener = (accounts: string[]) => {
              const currentState = useWalletStore.getState();
              const nextAddress = accounts[0] ?? null;

              if (!nextAddress) {
                void useWalletStore.getState().disconnect();
                return;
              }

              if (currentState.address && currentState.address !== nextAddress) {
                void useWalletStore.getState().disconnect();
                return;
              }

              set({
                address: nextAddress,
                publicKey: nextAddress,
              });
              void adapter
                .getBalance(nextAddress)
                .then((nextBalance) => set({ balance: nextBalance }))
                .catch(() => {
                  // No-op to avoid forcing disconnect on transient RPC failures.
                });
            };

            window.unisat.on?.("accountsChanged", unisatAccountsListener);
          }
        } catch (error: any) {
          set({
            error: error.message || "Failed to connect wallet",
            isConnecting: false,
          });
          throw error;
        }
      },

      disconnect: async () => {
        const { chain } = get();
        if (chain) {
          if (chain === "ethereum") {
            detachEthereumListeners();
          }
          if (chain === "bitcoin") {
            detachUnisatListeners();
          }
          await getAdapter(chain).disconnect();
        }

        set({
          address: null,
          publicKey: null,
          chain: null,
          network: null,
          walletName: null,
          isUnsupportedNetwork: false,
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
        network: state.network,
        walletName: state.walletName,
        isUnsupportedNetwork: state.isUnsupportedNetwork,
        isConnected: state.isConnected,
      }),
    }
  )
);
