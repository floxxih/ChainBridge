/**
 * Typed API Client using generated types from backend schemas
 * Provides type-safe API calls with automatic error handling
 */

import { createApiClient, getUserApiHeaders } from "./client";

// Import generated types (will be available after running npm run types:generate)
import type {
  HTLCCreate,
  HTLCResponse,
  HTLCStatusResponse,
  HTLCClaim,
  OrderCreate,
  OrderResponse,
  OrderMatch,
  SwapResponse,
  SwapProof,
  FeeEstimateRequest,
  SwapFeeBreakdownResponse,
  ExchangeRateRequest,
  RateQuoteResponse,
  APIKeyCreate,
  APIKeyResponse,
  TokenResponse,
  ApiResponse,
  PaginatedResponse,
  ChainBridgeApiClient,
} from "@/types/api";

export class ChainBridgeApi implements ChainBridgeApiClient {
  private client: ReturnType<typeof createApiClient>;

  constructor() {
    this.client = createApiClient({
      basePath: "",
      getHeaders: getUserApiHeaders,
      timeoutMs: 30000,
    });
  }

  // HTLC Operations
  async createHTLC(data: HTLCCreate): Promise<ApiResponse<HTLCResponse>> {
    try {
      const response = await this.client.post<HTLCResponse>("/htlc", data);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  async claimHTLC(id: string, data: HTLCClaim): Promise<ApiResponse<HTLCResponse>> {
    try {
      const response = await this.client.post<HTLCResponse>(`/htlc/${id}/claim`, data);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  async getHTLC(id: string): Promise<ApiResponse<HTLCStatusResponse>> {
    try {
      const response = await this.client.get<HTLCStatusResponse>(`/htlc/${id}`);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  async listHTLCS(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<HTLCResponse>>> {
    try {
      const response = await this.client.get<PaginatedResponse<HTLCResponse>>("/htlc", { params });
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  // Order Operations
  async createOrder(data: OrderCreate): Promise<ApiResponse<OrderResponse>> {
    try {
      const response = await this.client.post<OrderResponse>("/orders", data);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  async matchOrder(id: string, data: OrderMatch): Promise<ApiResponse<OrderResponse>> {
    try {
      const response = await this.client.post<OrderResponse>(`/orders/${id}/match`, data);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  async getOrder(id: string): Promise<ApiResponse<OrderResponse>> {
    try {
      const response = await this.client.get<OrderResponse>(`/orders/${id}`);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  async listOrders(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<OrderResponse>>> {
    try {
      const response = await this.client.get<PaginatedResponse<OrderResponse>>("/orders", {
        params,
      });
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  // Fee Operations
  async estimateFees(data: FeeEstimateRequest): Promise<ApiResponse<SwapFeeBreakdownResponse>> {
    try {
      const response = await this.client.post<SwapFeeBreakdownResponse>("/fees/estimate", data);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  async getExchangeRates(data: ExchangeRateRequest): Promise<ApiResponse<RateQuoteResponse>> {
    try {
      const response = await this.client.post<RateQuoteResponse>("/fees/rates", data);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  // Auth Operations
  async createApiKey(data: APIKeyCreate): Promise<ApiResponse<APIKeyResponse>> {
    try {
      const response = await this.client.post<APIKeyResponse>("/auth/api-keys", data);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  async refreshToken(token: string): Promise<ApiResponse<TokenResponse>> {
    try {
      const response = await this.client.post<TokenResponse>("/auth/refresh", { token });
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  // Additional utility methods
  private normalizeError(error: unknown) {
    // Import the normalizeApiError function from client
    const { normalizeApiError } = require("./client");
    return normalizeApiError(error);
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    try {
      const response = await this.client.get<{ status: string; timestamp: string }>("/health");
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  // Get supported chains
  async getSupportedChains(): Promise<ApiResponse<{ chains: string[] }>> {
    try {
      const response = await this.client.get<{ chains: string[] }>("/chains");
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  // Get asset information
  async getAssetInfo(asset: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get(`/assets/${asset}`);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }
}

// Create singleton instance
export const apiClient = new ChainBridgeApi();

// Export convenience hooks for React components
export function useApiClient() {
  return apiClient;
}

// Type-safe query keys for React Query
export const apiQueryKeys = {
  // HTLC queries
  htlc: {
    all: ["htlc"] as const,
    list: (params?: { page?: number; limit?: number }) => ["htlc", "list", params] as const,
    detail: (id: string) => ["htlc", "detail", id] as const,
  },

  // Order queries
  orders: {
    all: ["orders"] as const,
    list: (params?: { page?: number; limit?: number }) => ["orders", "list", params] as const,
    detail: (id: string) => ["orders", "detail", id] as const,
  },

  // Fee queries
  fees: {
    estimate: (request: FeeEstimateRequest) => ["fees", "estimate", request] as const,
    rates: (request: ExchangeRateRequest) => ["fees", "rates", request] as const,
  },

  // System queries
  system: {
    health: ["system", "health"] as const,
    chains: ["system", "chains"] as const,
    assets: (asset: string) => ["system", "assets", asset] as const,
  },
} as const;

// Type-safe mutation keys for React Query
export const apiMutationKeys = {
  // HTLC mutations
  htlc: {
    create: ["htlc", "create"] as const,
    claim: (id: string) => ["htlc", "claim", id] as const,
  },

  // Order mutations
  orders: {
    create: ["orders", "create"] as const,
    match: (id: string) => ["orders", "match", id] as const,
  },

  // Auth mutations
  auth: {
    createApiKey: ["auth", "createApiKey"] as const,
    refreshToken: ["auth", "refreshToken"] as const,
  },
} as const;

// Error handling utilities
export function isApiError<T>(
  response: ApiResponse<T>
): response is ApiResponse<T> & { error: NonNullable<ApiResponse<T>["error"]> } {
  return !response.success && response.error !== undefined;
}

export function getErrorMessage<T>(response: ApiResponse<T>): string {
  if (isApiError(response)) {
    return response.error.message;
  }
  return "Unknown error occurred";
}

export function getErrorCode<T>(response: ApiResponse<T>): string | undefined {
  if (isApiError(response)) {
    return response.error.code;
  }
  return undefined;
}

// Response validation utilities
export function validateApiResponse<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(getErrorMessage(response));
  }
  if (!response.data) {
    throw new Error("No data in successful response");
  }
  return response.data;
}

// Batch operations
export class BatchApiClient {
  private apiClient: ChainBridgeApi;

  constructor() {
    this.apiClient = new ChainBridgeApi();
  }

  async createMultipleHTLCS(htlcs: HTLCCreate[]): Promise<ApiResponse<HTLCResponse[]>> {
    const results = await Promise.allSettled(htlcs.map((htlc) => this.apiClient.createHTLC(htlc)));

    const successful: HTLCResponse[] = [];
    const errors: any[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.success) {
        successful.push(result.value.data!);
      } else {
        errors.push({
          index,
          error: result.status === "rejected" ? result.reason : getErrorMessage(result.value),
        });
      }
    });

    if (errors.length > 0) {
      return {
        success: false,
        error: {
          code: "BATCH_PARTIAL_FAILURE",
          message: `Batch operation partially failed. ${successful.length}/${htlcs.length} succeeded.`,
          details: { successful, errors },
        },
      };
    }

    return {
      success: true,
      data: successful,
    };
  }

  async getMultipleHTLCS(ids: string[]): Promise<ApiResponse<HTLCStatusResponse[]>> {
    const results = await Promise.allSettled(ids.map((id) => this.apiClient.getHTLC(id)));

    const successful: HTLCStatusResponse[] = [];
    const errors: any[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.success) {
        successful.push(result.value.data!);
      } else {
        errors.push({
          index,
          id: ids[index],
          error: result.status === "rejected" ? result.reason : getErrorMessage(result.value),
        });
      }
    });

    if (errors.length > 0) {
      return {
        success: false,
        error: {
          code: "BATCH_PARTIAL_FAILURE",
          message: `Batch operation partially failed. ${successful.length}/${ids.length} succeeded.`,
          details: { successful, errors },
        },
      };
    }

    return {
      success: true,
      data: successful,
    };
  }
}

export const batchApiClient = new BatchApiClient();
