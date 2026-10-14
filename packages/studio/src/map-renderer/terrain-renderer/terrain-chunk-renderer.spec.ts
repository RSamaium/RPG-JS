import { afterEach, describe, expect, it, vi } from "vitest";
import { StudioTerrainPainter } from "./terrain-painter";
import type { TerrainPaintBackend } from "./terrain-paint-backend";
import {
  resolveTerrainHoleWaveDescriptors,
  shouldRenderTerrainGridWithSoftMasks,
  StudioTerrainChunkRenderer,
} from "./terrain-chunk-renderer";

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
      const [key, bounds] = args as [string, any];
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
    const painter = new StudioTerrainPainter();
    const getBuffer = (control: any) =>
      (painter as any).getTerrainControlBuffer(control, null);
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

describe("StudioTerrainChunkRenderer legacy terrain composition", () => {
  it("keeps filled water holes available for surface undulation when map waves are disabled", () => {
    expect(resolveTerrainHoleWaveDescriptors([
      { id: "pond", kind: "hole", params: { fillHeight: 32 }, strokes: [] },
    ] as any, { enabled: false, intensity: 1 })).toHaveLength(1);
  });

  it("selects soft-mask composition for texture grids without a control texture", () => {
    const map = createTerrainMap(96, 48);
    map.terrainRenderData.asset = {
      sourceTexture: "terrain.png",
      textureGrid: { columns: 2, rows: 1, tileSize: 48 },
      terrainTextures: [
        { id: "grass", index: 0, label: "Grass" },
        { id: "dirt", index: 1, label: "Dirt" },
      ],
      transitions: [],
    } as any;
    (map.terrainRenderData as any).terrainGrid = [[
      { source: "terrain-texture", terrainTextureId: "grass", textureIndex: 0, collision: false },
      { source: "terrain-texture", terrainTextureId: "dirt", textureIndex: 1, collision: false },
    ]];

    expect(shouldRenderTerrainGridWithSoftMasks(map.terrainRenderData as any)).toBe(true);

    map.terrainRenderData.terrainControl = { source: "control.png" } as any;
    expect(shouldRenderTerrainGridWithSoftMasks(map.terrainRenderData as any)).toBe(false);
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

  it("rasterizes non-streamed chunks lazily as the viewport moves", async () => {
    const { renderer, renderChunk } = createInstrumentedRenderer();
    const map = createTerrainMap(3072, 1536);

    await renderer.renderMap(map, {
      viewportBounds: { x: 0, y: 0, width: 700, height: 700 },
      viewportMargin: 0,
    });
    expect(renderChunk.mock.calls.map(([key]) => key)).toEqual(["0:0"]);

    renderChunk.mockClear();
    await renderer.renderMap(map, {
      viewportBounds: { x: 800, y: 0, width: 700, height: 700 },
      viewportMargin: 0,
    });
    expect(renderChunk.mock.calls.map(([key]) => key)).toEqual(["1:0"]);
    expect([...(renderer as any).chunks.keys()]).toEqual(["0:0", "1:0"]);
  });

  it("draws the chunks in view that a stream update left out, as the camera moves over a map first drawn in part", async () => {
    const { renderer, renderChunk } = createInstrumentedRenderer();
    const map = createTerrainMap(3072, 1536);
    // The map is drawn where the camera is...
    await renderer.renderMap(map, { viewportBounds: { x: 0, y: 0, width: 700, height: 700 }, viewportMargin: 0 });
    expect([...(renderer as any).chunks.keys()]).toEqual(["0:0"]);

    // ...a stroke is given to the runtime as a stream update that touches chunk 0:0 only...
    const update = {
      revision: "",
      generation: 1,
      dirtyRegions: [{ x: 0, y: 0, width: 100, height: 100 }],
      activeRegions: [{ x: 0, y: 0, width: 3072, height: 1536 }],
    };
    map.terrainRenderData.version = "editor:1";
    renderChunk.mockClear();
    await renderer.renderMap(map, { streamUpdate: update, viewportBounds: { x: 0, y: 0, width: 700, height: 700 }, viewportMargin: 0 });
    expect(renderChunk.mock.calls.map(([key]) => key)).toEqual(["0:0"]);

    // ...and the camera moves over chunks never drawn: they are drawn, the one already there is not drawn again.
    renderChunk.mockClear();
    await renderer.renderMap(map, { streamUpdate: update, viewportBounds: { x: 800, y: 0, width: 700, height: 700 }, viewportMargin: 0 });
    expect(renderChunk.mock.calls.map(([key]) => key)).toEqual(["1:0"]);
    renderChunk.mockClear();
    await renderer.renderMap(map, { streamUpdate: update, viewportBounds: { x: 800, y: 0, width: 700, height: 700 }, viewportMargin: 0 });
    expect(renderChunk).not.toHaveBeenCalled();
  });

  it("shows the chunks of the view the camera has when the drawing ends, not of the view it had when it began", async () => {
    const { renderer } = createInstrumentedRenderer();
    const map = createTerrainMap(3072, 1536);
    const update = {
      revision: "",
      generation: 1,
      dirtyRegions: [{ x: 0, y: 0, width: 3072, height: 1536 }],
      activeRegions: [{ x: 0, y: 0, width: 3072, height: 1536 }],
    };
    const drawing = renderer.renderMap(map, { streamUpdate: update, viewportBounds: { x: 0, y: 0, width: 700, height: 700 }, viewportMargin: 0 });
    // the camera moves to the other end of the map while the chunks are drawn
    renderer.updateChunkVisibility({ x: 2400, y: 800, width: 600, height: 700 }, 0);
    await drawing;
    const visible = [...(renderer as any).chunks.values()].filter((chunk: any) => chunk.sprite.visible).map((chunk: any) => chunk.key);
    expect(visible).toEqual(["3:1"]);
  });

  it("draws once more, when the camera rests, the chunks drawn while it moved", async () => {
    const { renderer, renderChunk } = createInstrumentedRenderer();
    const map = createTerrainMap(3072, 1536);
    const update = {
      revision: "",
      generation: 1,
      dirtyRegions: [{ x: 0, y: 0, width: 3072, height: 1536 }],
      activeRegions: [{ x: 0, y: 0, width: 3072, height: 1536 }],
    };
    const drawing = renderer.renderMap(map, { streamUpdate: update, viewportBounds: { x: 0, y: 0, width: 700, height: 700 }, viewportMargin: 0 });
    renderer.updateChunkVisibility({ x: 2400, y: 800, width: 600, height: 700 }, 0);
    await drawing;
    renderChunk.mockClear();
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(renderChunk.mock.calls.map(([key]) => key)).toEqual(["3:1"]);
    renderChunk.mockClear();
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(renderChunk).not.toHaveBeenCalled();
  });

  it("does not lose the chunks a stream update asked for when another render replaces the one drawing them", async () => {
    const { renderer, renderChunk } = createInstrumentedRenderer();
    const map = createTerrainMap(3072, 1536);
    const update = {
      revision: "",
      generation: 1,
      dirtyRegions: [{ x: 0, y: 0, width: 3072, height: 1536 }],
      activeRegions: [{ x: 0, y: 0, width: 3072, height: 1536 }],
    };
    // the camera moves while the first chunk is drawn: the call it makes replaces the drawing in progress
    let replaced: Promise<void> | undefined;
    let replacing = false;
    const original = renderChunk.getMockImplementation()!;
    renderChunk.mockImplementation((...args: unknown[]) => {
      original(...args);
      if (replacing) return;
      replacing = true;
      replaced = renderer.renderMap(map, { streamUpdate: update, viewportBounds: { x: 2300, y: 800, width: 700, height: 700 }, viewportMargin: 0 });
    });
    await renderer.renderMap(map, { streamUpdate: update, viewportBounds: { x: 0, y: 0, width: 700, height: 700 }, viewportMargin: 0 });
    await replaced;
    expect([...(renderer as any).chunks.keys()].sort()).toEqual(["0:0", "0:1", "1:0", "1:1", "2:0", "2:1", "3:0", "3:1"]);
  });

  it("drops a chunk drawn for a render that another render replaced", async () => {
    const pending: Array<(paint: { canvas: unknown; water: null }) => void> = [];
    const painter: TerrainPaintBackend = {
      setData: vi.fn(),
      paintChunk: () => new Promise((resolve) => void pending.push(resolve as never)),
      paintWallOcclusion: async () => [],
      paintWallShadow: async () => [],
      paintLiquidContact: async () => null,
      clearCaches: vi.fn(),
      destroy: vi.fn(),
    };
    const renderer = new StudioTerrainChunkRenderer({ sortableChildren: false } as any, { chunkSize: 768, painter });
    const placeChunk = vi.spyOn(renderer as any, "placeChunk").mockImplementation(() => undefined);
    const map = createTerrainMap(768, 768);

    const obsolete = renderer.renderMap(map);
    map.terrainRenderData.version = "streamed:revision-1:2";
    const current = renderer.renderMap(map);
    expect(pending).toHaveLength(2); // each render waits for its chunk

    pending[0]!({ canvas: {}, water: null });
    pending[1]!({ canvas: {}, water: null });
    await Promise.all([obsolete, current]);

    expect(placeChunk).toHaveBeenCalledTimes(1);
  });

  it("closes the bitmaps a worker gave when a chunk goes", () => {
    class FakeBitmap { close = vi.fn(); }
    vi.stubGlobal("ImageBitmap", FakeBitmap);
    try {
      const { renderer } = createInstrumentedRenderer();
      const [chunk, surface, mask] = [new FakeBitmap(), new FakeBitmap(), new FakeBitmap()];
      (renderer as any).destroyChunk.mockRestore?.();
      const real = (StudioTerrainChunkRenderer.prototype as any).destroyChunk;
      real.call(renderer, {
        sprite: { destroyed: true },
        canvas: chunk,
        waterOverlay: { sprite: { destroyed: true }, surface, regions: [{ mask }] },
      });
      expect([chunk.close, surface.close, mask.close].map((close) => close.mock.calls.length)).toEqual([1, 1, 1]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("updates water animation smoothly at no more than thirty frames per second", () => {
    const { renderer } = createInstrumentedRenderer();
    const region = { phase: 0, speed: 1 };
    (renderer as any).chunks.set("0:0", {
      sprite: { visible: false },
      waterOverlay: {
        sprite: { destroyed: false, visible: false },
        regions: [region],
      },
    });

    for (let index = 0; index < 2; index += 1) renderer.update(16);
    expect(region.phase).toBe(0);
    renderer.update(16);
    expect(region.phase).toBeCloseTo(0.048);
  });

  describe("water animation budget", () => {
    const overlays = (count: number) => Array.from({ length: count }, (_, index) => ({
      id: index,
      sprite: { destroyed: false, visible: true },
      regions: [{ phase: 0, speed: 1 }],
    }));
    const setup = (count: number, costMs: number) => {
      const { renderer } = createInstrumentedRenderer();
      const list = overlays(count);
      list.forEach((overlay, index) => (renderer as any).chunks.set(`${index}:0`, { sprite: { visible: true }, waterOverlay: overlay }));
      let clock = 0;
      vi.spyOn(performance, "now").mockImplementation(() => clock);
      const drawn: number[] = [];
      vi.spyOn(renderer as any, "drawWaterOverlay").mockImplementation((overlay: any) => { drawn.push(overlay.id); clock += costMs; });
      return { renderer, list, drawn };
    };
    afterEach(() => vi.restoreAllMocks());

    it("redraws as many water overlays as fit in the budget, and the others on the next update", () => {
      const { renderer, drawn } = setup(4, 4);

      renderer.update(40);
      expect(drawn).toEqual([0, 1]); // 4 ms each: the budget (6 ms) is spent after two
      renderer.update(40);
      expect(drawn).toEqual([0, 1, 2, 3]); // the others take their turn
      renderer.update(40);
      expect(drawn.slice(4)).toEqual([0, 1]); // and it goes round again
    });

    it("always redraws at least one overlay, even if it alone is over the budget", () => {
      const { renderer, drawn } = setup(3, 50);

      renderer.update(40);
      renderer.update(40);
      renderer.update(40);

      expect(drawn).toEqual([0, 1, 2]);
    });

    it("keeps the waves moving at their speed for the overlays that wait", () => {
      const { renderer, list } = setup(4, 4);

      renderer.update(40);

      list.forEach((overlay) => expect(overlay.regions[0]!.phase).toBeCloseTo(0.04)); // all of them, drawn or not
    });

    it("draws every overlay in one update when they are cheap", () => {
      const { renderer, drawn } = setup(4, 1);

      renderer.update(40);

      expect(drawn).toEqual([0, 1, 2, 3]);
    });
  });
});
