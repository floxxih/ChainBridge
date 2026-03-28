import { Horizon, Networks } from "@stellar/stellar-sdk";

export function getStellarServer(): Horizon.Server {
  const networkType = process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet";

  const serverUrl =
    networkType === "mainnet"
      ? "https://horizon.stellar.org"
      : "https://horizon-testnet.stellar.org";

  return new Horizon.Server(serverUrl);
}

export function getStellarNetwork(): Networks {
  const networkType = process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet";

  return networkType === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
}

export async function getStellarBalance(publicKey: string): Promise<string> {
  try {
    const server = getStellarServer();
    const account = await server.loadAccount(publicKey);

    const xlmBalance = account.balances.find(
      (b: { asset_type: string; balance?: string }) => b.asset_type === "native"
    );

    return xlmBalance?.balance || "0";
  } catch (error) {
    console.error("Failed to get Stellar balance:", error);
    return "0";
  }
}
