import { afterEach, describe, expect, test, vi } from "vitest";
import { waitForGlobalAssets } from "./fade-transition";

describe("waitForGlobalAssets", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("continues immediately when there are no pending assets", () => {
    const onReady = vi.fn();

    waitForGlobalAssets(null, 1_200, onReady);

    expect(onReady).toHaveBeenCalledOnce();
  });

  test("continues when the global loader completes", () => {
    vi.useFakeTimers();
    const onReady = vi.fn();
    const unsubscribe = vi.fn();
    let complete: () => void = () => {};
    const cancel = waitForGlobalAssets({
      getAssetCount: () => 2,
      getGlobalProgress: () => 0.5,
      onComplete: (callback) => {
        complete = callback;
        return unsubscribe;
      },
    }, 1_200, onReady);

    complete();
    cancel();

    expect(onReady).toHaveBeenCalledOnce();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  test("cleans up when completion happens during registration", () => {
    const onReady = vi.fn();
    const unsubscribe = vi.fn();

    waitForGlobalAssets({
      getAssetCount: () => 1,
      getGlobalProgress: () => 0.99,
      onComplete: (callback) => {
        callback();
        return unsubscribe;
      },
    }, 1_200, onReady);

    expect(onReady).toHaveBeenCalledOnce();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  test("caps the asset wait", () => {
    vi.useFakeTimers();
    const onReady = vi.fn();
    const unsubscribe = vi.fn();
    waitForGlobalAssets({
      getAssetCount: () => 1,
      getGlobalProgress: () => 0,
      onComplete: () => unsubscribe,
    }, 1_200, onReady);

    vi.advanceTimersByTime(1_199);
    expect(onReady).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onReady).toHaveBeenCalledOnce();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  test("cancels pending callbacks on unmount", () => {
    vi.useFakeTimers();
    const onReady = vi.fn();
    const unsubscribe = vi.fn();
    const cancel = waitForGlobalAssets({
      getAssetCount: () => 1,
      getGlobalProgress: () => 0,
      onComplete: () => unsubscribe,
    }, 1_200, onReady);

    cancel();
    vi.runAllTimers();

    expect(onReady).not.toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
