import { HttpClient } from "../src/http";
import { AuthenticationError, NotFoundError, RateLimitError, ValidationError } from "../src/errors";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("HttpClient", () => {
  test("unwraps successful api envelopes", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({ success: true, data: { ok: true }, error: null }),
    );
    const client = new HttpClient({ baseUrl: "https://api.test", fetch: fetchMock as unknown as typeof fetch });
    const res = await client.request<{ ok: boolean }>("GET", "/api/v1/orders");
    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("throws AuthenticationError on 401", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(jsonResponse({ detail: "bad key" }, { status: 401 }));
    const client = new HttpClient({
      baseUrl: "https://api.test",
      fetch: fetchMock as unknown as typeof fetch,
      retry: { maxAttempts: 1, backoffMs: 0 },
    });
    await expect(client.request("GET", "/x")).rejects.toBeInstanceOf(AuthenticationError);
  });

  test("throws NotFoundError on 404", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(jsonResponse({ error: { code: "ORDER_NOT_FOUND", message: "nope" } }, { status: 404 }));
    const client = new HttpClient({
      baseUrl: "https://api.test",
      fetch: fetchMock as unknown as typeof fetch,
      retry: { maxAttempts: 1, backoffMs: 0 },
    });
    await expect(client.request("GET", "/x")).rejects.toBeInstanceOf(NotFoundError);
  });

  test("throws ValidationError on 400", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(jsonResponse({ error: { code: "INVALID_AMOUNT", message: "neg" } }, { status: 400 }));
    const client = new HttpClient({
      baseUrl: "https://api.test",
      fetch: fetchMock as unknown as typeof fetch,
      retry: { maxAttempts: 1, backoffMs: 0 },
    });
    await expect(client.request("POST", "/x", { a: 1 })).rejects.toBeInstanceOf(ValidationError);
  });

  test("retries on 429 and exposes Retry-After", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        new Response("{}", { status: 429, headers: { "Retry-After": "1", "content-type": "application/json" } }),
      )
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true }, error: null }));
    const client = new HttpClient({
      baseUrl: "https://api.test",
      fetch: fetchMock as unknown as typeof fetch,
      retry: { maxAttempts: 2, backoffMs: 1 },
    });
    const res = await client.request("GET", "/x");
    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("encodes query parameters", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, data: [], error: null }));
    const client = new HttpClient({ baseUrl: "https://api.test", fetch: fetchMock as unknown as typeof fetch });
    await client.request("GET", "/api/v1/orders", undefined, { status: "open", limit: 10 });
    const call = fetchMock.mock.calls[0][0];
    expect(call).toBe("https://api.test/api/v1/orders?status=open&limit=10");
  });

  test("RateLimitError preserves retry-after seconds", () => {
    const err = new RateLimitError("slow down", 5);
    expect(err.retryAfterSeconds).toBe(5);
    expect(err.code).toBe("RATE_LIMIT");
  });
});
