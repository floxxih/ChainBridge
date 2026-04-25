import { startTiming, reportWebVitals } from "@/lib/telemetry";

describe("startTiming", () => {
  it("returns a stop function", () => {
    const stop = startTiming("test_metric");
    expect(typeof stop).toBe("function");
  });

  it("stop function does not throw", () => {
    const stop = startTiming("test_metric");
    expect(() => stop()).not.toThrow();
  });
});

describe("reportWebVitals", () => {
  it("does not throw for a valid metric payload", () => {
    expect(() =>
      reportWebVitals({ name: "LCP", value: 1200, id: "v3-123" })
    ).not.toThrow();
  });
});
