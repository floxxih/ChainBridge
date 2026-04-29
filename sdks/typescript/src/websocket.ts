import WS from "isomorphic-ws";
import type { WsEvent, WsEventType } from "./types";

export interface WsClientOptions {
  url: string;
  apiKey?: string;
  bearerToken?: string;
  reconnect?: boolean;
  reconnectDelayMs?: number;
  maxReconnectAttempts?: number;
}

export type WsListener = (event: WsEvent) => void;

interface Subscription {
  channel: string;
  filters?: Record<string, unknown>;
  listeners: Set<WsListener>;
}

export class ChainBridgeWebSocket {
  private ws?: WS;
  private readonly url: string;
  private readonly opts: Required<Omit<WsClientOptions, "url" | "apiKey" | "bearerToken">> & {
    apiKey?: string;
    bearerToken?: string;
  };
  private readonly subs = new Map<string, Subscription>();
  private reconnectAttempts = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private explicitClose = false;

  constructor(options: WsClientOptions) {
    this.url = options.url;
    this.opts = {
      reconnect: options.reconnect ?? true,
      reconnectDelayMs: options.reconnectDelayMs ?? 1000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      apiKey: options.apiKey,
      bearerToken: options.bearerToken,
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const headers: Record<string, string> = {};
      if (this.opts.apiKey) headers["X-API-Key"] = this.opts.apiKey;
      if (this.opts.bearerToken) headers["Authorization"] = `Bearer ${this.opts.bearerToken}`;

      this.ws = new WS(this.url, undefined, { headers } as never);
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        for (const sub of this.subs.values()) this.sendSubscribe(sub);
        resolve();
      };
      this.ws.onerror = (err: unknown) => {
        if (this.reconnectAttempts === 0) reject(err);
      };
      this.ws.onclose = () => this.handleClose();
      this.ws.onmessage = (msg: { data: WS.Data }) => this.handleMessage(msg.data);
    });
  }

  subscribe<T = unknown>(
    channel: WsEventType | string,
    listener: (event: WsEvent<T>) => void,
    filters?: Record<string, unknown>,
  ): () => void {
    const key = this.subKey(channel, filters);
    let sub = this.subs.get(key);
    if (!sub) {
      sub = { channel, filters, listeners: new Set() };
      this.subs.set(key, sub);
      if (this.isOpen()) this.sendSubscribe(sub);
    }
    sub.listeners.add(listener as WsListener);
    return () => this.unsubscribe(channel, listener as WsListener, filters);
  }

  unsubscribe(
    channel: string,
    listener: WsListener,
    filters?: Record<string, unknown>,
  ): void {
    const key = this.subKey(channel, filters);
    const sub = this.subs.get(key);
    if (!sub) return;
    sub.listeners.delete(listener);
    if (sub.listeners.size === 0) {
      this.subs.delete(key);
      if (this.isOpen()) {
        this.send({ action: "unsubscribe", channel, filters });
      }
    }
  }

  close(): void {
    this.explicitClose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }

  private isOpen(): boolean {
    return this.ws?.readyState === WS.OPEN;
  }

  private send(payload: unknown): void {
    if (this.isOpen()) this.ws?.send(JSON.stringify(payload));
  }

  private sendSubscribe(sub: Subscription): void {
    this.send({ action: "subscribe", channel: sub.channel, filters: sub.filters });
  }

  private subKey(channel: string, filters?: Record<string, unknown>): string {
    return filters ? `${channel}:${JSON.stringify(filters)}` : channel;
  }

  private handleMessage(data: WS.Data): void {
    let parsed: WsEvent;
    try {
      parsed = JSON.parse(typeof data === "string" ? data : data.toString());
    } catch {
      return;
    }
    for (const sub of this.subs.values()) {
      const channelMatch =
        sub.channel === parsed.type ||
        sub.channel === inferChannelFromType(parsed.type) ||
        sub.channel === "*";
      if (channelMatch) {
        for (const l of sub.listeners) l(parsed);
      }
    }
  }

  private handleClose(): void {
    if (this.explicitClose || !this.opts.reconnect) return;
    if (this.reconnectAttempts >= this.opts.maxReconnectAttempts) return;

    const delay = this.opts.reconnectDelayMs * 2 ** this.reconnectAttempts;
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect().catch(() => {}), delay);
  }
}

function inferChannelFromType(type: string): string {
  if (type.startsWith("order_")) return "orders";
  if (type.startsWith("swap_")) return "swaps";
  if (type.startsWith("htlc_")) return "htlc";
  return type;
}
