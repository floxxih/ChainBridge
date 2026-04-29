import { ChainBridgeClient } from "../src/client";
import { deriveHashLock } from "../src/crypto";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("ChainBridgeClient", () => {
  test("createSwapOrder generates a secret + hashlock and calls /orders", async () => {
    const orderResponse = {
      order_id: "order-1",
      from_chain: "stellar",
      to_chain: "bitcoin",
      from_asset: "XLM",
      to_asset: "BTC",
      from_amount: "1000000000",
      to_amount: "10000",
      creator: "GA...",
      status: "open",
      expiry: "2026-04-30T00:00:00Z",
      created_at: "2026-04-29T00:00:00Z",
    };
    const fetchMock = jest
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, data: orderResponse, error: null }));
    const client = new ChainBridgeClient({
      baseUrl: "https://api.test",
      apiKey: "cb_test",
      fetch: fetchMock as unknown as typeof fetch,
    });

    const result = await client.createSwapOrder({
      from_chain: "stellar",
      to_chain: "bitcoin",
      from_asset: "XLM",
      to_asset: "BTC",
      from_amount: "1000000000",
      to_amount: "10000",
      sender_address: "GA...",
      expirySeconds: 3600,
    });

    expect(result.order.order_id).toBe("order-1");
    expect(result.secret).toMatch(/^[0-9a-f]{64}$/);
    expect(result.hashLock).toBe(deriveHashLock(result.secret));
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).method).toBe("POST");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.expiry).toBe(3600);
  });

  test("sets X-API-Key header on requests", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, data: { ok: true }, error: null }));
    const client = new ChainBridgeClient({
      baseUrl: "https://api.test",
      apiKey: "cb_test",
      fetch: fetchMock as unknown as typeof fetch,
    });
    await client.market.getFee("stellar");
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe("cb_test");
  });
});
