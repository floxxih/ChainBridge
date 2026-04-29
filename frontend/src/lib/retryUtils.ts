export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

export function calculateBackoffDelay(retryCount: number, config: RetryConfig = {}): number {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const delay = Math.min(
    cfg.initialDelayMs * Math.pow(cfg.backoffMultiplier, retryCount),
    cfg.maxDelayMs
  );
  const jitter = Math.random() * 0.1 * delay;
  return Math.round(delay + jitter);
}

export function getNextRetryTime(retryCount: number, config: RetryConfig = {}): number {
  const delayMs = calculateBackoffDelay(retryCount, config);
  return Date.now() + delayMs;
}

export function isReadyToRetry(nextRetryAt: number | undefined): boolean {
  if (!nextRetryAt) return true;
  return Date.now() >= nextRetryAt;
}

export function getRetryCountdownMs(nextRetryAt: number | undefined): number {
  if (!nextRetryAt) return 0;
  return Math.max(0, nextRetryAt - Date.now());
}

export function formatRetryCountdown(ms: number): string {
  if (ms <= 0) return "Ready to retry";
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `Retry in ${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  return `Retry in ${minutes}m`;
}
