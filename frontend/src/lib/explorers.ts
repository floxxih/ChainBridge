export function getExplorerUrl(chain: string, hash: string): string {
  switch (chain.toLowerCase()) {
    case "stellar":
      return `https://stellar.expert/explorer/testnet/tx/${hash}`;
    case "ethereum":
      return `https://sepolia.etherscan.io/tx/${hash}`;
    case "bitcoin":
      return `https://mempool.space/testnet/tx/${hash}`;
    default:
      return "#";
  }
}
