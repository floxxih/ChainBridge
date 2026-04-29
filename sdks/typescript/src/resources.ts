import type { HttpClient } from "./http";
import type {
  ApiKey,
  Asset,
  Chain,
  CreateHtlcInput,
  CreateOrderInput,
  ClaimHtlcInput,
  ExecuteSwapInput,
  FeeBreakdown,
  FeeEstimate,
  Htlc,
  Order,
  OrderListPage,
  RefundHtlcInput,
  SuccessRateStats,
  Swap,
  VerifyProofInput,
  VerifyProofResult,
  VolumeStats,
} from "./types";

export class OrdersResource {
  constructor(private readonly http: HttpClient) {}

  create(input: CreateOrderInput): Promise<Order> {
    return this.http.request<Order>("POST", "/api/v1/orders", input);
  }

  get(orderId: string): Promise<Order> {
    return this.http.request<Order>("GET", `/api/v1/orders/${orderId}`);
  }

  list(params?: {
    from_chain?: Chain;
    to_chain?: Chain;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<OrderListPage> {
    return this.http.request<OrderListPage>("GET", "/api/v1/orders", undefined, params);
  }

  cancel(orderId: string): Promise<Order> {
    return this.http.request<Order>("DELETE", `/api/v1/orders/${orderId}`);
  }
}

export class HtlcsResource {
  constructor(private readonly http: HttpClient) {}

  create(input: CreateHtlcInput): Promise<Htlc> {
    return this.http.request<Htlc>("POST", "/api/v1/htlcs", input);
  }

  get(htlcId: string): Promise<Htlc> {
    return this.http.request<Htlc>("GET", `/api/v1/htlcs/${htlcId}`);
  }

  claim(htlcId: string, input: ClaimHtlcInput): Promise<Htlc> {
    return this.http.request<Htlc>("POST", `/api/v1/htlcs/${htlcId}/claim`, input);
  }

  refund(htlcId: string, input: RefundHtlcInput): Promise<Htlc> {
    return this.http.request<Htlc>("POST", `/api/v1/htlcs/${htlcId}/refund`, input);
  }
}

export class SwapsResource {
  constructor(private readonly http: HttpClient) {}

  execute(input: ExecuteSwapInput): Promise<Swap> {
    return this.http.request<Swap>("POST", "/api/v1/swaps", input);
  }

  get(swapId: string): Promise<Swap> {
    return this.http.request<Swap>("GET", `/api/v1/swaps/${swapId}`);
  }

  list(params?: {
    status?: string;
    from_chain?: Chain;
    to_chain?: Chain;
    address?: string;
    page?: number;
    limit?: number;
  }): Promise<{ swaps: Swap[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
    return this.http.request("GET", "/api/v1/swaps", undefined, params);
  }
}

export class ProofsResource {
  constructor(private readonly http: HttpClient) {}

  verify(input: VerifyProofInput): Promise<VerifyProofResult> {
    return this.http.request<VerifyProofResult>("POST", "/api/v1/proofs/verify", input);
  }
}

export class MarketResource {
  constructor(private readonly http: HttpClient) {}

  getFee(chain: Chain): Promise<FeeEstimate> {
    return this.http.request<FeeEstimate>("GET", `/api/v1/market/fees/${chain}`);
  }

  estimateFees(input: { from_chain: Chain; to_chain: Chain; from_amount: string }): Promise<FeeBreakdown> {
    return this.http.request<FeeBreakdown>("POST", "/api/v1/market/fees/estimate", input);
  }

  getRate(fromAsset: string, toAsset: string): Promise<{ rate: string; from_asset: string; to_asset: string }> {
    return this.http.request("GET", "/api/v1/market/rate", undefined, {
      from_asset: fromAsset,
      to_asset: toAsset,
    });
  }
}

export class AssetsResource {
  constructor(private readonly http: HttpClient) {}

  list(params?: {
    chain?: Chain;
    symbol?: string;
    verified?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Asset[]> {
    return this.http.request<Asset[]>("GET", "/api/v1/assets", undefined, params);
  }
}

export class AnalyticsResource {
  constructor(private readonly http: HttpClient) {}

  volume(params?: { chain?: Chain; period?: string; asset?: string }): Promise<VolumeStats> {
    return this.http.request<VolumeStats>("GET", "/api/v1/analytics/volume", undefined, params);
  }

  successRate(params?: { period?: string }): Promise<SuccessRateStats> {
    return this.http.request<SuccessRateStats>(
      "GET",
      "/api/v1/analytics/success-rate",
      undefined,
      params,
    );
  }
}

export class AuthResource {
  constructor(private readonly http: HttpClient) {}

  createApiKey(input: { name: string; owner: string }): Promise<ApiKey> {
    return this.http.request<ApiKey>("POST", "/api/v1/auth/api-keys", input);
  }

  exchangeForToken(): Promise<{ access_token: string; token_type: string; expires_in: number }> {
    return this.http.request("POST", "/api/v1/auth/token");
  }

  revokeApiKey(keyId: string): Promise<void> {
    return this.http.request<void>("DELETE", `/api/v1/auth/api-keys/${keyId}`);
  }
}
