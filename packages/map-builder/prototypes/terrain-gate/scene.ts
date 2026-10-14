import type { PreparedTerrainMap, RasterImage, TerrainMapDocument } from "@rpgjs/render-map2d";

/**
 * Synthetic terrain for the feasibility gate (MAP_BUILDER.md, "Decision gate — terrain feasibility").
 * Not a deliverable: it only has to be as demanding as a real Studio map (five materials with
 * fades and a hard transition, animated water with border and foam, a control mask).
 */
export const CHUNK = 512;
/** The widest blend of the synthetic map (its transition fade is 24 px): a changed mask changes pixels this far around it. */
export const WIDEST_BLEND = 24;
/** Rendered and re-rendered around a dab: the blend, plus a few pixels for the tails of the soft mask. */
export const GROW = 24;
export const MATERIALS = ["grass", "dirt", "sand", "rock", "water"] as const;

/** Small deterministic PRNG, so every run (Node, browser, worker) sees the same map. */
export function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const COLORS: Record<(typeof MATERIALS)[number], [number, number, number]> = {
  grass: [86, 140, 60],
  dirt: [134, 98, 62],
  sand: [214, 196, 140],
  rock: [120, 120, 128],
  water: [40, 100, 170],
};

/** One atlas row: five 64x64 tiles with a little noise, so filtering and blending have something to chew on. */
export function createAtlas(): RasterImage {
  const tile = 64;
  const width = tile * MATERIALS.length;
  const pixels = new Uint8ClampedArray(width * tile * 4);
  const random = rng(7);
  MATERIALS.forEach((name, index) => {
    const [r, g, b] = COLORS[name];
    for (let y = 0; y < tile; y += 1) {
      for (let x = 0; x < tile; x += 1) {
        const n = (random() - 0.5) * 36;
        const offset = (y * width + index * tile + x) * 4;
        pixels[offset] = r + n;
        pixels[offset + 1] = g + n;
        pixels[offset + 2] = b + n;
        pixels[offset + 3] = 255;
      }
    }
  });
  return { width, height: tile, pixels };
}

export interface SceneOptions {
  /** Map size in chunks of 512 px. The spec says ~96 chunks at most (e.g. 12 x 8). */
  readonly chunksX: number;
  readonly chunksY: number;
  /** World pixels per control pixel. 1 is the pixel-perfect case of the spec. */
  readonly controlScale?: number;
}

export interface Scene {
  readonly map: TerrainMapDocument;
  readonly atlas: RasterImage;
  readonly control: RasterImage;
  readonly scale: number;
}

export function createScene(options: SceneOptions): Scene {
  const scale = options.controlScale ?? 1;
  const width = options.chunksX * CHUNK;
  const height = options.chunksY * CHUNK;
  const controlWidth = Math.ceil(width / scale);
  const controlHeight = Math.ceil(height / scale);
  const control: RasterImage = { width: controlWidth, height: controlHeight, pixels: new Uint8ClampedArray(controlWidth * controlHeight * 4) };
  // Grass everywhere, then blobs of the other materials.
  for (let i = 0; i < control.pixels.length; i += 4) control.pixels[i + 3] = 255;
  const random = rng(42);
  const blobs = Math.round(options.chunksX * options.chunksY * 1.5);
  for (let i = 0; i < blobs; i += 1) {
    paintCircle(control, scale, random() * width, random() * height, 40 + random() * 140, 1 + Math.floor(random() * 4));
  }
  const map: TerrainMapDocument = {
    version: 1,
    width,
    height,
    tileSize: 48,
    sourceTexture: "atlas",
    textureGrid: { columns: MATERIALS.length, rows: 1, tileSize: 64 },
    textures: MATERIALS.map((id, index) => ({
      id,
      index,
      label: id,
      priority: index,
      ...(id === "water" ? { specialType: "water", defaultRenderMode: { type: "water" as const, border: true, foam: true } } : {}),
      ...(id === "rock" ? { defaultRenderMode: { type: "hard" as const } } : {}),
      ...(id === "dirt" || id === "sand" ? { defaultRenderMode: { type: "fade" as const, width: 18, curve: "smooth" as const } } : {}),
    })),
    transitions: [{ from: "grass", to: "dirt", mode: { type: "fade", width: 24, curve: "smooth" } }],
    controlTexture: { width: controlWidth, height: controlHeight, palette: [...MATERIALS], pixels: control.pixels },
    morphology: [],
    waterAnimation: { enabled: true, speed: 1, intensity: 1, direction: 0 },
  };
  return { map, atlas: createAtlas(), control, scale };
}

/** Sets the material under a disc of the control mask. Returns the dirty rectangle in world pixels. */
export function paintCircle(control: RasterImage, scale: number, cx: number, cy: number, radius: number, material: number) {
  const x0 = Math.max(0, Math.floor((cx - radius) / scale));
  const x1 = Math.min(control.width - 1, Math.ceil((cx + radius) / scale));
  const y0 = Math.max(0, Math.floor((cy - radius) / scale));
  const y1 = Math.min(control.height - 1, Math.ceil((cy + radius) / scale));
  const r2 = (radius / scale) * (radius / scale);
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const dx = x - cx / scale;
      const dy = y - cy / scale;
      if (dx * dx + dy * dy > r2) continue;
      const offset = (y * control.width + x) * 4;
      control.pixels[offset] = material & 255;
      control.pixels[offset + 1] = material >> 8;
      control.pixels[offset + 3] = 255;
    }
  }
  return { x: x0 * scale, y: y0 * scale, width: (x1 - x0 + 1) * scale, height: (y1 - y0 + 1) * scale };
}

/** Chunks (by `col,row`) that a world rectangle touches, with the margin the kernel needs for blending. */
export function chunksTouching(rect: { x: number; y: number; width: number; height: number }, chunksX: number, chunksY: number, margin: number) {
  const out: Array<{ col: number; row: number }> = [];
  const c0 = Math.max(0, Math.floor((rect.x - margin) / CHUNK));
  const c1 = Math.min(chunksX - 1, Math.floor((rect.x + rect.width + margin) / CHUNK));
  const r0 = Math.max(0, Math.floor((rect.y - margin) / CHUNK));
  const r1 = Math.min(chunksY - 1, Math.floor((rect.y + rect.height + margin) / CHUNK));
  for (let row = r0; row <= r1; row += 1) for (let col = c0; col <= c1; col += 1) out.push({ col, row });
  return out;
}

export type Prepared = PreparedTerrainMap;
