import { useRef, useCallback } from "react";
import { startTiming } from "@/lib/telemetry";

export type SwapStep = "quote" | "confirm" | "lock" | "claim" | "complete";

/**
 * Instruments swap flow step durations for telemetry (#174).
 * Call `startStep("quote")` when a step begins; it returns a stop function.
 */
export function useSwapTiming() {
  const stoppers = useRef<Map<SwapStep, () => void>>(new Map());

  const startStep = useCallback((step: SwapStep) => {
    const stop = startTiming(`swap_step_${step}`, { step });
    stoppers.current.set(step, stop);
  }, []);

  const stopStep = useCallback((step: SwapStep) => {
    stoppers.current.get(step)?.();
    stoppers.current.delete(step);
  }, []);

  return { startStep, stopStep };
}
