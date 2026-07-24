import { describe, expect, it, vi } from "vitest";
import { StudioTerrainChunkRenderer } from "./terrain-chunk-renderer";

function createTerrainMap(width = 2304, height = 768) {
  return {
    terrainRenderData: {
      widthTiles: width / 48,
      heightTiles: height / 48,
      tileSize: 48,
      width,
      height,
      asset: null,
      sourceTexture: "",
      terrainControl: null,
      terrainGrid: [],
      morphologyFeatures: [],
      waterAnimation: {
        enabled: false,
        speed: 1,
        intensity: 0,
        direction: 0,
      },
      version: "streamed:revision-1:1",
    },
  };
}

function createInstrumentedRenderer() {
  const renderer = new StudioTerrainChunkRenderer(
    { sortableChildren: false } as any,
    { chunkSize: 768 }
  );
  const renderChunk = vi
    .spyOn(renderer as any, "renderChunk")
    .mockImplementation((...args: unknown[]) => {
      const [key, , , , bounds] = args as [string, unknown, unknown, unknown, any];
      (renderer as any).chunks.set(key, {
        key,
        ...bounds,
        sprite: { destroyed: false, visible: true },
      });
    });
  const destroyChunk = vi
    .spyOn(renderer as any, "destroyChunk")
    .mockImplementation(() => undefined);
  return { renderer, renderChunk, destroyChunk };
}

describe("StudioTerrainChunkRenderer terrain control cache", () => {
  it("does not reuse a buffer when region content changes after the base64 prefix", () => {
    const renderer = new StudioTerrainChunkRenderer({ sortableChildren: false } as any);
    const getBuffer = (control: any) =>
      (renderer as any).getTerrainControlBuffer(control, null);
    const baseRegion = {
      key: "0:0",
      x: 0,
      y: 0,
      width: 3,
      height: 1,
      encoding: "rgba8-base64",
    };
    const first = getBuffer({
      source: "",
      width: 3,
      height: 1,
      regions: [{ ...baseRegion, data: "AQIDBAUGBwgJCgsM" }],
    });
    const second = getBuffer({
      source: "",
      width: 3,
      height: 1,
      regions: [{ ...baseRegion, data: "AQIDBAUGBwgJCgAA" }],
    });

    expect(second).not.toBe(first);
    expect(Array.from(second.data)).not.toEqual(Array.from(first.data));
  });
});

describe("StudioTerrainChunkRenderer streamed invalidation", () => {
  it("renders only active chunks and preserves chunks outside a dirty region", async () => {
    const { renderer, renderChunk, destroyChunk } = createInstrumentedRenderer();
    const map = createTerrainMap();
    const firstUpdate = {
      revision: "revision-1",
      generation: 1,
      dirtyRegions: [{ x: 0, y: 0, width: 1536, height: 768 }],
      activeRegions: [{ x: 0, y: 0, width: 1536, height: 768 }],
    };

    await renderer.renderMap(map, { streamUpdate: firstUpdate });
    expect(renderChunk.mock.calls.map(([key]) => key)).toEqual(["0:0", "1:0"]);
    const firstChunk = (renderer as any).chunks.get("0:0");

    renderChunk.mockClear();
    map.terrainRenderData.version = "streamed:revision-1:2";
    await renderer.renderMap(map, {
      streamUpdate: {
        ...firstUpdate,
        generation: 2,
        dirtyRegions: [{ x: 768, y: 0, width: 768, height: 768 }],
      },
    });

    expect(renderChunk.mock.calls.map(([key]) => key)).toEqual(["1:0"]);
    expect((renderer as any).chunks.get("0:0")).toBe(firstChunk);
    expect(destroyChunk).not.toHaveBeenCalled();
  });

  it("destroys an evicted renderer chunk without rebuilding retained chunks", async () => {
    const { renderer, renderChunk, destroyChunk } = createInstrumentedRenderer();
    const map = createTerrainMap();
    const firstUpdate = {
      revision: "revision-1",
      generation: 1,
      dirtyRegions: [{ x: 0, y: 0, width: 1536, height: 768 }],
      activeRegions: [{ x: 0, y: 0, width: 1536, height: 768 }],
    };
    await renderer.renderMap(map, { streamUpdate: firstUpdate });
    const retainedChunk = (renderer as any).chunks.get("0:0");
    const removedChunk = (renderer as any).chunks.get("1:0");

    renderChunk.mockClear();
    map.terrainRenderData.version = "streamed:revision-1:2";
    await renderer.renderMap(map, {
      streamUpdate: {
        revision: "revision-1",
        generation: 2,
        dirtyRegions: [{ x: 768, y: 0, width: 768, height: 768 }],
        activeRegions: [{ x: 0, y: 0, width: 768, height: 768 }],
      },
    });

    expect(renderChunk).not.toHaveBeenCalled();
    expect(destroyChunk).toHaveBeenCalledWith(removedChunk);
    expect((renderer as any).chunks.get("0:0")).toBe(retainedChunk);
    expect((renderer as any).chunks.has("1:0")).toBe(false);
  });

  it("uses half-open dirty bounds and fully refreshes a new revision", async () => {
    const { renderer, renderChunk } = createInstrumentedRenderer();
    const map = createTerrainMap();
    await renderer.renderMap(map, {
      streamUpdate: {
        revision: "revision-1",
        generation: 1,
        dirtyRegions: [{ x: 0, y: 0, width: 768, height: 768 }],
        activeRegions: [{ x: 0, y: 0, width: 2304, height: 768 }],
      },
    });
    expect(renderChunk.mock.calls.map(([key]) => key)).toEqual([
      "0:0",
      "1:0",
      "2:0",
    ]);

    renderChunk.mockClear();
    map.terrainRenderData.version = "streamed:revision-1:2";
    await renderer.renderMap(map, {
      streamUpdate: {
        revision: "revision-1",
        generation: 2,
        dirtyRegions: [{ x: 0, y: 0, width: 768, height: 768 }],
        activeRegions: [{ x: 0, y: 0, width: 2304, height: 768 }],
      },
    });
    expect(renderChunk.mock.calls.map(([key]) => key)).toEqual(["0:0"]);

    renderChunk.mockClear();
    map.terrainRenderData.version = "streamed:revision-2:1";
    await renderer.renderMap(map, {
      streamUpdate: {
        revision: "revision-2",
        generation: 1,
        dirtyRegions: [{ x: 1536, y: 0, width: 768, height: 768 }],
        activeRegions: [{ x: 1536, y: 0, width: 768, height: 768 }],
      },
    });
    expect(renderChunk.mock.calls.map(([key]) => key)).toEqual(["2:0"]);
    expect([...(renderer as any).chunks.keys()]).toEqual(["2:0"]);
  });

  it("keeps full-map rendering for non-streamed terrain", async () => {
    const { renderer, renderChunk } = createInstrumentedRenderer();
    await renderer.renderMap(createTerrainMap());
    expect(renderChunk.mock.calls.map(([key]) => key)).toEqual([
      "0:0",
      "1:0",
      "2:0",
    ]);
  });
});
