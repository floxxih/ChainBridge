"use client";

import { useCallback, useRef } from "react";
import axios, { AxiosError, AxiosRequestConfig } from "axios";

export const IDEMPOTENT_METHODS = ["GET", "HEAD", "OPTIONS"];

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: AxiosError, delayMs: number) => void;
  onMaxRetriesExceeded?: (error: AxiosError) => void;
}

export interface RequestOptions extends RetryOptions {
  silent?: boolean;
}

function calculateBackoff(
  delay: number,
  multiplier: number,
  jitter: number,
  maxDelay: number
): number {
  const next = Math.min(delay * multiplier, maxDelay);
  return Math.round(next + jitter * next);
}

export function useRequestRetry() {
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const isIdempotent = useCallback((method?: string): boolean => {
    return IDEMPOTENT_METHODS.includes((method ?? "").toUpperCase());
  }, []);

  const requestWithRetry = useCallback(
    async <T>(config: AxiosRequestConfig, options: RequestOptions = {}): Promise<T> => {
      const {
        maxRetries = 3,
        initialDelayMs = 1000,
        maxDelayMs = 30000,
        backoffMultiplier = 2,
        onRetry,
        onMaxRetriesExceeded,
        silent = false,
      } = options;

      let attempt = 0;
      let delayMs = initialDelayMs;
      let lastError: AxiosError | undefined;

      while (attempt <= maxRetries) {
        try {
          const response = await axios.request<T>({ ...config });
          return response.data;
        } catch (error) {
          if (!axios.isAxiosError(error)) {
            throw error;
          }

          lastError = error as AxiosError;

          if (attempt === maxRetries) {
            if (!silent) {
              console.error(`[RequestRetry] Max retries (${maxRetries}) exceeded:`, error);
            }
            onMaxRetriesExceeded?.(lastError);
            throw error;
          }

          const isServerError = (error.response?.status ?? 0) >= 500;
          const isNetworkError = !error.response;
          const isTimeout = axios.isAxiosError(error) && error.code === "ECONNABORTED";

          if (!isServerError && !isNetworkError && !isTimeout) {
            if (!silent) {
              console.warn(
                `[RequestRetry] Non-retryable error (${error.response?.status}):`,
                error.message
              );
            }
            throw error;
          }

          const jitter = Math.random() * 0.2;
          onRetry?.(attempt + 1, lastError, delayMs);

          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs = calculateBackoff(delayMs, backoffMultiplier, jitter, maxDelayMs);
          attempt++;
        }
      }

      throw lastError;
    },
    []
  );

  const abortAll = useCallback(() => {
    abortControllersRef.current.forEach((controller) => controller.abort());
    abortControllersRef.current.clear();
  }, []);

  const abort = useCallback((key: string) => {
    const controller = abortControllersRef.current.get(key);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(key);
    }
  }, []);

  const trackedRequest = useCallback(
    async <T>(
      key: string,
      config: AxiosRequestConfig,
      options: RequestOptions = {}
    ): Promise<T> => {
      const controller = new AbortController();
      abortControllersRef.current.set(key, controller);
      try {
        return await requestWithRetry<T>({ ...config, signal: controller.signal }, options);
      } finally {
        abortControllersRef.current.delete(key);
      }
    },
    [requestWithRetry]
  );

  return { requestWithRetry, trackedRequest, isIdempotent, abortAll, abort };
}

export function isRetryableError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status ?? 0;
  return status >= 500 || status === 0 || error.code === "ECONNABORTED";
}
