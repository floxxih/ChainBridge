import { renderHook, act } from "@testing-library/react";
import { useAsync } from "@/hooks/useAsync";

describe("useAsync", () => {
  it("starts with idle state", () => {
    const { result } = renderHook(() => useAsync());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.value).toBeNull();
  });

  it("sets loading while executing", async () => {
    const { result } = renderHook(() => useAsync<string>());
    let resolve!: (v: string) => void;
    const promise = new Promise<string>((r) => { resolve = r; });

    act(() => { result.current.execute(() => promise); });
    expect(result.current.loading).toBe(true);

    await act(async () => { resolve("done"); await promise; });
    expect(result.current.loading).toBe(false);
    expect(result.current.value).toBe("done");
  });

  it("stores error on rejection", async () => {
    const { result } = renderHook(() => useAsync<string>());
    const err = new Error("fail");

    await act(async () => {
      try {
        await result.current.execute(() => Promise.reject(err));
      } catch {}
    });

    expect(result.current.error).toBe(err);
    expect(result.current.value).toBeNull();
  });
});
