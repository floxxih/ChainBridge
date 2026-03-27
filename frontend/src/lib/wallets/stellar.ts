import freighter from "@stellar/freighter-api";
const { isConnected, getPublicKey, signTransaction } = freighter;

import { Horizon } from "@stellar/stellar-sdk";
import { WalletAdapter } from "@/types/wallet";
import config from "@/lib/config";

export class StellarAdapter implements WalletAdapter {
  private horizon: Horizon.Server;

  constructor() {
    this.horizon = new Horizon.Server(config.stellar.horizonUrl);
  }

  async connect() {
    const connected = await isConnected();
    if (!connected) {
      throw new Error("Freighter wallet not found or disconnected");
    }

    const publicKey = await getPublicKey();
    if (!publicKey) {
      throw new Error("Failed to get Stellar public key");
    }

    return { address: publicKey, publicKey };
  }

  async disconnect() {
    // Freighter doesn't have a programmatic disconnect
  }

  async signTransaction(tx: any) {
    const signedTx = await signTransaction(tx.toXDR(), {
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
