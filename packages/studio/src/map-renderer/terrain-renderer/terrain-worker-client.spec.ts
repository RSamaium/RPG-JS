// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const workers: Array<{ terminate: ReturnType<typeof vi.fn> }> = [];

class FakeWorker {
  terminate = vi.fn();
  postMessage = vi.fn();
  onmessage: unknown = null;
  onerror: unknown = null;
  constructor() {
    workers.push(this);
  }
}

describe("TerrainWorkerClient warm-up", () => {
  beforeEach(() => {
    workers.length = 0;
    vi.resetModules();
    vi.useFakeTimers();
    vi.stubGlobal("Worker", FakeWorker);
    vi.stubGlobal("OffscreenCanvas", class {});
    vi.stubGlobal("createImageBitmap", () => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts the workers ahead and hands them out instead of starting new ones", async () => {
    const { TerrainWorkerClient } = await import("./terrain-worker-client");
    TerrainWorkerClient.warm(2);
    expect(workers).toHaveLength(2);

    expect(TerrainWorkerClient.create()).not.toBeNull();
    expect(TerrainWorkerClient.create()).not.toBeNull();
    expect(workers).toHaveLength(2);

    // The warmed ones are used up: the next one is started on demand.
    expect(TerrainWorkerClient.create()).not.toBeNull();
    expect(workers).toHaveLength(3);
  });

  it("warms only what is missing when called again", async () => {
    const { TerrainWorkerClient } = await import("./terrain-worker-client");
    TerrainWorkerClient.warm(2);
    TerrainWorkerClient.warm(2);
    expect(workers).toHaveLength(2);
  });

  it("stops a warmed worker nobody used after a while", async () => {
    const { TerrainWorkerClient } = await import("./terrain-worker-client");
    TerrainWorkerClient.warm(2);
    await vi.advanceTimersByTimeAsync(60_001);
    expect(workers.every((worker) => worker.terminate.mock.calls.length === 1)).toBe(true);
  });

  it("does nothing where workers are not available", async () => {
    vi.stubGlobal("Worker", undefined);
    const { TerrainWorkerClient } = await import("./terrain-worker-client");
    expect(() => TerrainWorkerClient.warm()).not.toThrow();
    expect(TerrainWorkerClient.create()).toBeNull();
  });
});
