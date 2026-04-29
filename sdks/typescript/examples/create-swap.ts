/**
 * End-to-end example: creating an XLM→BTC atomic swap order.
 *
 * Run with: ts-node examples/create-swap.ts
 *
 * Required env: CHAINBRIDGE_API_KEY, CHAINBRIDGE_SENDER (Stellar address).
 */

import { ChainBridgeClient } from "../src";

async function main() {
  const client = new ChainBridgeClient({
    baseUrl: process.env.CHAINBRIDGE_API_URL ?? "https://api.chainbridge.io",
    apiKey: process.env.CHAINBRIDGE_API_KEY!,
  });

  const fees = await client.market.estimateFees({
    from_chain: "stellar",
    to_chain: "bitcoin",
    from_amount: "1000000000",
  });
  console.log("Estimated fees:", fees);

  const { order, secret, hashLock } = await client.createSwapOrder({
    from_chain: "stellar",
    to_chain: "bitcoin",
    from_asset: "XLM",
    to_asset: "BTC",
    from_amount: "1000000000",
    to_amount: "10000",
    sender_address: process.env.CHAINBRIDGE_SENDER!,
    expirySeconds: 86_400,
  });

  console.log("Created order:", order.order_id);
  console.log("Hash-lock (share with counterparty):", hashLock);
  console.warn("Secret (KEEP PRIVATE until you claim):", secret);

  const ws = client.createWebSocket();
  await ws.connect();
  ws.subscribe("swaps", (event) => {
    console.log("Swap event:", event);
    if ((event.data as { status?: string }).status === "completed") ws.close();
  });
}

main().catch((err) => {
  console.error("Swap example failed:", err);
  process.exit(1);
});
