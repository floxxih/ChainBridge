/**
 * Subscribe to order events on the public WebSocket feed.
 */

import { ChainBridgeClient } from "../src";

async function main() {
  const client = new ChainBridgeClient({
    baseUrl: process.env.CHAINBRIDGE_API_URL ?? "https://api.chainbridge.io",
    apiKey: process.env.CHAINBRIDGE_API_KEY,
  });
  const ws = client.createWebSocket();
  await ws.connect();
  ws.subscribe("orders", (event) => console.log("event:", event.type, event.data));
  console.log("Listening for order events. Ctrl+C to exit.");
}

main();
