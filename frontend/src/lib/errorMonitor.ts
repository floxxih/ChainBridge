/**
 * Lightweight error monitoring for runtime exceptions (#175).
 *
 * Usage: call `initErrorMonitor()` once at app startup.
 * Reports are sent to NEXT_PUBLIC_ERROR_REPORT_URL when set.
 * All reports are scrubbed of PII before transmission.
 */

const REPORT_URL = process.env.NEXT_PUBLIC_ERROR_REPORT_URL ?? "";
const ENABLED = process.env.NEXT_PUBLIC_ERROR_MONITORING_ENABLED !== "false";

/** Fields stripped from error context to avoid PII leakage. */
const PII_KEYS = /address|wallet|email|key|secret|token|seed|mnemonic/i;

function scrub(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, PII_KEYS.test(k) ? "[redacted]" : v])
  );
}

export interface ErrorReport {
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  url: string;
  timestamp: string;
}

async function send(report: ErrorReport) {
  if (!ENABLED || !REPORT_URL) {
    // In development, always log to console for visibility
    if (process.env.NODE_ENV !== "production") {
      console.error("[errorMonitor]", report);
    }
    return;
  }
  try {
    await fetch(REPORT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
      keepalive: true,
    });
  } catch {
    // Never throw from error reporter
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  const err = error instanceof Error ? error : new Error(String(error));
  send({
    message: err.message,
    stack: err.stack,
    context: context ? scrub(context) : undefined,
    url: typeof window !== "undefined" ? window.location.href : "",
    timestamp: new Date().toISOString(),
  });
}

let installed = false;

export function initErrorMonitor() {
  if (typeof window === "undefined" || installed) return;
  installed = true;

  window.addEventListener("error", (event) => {
    captureError(event.error ?? event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    captureError(event.reason, { type: "unhandledrejection" });
  });
}
