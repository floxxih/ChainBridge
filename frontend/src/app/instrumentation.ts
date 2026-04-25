// Next.js instrumentation hook — runs once on server startup.
// Web vitals are reported client-side via the hook below.
export async function register() {}

export { reportWebVitals } from "@/lib/telemetry";
