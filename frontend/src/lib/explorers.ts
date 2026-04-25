export type ExplorerLinkType = "tx" | "address" | "contract";

export interface ExplorerBaseUrls {
  tx: string;
  address: string;
  contract: string;
}

const EXPLORER_URLS: Record<string, ExplorerBaseUrls> = {
  stellar: {
    tx: "https://stellar.expert/explorer/testnet/tx",
    address: "https://stellar.expert/explorer/testnet/account",
    contract: "https://stellar.expert/explorer/testnet/contract",
  },
  ethereum: {
    tx: "https://sepolia.etherscan.io/tx",
    address: "https://sepolia.etherscan.io/address",
    contract: "https://sepolia.etherscan.io/address",
  },
  bitcoin: {
    tx: "https://mempool.space/testnet/tx",
    address: "https://mempool.space/testnet/address",
    contract: "#",
  },
};

export function getExplorerUrl(
  chain: string,
  hash: string,
  type: ExplorerLinkType = "tx"
): string {
  const normalizedChain = chain.toLowerCase();
  const urls = EXPLORER_URLS[normalizedChain];

  if (!urls) {
    return "#";
  }

  const baseUrl = urls[type];
  if (!baseUrl || baseUrl === "#") {
    return "#";
  }

  return `${baseUrl}/${hash}`;
}

export function isValidChain(chain: string): boolean {
  return chain.toLowerCase() in EXPLORER_URLS;
}
