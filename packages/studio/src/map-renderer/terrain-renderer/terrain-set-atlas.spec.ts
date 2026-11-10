import { describe, expect, it } from "vitest";
import { createStudioTerrainRenderData } from "../map-normalizer";
import type { StudioTerrainRenderData, StudioTerrainSet, TerrainAssetMetadata } from "../types";
import { mergeStudioTerrainSets, planTerrainSetAtlas } from "./terrain-set-atlas";

const asset = (source: string, ids: string[], columns: number, rows: number, tileSize = 48): TerrainAssetMetadata => ({
  sourceTexture: source,
  tileAtlas: null,
  textureGrid: { columns, rows, tileSize },
  terrainTextures: ids.map((id, index) => ({ id, index, label: id })),
  transitions: [],
});
const set = (id: string, a: TerrainAssetMetadata): StudioTerrainSet => ({ id, sourceTexture: a.sourceTexture, asset: a });

describe("planTerrainSetAtlas", () => {
  const summer = set("summer", asset("summer.png", ["grass", "sand", "water"], 2, 2));
  const winter = set("winter", { ...asset("winter.png", ["snow", "grass"], 2, 1), transitions: [{ from: "snow", to: "grass", mode: { type: "blend" } as any }] });

  it("stacks the pictures and keeps the tile of each texture", () => {
    const plan = planTerrainSetAtlas([
      { set: summer, width: 96, height: 96 },
      { set: winter, width: 96, height: 48 },
    ])!;

    expect(plan.height).toBe(144);
    expect(plan.asset.textureGrid).toEqual({ columns: 2, rows: 3, tileSize: 48 });
    const index = Object.fromEntries(plan.asset.terrainTextures.map((t) => [t.id, t.index]));
    // summer: grass (0,0), sand (1,0), water (0,1); winter starts on the third row
    expect(index).toMatchObject({ grass: 0, sand: 1, water: 2, snow: 4 });
    expect(plan.placements).toEqual([
      { setId: "summer", y: 0, width: 96, height: 96 },
      { setId: "winter", y: 96, width: 96, height: 48 },
    ]);
  });

  it("makes ids unique across the sets: the first set keeps a shared id", () => {
    const plan = planTerrainSetAtlas([
      { set: summer, width: 96, height: 96 },
      { set: winter, width: 96, height: 48 },
    ])!;

    expect(plan.asset.terrainTextures.map((t) => t.id)).toEqual(["grass", "sand", "water", "snow", "winter::grass"]);
    expect(plan.resolve("grass")).toBe("grass");
    expect(plan.resolve("summer::grass")).toBe("grass");
    expect(plan.resolve("winter::grass")).toBe("winter::grass");
    expect(plan.resolve("snow")).toBe("snow");
    expect(plan.resolve("lava")).toBeUndefined();
  });

  it("maps the transitions of a set onto the merged ids", () => {
    const plan = planTerrainSetAtlas([
      { set: summer, width: 96, height: 96 },
      { set: winter, width: 96, height: 48 },
    ])!;

    expect(plan.asset.transitions).toEqual([{ from: "snow", to: "winter::grass", mode: { type: "blend" } }]);
  });

  it("leaves out a set with another tile size", () => {
    const big = set("big", asset("big.png", ["rock"], 1, 1, 64));
    const plan = planTerrainSetAtlas([
      { set: summer, width: 96, height: 96 },
      { set: big, width: 64, height: 64 },
    ])!;

    expect(plan.skipped).toEqual(["big"]);
    expect(plan.asset.terrainTextures.map((t) => t.id)).toEqual(["grass", "sand", "water"]);
  });

  it("a single set gives its own grid", () => {
    const plan = planTerrainSetAtlas([{ set: summer, width: 96, height: 96 }])!;

    expect(plan.asset.textureGrid).toEqual({ columns: 2, rows: 2, tileSize: 48 });
    expect(plan.asset.terrainTextures.map((t) => t.index)).toEqual([0, 1, 2]);
  });
});

describe("terrain sets of a map", () => {
  const tileset = (id: string, file: string, ids: string[]) => ({
    _id: id,
    fileName: file,
    metadata: {
      fileName: file,
      textureGrid: { columns: 2, rows: 2, tileSize: 48 },
      terrainTextures: ids.map((tid, index) => ({ id: tid, index, label: tid })),
    },
  });
  const map = (layerSets?: string[]) => ({
    params: {
      width: 4, height: 4,
      primaryTerrainTileset: { _id: "summer" },
      terrainTilesets: [tileset("summer", "summer.png", ["grass", "sand"]), tileset("winter", "winter.png", ["snow"])],
    },
    terrainLayer: { mode: "control-texture", controlTexture: { fileName: "control.png" }, palette: ["grass", "winter::snow"], ...(layerSets ? { terrainSets: layerSets } : {}) },
  });

  it("lists the sets the terrain layer names, the primary one first", () => {
    const data = createStudioTerrainRenderData(map(["winter"]));

    expect(data.terrainSets?.map((s) => s.id)).toEqual(["summer", "winter"]);
    expect(data.terrainControl?.palette).toEqual(["grass", "winter::snow"]);
  });

  it("a map without terrainSets has one set and no list", () => {
    expect(createStudioTerrainRenderData(map()).terrainSets).toBeUndefined();
  });

  it("ignores a set that the project does not have", () => {
    expect(createStudioTerrainRenderData(map(["lava"])).terrainSets).toBeUndefined();
  });
});

describe("mergeStudioTerrainSets", () => {
  const base = (sets?: StudioTerrainSet[]): StudioTerrainRenderData => ({
    widthTiles: 1, heightTiles: 1, tileSize: 48, width: 48, height: 48,
    asset: sets?.[0]?.asset ?? null, sourceTexture: "summer.png", terrainControl: null,
    terrainGrid: [], morphologyFeatures: [], waterAnimation: { enabled: false, speed: 1, intensity: 0.45, direction: 90 },
    version: "v", ...(sets ? { terrainSets: sets } : {}),
  });

  it("gives back a map with one set as it is", async () => {
    const data = base();

    expect(await mergeStudioTerrainSets(data, async () => ({ width: 96, height: 96 }))).toBe(data);
  });

  it("keeps the first set when a picture cannot be loaded", async () => {
    const data = base([set("a", asset("a.png", ["x"], 1, 1)), set("b", asset("b.png", ["y"], 1, 1))]);

    expect(await mergeStudioTerrainSets(data, async (source) => (source === "a.png" ? { width: 48, height: 48 } : null))).toBe(data);
  });
});
