import freighter from "@stellar/freighter-api";
import { Horizon } from "@stellar/stellar-sdk";
import { WalletAdapter } from "@/types/wallet";
import config from "@/lib/config";

type FreighterApi = {
  isConnected?: () => Promise<boolean | { isConnected?: boolean; error?: string }>;
  isAllowed?: () => Promise<boolean>;
  setAllowed?: () => Promise<boolean>;
  getPublicKey?: () => Promise<string>;
  getNetwork?: () => Promise<string | { network?: string; networkPassphrase?: string }>;
  signTransaction?: (xdr: string, options: { network: string }) => Promise<any>;
};

const freighterApi = freighter as FreighterApi;

function normalizeNetwork(network: string | null | undefined): string | null {
  if (!network) return null;

  const value = network.toLowerCase();
  if (value.includes("public") || value.includes("mainnet")) return "mainnet";
  if (value.includes("testnet")) return "testnet";
  if (value.includes("future")) return "futurenet";

  return value;
}

export class StellarAdapter implements WalletAdapter {
  private horizon: Horizon.Server;

  constructor() {
    this.horizon = new Horizon.Server(config.stellar.horizonUrl);
  }

  async connect() {
    if (!freighterApi.getPublicKey) {
      throw new Error("Freighter wallet not found");
    }

    const connectionState = await freighterApi.isConnected?.();
    const extensionConnected =
      typeof connectionState === "boolean"
        ? connectionState
        : Boolean(connectionState?.isConnected);

    if (!extensionConnected) {
      throw new Error("Freighter extension is not available");
    }

    if (freighterApi.isAllowed && freighterApi.setAllowed) {
      const isAllowed = await freighterApi.isAllowed();
      if (!isAllowed) {
        const approved = await freighterApi.setAllowed();
        if (!approved) {
          throw new Error("Freighter connection request was declined");
        }
      }
    }

    const publicKey = await freighterApi.getPublicKey();
    if (!publicKey) {
      throw new Error("Failed to get Stellar public key");
    }

    const networkResult = await freighterApi.getNetwork?.();
    const network =
      typeof networkResult === "string"
        ? normalizeNetwork(networkResult)
        : normalizeNetwork(networkResult?.network || networkResult?.networkPassphrase);

    return {
      address: publicKey,
      publicKey,
      network,
      walletName: "Freighter",
      isUnsupportedNetwork: Boolean(network && network !== config.stellar.network),
    };
  }

  async disconnect() {
    // Freighter doesn't have a programmatic disconnect
  }

  async signTransaction(tx: any) {
    if (!freighterApi.signTransaction) {
      throw new Error("Freighter signing is unavailable");
    }

    const signedTx = await freighterApi.signTransaction(tx.toXDR(), {
      network: config.stellar.network.toUpperCase(),
    });
    return signedTx;
  }

  async getBalance(address: string) {
    try {
      const account = await this.horizon.loadAccount(address);
      const nativeBalance = account.balances.find((b) => b.asset_type === "native");
      return nativeBalance?.balance || "0";
    } catch (e) {
      console.error("Failed to fetch Stellar balance", e);
      return "0";
    }
  }
}
