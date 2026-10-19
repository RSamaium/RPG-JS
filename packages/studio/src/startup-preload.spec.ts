import { afterEach, describe, expect, it, vi } from "vitest";
import { setStudioMediaPreload, waitForStudioMediaPreload } from "./startup-preload";

describe("Studio startup media preload", () => {
  afterEach(() => {
    vi.useRealTimers();
    setStudioMediaPreload(Promise.resolve());
  });

  it("resolves at once when nothing is loading", async () => {
    await expect(waitForStudioMediaPreload()).resolves.toBeUndefined();
  });

  it("waits for the preload when it ends soon", async () => {
    let done = false;
    setStudioMediaPreload(new Promise<void>((resolve) => setTimeout(() => { done = true; resolve(); }, 20)));
    await waitForStudioMediaPreload(500);
    expect(done).toBe(true);
  });

  it("stops waiting after the maximum delay", async () => {
    vi.useFakeTimers();
    setStudioMediaPreload(new Promise<void>(() => undefined));
    const waited = vi.fn();
    void waitForStudioMediaPreload(800).then(waited);
    await vi.advanceTimersByTimeAsync(799);
    expect(waited).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    expect(waited).toHaveBeenCalledOnce();
  });

  it("never rejects", async () => {
    setStudioMediaPreload(Promise.reject(new Error("offline")));
    await expect(waitForStudioMediaPreload()).resolves.toBeUndefined();
  });
});
