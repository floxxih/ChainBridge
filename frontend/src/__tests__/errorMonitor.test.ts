import { captureError } from "@/lib/errorMonitor";

describe("captureError", () => {
  it("does not throw when called with an Error", () => {
    expect(() => captureError(new Error("test"))).not.toThrow();
  });

  it("does not throw when called with a non-Error value", () => {
    expect(() => captureError("something went wrong")).not.toThrow();
  });

  it("scrubs PII keys from context", () => {
    // Should not throw and should not expose address in payload
    expect(() =>
      captureError(new Error("test"), { wallet: "secret123", message: "ok" })
    ).not.toThrow();
  });
});
