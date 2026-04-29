import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { ZodSchema } from "zod";
import config from "@/lib/config";
import type { ApiErrorShape } from "@/types/api";
import { validateApiResponse } from "./validation";

export class ApiClientError extends Error implements ApiErrorShape {
  status: number;
  code: string;
  details?: unknown;

  constructor({ message, status, code, details }: ApiErrorShape) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildErrorMessage(error: AxiosError): string {
  const detail = error.response?.data;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (detail && typeof detail === "object") {
    const detailRecord = detail as Record<string, unknown>;
    const message = detailRecord.message;
    const detailMessage = detailRecord.detail;

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (typeof detailMessage === "string" && detailMessage.trim()) {
      return detailMessage;
    }
  }

  return error.message || "Request failed";
}

export function normalizeApiError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 500;
    const detail = error.response?.data;
    let code = error.code || `HTTP_${status}`;

    if (detail && typeof detail === "object") {
      const detailRecord = detail as Record<string, unknown>;
      if (typeof detailRecord.code === "string" && detailRecord.code.trim()) {
        code = detailRecord.code;
      }
    }

    return new ApiClientError({
      message: buildErrorMessage(error),
      status,
      code,
      details: detail,
    });
  }

  if (error instanceof Error) {
    return new ApiClientError({
      message: error.message,
      status: 500,
      code: "UNKNOWN_ERROR",
      details: undefined,
    });
  }

  return new ApiClientError({
    message: "Unknown API error",
    status: 500,
    code: "UNKNOWN_ERROR",
    details: error,
  });
}

function attachErrorNormalizer(instance: AxiosInstance) {
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: unknown) => Promise.reject(normalizeApiError(error))
  );
}

function mergeHeaders(
  current: AxiosRequestConfig["headers"],
  next: Record<string, string> | undefined
) {
  if (!next) return current;
  return {
    ...(typeof current === "object" ? current : {}),
    ...next,
  };
}

export const DEFAULT_API_TIMEOUT_MS = 30_000;

export interface ApiRetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_API_RETRY_CONFIG: ApiRetryConfig = {
  maxRetries: 0,
  initialDelayMs: 500,
  maxDelayMs: 5_000,
  backoffMultiplier: 2,
};

export interface ApiClientOptions {
  basePath: string;
  getHeaders?: () => Record<string, string> | undefined;
  timeoutMs?: number;
  retry?: Partial<ApiRetryConfig>;
  enableValidation?: boolean;
}

export function createApiClient({
  basePath,
  getHeaders,
  timeoutMs = DEFAULT_API_TIMEOUT_MS,
  retry,
  enableValidation = true,
}: ApiClientOptions) {
  const retryConfig: ApiRetryConfig = { ...DEFAULT_API_RETRY_CONFIG, ...retry };
  const instance = axios.create({
    baseURL: `${config.api.url}/api/v1${basePath}`,
    timeout: timeoutMs,
    headers: {
      Accept: "application/json",
    },
  });

  instance.interceptors.request.use((request) => {
    const merged = mergeHeaders(request.headers, getHeaders?.());
    if (merged) {
      request.headers = merged as typeof request.headers;
    }
    return request;
  });

  attachErrorNormalizer(instance);

  return {
    instance,
    retryConfig,
    enableValidation,
    get: async <T>(url: string = "/", request?: AxiosRequestConfig, schema?: ZodSchema<T>) => {
      const { data } = await instance.get<T>(url, request);
      if (enableValidation && schema) {
        return validateApiResponse(data, schema, `${basePath}${url}`);
      }
      return data;
    },
    post: async <T>(
      url: string,
      body?: unknown,
      request?: AxiosRequestConfig,
      schema?: ZodSchema<T>
    ) => {
      const { data } = await instance.post<T>(url, body, request);
      if (enableValidation && schema) {
        return validateApiResponse(data, schema, `${basePath}${url}`);
      }
      return data;
    },
    patch: async <T>(
      url: string,
      body?: unknown,
      request?: AxiosRequestConfig,
      schema?: ZodSchema<T>
    ) => {
      const { data } = await instance.patch<T>(url, body, request);
      if (enableValidation && schema) {
        return validateApiResponse(data, schema, `${basePath}${url}`);
      }
      return data;
    },
    delete: async (url: string, request?: AxiosRequestConfig) => {
      await instance.delete(url, request);
    },
  };
}

function readStoredApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cb_api_key");
}

export function getUserApiHeaders(): Record<string, string> | undefined {
  const localKey = readStoredApiKey();
  const envKey = process.env.NEXT_PUBLIC_CHAINBRIDGE_API_KEY;
  const apiKey = localKey || envKey;

  return apiKey ? { "X-API-Key": apiKey } : undefined;
}
