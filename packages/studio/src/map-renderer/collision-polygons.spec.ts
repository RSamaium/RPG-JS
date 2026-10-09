import { describe, expect, it } from "vitest";
import { buildStudioTerrainCollisionPolygons } from "./collision-polygons";
import { createStudioTerrainRenderData } from "./map-normalizer";
import {
  isWaterTerrainTexture,
  resolveTerrainTextureSourceRect,
  resolveTerrainTileAtlasSourceRect,
} from "./terrain-renderer/terrain-texture";

const terrainMedia = {
  id: "terrain",
  fileName: "terrain.png",
  metadata: {
    textureGrid: { columns: 2, rows: 1, tileSize: 48 },
    terrainTextures: [
      { id: "grass", index: 0, label: "Grass", collision: false },
      { id: "water", index: 1, label: "Water", collision: true },
    ],
  },
};

const tileAtlasTerrainMedia = {
  id: "terrain-atlas",
  fileName: "terrain-atlas.png",
  metadata: {
    sourceTexture: "source-texture.png",
    textureGrid: { columns: 2, rows: 2, tileSize: 48 },
    tilewidth: 48,
    tileheight: 48,
    tilecount: 256,
    terrainTextures: [
      { id: "terrain-0", index: 0, label: "Terrain 1", collision: false },
      { id: "terrain-1", index: 1, label: "Terrain 2", collision: false },
      { id: "terrain-2", index: 2, label: "Terrain 3", collision: false },
      { id: "terrain-3", index: 3, label: "Terrain 4", collision: false },
    ],
  },
};

const elementTilesetMedia = {
  _id: "element-tileset",
  id: "element-tileset",
  fileName: "elements.png",
  metadata: {
    elements: JSON.stringify([
      { id: "floor", rect: [0, 0, 48, 48], hitbox: { type: "none", x: 0, y: 0, width: 48, height: 48 } },
      { id: "wide-floor", rect: [0, 0, 144, 96], hitbox: { type: "none", x: 0, y: 0, width: 144, height: 96 } },
    ]),
  },
};

function createMap(overrides: Record<string, unknown> = {}) {
  return {
    _id: "map",
    creationDetails: { version: "v2" },
    params: {
      width: 4,
      height: 3,
      baseTerrain: terrainMedia,
      primaryTerrainTileset: terrainMedia,
      terrainTilesets: [terrainMedia],
    },
    terrain: JSON.stringify([
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ]),
    ...overrides,
  };
}

function hasCollisionAt(polygons: ReturnType<typeof buildStudioTerrainCollisionPolygons>, x: number, y: number) {
  return polygons.some((polygon) => (
    x >= polygon.x &&
    x < polygon.x + polygon.width &&
    y >= polygon.y &&
    y < polygon.y + polygon.height
  ));
}

function hasPolygonCollisionAt(polygons: ReturnType<typeof buildStudioTerrainCollisionPolygons>, x: number, y: number) {
  return polygons.some((polygon) => {
    if (
      x < polygon.x ||
      x > polygon.x + polygon.width ||
      y < polygon.y ||
      y > polygon.y + polygon.height
    ) {
      return false;
    }
    return pointInPolygon(x, y, polygon.points);
  });
}

function pointInPolygon(x: number, y: number, points: Array<[number, number]>) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const intersects = ((yi > y) !== (yj > y)) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

describe("studio terrain map renderer data", () => {
  it("normalizes empty v2 maps with a full fallback terrain grid", () => {
    const data = createStudioTerrainRenderData(createMap({ terrain: undefined }));

    expect(data.widthTiles).toBe(4);
    expect(data.heightTiles).toBe(3);
    expect(data.terrainGrid).toHaveLength(3);
    expect(data.terrainGrid[0]).toHaveLength(4);
    expect(data.terrainGrid[0][0]).toMatchObject({
      terrainTextureId: "grass",
      collision: false,
    });
  });

  it("normalizes Studio control texture terrain layers", () => {
    const data = createStudioTerrainRenderData(
      createMap({
        terrainLayer: {
          version: 1,
          mode: "control-texture",
          width: 192,
          height: 144,
          tileSize: 48,
          palette: ["water", "grass"],
          controlTexture: {
            fileName: "control.png",
            encoding: "rgba8",
          },
        },
      })
    );

    expect(data.terrainControl).toMatchObject({
      source: expect.stringContaining("control.png"),
      width: 192,
      height: 144,
      tileSize: 48,
      palette: ["water", "grass"],
    });
  });

  it("preserves morphology erase operations during render data normalization", () => {
    const data = createStudioTerrainRenderData(
      createMap({
        terrainMorphologyLayer: {
          version: 1,
          mode: "terrain-morphology",
          width: 192,
          height: 144,
          tileSize: 48,
          features: [
            {
              id: "wall-1",
              kind: "wall",
              params: { height: 48 },
              strokes: [
                {
                  id: "stroke-1",
                  points: [
                    { x: 48, y: 72 },
                    { x: 144, y: 72 },
                  ],
                  radius: 42,
                },
              ],
              eraserStrokes: [
                {
                  id: "erase-1",
                  points: [{ x: 96, y: 72 }],
                  radius: 24,
                },
              ],
              operations: [
                {
                  mode: "paint",
                  stroke: {
                    id: "stroke-1",
                    points: [
                      { x: 48, y: 72 },
                      { x: 144, y: 72 },
                    ],
                    radius: 42,
                  },
                },
                {
                  mode: "erase",
                  stroke: {
                    id: "erase-1",
                    points: [{ x: 96, y: 72 }],
                    radius: 24,
                  },
                },
              ],
            },
          ],
        },
      })
    );

    expect(data.morphologyFeatures[0].eraserStrokes).toHaveLength(1);
    expect(data.morphologyFeatures[0].operations?.map((operation) => operation.mode)).toEqual(["paint", "erase"]);
  });

  it("normalizes disabled water animation by default", () => {
    const data = createStudioTerrainRenderData(createMap());

    expect(data.waterAnimation).toEqual({
      enabled: false,
      speed: 1,
      intensity: 0.45,
      direction: 90,
    });
  });

  it("normalizes enabled water animation options", () => {
    const data = createStudioTerrainRenderData(
      createMap({
        waterAnimation: {
          enabled: true,
          speed: 20,
          intensity: 5,
          direction: -90,
        },
      })
    );

    expect(data.waterAnimation).toEqual({
      enabled: true,
      speed: 4,
      intensity: 1,
      direction: 270,
    });
  });

  it("keeps disabled water values available as filled-hole defaults", () => {
    const data = createStudioTerrainRenderData(
      createMap({
        waterAnimation: {
          enabled: false,
          speed: 0,
          intensity: 0,
          direction: 450,
        },
      })
    );

    expect(data.waterAnimation).toEqual({
      enabled: false,
      speed: 0.1,
      intensity: 0,
      direction: 90,
    });
  });

  it("detects water terrain textures from render metadata", () => {
    const asset = createStudioTerrainRenderData(createMap()).asset!;

    expect(isWaterTerrainTexture(asset, "water")).toBe(true);
    expect(isWaterTerrainTexture(asset, "grass")).toBe(false);
  });

  it("uses the source image dimensions when terrain atlas metadata is compact", () => {
    const asset = createStudioTerrainRenderData(createMap()).asset!;
    const rect = resolveTerrainTextureSourceRect(asset, asset.terrainTextures[1], 1254, 1254);

    expect(rect).toMatchObject({
      x: 627,
      y: 0,
      width: 627,
      height: 627,
    });
  });

  it("keeps numeric tile grids as tile-atlas cells when the terrain media is an atlas", () => {
    const data = createStudioTerrainRenderData(
      createMap({
        params: {
          width: 2,
          height: 1,
          baseTerrain: tileAtlasTerrainMedia,
          primaryTerrainTileset: tileAtlasTerrainMedia,
          terrainTilesets: [tileAtlasTerrainMedia],
        },
        terrain: JSON.stringify([[8, 0]]),
      })
    );

    expect(data.sourceTexture).toContain("terrain-atlas.png");
    expect(data.sourceTexture).not.toContain("source-texture.png");
    expect(data.terrainGrid[0][0]).toMatchObject({
      source: "tile-atlas",
      tileId: 8,
    });
    expect(data.terrainGrid[0][1]).toMatchObject({
      source: "tile-atlas",
      tileId: 0,
    });
  });

  it("resolves tile atlas source rectangles from the loaded image dimensions", () => {
    const asset = createStudioTerrainRenderData(
      createMap({
        params: {
          baseTerrain: tileAtlasTerrainMedia,
          primaryTerrainTileset: tileAtlasTerrainMedia,
          terrainTilesets: [tileAtlasTerrainMedia],
        },
        terrain: JSON.stringify([[255]]),
      })
    ).asset!;

    expect(resolveTerrainTileAtlasSourceRect(asset, 8, 2400, 288)).toMatchObject({
      x: 384,
      y: 0,
      width: 48,
      height: 48,
    });
    expect(resolveTerrainTileAtlasSourceRect(asset, 255, 2400, 288)).toMatchObject({
      x: 240,
      y: 240,
      width: 48,
      height: 48,
    });
  });
});

describe("buildStudioTerrainCollisionPolygons", () => {
  it("merges adjacent terrain collision cells into one polygon", () => {
    const polygons = buildStudioTerrainCollisionPolygons(createMap());

    expect(polygons).toHaveLength(1);
    expect(polygons[0]).toMatchObject({
      type: "terrain_collision",
      x: 48,
      y: 0,
      width: 96,
      height: 96,
    });
    expect(polygons[0].points).toEqual([
      [48, 0],
      [144, 0],
      [144, 96],
      [48, 96],
    ]);
  });

  it("lets always-low elements clear non-walkable terrain below them", () => {
    const polygons = buildStudioTerrainCollisionPolygons(
      createMap({
        params: {
          ...createMap().params,
          tileset: elementTilesetMedia,
        },
        terrain: JSON.stringify([[1, 1, 1]]),
        elementsAlwaysLow: JSON.stringify([
          { x: 48, y: 0, id: "floor", tilesetId: "element-tileset", width: 48, height: 48 },
        ]),
      })
    );

    const terrainPolygons = polygons.filter((polygon) => polygon.type === "terrain_collision");

    expect(hasCollisionAt(terrainPolygons, 24, 24)).toBe(true);
    expect(hasCollisionAt(terrainPolygons, 72, 24)).toBe(false);
    expect(hasCollisionAt(terrainPolygons, 120, 24)).toBe(true);
  });

  it("keeps regular low elements from clearing terrain collisions", () => {
    const polygons = buildStudioTerrainCollisionPolygons(
      createMap({
        params: {
          ...createMap().params,
          tileset: elementTilesetMedia,
        },
        terrain: JSON.stringify([[1, 1, 1]]),
        elementsLow: JSON.stringify([
          { x: 48, y: 0, id: "floor", tilesetId: "element-tileset", width: 48, height: 48 },
        ]),
      })
    );

    const terrainPolygons = polygons.filter((polygon) => polygon.type === "terrain_collision");

    expect(hasCollisionAt(terrainPolygons, 72, 24)).toBe(true);
  });

  it("creates edge collisions for hole borders while leaving the interior rule separate", () => {
    const polygons = buildStudioTerrainCollisionPolygons(
      createMap({
        terrain: JSON.stringify([
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ]),
        terrainMorphologyLayer: {
          version: 1,
          mode: "terrain-morphology",
          width: 192,
          height: 144,
          tileSize: 48,
          features: [
            {
              id: "hole-1",
              kind: "hole",
              params: { depth: 64, fillHeight: 50 },
              strokes: [
                {
                  id: "stroke-1",
                  points: [{ x: 96, y: 72 }],
                  radius: 54,
                },
              ],
            },
          ],
        },
      })
    );

    expect(polygons.some((polygon) => polygon.type === "morphology_hole_edge_collision")).toBe(true);
    expect(polygons.every((polygon) => polygon.width > 0 && polygon.height > 0)).toBe(true);
  });

  it("follows the hole contour instead of blocking whole terrain tiles around it", () => {
    const polygons = buildStudioTerrainCollisionPolygons(
      createMap({
        terrain: JSON.stringify([
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ]),
        terrainMorphologyLayer: {
          version: 1,
          mode: "terrain-morphology",
          width: 192,
          height: 144,
          tileSize: 48,
          features: [
            {
              id: "hole-1",
              kind: "hole",
              params: { depth: 64, fillHeight: 50 },
              strokes: [
                {
                  id: "stroke-1",
                  points: [{ x: 96, y: 72 }],
                  radius: 54,
                },
              ],
            },
          ],
        },
      })
    ).filter((polygon) => polygon.type === "morphology_hole_edge_collision");

    expect(hasPolygonCollisionAt(polygons, 96, 18)).toBe(true);
    expect(hasPolygonCollisionAt(polygons, 60, 10)).toBe(false);
  });

  it("lets always-low elements clear hole edge collisions below them", () => {
    const polygons = buildStudioTerrainCollisionPolygons(
      createMap({
        params: {
          ...createMap().params,
          tileset: elementTilesetMedia,
        },
        terrain: JSON.stringify([
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ]),
        elementsAlwaysLow: JSON.stringify([
          { x: 0, y: 0, id: "wide-floor", tilesetId: "element-tileset", width: 192, height: 144 },
        ]),
        terrainMorphologyLayer: {
          version: 1,
          mode: "terrain-morphology",
          width: 192,
          height: 144,
          tileSize: 48,
          features: [
            {
              id: "hole-1",
              kind: "hole",
              params: { depth: 64, fillHeight: 50 },
              strokes: [
                {
                  id: "stroke-1",
                  points: [{ x: 96, y: 72 }],
                  radius: 54,
                },
              ],
            },
          ],
        },
      })
    );

    expect(polygons.some((polygon) => polygon.type === "morphology_hole_edge_collision")).toBe(false);
  });

  it("creates edge collisions for wall borders instead of blocking the whole top surface", () => {
    const polygons = buildStudioTerrainCollisionPolygons(
      createMap({
        terrain: JSON.stringify([
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ]),
        terrainMorphologyLayer: {
          version: 1,
          mode: "terrain-morphology",
          width: 192,
          height: 144,
          tileSize: 48,
          features: [
            {
              id: "wall-1",
              kind: "wall",
              params: { height: 48 },
              strokes: [
                {
                  id: "stroke-1",
                  points: [
                    { x: 48, y: 72 },
                    { x: 144, y: 72 },
                  ],
                  radius: 42,
                },
              ],
            },
          ],
        },
      })
    );

    expect(polygons.some((polygon) => polygon.type === "morphology_wall_edge_collision")).toBe(true);
    expect(polygons.every((polygon) => polygon.points.length >= 4)).toBe(true);
  });

  it("lets always-low elements clear wall collisions below them", () => {
    const polygons = buildStudioTerrainCollisionPolygons(
      createMap({
        params: {
          ...createMap().params,
          tileset: elementTilesetMedia,
        },
        terrain: JSON.stringify([
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ]),
        elementsAlwaysLow: JSON.stringify([
          { x: 0, y: 0, id: "wide-floor", tilesetId: "element-tileset", width: 192, height: 144 },
        ]),
        terrainMorphologyLayer: {
          version: 1,
          mode: "terrain-morphology",
          width: 192,
          height: 144,
          tileSize: 48,
          features: [
            {
              id: "wall-1",
              kind: "wall",
              params: { height: 48 },
              strokes: [
                {
                  id: "stroke-1",
                  points: [
                    { x: 48, y: 72 },
                    { x: 144, y: 72 },
                  ],
                  radius: 42,
                },
              ],
            },
          ],
        },
      })
    );

    expect(polygons.some((polygon) => polygon.type === "morphology_wall_edge_collision")).toBe(false);
  });

  it("keeps a wall collision gap where a morphology erase operation cuts the middle", () => {
    const polygons = buildStudioTerrainCollisionPolygons(
      createMap({
        params: {
          ...createMap().params,
          width: 5,
          height: 4,
        },
        terrain: JSON.stringify([
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
        ]),
        terrainMorphologyLayer: {
          version: 1,
          mode: "terrain-morphology",
          width: 240,
          height: 192,
          tileSize: 48,
          features: [
            {
              id: "wall-erased",
              kind: "wall",
              params: { height: 48 },
              strokes: [
                {
                  id: "stroke-1",
                  points: [
                    { x: 48, y: 72 },
                    { x: 192, y: 72 },
                  ],
                  radius: 42,
                },
              ],
              operations: [
                {
                  mode: "paint",
                  stroke: {
                    id: "stroke-1",
                    points: [
                      { x: 48, y: 72 },
                      { x: 192, y: 72 },
                    ],
                    radius: 42,
                  },
                },
                {
                  mode: "erase",
                  stroke: {
                    id: "erase-1",
                    points: [{ x: 120, y: 72 }],
                    radius: 52,
                  },
                },
              ],
            },
          ],
        },
      })
    );

    const wallPolygons = polygons.filter((polygon) => polygon.type === "morphology_wall_edge_collision");

    expect(hasCollisionAt(wallPolygons, 48, 120)).toBe(true);
    expect(hasCollisionAt(wallPolygons, 120, 120)).toBe(false);
    expect(hasCollisionAt(wallPolygons, 192, 120)).toBe(true);
  });

  it("pushes the far wall border collision down to allow visual overlap with the top surface", () => {
    const polygons = buildStudioTerrainCollisionPolygons(
      createMap({
        params: {
          ...createMap().params,
          width: 5,
          height: 4,
        },
        terrain: JSON.stringify([
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
        ]),
        terrainMorphologyLayer: {
          version: 1,
          mode: "terrain-morphology",
          width: 240,
          height: 192,
          tileSize: 48,
          features: [
            {
              id: "wall-offset",
              kind: "wall",
              params: { height: 56 },
              strokes: [
                {
                  id: "stroke-1",
                  points: [
                    { x: 72, y: 72 },
                    { x: 168, y: 72 },
                  ],
                  radius: 42,
                },
              ],
            },
          ],
        },
      })
    );

    const wallPolygons = polygons.filter((polygon) => polygon.type === "morphology_wall_edge_collision");

    expect(wallPolygons.length).toBeGreaterThan(0);
    expect(wallPolygons.some((polygon) => polygon.y === 0)).toBe(false);
    expect(wallPolygons.some((polygon) => polygon.y >= 48)).toBe(true);
  });

  it("adds lower body collisions for large smart wall blocks while leaving the upper layer passable", () => {
    const polygons = buildStudioTerrainCollisionPolygons(
      createMap({
        params: {
          ...createMap().params,
          width: 5,
          height: 4,
        },
        terrain: JSON.stringify([
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
        ]),
        terrainMorphologyLayer: {
          version: 1,
          mode: "terrain-morphology",
          width: 240,
          height: 192,
          tileSize: 48,
          features: [
            {
              id: "smart-block-wall",
              kind: "wall",
              params: { height: 96, smartBrushMode: "cave" },
              strokes: [
                {
                  id: "stroke-1",
                  points: [
                    { x: 48, y: 72 },
                    { x: 192, y: 72 },
                  ],
                  radius: 72,
                },
              ],
            },
          ],
        },
      })
    );

    const wallPolygons = polygons.filter((polygon) => polygon.type === "morphology_wall_edge_collision");
    const bodyPolygons = wallPolygons.filter((polygon) => polygon.properties?.role === "body");

    expect(bodyPolygons.length).toBeGreaterThan(0);
    expect(bodyPolygons.some((polygon) => polygon.y > 96 && polygon.y < 128)).toBe(true);
    expect(bodyPolygons.some((polygon) => polygon.y + polygon.height >= 160)).toBe(true);
    expect(wallPolygons.every((polygon) => polygon.y + polygon.height <= 192)).toBe(true);
  });

  it("does not add body collisions to small cave wall strokes so the upper wall layer stays passable", () => {
    const polygons = buildStudioTerrainCollisionPolygons(
      createMap({
        params: {
          ...createMap().params,
          width: 5,
          height: 4,
        },
        terrain: JSON.stringify([
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
        ]),
        terrainMorphologyLayer: {
          version: 1,
          mode: "terrain-morphology",
          width: 240,
          height: 192,
          tileSize: 48,
          features: [
            {
              id: "small-cave-wall",
              kind: "wall",
              params: { height: 96, smartBrushMode: "cave" },
              strokes: [
                {
                  id: "stroke-1",
                  points: [
                    { x: 48, y: 72 },
                    { x: 192, y: 72 },
                  ],
                  radius: 22,
                },
              ],
            },
          ],
        },
      })
    );

    const wallPolygons = polygons.filter((polygon) => polygon.type === "morphology_wall_edge_collision");

    expect(wallPolygons.length).toBeGreaterThan(0);
    expect(wallPolygons.some((polygon) => polygon.properties?.role === "body")).toBe(false);
  });

  it("keeps body collisions low on large diagonal wall strokes so the upper layer remains passable", () => {
    const polygons = buildStudioTerrainCollisionPolygons(
      createMap({
        params: {
          ...createMap().params,
          width: 10,
          height: 8,
        },
        terrain: JSON.stringify([
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ]),
        terrainMorphologyLayer: {
          version: 1,
          mode: "terrain-morphology",
          width: 480,
          height: 384,
          tileSize: 48,
          features: [
            {
              id: "large-diagonal-wall",
              kind: "wall",
              params: { height: 56, roundness: 0.35, roughness: 0.45 },
              strokes: [
                {
                  id: "stroke-1",
                  points: [
                    { x: 288, y: 144 },
                    { x: 240, y: 240 },
                  ],
                  radius: 96,
                },
              ],
            },
          ],
        },
      })
    );

    const bodyPolygons = polygons.filter(
      (polygon) =>
        polygon.type === "morphology_wall_edge_collision" &&
        polygon.properties?.role === "body"
    );

    expect(bodyPolygons.length).toBeGreaterThan(0);
    expect(bodyPolygons.every((polygon) => polygon.y >= 320)).toBe(true);
    expect(bodyPolygons.some((polygon) => polygon.y + polygon.height >= 380)).toBe(true);
  });

  it("keeps bottom map wall collisions inside the map bounds", () => {
    const polygons = buildStudioTerrainCollisionPolygons(
      createMap({
        params: {
          ...createMap().params,
          width: 5,
          height: 4,
        },
        terrain: JSON.stringify([
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
        ]),
        terrainMorphologyLayer: {
          version: 1,
          mode: "terrain-morphology",
          width: 240,
          height: 192,
          tileSize: 48,
          features: [
            {
              id: "bottom-wall",
              kind: "wall",
              params: { height: 96 },
              strokes: [
                {
                  id: "stroke-1",
                  points: [
                    { x: 0, y: 192 },
                    { x: 240, y: 192 },
                  ],
                  radius: 22,
                },
              ],
            },
          ],
        },
      })
    );

    const wallPolygons = polygons.filter((polygon) => polygon.type === "morphology_wall_edge_collision");

    expect(wallPolygons.length).toBeGreaterThan(0);
    expect(wallPolygons.some((polygon) => polygon.y >= 160)).toBe(true);
    expect(wallPolygons.every((polygon) => polygon.y + polygon.height <= 192)).toBe(true);
  });

  it("keeps vertical wall side collisions aligned with the side instead of the wall base", () => {
    const polygons = buildStudioTerrainCollisionPolygons(
      createMap({
        terrain: JSON.stringify([
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ]),
        terrainMorphologyLayer: {
          version: 1,
          mode: "terrain-morphology",
          width: 192,
          height: 144,
          tileSize: 48,
          features: [
            {
              id: "side-wall",
              kind: "wall",
              params: { height: 96 },
              strokes: [
                {
                  id: "stroke-1",
                  points: [
                    { x: 96, y: 24 },
                    { x: 96, y: 120 },
                  ],
                  radius: 22,
                },
              ],
            },
          ],
        },
      })
    );

    const wallPolygons = polygons.filter((polygon) => polygon.type === "morphology_wall_edge_collision");

    expect(wallPolygons.length).toBeGreaterThan(0);
    expect(wallPolygons.some((polygon) => polygon.x > 80 && polygon.x < 100)).toBe(true);
    expect(wallPolygons.every((polygon) => polygon.y < 48)).toBe(true);
    expect(wallPolygons.every((polygon) => polygon.y + polygon.height <= 144)).toBe(true);
  });

  it("keeps diagonal wall side collisions near the segment instead of pushing them to the base", () => {
    const polygons = buildStudioTerrainCollisionPolygons(
      createMap({
        terrain: JSON.stringify([
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ]),
        terrainMorphologyLayer: {
          version: 1,
          mode: "terrain-morphology",
          width: 192,
          height: 144,
          tileSize: 48,
          features: [
            {
              id: "diagonal-side-wall",
              kind: "wall",
              params: { height: 96 },
              strokes: [
                {
                  id: "stroke-1",
                  points: [
                    { x: 48, y: 96 },
                    { x: 96, y: 48 },
                  ],
                  radius: 22,
                },
              ],
            },
          ],
        },
      })
    );

    const wallPolygons = polygons.filter((polygon) => polygon.type === "morphology_wall_edge_collision");

    expect(wallPolygons.length).toBeGreaterThan(0);
    expect(wallPolygons.every((polygon) => polygon.y < 96)).toBe(true);
    expect(wallPolygons.every((polygon) => polygon.y + polygon.height <= 120)).toBe(true);
  });
});

describe('final painted morphology collisions', () => {
  const stroke = (id: string, points: Array<{ x: number; y: number }>, radius = 40) => ({ id, points, radius });
  const paint = stroke('paint', [{ x: 48, y: 72 }, { x: 144, y: 72 }]);
  function build(operations: Array<{ mode: 'paint' | 'erase'; stroke: ReturnType<typeof stroke> }>, extra = {}) {
    return buildStudioTerrainCollisionPolygons(createMap({
      terrain: '[]',
      terrainMorphologyLayer: {
        width: 192, height: 144, tileSize: 48,
        features: [{ id: 'lake', kind: 'hole', params: { depth: 20 }, strokes: operations.filter(op => op.mode === 'paint').map(op => op.stroke), operations }],
      },
      ...extra,
    }));
  }

  it('makes identical geometry for repeated paint, without interior caps or joints', () => {
    const single = build([{ mode: 'paint', stroke: paint }]);
    const repeated = build(Array.from({ length: 200 }, (_, i) => ({
      mode: 'paint', stroke: { ...paint, id: `paint-${i}` },
    })));
    expect(repeated).toEqual(single);
    expect(single.length).toBeLessThan(40);
    expect(hasPolygonCollisionAt(single, 48, 32)).toBe(true);
    expect(hasPolygonCollisionAt(single, 88, 72)).toBe(false);
  });

  it('removes the shared edge between overlapping strokes', () => {
    const polygons = build([
      { mode: 'paint', stroke: stroke('a', [{ x: 60, y: 72 }]) },
      { mode: 'paint', stroke: stroke('b', [{ x: 100, y: 72 }]) },
    ]);
    expect(hasPolygonCollisionAt(polygons, 100, 72)).toBe(false);
    expect(hasPolygonCollisionAt(polygons, 60, 72)).toBe(false);
    expect(hasPolygonCollisionAt(polygons, 140, 72)).toBe(true);
  });

  it('keeps an erased channel open without growing new end caps into it', () => {
    const polygons = build([
      { mode: 'paint', stroke: paint },
      { mode: 'erase', stroke: stroke('channel', [{ x: 96, y: 0 }, { x: 96, y: 144 }], 18) },
    ]);
    for (let y = 0; y < 144; y++) expect(hasPolygonCollisionAt(polygons, 96, y)).toBe(false);
    expect(hasPolygonCollisionAt(polygons, 76, 72)).toBe(true);
    expect(hasPolygonCollisionAt(polygons, 116, 72)).toBe(true);
  });

  it('honours partial erasure away from the original centreline and subsequent repaint', () => {
    const eraser = stroke('erase-bank', [{ x: 96, y: 28 }], 20);
    const erased = build([{ mode: 'paint', stroke: paint }, { mode: 'erase', stroke: eraser }]);
    expect(hasPolygonCollisionAt(erased, 96, 32)).toBe(false);
    expect(hasPolygonCollisionAt(erased, 96, 48)).toBe(true);
    expect(build([
      { mode: 'paint', stroke: paint }, { mode: 'erase', stroke: eraser }, { mode: 'paint', stroke: paint },
    ])).toEqual(build([{ mode: 'paint', stroke: paint }]));
  });

  it('retains inner island boundaries instead of filling a concave outline', () => {
    const polygons = build([
      { mode: 'paint', stroke: paint },
      { mode: 'erase', stroke: stroke('island', [{ x: 96, y: 72 }], 18) },
    ]);
    expect(hasPolygonCollisionAt(polygons, 96, 72)).toBe(false);
    expect(hasPolygonCollisionAt(polygons, 96, 54)).toBe(true);
    expect(hasPolygonCollisionAt(polygons, 96, 32)).toBe(true);
  });

  it('cuts only the bridge width out of a long bank', () => {
    const polygons = build([{ mode: 'paint', stroke: paint }], {
      params: { ...createMap().params, tileset: elementTilesetMedia },
      elementsAlwaysLow: JSON.stringify([{ x: 80, y: 0, id: 'floor', tilesetId: 'element-tileset', width: 32, height: 144 }]),
    });
    expect(hasPolygonCollisionAt(polygons, 96, 32)).toBe(false);
    expect(hasPolygonCollisionAt(polygons, 60, 32)).toBe(true);
    expect(hasPolygonCollisionAt(polygons, 130, 32)).toBe(true);
  });

  it('handles fully erased and outside-map paint without degenerate polygons', () => {
    expect(build([{ mode: 'paint', stroke: paint }, { mode: 'erase', stroke: { ...paint, radius: 60 } }])).toEqual([]);
    expect(build([{ mode: 'paint', stroke: stroke('outside', [{ x: -100, y: -100 }]) }])).toEqual([]);
    const polygons = build([{ mode: 'paint', stroke: stroke('clipped', [{ x: 0, y: 0 }]) }]);
    expect(polygons.length).toBeGreaterThan(0);
    expect(polygons.every(p => p.points.every(([x, y]) => x >= 0 && y >= 0 && x <= 192 && y <= 144))).toBe(true);
  });
});
