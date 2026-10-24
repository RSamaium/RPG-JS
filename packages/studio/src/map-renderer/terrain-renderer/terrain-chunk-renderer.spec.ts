import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resolveTerrainHoleWaveDescriptors,
  shouldRenderTerrainGridWithSoftMasks,
  StudioTerrainChunkRenderer,
  StudioTerrainWallOcclusionRenderer,
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
      const [key, , bounds] = args as [string, unknown, any];
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
    expect(renderChunk.mock.calls.map(([key]) => key).sort()).toEqual(["0:0", "1:0"]);
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
    expect(renderChunk.mock.calls.map(([key]) => key).sort()).toEqual([
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
    expect(renderChunk.mock.calls.map(([key]) => key).sort()).toEqual([
      "0:0",
      "1:0",
      "2:0",
    ]);
  });

  it("renders the chunks nearest to the middle of the map first", async () => {
    const { renderer, renderChunk } = createInstrumentedRenderer();
    await renderer.renderMap(createTerrainMap());
    expect(renderChunk.mock.calls.map(([key]) => key)[0]).toBe("1:0");
  });

  it("renders the chunks nearest to the viewport first", async () => {
    const { renderer, renderChunk } = createInstrumentedRenderer();
    await renderer.renderMap(createTerrainMap(), {
      viewportBounds: { x: 1500, y: 0, width: 800, height: 600 },
      viewportMargin: 1500,
    });
    expect(renderChunk.mock.calls.map(([key]) => key)[0]).toBe("2:0");
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

  it("waits for terrain assets and drops an obsolete render request", async () => {
    const { renderer, renderChunk } = createInstrumentedRenderer();
    const map = createTerrainMap(768, 768);
    map.terrainRenderData.sourceTexture = "terrain.png";
    map.terrainRenderData.terrainControl = {
      source: "control.png",
      width: 768,
      height: 768,
      palette: [],
    } as any;
    const pending = new Map<string, {
      promise: Promise<HTMLImageElement>;
      resolve: (image: HTMLImageElement) => void;
    }>();
    for (const source of ["terrain.png", "control.png"]) {
      let resolve!: (image: HTMLImageElement) => void;
      const promise = new Promise<HTMLImageElement>((done) => { resolve = done; });
      pending.set(source, { promise, resolve });
    }
    vi.spyOn(renderer as any, "loadImage").mockImplementation(
      (...args: unknown[]) => pending.get(String(args[0]))!.promise
    );

    const obsolete = renderer.renderMap(map);
    map.terrainRenderData.version = "streamed:revision-1:2";
    const current = renderer.renderMap(map);
    expect(renderChunk).not.toHaveBeenCalled();

    pending.get("terrain.png")?.resolve({} as HTMLImageElement);
    pending.get("control.png")?.resolve({} as HTMLImageElement);
    await Promise.all([obsolete, current]);
    expect(renderChunk).toHaveBeenCalledTimes(1);
  });

  it("moves the water drawn by a shader on every frame, and only syncs it where it can be seen", () => {
    const { renderer } = createInstrumentedRenderer();
    const visible = { phase: 0, speed: 2 };
    const hidden = { phase: 0, speed: 1 };
    const syncVisible = vi.fn();
    const syncHidden = vi.fn();
    (renderer as any).chunks.set("0:0", {
      sprite: { visible: true },
      waterOverlay: { sprite: { destroyed: false, visible: true }, regions: [visible], gpu: { sync: syncVisible } },
    });
    (renderer as any).chunks.set("1:0", {
      sprite: { visible: false },
      waterOverlay: { sprite: { destroyed: false, visible: false }, regions: [hidden], gpu: { sync: syncHidden } },
    });

    renderer.update(16);
    renderer.update(16);

    expect(visible.phase).toBeCloseTo(0.064);
    expect(hidden.phase).toBeCloseTo(0.032); // the waves keep their speed where nobody looks
    expect(syncVisible).toHaveBeenCalledTimes(2);
    expect(syncHidden).not.toHaveBeenCalled();
  });

  it("updates water animation drawn on the CPU smoothly at no more than thirty frames per second", () => {
    const { renderer } = createInstrumentedRenderer();
    const region = { phase: 0, speed: 1 };
    (renderer as any).chunks.set("0:0", {
      sprite: { visible: false },
      waterOverlay: {
        sprite: { destroyed: false, visible: false },
        regions: [region],
        cpu: {},
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
      cpu: {},
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

describe("StudioTerrainChunkRenderer overlapping renders", () => {
  it("resolves a render only once the chunks already on their way have arrived", async () => {
    const { renderer } = createInstrumentedRenderer();
    const map = createTerrainMap();
    let painting = 0;
    (renderer as any).worker = {
      setData: () => undefined,
      dispose: () => undefined,
      paint: async () => {
        painting += 1;
        await new Promise((resolve) => setTimeout(resolve, 25));
        return { canvas: {} as HTMLCanvasElement, water: null };
      },
    };

    const first = renderer.renderMap(map);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = renderer.renderMap(map);
    let secondDone = false;
    void second.then(() => { secondDone = true; });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(secondDone).toBe(false);

    await Promise.all([first, second]);
    // Whichever call resolves, no chunk is missing when it does.
    expect([...(renderer as any).chunks.keys()].sort()).toEqual(["0:0", "1:0", "2:0"]);
    // A chunk is not painted twice for the same state.
    expect(painting).toBe(3);
  });
});

describe("StudioTerrainWallOcclusionRenderer", () => {
  it("paints the walls once when the scene asks for them again while they are being painted", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const create = vi
      .spyOn(StudioTerrainChunkRenderer.prototype, "createWallOcclusionSprites")
      .mockImplementation(async () => { await gate; return []; });
    try {
      const walls = new StudioTerrainWallOcclusionRenderer();
      const map = createTerrainMap();
      const requests = [walls.renderMap(map), walls.renderMap(map), walls.renderMap(map)];
      release();
      const results = await Promise.all(requests);
      expect(create).toHaveBeenCalledTimes(1);
      expect(results[1]).toBe(results[0]);
      // Painted: a new request for the same terrain does not paint again.
      await walls.renderMap(map);
      expect(create).toHaveBeenCalledTimes(1);
    } finally {
      create.mockRestore();
    }
  });
});

describe("StudioTerrainChunkRenderer pipeline", () => {
  it("asks the worker for the next chunk before the previous one has been handled", async () => {
    const { renderer } = createInstrumentedRenderer();
    const map = createTerrainMap();
    let inFlight = 0;
    let maxInFlight = 0;
    (renderer as any).worker = {
      setData: () => undefined,
      dispose: () => undefined,
      paint: async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 20));
        inFlight -= 1;
        return { canvas: {} as HTMLCanvasElement, water: null };
      },
    };

    await renderer.renderMap(map);

    expect(maxInFlight).toBeGreaterThanOrEqual(2);
    expect([...(renderer as any).chunks.keys()].sort()).toEqual(["0:0", "1:0", "2:0"]);
  });
});
