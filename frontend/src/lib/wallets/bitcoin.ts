import { getAddress, signTransaction } from "sats-connect";
import { WalletAdapter, WalletConnection } from "@/types/wallet";
import config from "@/lib/config";

// Internal interface implemented by each Bitcoin wallet provider
interface BitcoinProviderAdapter {
  isAvailable(): boolean;
  connect(): Promise<WalletConnection>;
  disconnect(): Promise<void>;
  signTransaction(tx: any): Promise<any>;
  getBalance(address: string): Promise<string>;
}

// ─── Shared helper ────────────────────────────────────────────────────────────

async function fetchMempoolBalance(address: string): Promise<string> {
  try {
    const network = config.bitcoin.network === "mainnet" ? "" : "testnet/";
    const res = await fetch(`https://mempool.space/${network}api/address/${address}`);
    const data = await res.json();
    const satoshis = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
    return (satoshis / 100_000_000).toString();
  } catch {
    return "0";
  }
}

// ─── Xverse adapter (via sats-connect) ───────────────────────────────────────

class XverseProviderAdapter implements BitcoinProviderAdapter {
  isAvailable(): boolean {
    return (
      typeof window !== "undefined" &&
      Boolean((window as any).XverseProviders || (window as any).BitcoinProvider)
    );
  }

  async connect(): Promise<WalletConnection> {
    return new Promise((resolve, reject) => {
      getAddress({
        payload: {
          purposes: ["ordinals", "payment"] as any,
          message: "Connect to ChainBridge",
          network: {
            type: (config.bitcoin.network === "mainnet" ? "Mainnet" : "Testnet") as any,
          },
        },
        onFinish: (response) => {
          const paymentAccount = response.addresses.find((a) => a.purpose === "payment");
          if (!paymentAccount) {
            reject(new Error("No payment address found"));
            return;
          }
          resolve({
            address: paymentAccount.address,
            publicKey: paymentAccount.publicKey,
            walletName: "Xverse",
          });
        },
        onCancel: () => reject(new Error("Connection cancelled")),
      });
    });
  }

  async disconnect(): Promise<void> {}

  async signTransaction(tx: any): Promise<any> {
    return new Promise((resolve, reject) => {
      signTransaction({
        payload: {
          network: {
            type: (config.bitcoin.network === "mainnet" ? "Mainnet" : "Testnet") as any,
          },
          psbtBase64: tx.psbtBase64,
          inputsToSign: tx.inputsToSign,
        } as any,
        onFinish: (response) => resolve(response),
        onCancel: () => reject(new Error("Signing cancelled")),
      });
    });
  }

  async getBalance(address: string): Promise<string> {
    return fetchMempoolBalance(address);
  }
}

// ─── Unisat adapter (window.unisat) ──────────────────────────────────────────

declare global {
  interface Window {
    unisat?: {
      requestAccounts: () => Promise<string[]>;
      getPublicKey: () => Promise<string>;
      getBalance: () => Promise<{ total: number; confirmed: number; unconfirmed: number }>;
      signPsbt: (psbtHex: string, options?: any) => Promise<string>;
    };
  }
}

class UnisatProviderAdapter implements BitcoinProviderAdapter {
  isAvailable(): boolean {
    return typeof window !== "undefined" && Boolean(window.unisat);
  }

  async connect(): Promise<WalletConnection> {
    if (!window.unisat) throw new Error("Unisat wallet not found");
    const accounts = await window.unisat.requestAccounts();
    if (!accounts[0]) throw new Error("No address returned from Unisat");
    const publicKey = await window.unisat.getPublicKey();
    return { address: accounts[0], publicKey, walletName: "Unisat" };
  }

  async disconnect(): Promise<void> {}

  async signTransaction(tx: any): Promise<any> {
    if (!window.unisat) throw new Error("Unisat wallet not found");
    const psbtHex = Buffer.from(tx.psbtBase64, "base64").toString("hex");
    return window.unisat.signPsbt(psbtHex, { autoFinalized: false });
  }

  async getBalance(address: string): Promise<string> {
    if (window.unisat) {
      try {
        const { total } = await window.unisat.getBalance();
        return (total / 100_000_000).toString();
      } catch {
        // Fall through to mempool API
      }
    }
    return fetchMempoolBalance(address);
  }
}

// ─── Leather adapter (window.LeatherProvider) ─────────────────────────────────

declare global {
  interface Window {
    LeatherProvider?: {
      request: (method: string, params?: any) => Promise<any>;
    };
  }
}

class LeatherProviderAdapter implements BitcoinProviderAdapter {
  isAvailable(): boolean {
    return typeof window !== "undefined" && Boolean(window.LeatherProvider);
  }

  async connect(): Promise<WalletConnection> {
    if (!window.LeatherProvider) throw new Error("Leather wallet not found");
    const response = await window.LeatherProvider.request("getAddresses");
    const addresses: Array<{ address: string; publicKey: string; type: string }> =
      response?.result?.addresses ?? [];
    const payment = addresses.find((a) => a.type === "p2wpkh" || a.type === "p2pkh");
    if (!payment) throw new Error("No payment address returned from Leather");
    return { address: payment.address, publicKey: payment.publicKey, walletName: "Leather" };
  }

  async disconnect(): Promise<void> {}

  async signTransaction(tx: any): Promise<any> {
    if (!window.LeatherProvider) throw new Error("Leather wallet not found");
    return window.LeatherProvider.request("signPsbt", { psbt: tx.psbtBase64 });
  }

  async getBalance(address: string): Promise<string> {
    return fetchMempoolBalance(address);
  }
}

// ─── Provider registry (tried in order) ──────────────────────────────────────

const PROVIDERS: BitcoinProviderAdapter[] = [
  new XverseProviderAdapter(),
  new UnisatProviderAdapter(),
  new LeatherProviderAdapter(),
];

// ─── Orchestrating adapter ────────────────────────────────────────────────────

export class BitcoinAdapter implements WalletAdapter {
  private activeProvider: BitcoinProviderAdapter | null = null;

  private detectProvider(): BitcoinProviderAdapter {
    const available = PROVIDERS.find((p) => p.isAvailable());
    if (!available) {
      throw new Error(
        "No Bitcoin wallet detected. Please install Xverse, Unisat, or Leather."
      );
    }
    return available;
  }

  async connect(): Promise<WalletConnection> {
    const provider = this.detectProvider();
    const connection = await provider.connect();
    this.activeProvider = provider;
    return connection;
  }

  async disconnect(): Promise<void> {
    await this.activeProvider?.disconnect();
    this.activeProvider = null;
  }

  async signTransaction(tx: any): Promise<any> {
    if (!this.activeProvider) {
      throw new Error("No Bitcoin wallet connected");
    }
    return this.activeProvider.signTransaction(tx);
  }

  async getBalance(address: string): Promise<string> {
    const provider = this.activeProvider ?? this.detectProvider();
    return provider.getBalance(address);
  }
}
