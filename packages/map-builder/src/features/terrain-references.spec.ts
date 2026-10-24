// @vitest-environment node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { prepareTerrainMap, renderTerrainRegion, type RasterImage, type TerrainMapDocument } from "@rpgjs/render-map2d";
import { describe, expect, it } from "vitest";
import { defineAssets } from "../model/assets";
import { defineMap } from "../model/define-map";
import { createMapModel } from "../model/model";
import { createMapView } from "../renderer/view";
import { defineTerrain, NO_MATERIAL, paint, readAll, readTerrain, terrainPatchHandlers, type LayersOptions, type TerrainMode } from "../terrain";
import { memorySurface, terrain } from "./terrain";

/**
 * Reference snapshots of the terrain, one per kind of terrain the kernel knows (MAP_BUILDER.md, step 6a).
 *
 * Each case is a small map painted with one kind of material over grass. The pixels the kernel gives for it
 * are frozen as a fingerprint in `__references__/terrain.json`; the terrain feature, which renders the same map
 * in chunks that are put together, must give the same fingerprint. If the kernel changes its output on purpose:
 *   UPDATE_TERRAIN_REFERENCES=1 pnpm vitest run terrain-references
 */
const FILE = resolve(__dirname, "__references__/terrain.json");
let SIZE: [number, number] = [192, 128];
const CHUNK = 64; // 3 x 2 chunks: every case crosses chunk borders

const assets = defineAssets({ grass: { src: "grass.png" }, other: { src: "other.png" }, sheet: { src: "sheet.png" }, liquid: { src: "liquid.png" } });

/** A deterministic 16 px texture with some structure, so that blends and slices have something to show. */
const raster = (src: string): RasterImage => {
  const base: Record<string, [number, number, number]> = { "grass.png": [70, 140, 60], "other.png": [150, 110, 70], "sheet.png": [180, 60, 60], "liquid.png": [40, 100, 170] };
  const [r, g, b] = base[src] ?? [255, 0, 255];
  const pixels = new Uint8ClampedArray(16 * 16 * 4);
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const edge = x < 4 || y < 4 || x >= 12 || y >= 12 ? 40 : 0; // a frame, for the nine-slice
      const noise = ((x * 7 + y * 13) % 17) - 8;
      pixels.set([r + noise + edge, g + noise + edge, b + noise - edge, 255], (y * 16 + x) * 4);
    }
  }
  return { width: 16, height: 16, pixels };
};

interface Case {
  readonly name: string;
  readonly description: string;
  readonly mode: TerrainMode | undefined;
  readonly options?: LayersOptions;
  readonly specialType?: string;
  readonly priority?: number;
  readonly shape?: "disc" | "bar";
}

const hole = {
  id: "pond", kind: "hole",
  params: { depth: 14, fillHeight: 100, fillTextureId: "other", border: true, foam: true },
  strokes: [{ id: "s", radius: 22, points: [{ x: 96, y: 64 }] }],
};
const wall = { id: "cliff", kind: "wall", params: { height: 40 }, strokes: [{ id: "s", radius: 10, points: [{ x: 40, y: 40 }, { x: 150, y: 90 }] }] };

const CASES: Case[] = [
  { name: "hard", description: "Cut edge, no blending.", mode: { type: "hard" } },
  { name: "fade-smooth", description: "Soft edge, smooth curve.", mode: { type: "fade", width: 18, curve: "smooth" } },
  { name: "fade-linear", description: "Soft edge, linear curve.", mode: { type: "fade", width: 24, curve: "linear" } },
  { name: "fade-sharp", description: "Narrow soft edge, sharp curve.", mode: { type: "fade", width: 10, curve: "sharp" } },
  { name: "fade-sharp-grass-edge", description: "The fade the kernel dresses with a grass rim.", mode: { type: "fade", width: 12, curve: "sharp" } },
  { name: "nine-slice", description: "A border cut from a sheet, stretched around the area.", mode: { type: "nine-slice", center: { x: 4, y: 4, width: 8, height: 8 } }, shape: "bar" },
  { name: "water", description: "Water with border and foam.", mode: { type: "water", border: true, foam: true }, specialType: "water" },
  { name: "water-bare", description: "Water without border or foam.", mode: { type: "water", border: false, foam: false }, specialType: "water" },
  { name: "custom-grass-edge", description: "Preset: a rim along the edge.", mode: { type: "custom", shaderKey: "grass-edge" } },
  { name: "custom-carpet", description: "Preset: carpet border.", mode: { type: "custom", shaderKey: "carpet" }, shape: "bar" },
  { name: "custom-road-sidewalk", description: "Preset: town road with sidewalk.", mode: { type: "custom", shaderKey: "road-town-sidewalk" }, shape: "bar" },
  { name: "custom-road-marked", description: "Preset: town road with lane marks.", mode: { type: "custom", shaderKey: "road-town-marked" }, shape: "bar" },
  { name: "transition-hard", description: "A rule that makes two materials meet with a cut edge.", mode: { type: "fade", width: 20 }, options: { transitions: [{ from: "grass", to: "area", mode: { type: "hard" } }] } },
  { name: "morphology-hole", description: "A hole filled with liquid.", mode: { type: "fade", width: 18 }, options: { morphology: [hole] } },
  { name: "morphology-wall", description: "A wall drawn by a stroke.", mode: { type: "hard" }, options: { morphology: [wall] } },
  { name: "mask-scale-2", description: "A mask at half the resolution of the world.", mode: { type: "fade", width: 18, curve: "smooth" }, options: { scale: 2 } },
];

function build(c: Case, options: { hardBase?: boolean } = {}) {
  const terrainDef = defineTerrain({
    grass: { texture: "grass", mode: options.hardBase ? { type: "hard" } : { type: "fade", width: 18, curve: "smooth" } },
    area: { texture: c.mode?.type === "nine-slice" || c.mode?.type === "custom" ? "sheet" : "other", ...(c.mode ? { mode: c.mode } : {}), ...(c.specialType ? { specialType: c.specialType } : {}), ...(c.mode?.type === "water" ? { texture: "liquid" } : {}) },
    other: { texture: "other", mode: { type: "hard" } },
  });
  const shape = c.shape === "bar"
    ? paint.rect("area", { x: 30, y: 30, width: 130, height: 60 })
    : paint.circle("area", { x: 96, y: 64, radius: 42 });
  return createMapModel(
    defineMap(assets, { id: c.name, size: SIZE, terrain: terrainDef.layers([paint.fill("grass"), shape], { chunk: 32, ...c.options }) }),
    { patchHandlers: [terrainPatchHandlers] },
  );
}

/** The map as the kernel renders it, written out by hand: no adapter of ours in between. */
function direct(model: ReturnType<typeof build>): Uint8ClampedArray {
  const data = readTerrain(model.state)!;
  const values = readAll(data.mask);
  const control = new Uint8ClampedArray(values.length * 4);
  values.forEach((value, i) => control.set([value & 255, value >> 8, 0, value === NO_MATERIAL ? 0 : 255], i * 4));
  const sourceOf = (id: string) => `${(model.state.extensions as never as { terrain: { materials: Array<{ id: string; texture: string }> } }).terrain.materials.find((m) => m.id === id)!.texture}`;
  const map: TerrainMapDocument = {
    version: 1, width: SIZE[0], height: SIZE[1], tileSize: 48,
    textureGrid: { columns: 1, rows: 1, tileSize: 16 },
    textures: data.materials.map((material, index) => ({
      id: material.id, index, label: material.id, source: `${material.texture}.png`, priority: index,
      sourceRect: { x: 0, y: 0, width: 16, height: 16 },
      ...(material.mode ? { defaultRenderMode: material.mode as never } : {}),
      ...(material.specialType ? { specialType: material.specialType } : {}),
    })),
    transitions: (data.transitions ?? []) as never,
    controlTexture: { width: data.mask.width, height: data.mask.height, palette: data.materials.map((m) => m.id), pixels: control },
    morphology: (data.morphology ?? []) as never,
    waterAnimation: { enabled: false, speed: 1, intensity: 1, direction: 0 },
  };
  void sourceOf;
  const textures = Object.fromEntries(data.materials.map((m) => [`${m.texture}.png`, raster(`${m.texture}.png`)]));
  return renderTerrainRegion(prepareTerrainMap({ map, textures }), {}).pixels;
}

async function viaFeature(model: ReturnType<typeof build>): Promise<Uint8ClampedArray> {
  const surfaces = memorySurface();
  const view = createMapView({ model, assets, interactive: false, features: [terrain({ chunk: CHUNK, surface: surfaces, loadImage: async (src) => raster(src) })], onError: () => undefined });
  await view.terrain.whenIdle();
  const out = new Uint8ClampedArray(SIZE[0] * SIZE[1] * 4);
  for (const sprite of view.stages.ground.children[0]!.children as unknown as Array<{ x: number; y: number; texture: Parameters<typeof surfaces.pixelsOf>[0] }>) {
    const pixels = surfaces.pixelsOf(sprite.texture)!;
    for (let y = 0; y < CHUNK && sprite.y + y < SIZE[1]; y += 1) {
      for (let x = 0; x < CHUNK && sprite.x + x < SIZE[0]; x += 1) out.set(pixels.subarray((y * CHUNK + x) * 4, (y * CHUNK + x) * 4 + 4), ((sprite.y + y) * SIZE[0] + sprite.x + x) * 4);
    }
  }
  view.destroy();
  return out;
}

/** What identifies a frame: a hash of every byte, how much of it is opaque, and a few samples. */
function fingerprint(pixels: Uint8ClampedArray) {
  let hash = 0x811c9dc5;
  let opaque = 0;
  const sums = [0, 0, 0];
  for (let i = 0; i < pixels.length; i += 1) {
    hash = Math.imul(hash ^ pixels[i]!, 0x01000193) >>> 0;
    if (i % 4 === 3 && pixels[i] === 255) opaque += 1;
    if (i % 4 < 3) sums[i % 4]! += pixels[i]!;
  }
  const at = (x: number, y: number) => [...pixels.slice((y * SIZE[0] + x) * 4, (y * SIZE[0] + x) * 4 + 4)];
  return { hash: hash.toString(16), opaque, mean: sums.map((s) => Math.round(s / (pixels.length / 4))), samples: [at(5, 5), at(96, 64), at(60, 40), at(150, 100)] };
}

const update = Boolean(process.env.UPDATE_TERRAIN_REFERENCES);
const frozen: Array<{ name: string; description: string } & ReturnType<typeof fingerprint>> = !update && existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : [];

describe("terrain reference snapshots", () => {
  if (update) {
    it("writes the references", () => {
      const out = CASES.map((c) => ({ name: c.name, description: c.description, ...fingerprint(direct(build(c))) }));
      mkdirSync(dirname(FILE), { recursive: true });
      writeFileSync(FILE, `${JSON.stringify(out, null, 2)}\n`);
    });
    return;
  }

  it("has one reference per case, for every kind of terrain", () => {
    expect(frozen.map((f) => f.name)).toEqual(CASES.map((c) => c.name));
    const modes = new Set(CASES.map((c) => (c.mode?.type === "custom" ? `custom:${c.mode.shaderKey}` : c.mode?.type)));
    for (const expected of ["hard", "fade", "nine-slice", "water", "custom:grass-edge", "custom:carpet", "custom:road-town-sidewalk", "custom:road-town-marked"]) expect(modes.has(expected)).toBe(true);
  });

  describe("editing, for every kind", () => {
    const STROKES = {
      "a long stroke across the map": { type: "stroke", points: [[20, 100], [100, 100], [170, 20]], radius: 12 },
      "a small dab at the end of the shape": { type: "rect", x: 158, y: 40, width: 14, height: 40 },
    } as const;
    const editing = CASES.flatMap((c) => Object.keys(STROKES).flatMap((stroke) => [[c.name, c, false, stroke] as const, [c.name, c, true, stroke] as const]));
    it.each(editing)("%s (hard base: %s), %s: the chunks equal a render of the new map", async (_name, c, hardBase, stroke) => {
      const model = build(c, { hardBase });
      const surfaces = memorySurface();
      const view = createMapView({ model, assets, interactive: false, features: [terrain({ chunk: CHUNK, surface: surfaces, loadImage: async (src) => raster(src) })], onError: () => undefined });
      await view.terrain.whenIdle();
      model.apply({ type: "terrain.paint", shape: STROKES[stroke as keyof typeof STROKES] as never, material: "area" });
      await view.terrain.whenIdle();
      const out = new Uint8ClampedArray(SIZE[0] * SIZE[1] * 4);
      for (const sprite of view.stages.ground.children[0]!.children as unknown as Array<{ x: number; y: number; texture: Parameters<typeof surfaces.pixelsOf>[0] }>) {
        const pixels = surfaces.pixelsOf(sprite.texture)!;
        for (let y = 0; y < CHUNK && sprite.y + y < SIZE[1]; y += 1) {
          for (let x = 0; x < CHUNK && sprite.x + x < SIZE[0]; x += 1) out.set(pixels.subarray((y * CHUNK + x) * 4, (y * CHUNK + x) * 4 + 4), ((sprite.y + y) * SIZE[0] + sprite.x + x) * 4);
        }
      }
      view.destroy();
      const expected = direct(model);
      let different = 0;
      for (let i = 0; i < out.length; i += 4) if (out[i] !== expected[i] || out[i + 1] !== expected[i + 1] || out[i + 2] !== expected[i + 2]) different += 1;
      expect(different).toBe(0);
    });
  });

  it("lane marks follow the whole road: an extension at one end re-renders the other end too", async () => {
    // A long road: the marks are laid along its whole length, so adding to one end moves them everywhere.
    const previous = SIZE;
    SIZE = [640, 256];
    try {
      const c: Case = { name: "road", description: "", mode: { type: "custom", shaderKey: "road-town-marked" } };
      const terrainDef = defineTerrain({ grass: { texture: "grass", mode: { type: "hard" } }, area: { texture: "sheet", mode: c.mode! }, other: { texture: "other", mode: { type: "hard" } } });
      const model = createMapModel(
        defineMap(assets, { id: "road", size: SIZE, terrain: terrainDef.layers([paint.fill("grass"), paint.rect("area", { x: 40, y: 40, width: 400, height: 150 })], { chunk: 64 }) }),
        { patchHandlers: [terrainPatchHandlers] },
      );
      const surfaces = memorySurface();
      const view = createMapView({ model, assets, interactive: false, features: [terrain({ chunk: 128, surface: surfaces, loadImage: async (src) => raster(src) })], onError: () => undefined });
      await view.terrain.whenIdle();
      model.apply({ type: "terrain.paint", shape: { type: "rect", x: 440, y: 80, width: 60, height: 30 }, material: "area" });
      await view.terrain.whenIdle();
      const out = new Uint8ClampedArray(SIZE[0] * SIZE[1] * 4);
      for (const sprite of view.stages.ground.children[0]!.children as unknown as Array<{ x: number; y: number; texture: Parameters<typeof surfaces.pixelsOf>[0] }>) {
        const pixels = surfaces.pixelsOf(sprite.texture)!;
        for (let y = 0; y < 128 && sprite.y + y < SIZE[1]; y += 1) for (let x = 0; x < 128 && sprite.x + x < SIZE[0]; x += 1) out.set(pixels.subarray((y * 128 + x) * 4, (y * 128 + x) * 4 + 4), ((sprite.y + y) * SIZE[0] + sprite.x + x) * 4);
      }
      view.destroy();
      const expected = direct(model);
      let different = 0;
      for (let i = 0; i < out.length; i += 4) if (out[i] !== expected[i] || out[i + 1] !== expected[i + 1] || out[i + 2] !== expected[i + 2]) different += 1;
      expect(different).toBe(0);
    } finally {
      SIZE = previous;
    }
  });

  describe.each(CASES)("$name", (c) => {
    const reference = frozen.find((f) => f.name === c.name)!;
    it("is still what the kernel gave when the reference was frozen", () => {
      expect(fingerprint(direct(build(c)))).toEqual({ hash: reference.hash, opaque: reference.opaque, mean: reference.mean, samples: reference.samples });
    });
    it("is what the terrain feature draws, chunk by chunk", async () => {
      expect(fingerprint(await viaFeature(build(c)))).toEqual({ hash: reference.hash, opaque: reference.opaque, mean: reference.mean, samples: reference.samples });
    });
    it("is not blank, and shows the material that was painted", () => {
      expect(reference.opaque).toBeGreaterThan(SIZE[0] * SIZE[1] * 0.9);
      expect(JSON.stringify(reference.samples[1])).not.toBe(JSON.stringify(reference.samples[0]));
    });
  });
});
