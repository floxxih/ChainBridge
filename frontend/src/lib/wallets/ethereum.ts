import { BrowserProvider, formatEther } from "ethers";
import { WalletAdapter } from "@/types/wallet";

export class EthereumAdapter implements WalletAdapter {
  private getProvider() {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask not found");
    }
    return new BrowserProvider(window.ethereum);
  }

  async connect() {
    const provider = this.getProvider();
    const accounts = await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    return { address, publicKey: address }; // For EVM, address is the primary ID
  }

  async disconnect() {
    // EIP-1193 doesn't support programmatic logout
  }

  async signTransaction(tx: any) {
    const provider = this.getProvider();
    const signer = await provider.getSigner();
    return await signer.sendTransaction(tx);
  }

  async getBalance(address: string) {
    const provider = this.getProvider();
    const balance = await provider.getBalance(address);
    return formatEther(balance);
  }
}

// Add ethereum to window for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}
