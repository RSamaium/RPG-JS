// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

const gpu = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock("./terrain-water-shader", () => ({
  createTerrainWaterGpuOverlay: gpu.create,
}));

import { StudioTerrainChunkRenderer } from "./terrain-chunk-renderer";

const water = {
  overlayBounds: { x: 10.4, y: 20.6, width: 300, height: 200 },
  regions: [{ phase: 0, speed: 1, seed: 0, intensity: 0.5, direction: 0, bounds: { x: 0, y: 0, width: 300, height: 200 }, mask: {} }],
  surface: { width: 300, height: 200 },
};

describe("StudioTerrainChunkRenderer water overlay on the GPU", () => {
  it("places the quads of the shader in the world, where the chunk's water is", () => {
    const sync = vi.fn();
    const dispose = vi.fn();
    const container: any = {};
    gpu.create.mockReturnValue({ container, sync, dispose });
    const renderer = new StudioTerrainChunkRenderer({ sortableChildren: false } as any);

    const overlay = (renderer as any).createWaterOverlay(water, { x: 768, y: 1536, width: 768, height: 768 });

    expect(gpu.create).toHaveBeenCalledWith(water, { x: 778.4, y: 1556.6 });
    expect(overlay.gpu).toBeDefined();
    expect(overlay.cpu).toBeUndefined();
    expect(overlay.sprite).toBe(container);
    expect(container.x).toBe(778);
    expect(container.y).toBe(1557);
    expect(container.zIndex).toBe(0.15);
    expect(container.cullable).toBe(true);
    expect(overlay.regions).toBe(water.regions);
  });

  it("releases the shader, its textures and its geometry with the chunk", () => {
    const dispose = vi.fn();
    const destroy = vi.fn();
    const renderer = new StudioTerrainChunkRenderer({ sortableChildren: false } as any);

    (renderer as any).destroyChunk({
      sprite: { destroyed: false, destroy: vi.fn() },
      waterOverlay: { sprite: { destroyed: false, destroy }, regions: [], gpu: { dispose, sync: vi.fn() } },
    });

    expect(dispose).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledWith({ texture: true });
  });
});
