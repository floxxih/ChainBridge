import { HttpClient } from "./http";
import {
  AnalyticsResource,
  AssetsResource,
  AuthResource,
  HtlcsResource,
  MarketResource,
  OrdersResource,
  ProofsResource,
  SwapsResource,
} from "./resources";
import { ChainBridgeWebSocket } from "./websocket";
import { deriveHashLock, generateSecret } from "./crypto";
import type { CreateOrderInput, Order, Swap } from "./types";

export interface ChainBridgeClientOptions {
  baseUrl?: string;
  wsUrl?: string;
  apiKey?: string;
  bearerToken?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

const DEFAULT_BASE_URL = "https://api.chainbridge.io";

export class ChainBridgeClient {
  readonly http: HttpClient;
  readonly orders: OrdersResource;
  readonly htlcs: HtlcsResource;
  readonly swaps: SwapsResource;
  readonly proofs: ProofsResource;
  readonly market: MarketResource;
  readonly assets: AssetsResource;
  readonly analytics: AnalyticsResource;
  readonly auth: AuthResource;

  private readonly wsUrl: string;
  private readonly apiKey?: string;

  constructor(options: ChainBridgeClientOptions = {}) {
    const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.wsUrl = options.wsUrl ?? deriveWsUrl(baseUrl);
    this.apiKey = options.apiKey;
    this.http = new HttpClient({
      baseUrl,
      apiKey: options.apiKey,
      bearerToken: options.bearerToken,
      timeoutMs: options.timeoutMs,
      fetch: options.fetch,
    });
    this.orders = new OrdersResource(this.http);
    this.htlcs = new HtlcsResource(this.http);
    this.swaps = new SwapsResource(this.http);
    this.proofs = new ProofsResource(this.http);
    this.market = new MarketResource(this.http);
    this.assets = new AssetsResource(this.http);
    this.analytics = new AnalyticsResource(this.http);
    this.auth = new AuthResource(this.http);
  }

  createWebSocket(): ChainBridgeWebSocket {
    return new ChainBridgeWebSocket({ url: this.wsUrl, apiKey: this.apiKey });
  }

  /**
   * High-level helper that creates a swap order along with a fresh
   * secret and hash-lock. The secret is returned for the caller to
   * persist — it must be revealed to claim the counterparty leg.
   */
  async createSwapOrder(
    input: Omit<CreateOrderInput, "expiry"> & { expirySeconds: number },
  ): Promise<{ order: Order; secret: string; hashLock: string }> {
    const secret = generateSecret();
    const hashLock = deriveHashLock(secret);
    const order = await this.orders.create({
      from_chain: input.from_chain,
      to_chain: input.to_chain,
      from_asset: input.from_asset,
      to_asset: input.to_asset,
      from_amount: input.from_amount,
      to_amount: input.to_amount,
      sender_address: input.sender_address,
      expiry: input.expirySeconds,
    });
    return { order, secret, hashLock };
  }

  /**
   * Poll a swap until it reaches a terminal status or the timeout elapses.
   */
  async waitForSwap(
    swapId: string,
    opts: { timeoutMs?: number; intervalMs?: number; isTerminal?: (s: Swap) => boolean } = {},
  ): Promise<Swap> {
    const timeout = opts.timeoutMs ?? 5 * 60 * 1000;
    const interval = opts.intervalMs ?? 5_000;
    const terminal = opts.isTerminal ?? ((s: Swap) => ["completed", "refunded", "failed"].includes(s.status));
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const swap = await this.swaps.get(swapId);
      if (terminal(swap)) return swap;
      await new Promise((r) => setTimeout(r, interval));
    }
    throw new Error(`Timed out waiting for swap ${swapId}`);
  }
}

function deriveWsUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = url.pathname.replace(/\/$/, "") + "/ws";
  return url.toString();
}
