import { ethers } from "ethers";

export function getEthereumProvider(): ethers.BrowserProvider | null {
  if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
}

export async function connectEthereumWallet(): Promise<string | null> {
  try {
    const provider = getEthereumProvider();
    if (!provider) {
      throw new Error("No Ethereum wallet detected. Please install MetaMask.");
    }

    const accounts = await provider.send("eth_requestAccounts", []);
    return accounts[0] || null;
  } catch (error) {
    console.error("Failed to connect Ethereum wallet:", error);
    return null;
  }
}

export async function getEthereumBalance(address: string): Promise<string> {
  try {
    const provider = getEthereumProvider();
    if (!provider) {
      throw new Error("No Ethereum provider available");
    }

    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error("Failed to get Ethereum balance:", error);
    return "0";
  }
}
