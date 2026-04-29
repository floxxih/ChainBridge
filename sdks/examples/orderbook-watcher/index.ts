/**
 * Real-time orderbook watcher built on the @chainbridge/sdk WebSocket client.
 *
 * Run:
 *     npm install @chainbridge/sdk
 *     CHAINBRIDGE_API_KEY=cb_xxx npx tsx index.ts
 */

import { ChainBridgeClient, type WsEvent } from "@chainbridge/sdk";

interface OrderRow {
  order_id: string;
  pair: string;
  from_amount: string;
  to_amount: string;
  status: string;
}

const orders = new Map<string, OrderRow>();

function render() {
  console.clear();
  console.log("ChainBridge Orderbook (live)");
  console.log("─".repeat(60));
  for (const o of orders.values()) {
    console.log(
      `${o.order_id.padEnd(12)} ${o.pair.padEnd(15)} ${o.from_amount.padStart(12)} → ${o.to_amount.padStart(10)}  [${o.status}]`,
    );
  }
}

async function main() {
  const client = new ChainBridgeClient({
    baseUrl: process.env.CHAINBRIDGE_API_URL ?? "https://api.chainbridge.io",
    apiKey: process.env.CHAINBRIDGE_API_KEY,
  });

  // Seed with current open orders
  const page = await client.orders.list({ status: "open", limit: 50 });
  for (const o of page.orders) {
    orders.set(o.order_id, {
      order_id: o.order_id,
      pair: `${o.from_asset}/${o.to_asset}`,
      from_amount: o.from_amount,
      to_amount: o.to_amount,
      status: o.status,
    });
  }
  render();

  const ws = client.createWebSocket();
  await ws.connect();

  ws.subscribe("orders", (event: WsEvent) => {
    const data = event.data as Record<string, string>;
    const id = data.order_id;
    if (!id) return;
    if (event.type === "order_created") {
      orders.set(id, {
        order_id: id,
        pair: `${data.from_asset}/${data.to_asset}`,
        from_amount: data.from_amount,
        to_amount: data.to_amount,
        status: "open",
      });
    } else if (event.type === "order_matched") {
      const existing = orders.get(id);
      if (existing) existing.status = "matched";
    } else {
      orders.delete(id);
    }
    render();
  });

  process.on("SIGINT", () => {
    ws.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Watcher failed:", err);
  process.exit(1);
});
