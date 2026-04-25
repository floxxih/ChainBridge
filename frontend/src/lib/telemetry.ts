/**
 * Telemetry: web vitals + swap step timing (#174).
 *
 * Toggle via NEXT_PUBLIC_TELEMETRY_ENABLED=false to disable entirely.
 * Reports are sent to NEXT_PUBLIC_TELEMETRY_URL when set; otherwise logged in dev.
 */

const ENABLED = process.env.NEXT_PUBLIC_TELEMETRY_ENABLED !== "false";
const REPORT_URL = process.env.NEXT_PUBLIC_TELEMETRY_URL ?? "";

export interface MetricPayload {
  name: string;
  value: number;
  id?: string;
  tags?: Record<string, string>;
}

function send(payload: MetricPayload) {
  if (!ENABLED) return;
  if (!REPORT_URL) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[telemetry]", payload);
    }
    return;
  }
  try {
    navigator.sendBeacon(REPORT_URL, JSON.stringify(payload));
  } catch {
    // Never throw from telemetry
  }
}

/** Called by Next.js App Router to report web vitals automatically. */
export function reportWebVitals(metric: { name: string; value: number; id: string }) {
  send({ name: metric.name, value: metric.value, id: metric.id, tags: { source: "web-vitals" } });
}

/** Track a named duration (ms). Returns a stop function. */
export function startTiming(name: string, tags?: Record<string, string>): () => void {
  if (!ENABLED) return () => {};
  const start = performance.now();
  return () => send({ name, value: Math.round(performance.now() - start), tags });
}
