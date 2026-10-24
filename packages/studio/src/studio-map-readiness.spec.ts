import { describe, expect, it, vi } from "vitest";
import {
  beginStudioMapLoading,
  holdStudioMapReady,
  markStudioMapReady,
  waitForStudioMapReady,
} from "./studio-map-readiness";

describe("Studio map readiness", () => {
  it("waits until the initial terrain viewport is ready", async () => {
    const map = { terrainRenderData: {} };
    const ready = vi.fn();
    beginStudioMapLoading();
    void waitForStudioMapReady(map).then(ready);

    await Promise.resolve();
    expect(ready).not.toHaveBeenCalled();

    markStudioMapReady();
    await waitForStudioMapReady(map);
    expect(ready).toHaveBeenCalledOnce();
  });

  it("does not block maps without Studio terrain", async () => {
    await expect(waitForStudioMapReady({})).resolves.toBeUndefined();
  });

  it("remembers readiness when rendering wins the after-loading-hook race", async () => {
    const map = { terrainRenderData: {} };
    beginStudioMapLoading();
    markStudioMapReady();
    await expect(waitForStudioMapReady(map)).resolves.toBeUndefined();
  });

  it("starts a fresh cycle when the same map is loaded again", async () => {
    const map = { terrainRenderData: {} };
    beginStudioMapLoading();
    markStudioMapReady();
    await waitForStudioMapReady(map);

    const ready = vi.fn();
    beginStudioMapLoading();
    void waitForStudioMapReady(map).then(ready);
    await Promise.resolve();
    expect(ready).not.toHaveBeenCalled();

    markStudioMapReady();
    await waitForStudioMapReady(map);
    expect(ready).toHaveBeenCalledOnce();
  });

  it("also waits for the parts of the scene that hold the reveal", async () => {
    const map = { terrainRenderData: {} };
    const ready = vi.fn();
    beginStudioMapLoading();
    const release = holdStudioMapReady();
    void waitForStudioMapReady(map).then(ready);

    markStudioMapReady();
    await Promise.resolve();
    await Promise.resolve();
    expect(ready).not.toHaveBeenCalled();

    release();
    release();
    await waitForStudioMapReady(map);
    expect(ready).toHaveBeenCalledOnce();
  });

  it("ignores a hold taken after the map is revealed", async () => {
    const map = { terrainRenderData: {} };
    beginStudioMapLoading();
    markStudioMapReady();
    const release = holdStudioMapReady();
    await expect(waitForStudioMapReady(map)).resolves.toBeUndefined();
    expect(() => release()).not.toThrow();
  });
});
