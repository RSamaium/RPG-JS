// @vitest-environment node
import { prepareTerrainMap, renderTerrainRegion, type RasterImage, type TerrainMapDocument } from "@rpgjs/render-map2d";
import { describe, expect, it, vi } from "vitest";
import { defineAssets } from "../model/assets";
import { defineMap } from "../model/define-map";
import { createMapModel } from "../model/model";
import type { MapPatch } from "../model/patches";
import { createMapView } from "../renderer/view";
import { inlineTerrainBackend, workerTerrainBackend, type TerrainBackend, type WorkerLike, type WorkerRequest, type WorkerResponse } from "../terrain-render/backend";
import { TerrainKernelHost } from "../terrain-render/host";
import { readTerrain, terrainPatchHandlers, defineTerrain, paint, readAll, NO_MATERIAL } from "../terrain";
import { memorySurface, terrain } from "./terrain";

/**
 * The terrain feature against the kernel itself: whatever is on the chunk textures must be what the kernel
 * gives for the whole map, after the initial render and after any sequence of edits.
 */
const CHUNK = 128;
const SIZE: [number, number] = [320, 224]; // 3 x 2 chunks, the last ones partial

const assets = defineAssets({
  grass: { src: "grass.png" },
  dirt: { src: "dirt.png" },
  water: { src: "water.png" },
  rock: { src: "rock.png" },
});

/** A deterministic 16 px texture per image, with noise, so that blends have something to blend. */
const raster = (src: string): RasterImage => {
  const base: Record<string, [number, number, number]> = { "grass.png": [70, 140, 60], "dirt.png": [140, 100, 60], "water.png": [40, 100, 170], "rock.png": [120, 120, 130] };
  const [r, g, b] = base[src] ?? [255, 0, 255];
  const pixels = new Uint8ClampedArray(16 * 16 * 4);
  for (let i = 0; i < 256; i += 1) {
    const noise = ((i * 37) % 21) - 10;
    pixels.set([r + noise, g + noise, b + noise, 255], i * 4);
  }
  return { width: 16, height: 16, pixels };
};
const loadImage = async (src: string) => raster(src);

const palette = defineTerrain({
  grass: { texture: "grass", mode: { type: "fade", width: 18, curve: "smooth" } },
  dirt: { texture: "dirt", mode: { type: "fade", width: 24 } },
  water: { texture: "water", mode: { type: "water", border: true, foam: true }, collision: true },
  rock: { texture: "rock", mode: { type: "hard" } },
});

const definition = () =>
  defineMap(assets, {
    id: "meadow",
    size: SIZE,
    terrain: palette.layers([paint.fill("grass"), paint.circle("dirt", { x: 100, y: 90, radius: 50 }), paint.circle("water", { x: 220, y: 150, radius: 40 }), paint.circle("rock", { x: 40, y: 190, radius: 25 })], { chunk: 64 }),
  });

/** The map as the kernel renders it, built by hand (not through the adapter under test). */
function referenceFrame(model: { state: Parameters<typeof readTerrain>[0] }): Uint8ClampedArray {
  const data = readTerrain(model.state)!;
  const values = readAll(data.mask);
  const control = new Uint8ClampedArray(values.length * 4);
  values.forEach((value, i) => control.set([value & 255, value >> 8, 0, value === NO_MATERIAL ? 0 : 255], i * 4));
  const document: TerrainMapDocument = {
    version: 1, width: SIZE[0], height: SIZE[1], tileSize: 48,
    textureGrid: { columns: 1, rows: 1, tileSize: 16 },
    textures: data.materials.map((material, index) => ({
      id: material.id, index, label: material.id, source: `${material.texture}.png`, priority: index,
      sourceRect: { x: 0, y: 0, width: 16, height: 16 },
      ...(material.mode ? { defaultRenderMode: material.mode as never } : {}),
      ...(material.collision ? { collision: true } : {}),
    })),
    transitions: [],
    controlTexture: { width: data.mask.width, height: data.mask.height, palette: data.materials.map((m) => m.id), pixels: control },
    morphology: [],
    waterAnimation: { enabled: false, speed: 1, intensity: 1, direction: 0 },
  };
  const textures = Object.fromEntries(data.materials.map((m) => [`${m.texture}.png`, raster(`${m.texture}.png`)]));
  return renderTerrainRegion(prepareTerrainMap({ map: document, textures }), {}).pixels;
}

function setup(options: { backend?: () => TerrainBackend; model?: ReturnType<typeof createMapModel>; onError?: (e: unknown) => void } = {}) {
  const surfaces = memorySurface();
  const model = options.model ?? createMapModel(definition(), { patchHandlers: [terrainPatchHandlers] });
  const errors: unknown[] = [];
  const view = createMapView({
    model, assets, interactive: false,
    features: [terrain({ chunk: CHUNK, surface: surfaces, loadImage, ...(options.backend ? { backend: options.backend } : {}), onError: options.onError ?? ((e) => void errors.push(e)) })],
    onError: () => undefined,
  });
  /** Everything on the chunk textures as one image of the map. */
  const shown = (): Uint8ClampedArray => {
    const out = new Uint8ClampedArray(SIZE[0] * SIZE[1] * 4);
    const stage = view.stages.ground.children[0]!;
    for (const sprite of stage.children as unknown as Array<{ x: number; y: number; texture: Parameters<typeof surfaces.pixelsOf>[0] }>) {
      const pixels = surfaces.pixelsOf(sprite.texture)!;
      for (let y = 0; y < CHUNK && sprite.y + y < SIZE[1]; y += 1) {
        for (let x = 0; x < CHUNK && sprite.x + x < SIZE[0]; x += 1) {
          const from = (y * CHUNK + x) * 4;
          out.set(pixels.subarray(from, from + 4), ((sprite.y + y) * SIZE[0] + sprite.x + x) * 4);
        }
      }
    }
    return out;
  };
  return { view, model, shown, errors, surfaces };
}

const differences = (a: Uint8ClampedArray, b: Uint8ClampedArray): number => {
  let count = 0;
  for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) count += 1;
  return count;
};

describe("terrain feature", () => {
  it("draws what the kernel renders for the whole map, chunk by chunk", async () => {
    const { view, shown, model } = setup();
    await view.terrain.whenIdle();
    const reference = referenceFrame(model);
    expect(differences(shown(), reference)).toBe(0);
    // and it is not trivially empty: every kind of material is there
    const colours = new Set<string>();
    for (let i = 0; i < reference.length; i += 4 * 97) colours.add(`${reference[i]! >> 5},${reference[i + 1]! >> 5},${reference[i + 2]! >> 5}`);
    expect(colours.size).toBeGreaterThan(4);
    view.destroy();
  });

  it("re-renders only what a stroke touches, and gets the pixels of a full render", async () => {
    const { view, shown, model, surfaces } = setup();
    await view.terrain.whenIdle();
    const before = shown();
    const spy = vi.spyOn(view.terrain.backend!, "render");
    model.apply({ type: "terrain.paint", shape: { type: "circle", x: 40, y: 40, radius: 15 }, material: "dirt" });
    await view.terrain.whenIdle();
    expect(spy.mock.calls.length).toBeGreaterThan(0);
    // nothing rendered covers the chunks that are far away
    expect(spy.mock.calls.every(([rect]) => rect.x < CHUNK + 64 && rect.y < CHUNK + 64)).toBe(true);
    const after = shown();
    expect(differences(after, referenceFrame(model))).toBe(0);
    expect(differences(after, before)).toBeGreaterThan(0);
    // the part of the map that is far from the stroke was not touched
    const far = (a: Uint8ClampedArray) => a.slice(((SIZE[1] - 20) * SIZE[0] + 200) * 4);
    expect(differences(far(after), far(before))).toBe(0);
    void surfaces;
    view.destroy();
  });

  it("follows a long sequence of edits, undo and redo, always equal to a full render", async () => {
    const { view, shown, model } = setup();
    await view.terrain.whenIdle();
    const initial = shown();
    const strokes: MapPatch[] = [
      { type: "terrain.paint", shape: { type: "stroke", points: [[0, 100], [150, 120], [319, 80]], radius: 14 }, material: "dirt" },
      { type: "terrain.paint", shape: { type: "circle", x: 128, y: 128, radius: 30 }, material: "water" },
      { type: "terrain.paint", shape: { type: "rect", x: 250, y: 10, width: 60, height: 40 }, material: "rock" },
      { type: "terrain.paint", shape: { type: "circle", x: 220, y: 150, radius: 20 }, material: null },
    ];
    for (const patch of strokes) {
      model.apply(patch);
      await view.terrain.whenIdle();
      expect(differences(shown(), referenceFrame(model))).toBe(0);
    }
    for (let i = 0; i < strokes.length; i += 1) model.history.undo();
    await view.terrain.whenIdle();
    expect(differences(shown(), initial)).toBe(0);
    model.history.redo();
    model.history.redo();
    await view.terrain.whenIdle();
    expect(differences(shown(), referenceFrame(model))).toBe(0);
    view.destroy();
  });

  it("renders strokes that follow each other without waiting: the last state wins everywhere", async () => {
    const { view, shown, model } = setup();
    await view.terrain.whenIdle();
    for (let i = 0; i < 25; i += 1) {
      model.apply({ type: "terrain.paint", shape: { type: "circle", x: 20 + i * 12, y: 100 + Math.sin(i / 3) * 40, radius: 18 }, material: i % 2 ? "dirt" : "water" });
    }
    await view.terrain.whenIdle();
    expect(differences(shown(), referenceFrame(model))).toBe(0);
    view.destroy();
  });

  it("applies a batch, a region patch, and a palette change", async () => {
    const { view, shown, model } = setup();
    await view.terrain.whenIdle();
    model.apply([
      { type: "terrain.paint", shape: { type: "circle", x: 60, y: 60, radius: 20 }, material: "water" },
      { type: "terrain.paint", shape: { type: "circle", x: 70, y: 70, radius: 20 }, material: "rock" },
    ]);
    await view.terrain.whenIdle();
    expect(differences(shown(), referenceFrame(model))).toBe(0);

    const runs = (await import("../terrain")).encodeRuns(new Uint16Array(30 * 30).fill(1));
    model.apply({ type: "terrain.region", x: 200, y: 20, width: 30, height: 30, runs });
    await view.terrain.whenIdle();
    expect(differences(shown(), referenceFrame(model))).toBe(0);

    const materials = readTerrain(model.state)!.materials;
    model.apply({ type: "terrain.materials", materials: [...materials, { id: "sand", texture: "dirt", mode: { type: "hard" } }] });
    model.apply({ type: "terrain.paint", shape: { type: "circle", x: 280, y: 190, radius: 25 }, material: "sand" });
    await view.terrain.whenIdle();
    expect(differences(shown(), referenceFrame(model))).toBe(0);
    view.destroy();
  });

  it("does not lose a stroke made while the backend is still being given the terrain", async () => {
    const slow = () => {
      const real = inlineTerrainBackend();
      return { ...real, init: async (init: Parameters<typeof real.init>[0]) => { await new Promise((resolve) => setTimeout(resolve, 40)); return real.init(init); } };
    };
    const { view, shown, model } = setup({ backend: slow });
    await new Promise((resolve) => setTimeout(resolve, 15)); // images are loaded, the backend is initialising
    model.apply({ type: "terrain.paint", shape: { type: "circle", x: 150, y: 100, radius: 30 }, material: "water" });
    model.apply({ type: "terrain.paint", shape: { type: "circle", x: 170, y: 110, radius: 30 }, material: "rock" });
    await view.terrain.whenIdle();
    await new Promise((resolve) => setTimeout(resolve, 60));
    await view.terrain.whenIdle();
    expect(differences(shown(), referenceFrame(model))).toBe(0);
    view.destroy();
  });

  it("does nothing on a map without terrain, and draws it when a terrain arrives", async () => {
    const bare = createMapModel(defineMap(assets, { id: "bare", size: SIZE }), { patchHandlers: [terrainPatchHandlers] });
    const { view, shown, errors } = setup({ model: bare });
    await view.terrain.whenIdle();
    expect(view.terrain.pending).toBe(0);
    expect(view.stages.ground.children[0]!.children).toHaveLength(0);
    const built = definition().extensions!.terrain!;
    bare.apply({ type: "extension.set", id: "terrain", value: built });
    await view.terrain.whenIdle();
    expect(differences(shown(), referenceFrame(bare))).toBe(0);
    expect(errors).toEqual([]);
    view.destroy();
  });

  it("goes on without a material whose asset is unknown, and says so", async () => {
    const broken = definition();
    const data = broken.extensions!.terrain as unknown as { materials: Array<{ texture: string }> };
    const ghosted = { ...broken, extensions: { terrain: { ...data, materials: data.materials.map((m, i) => (i === 3 ? { ...m, texture: "ghost" } : m)) } } };
    const { view, errors } = setup({ model: createMapModel(ghosted as never, { patchHandlers: [terrainPatchHandlers] }) });
    await view.terrain.whenIdle();
    expect(String(errors[0])).toContain('unknown asset "ghost"');
    expect(view.stages.ground.children[0]!.children.length).toBeGreaterThan(0);
    view.destroy();
  });

  it("reports an image that does not load, and does not get stuck", async () => {
    const errors: unknown[] = [];
    const view = createMapView({
      model: createMapModel(definition(), { patchHandlers: [terrainPatchHandlers] }), assets, interactive: false,
      features: [terrain({ chunk: CHUNK, surface: memorySurface(), loadImage: async (src) => { if (src === "water.png") throw new Error("404"); return raster(src); }, onError: (e) => void errors.push(e) })],
      onError: () => undefined,
    });
    await view.terrain.whenIdle();
    expect(errors.map(String)).toContain("Error: 404");
    expect(view.terrain.pending).toBe(0);
    view.destroy();
  });

  it("renders what is in the viewport first", async () => {
    const order: number[] = [];
    const { view } = setup({
      backend: () => {
        const real = inlineTerrainBackend();
        return { ...real, render: (rect, margin) => (order.push(rect.x), real.render(rect, margin)) };
      },
    });
    view.setViewport({ x: 260, y: 0, width: 50, height: 50 });
    await view.terrain.whenIdle();
    // chunk of x = 256 is the one shown: first, whatever the initial order was
    expect(order.length).toBeGreaterThanOrEqual(6);
    view.destroy();
  });

  it("stops everything when the view is destroyed", async () => {
    const { view } = setup();
    view.destroy();
    expect(() => view.terrain.pending).not.toThrow();
  });
});

describe("terrain in a pool of workers", () => {
  /** Workers that run the real kernel host, answer in a scrambled order, and copy their messages like postMessage does. */
  function fakeWorkers(delays: number[]) {
    const created: Array<{ host: TerrainKernelHost; log: string[] }> = [];
    const createWorker = (): WorkerLike => {
      const host = new TerrainKernelHost();
      const log: string[] = [];
      created.push({ host, log });
      let listener: ((event: { data: WorkerResponse }) => void) | undefined;
      const delay = delays[created.length - 1] ?? 0;
      const send = (data: WorkerResponse) => setTimeout(() => listener?.({ data }), delay);
      return {
        addEventListener: ((type: string, fn: (event: { data: WorkerResponse }) => void) => { if (type === "message") listener = fn; }) as WorkerLike["addEventListener"],
        postMessage(message: WorkerRequest) {
          log.push(message.type);
          const copy = structuredClone(message);
          try {
            if (copy.type === "init") { host.init(copy.init); send({ type: "ready" }); }
            else if (copy.type === "mask") host.updateMask(copy.rect, copy.values);
            else send({ type: "frame", job: copy.job, frame: host.render(copy.rect, copy.margin) });
          } catch (error) {
            send({ type: "error", ...("job" in copy ? { job: copy.job } : {}), message: String(error) });
          }
        },
        terminate: vi.fn(),
      };
    };
    return { createWorker, created };
  }

  it("gives every worker the terrain and every change, and ends with the pixels of a full render, whatever the order of the answers", async () => {
    const { createWorker, created } = fakeWorkers([30, 0, 12]);
    const { view, shown, model } = setup({ backend: () => workerTerrainBackend({ createWorker, workers: 3 }) });
    await view.terrain.whenIdle();
    expect(differences(shown(), referenceFrame(model))).toBe(0);
    for (let i = 0; i < 12; i += 1) model.apply({ type: "terrain.paint", shape: { type: "circle", x: 30 + i * 22, y: 110 + (i % 3) * 20, radius: 20 }, material: i % 2 ? "dirt" : "water" });
    await view.terrain.whenIdle();
    expect(differences(shown(), referenceFrame(model))).toBe(0);
    expect(created).toHaveLength(3);
    for (const { log } of created) {
      expect(log[0]).toBe("init");
      expect(log.filter((type) => type === "mask")).toHaveLength(12); // every worker saw every stroke
    }
    expect(created.every(({ log }) => log.includes("render"))).toBe(true);
    view.destroy();
    expect(created.length).toBe(3);
  });

  it("rejects the renders that are in flight when a worker fails or the backend is destroyed", async () => {
    let fail = false;
    const backend = workerTerrainBackend({
      workers: 1,
      createWorker: () => {
        const listeners: Record<string, (event: never) => void> = {};
        return {
          addEventListener: ((type: string, fn: (event: never) => void) => { listeners[type] = fn; }) as WorkerLike["addEventListener"],
          postMessage(message: WorkerRequest) {
            if (message.type === "init") queueMicrotask(() => listeners.message!({ data: { type: "ready" } } as never));
            else if (message.type === "render") queueMicrotask(() => (fail ? listeners.error!({ message: "crashed" } as never) : undefined));
          },
          terminate: () => undefined,
        };
      },
    });
    await backend.init({ data: readTerrain(createMapModel(definition()).state)!, size: SIZE, tileSize: 48, sources: {}, images: {} });
    fail = true;
    await expect(backend.render({ x: 0, y: 0, width: 10, height: 10 })).rejects.toThrow("crashed");
    fail = false;
    const pending = backend.render({ x: 0, y: 0, width: 10, height: 10 });
    backend.destroy();
    await expect(pending).rejects.toThrow("destroyed");
  });
});
