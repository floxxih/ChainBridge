import fetchPolyfill from "cross-fetch";
import {
  AuthenticationError,
  ChainBridgeError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "./errors";
import type { ApiEnvelope } from "./types";

export interface HttpClientOptions {
  baseUrl: string;
  apiKey?: string;
  bearerToken?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  defaultHeaders?: Record<string, string>;
  retry?: {
    maxAttempts: number;
    backoffMs: number;
  };
}

const DEFAULT_TIMEOUT_MS = 30_000;

export class HttpClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly retry: { maxAttempts: number; backoffMs: number };

  constructor(opts: HttpClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = (opts.fetch ?? globalThis.fetch ?? fetchPolyfill) as typeof fetch;
    this.retry = opts.retry ?? { maxAttempts: 3, backoffMs: 500 };

    this.headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "chainbridge-sdk-js/0.1.0",
      ...(opts.defaultHeaders ?? {}),
    };
    if (opts.apiKey) this.headers["X-API-Key"] = opts.apiKey;
    if (opts.bearerToken) this.headers["Authorization"] = `Bearer ${opts.bearerToken}`;
  }

  setBearerToken(token: string | null): void {
    if (token) this.headers["Authorization"] = `Bearer ${token}`;
    else delete this.headers["Authorization"];
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const url = this.buildUrl(path, query);
    const init: RequestInit = {
      method,
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    };

    let lastError: unknown;
    for (let attempt = 1; attempt <= this.retry.maxAttempts; attempt++) {
      try {
        return await this.executeOnce<T>(url, init);
      } catch (err) {
        lastError = err;
        if (!this.shouldRetry(err) || attempt === this.retry.maxAttempts) throw err;
        const delay = this.retry.backoffMs * 2 ** (attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw lastError;
  }

  private async executeOnce<T>(url: string, init: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this.fetchImpl(url, { ...init, signal: controller.signal });
    } catch (err) {
      throw new NetworkError(
        err instanceof Error ? err.message : "Network request failed",
        err,
      );
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    let parsed: ApiEnvelope<T> | { detail?: string } | T | null = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        if (!res.ok) {
          throw new ChainBridgeError("INTERNAL_ERROR", text || res.statusText, {
            status: res.status,
          });
        }
      }
    }

    if (!res.ok) this.throwApiError(res, parsed);

    if (parsed && typeof parsed === "object" && "success" in parsed) {
      const env = parsed as ApiEnvelope<T>;
      if (env.success === false && env.error) {
        throw new ChainBridgeError(env.error.code, env.error.message, { status: res.status });
      }
      return env.data as T;
    }
    return parsed as T;
  }

  private throwApiError(res: Response, parsed: unknown): never {
    const code = extractCode(parsed) ?? mapStatusToCode(res.status);
    const message = extractMessage(parsed) ?? res.statusText;

    if (res.status === 401 || res.status === 403) throw new AuthenticationError(message);
    if (res.status === 404) throw new NotFoundError(code, message);
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      throw new RateLimitError(message, retryAfter ? Number(retryAfter) : undefined);
    }
    if (res.status >= 400 && res.status < 500) throw new ValidationError(code, message);
    throw new ChainBridgeError(code, message, { status: res.status, details: parsed });
  }

  private shouldRetry(err: unknown): boolean {
    if (err instanceof NetworkError) return true;
    if (err instanceof RateLimitError) return true;
    if (err instanceof ChainBridgeError && err.status && err.status >= 500) return true;
    return false;
  }

  private buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(path.startsWith("/") ? path : `/${path}`, `${this.baseUrl}/`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }
}

function extractCode(parsed: unknown): string | undefined {
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    const err = (parsed as { error?: { code?: string } }).error;
    if (err?.code) return err.code;
  }
  return undefined;
}

function extractMessage(parsed: unknown): string | undefined {
  if (!parsed || typeof parsed !== "object") return undefined;
  const obj = parsed as { error?: { message?: string }; detail?: string; message?: string };
  return obj.error?.message ?? obj.detail ?? obj.message;
}

function mapStatusToCode(status: number): string {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401 || status === 403) return "UNAUTHORIZED";
  if (status === 404) return "NOT_FOUND";
  if (status === 429) return "RATE_LIMIT";
  if (status >= 500) return "INTERNAL_ERROR";
  return "UNKNOWN_ERROR";
}
