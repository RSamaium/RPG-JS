import { describe, expect, test } from "vitest";
import {
  disposeTerrainMap,
  normalizeTerrainMap,
  prepareTerrainMap,
  renderTerrainRegion,
  TerrainMapValidationError,
  TerrainPreset,
  builtInTerrainPresets,
} from "./index";

function solid(width: number, height: number, rgba: readonly [number, number, number, number]) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let offset = 0; offset < pixels.length; offset += 4) pixels.set(rgba, offset);
  return { width, height, pixels };
}

describe("@rpgjs/render-map2d", () => {
  test("normalizes current Studio terrain metadata and nine-slice mode", () => {
    const map = normalizeTerrainMap({
      params: {
        width: 2,
        height: 1,
        baseTerrain: {
          fileName: "atlas.png",
          metadata: {
            textureGrid: { columns: 2, rows: 1, tileSize: 4 },
            terrainTextures: [
              { id: "grass", index: 0, label: "Grass" },
              { id: "carpet", index: 1, label: "Carpet", defaultRenderMode: {
                type: "nine-slice", center: { x: 1, y: 1, width: 2, height: 2 },
              } },
            ],
          },
        },
      },
      terrain: [[0, 1]],
    });

    expect(map).toMatchObject({ width: 96, height: 48, sourceTexture: "atlas.png" });
    expect(map.textures[1].defaultRenderMode).toEqual({
      type: "nine-slice", center: { x: 1, y: 1, width: 2, height: 2 },
    });
  });

  test("reports a typed validation path", () => {
    expect(() => normalizeTerrainMap(null)).toThrowError(TerrainMapValidationError);
    expect(() => normalizeTerrainMap(null)).toThrowError(/^\$: expected an object$/);
  });

  test("renders deterministic frames and changes animated water only when time is supplied", () => {
    const map = normalizeTerrainMap({
      params: { width: 1, height: 1, baseTerrain: { fileName: "water", metadata: {
        textureGrid: { columns: 1, rows: 1, tileSize: 4 },
        terrainTextures: [{ id: "water", index: 0, label: "Water", specialType: "water", defaultRenderMode: { type: "water" } }],
      } } },
      terrain: [[0]],
      waterAnimation: { enabled: true, intensity: 1, speed: 1 },
    });
    const prepared = prepareTerrainMap({ map, textures: { water: solid(4, 4, [20, 80, 120, 255]) } });
    const staticA = renderTerrainRegion(prepared);
    const staticB = renderTerrainRegion(prepared);
    const animated = renderTerrainRegion(prepared, { timeMs: 500 });
    expect(staticA.pixels).toEqual(staticB.pixels);
    expect(animated.pixels).not.toEqual(staticA.pixels);
  });

  test("renders adjacent regions without changing world-space texture sampling", () => {
    const pixels = new Uint8ClampedArray([
      10, 0, 0, 255, 20, 0, 0, 255,
      30, 0, 0, 255, 40, 0, 0, 255,
    ]);
    const map = normalizeTerrainMap({
      params: { width: 1, height: 1, baseTerrain: { fileName: "atlas", metadata: {
        textureGrid: { columns: 1, rows: 1, tileSize: 2 },
        terrainTextures: [{ id: "ground", index: 0, label: "Ground", renderTileSize: 2, defaultRenderMode: { type: "hard" } }],
      } } },
      terrain: [[0]],
    });
    const prepared = prepareTerrainMap({ map, textures: { atlas: { width: 2, height: 2, pixels } } });
    const whole = renderTerrainRegion(prepared, { bounds: { x: 0, y: 0, width: 4, height: 2 } });
    const left = renderTerrainRegion(prepared, { bounds: { x: 0, y: 0, width: 2, height: 2 } });
    const right = renderTerrainRegion(prepared, { bounds: { x: 2, y: 0, width: 2, height: 2 } });
    for (let y = 0; y < 2; y += 1) {
      expect([...whole.pixels.slice(y * 16, y * 16 + 8)]).toEqual([...left.pixels.slice(y * 8, y * 8 + 8)]);
      expect([...whole.pixels.slice(y * 16 + 8, y * 16 + 16)]).toEqual([...right.pixels.slice(y * 8, y * 8 + 8)]);
    }
  });

  test("accepts an application preset without global registration", () => {
    const map = normalizeTerrainMap({
      params: { width: 1, height: 1, baseTerrain: { fileName: "atlas", metadata: {
        textureGrid: { columns: 1, rows: 1, tileSize: 2 },
        terrainTextures: [{ id: "lava", index: 0, label: "Lava", defaultRenderMode: { type: "custom", shaderKey: "game:lava" } }],
      } } },
      terrainLayer: { mode: "control-texture", width: 2, height: 2, palette: ["lava"], controlTexture: { pixels: solid(2, 2, [0, 0, 128, 255]).pixels } },
    });
    const prepared = prepareTerrainMap({
      map,
      textures: { atlas: solid(2, 2, [10, 10, 10, 255]) },
      presets: { "game:lava": ({ mask }) => mask.map((value, index) => index % 4 === 0 ? 255 : value) },
    });
    expect(renderTerrainRegion(prepared).pixels[0]).toBe(255);
    disposeTerrainMap(prepared);
    expect(() => renderTerrainRegion(prepared)).toThrow(/disposed/);
    expect(TerrainPreset.RoadTownMarked).toBe("road-town-marked");
    expect(Object.values(TerrainPreset).every((preset) => preset in builtInTerrainPresets)).toBe(true);
  });

  test("composes fade transitions and preserves explicit hard boundaries", () => {
    const control = solid(8, 2, [0, 0, 0, 255]);
    for (let y = 0; y < 2; y += 1) for (let x = 4; x < 8; x += 1) {
      control.pixels[(y * 8 + x) * 4] = 1;
    }
    const source = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 0, 255, 255,
    ]);
    const createMap = (hard: boolean) => normalizeTerrainMap({
      params: { width: 4, height: 1, baseTerrain: { fileName: "atlas", metadata: {
        textureGrid: { columns: 2, rows: 1, tileSize: 1 },
        terrainTextures: [
          { id: "red", index: 0, label: "Red", defaultRenderMode: { type: "fade", width: 2 } },
          { id: "blue", index: 1, label: "Blue", defaultRenderMode: { type: "fade", width: 2 } },
        ],
        transitions: hard ? [{ from: "red", to: "blue", mode: { type: "hard" } }] : [],
      } } },
      terrainLayer: { mode: "control-texture", width: 8, height: 2, palette: ["red", "blue"], controlTexture: { pixels: control.pixels } },
    });
    const faded = renderTerrainRegion(prepareTerrainMap({ map: createMap(false), textures: { atlas: { width: 2, height: 1, pixels: source } } }));
    const hard = renderTerrainRegion(prepareTerrainMap({ map: createMap(true), textures: { atlas: { width: 2, height: 1, pixels: source } } }));
    const fadedBoundary = (0 * 8 + 3) * 4;
    const hardBoundary = (0 * 8 + 3) * 4;
    expect(faded.pixels[fadedBoundary]).toBeGreaterThan(0);
    expect(faded.pixels[fadedBoundary + 2]).toBeGreaterThan(0);
    expect([...hard.pixels.slice(hardBoundary, hardBoundary + 3)]).toEqual([255, 0, 0]);
  });

  test("rejects a custom preset that returns an invalid RGBA buffer", () => {
    const map = normalizeTerrainMap({
      params: { width: 1, height: 1, baseTerrain: { fileName: "atlas", metadata: {
        textureGrid: { columns: 1, rows: 1, tileSize: 1 },
        terrainTextures: [{ id: "bad", index: 0, label: "Bad", defaultRenderMode: { type: "custom", shaderKey: "game:bad" } }],
      } } },
      terrain: [[0]],
    });
    const prepared = prepareTerrainMap({
      map,
      textures: { atlas: solid(1, 1, [1, 2, 3, 255]) },
      presets: { "game:bad": () => new Uint8ClampedArray(0) },
    });
    expect(() => renderTerrainRegion(prepared)).toThrow(/presets\.game:bad/);
  });

  test("keeps shared road pixels continuous across separately rendered regions", () => {
    const width = 480;
    const height = 96;
    const control = solid(width, height, [0, 0, 128, 0]);
    for (let y = 26; y < 70; y += 1) for (let x = 0; x < width; x += 1) {
      control.pixels[(y * width + x) * 4 + 3] = 255;
    }
    const map = normalizeTerrainMap({
      params: { width: 10, height: 2, baseTerrain: { fileName: "atlas", metadata: {
        textureGrid: { columns: 1, rows: 1, tileSize: 4 },
        terrainTextures: [{ id: "road", index: 0, label: "Road", defaultRenderMode: {
          type: "custom", shaderKey: TerrainPreset.RoadTownMarked,
        } }],
      } } },
      terrainLayer: { mode: "control-texture", width, height, palette: ["road"], controlTexture: { pixels: control.pixels } },
    });
    const prepared = prepareTerrainMap({ map, textures: { atlas: solid(4, 4, [55, 55, 55, 255]) } });
    const whole = renderTerrainRegion(prepared);
    const left = renderTerrainRegion(prepared, { bounds: { x: 0, y: 0, width: 240, height } });
    const right = renderTerrainRegion(prepared, { bounds: { x: 240, y: 0, width: 240, height } });
    for (let y = 0; y < height; y += 1) {
      const wholeRow = y * width * 4;
      expect(left.pixels.slice(y * 240 * 4, (y + 1) * 240 * 4)).toEqual(whole.pixels.slice(wholeRow, wholeRow + 240 * 4));
      expect(right.pixels.slice(y * 240 * 4, (y + 1) * 240 * 4)).toEqual(whole.pixels.slice(wholeRow + 240 * 4, wholeRow + width * 4));
    }
  });

  test("renders a completely filled hole and remains structured-clone compatible", () => {
    const map = normalizeTerrainMap({
      params: { width: 2, height: 2, baseTerrain: { fileName: "ground", metadata: {
        textureGrid: { columns: 1, rows: 1, tileSize: 4 },
        terrainTextures: [{ id: "ground", index: 0, label: "Ground", defaultRenderMode: { type: "hard" } }],
      } } },
      terrain: [[0, 0], [0, 0]],
      terrainMorphologyLayer: { features: [{
        id: "pond", kind: "hole", params: { depth: 12, fillHeight: 100 },
        strokes: [{ id: "pond-stroke", radius: 16, points: [{ x: 48, y: 48 }] }],
      }] },
    });
    const prepared = prepareTerrainMap({ map, textures: { ground: solid(4, 4, [90, 80, 60, 255]) } });
    const frame = renderTerrainRegion(prepared, { timeMs: 250 });
    const center = (48 * frame.width + 48) * 4;
    const edge = (48 * frame.width + 32) * 4;
    expect(frame.pixels[center + 2]).toBeGreaterThan(frame.pixels[center]);
    expect(frame.pixels[edge + 2]).toBeGreaterThan(frame.pixels[edge]);

    const cloned = structuredClone(frame, { transfer: [frame.pixels.buffer] });
    expect(cloned.pixels).toBeInstanceOf(Uint8ClampedArray);
    expect(cloned.pixels.length).toBe(frame.width * frame.height * 4);
    expect(frame.pixels.length).toBe(0);
  });

  test("keeps a partial hole fill below its world-space level and applies erasures", () => {
    const map = normalizeTerrainMap({
      params: { width: 2, height: 2, baseTerrain: { fileName: "ground", metadata: {
        textureGrid: { columns: 1, rows: 1, tileSize: 4 },
        terrainTextures: [{ id: "ground", index: 0, label: "Ground", defaultRenderMode: { type: "hard" } }],
      } } },
      terrain: [[0, 0], [0, 0]],
      terrainMorphologyLayer: { features: [{
        id: "partial", kind: "hole", params: { depth: 12, fillHeight: 50 },
        strokes: [{ id: "paint", radius: 24, points: [{ x: 48, y: 48 }] }],
        operations: [
          { mode: "paint", stroke: { id: "paint", radius: 24, points: [{ x: 48, y: 48 }] } },
          { mode: "erase", stroke: { id: "erase", radius: 3, points: [{ x: 48, y: 48 }] } },
        ],
      }] },
    });
    const prepared = prepareTerrainMap({ map, textures: { ground: solid(4, 4, [90, 80, 60, 255]) } });
    const frame = renderTerrainRegion(prepared);
    const erasedCenter = (48 * frame.width + 48) * 4;
    const dryTop = (28 * frame.width + 48) * 4;
    const wetBottom = (68 * frame.width + 48) * 4;
    expect([...frame.pixels.slice(erasedCenter, erasedCenter + 4)]).toEqual([90, 80, 60, 255]);
    expect(frame.pixels[dryTop + 2]).toBeLessThan(frame.pixels[dryTop]);
    expect(frame.pixels[wetBottom + 2]).toBeGreaterThan(frame.pixels[wetBottom]);
  });
});
