import { describe, expect, it } from "vitest";
import { prepareStudioMapPayload, studioMapHitboxes } from "./map-streaming";
import { studioMapHitboxes as fromPackage } from "./index";
import { studioMapHitboxes as fromServer } from "./server-entry";

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

const elementTileset = {
  _id: "tileset",
  fileName: "tiles.png",
  metadata: {
    elements: JSON.stringify([
      { id: 0, rect: [0, 0, 48, 48], hitbox: { x: 0, y: 24, width: 48, height: 24 } },
    ]),
  },
};

/** A map with a collision of every source: drawn on the map, a polygon, a placed element and water. */
function createMap() {
  return {
    _id: "hitbox-map",
    updatedAt: "revision-1",
    creationDetails: { version: "v2" },
    params: {
      width: 6,
      height: 3,
      tileset: elementTileset,
      baseTerrain: terrainMedia,
      primaryTerrainTileset: terrainMedia,
      terrainTilesets: [terrainMedia],
    },
    hitboxes: [{ id: "drawn-wall", x: 0, y: 0, width: 48, height: 96 }],
    polygons: [[[200, 10], [240, 10], [220, 40]], [[0, 0], [1, 1]]],
    elementsAlwaysLow: "[]",
    elementsLow: JSON.stringify([{ id: 0, tilesetId: "tileset", x: 240, y: 96 }]),
    elementsHigh: "[]",
    terrain: JSON.stringify([
      [0, 0, 0, 0, 1, 1],
      [0, 0, 0, 0, 1, 1],
      [0, 0, 0, 0, 0, 0],
    ]),
    events: [{ id: "chest", x: 96, y: 96 }],
  };
}

const inside = (hitbox: any, x: number, y: number): boolean => {
  if (Array.isArray(hitbox.points)) {
    let crossed = false;
    const points = hitbox.points;
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) crossed = !crossed;
    }
    return crossed;
  }
  return x >= hitbox.x && x < hitbox.x + hitbox.width && y >= hitbox.y && y < hitbox.y + hitbox.height;
};
const blocked = (hitboxes: any[], x: number, y: number) => hitboxes.some((hitbox) => inside(hitbox, x, y));

describe("studioMapHitboxes", () => {
  it("gives the hitboxes that prepareStudioMapPayload gives the map", () => {
    const map = createMap();
    expect(studioMapHitboxes(map)).toEqual(prepareStudioMapPayload(createMap()).hitboxes);
  });

  it("gathers the collisions of every source, in pixels of the map", () => {
    const hitboxes = studioMapHitboxes(createMap());

    // Drawn on the map, kept as they are
    expect(hitboxes).toContainEqual({ id: "drawn-wall", x: 0, y: 0, width: 48, height: 96 });
    // A polygon of the map; one with fewer than three points is not a polygon
    expect(hitboxes.filter((hitbox) => hitbox.id?.startsWith("studio-polygon:"))).toEqual([
      { id: "studio-polygon:0", points: [[200, 10], [240, 10], [220, 40]] },
    ]);
    // The lower half of the placed element
    expect(blocked(hitboxes, 260, 135)).toBe(true);
    expect(blocked(hitboxes, 260, 100)).toBe(false);
    // The water of the terrain
    expect(blocked(hitboxes, 230, 70)).toBe(true);
    // Free grass
    expect(blocked(hitboxes, 120, 30)).toBe(false);
    // Events are not collisions of the map
    expect(blocked(hitboxes, 100, 100)).toBe(false);
  });

  it("reads a map held in the data of a payload", () => {
    expect(studioMapHitboxes({ id: "hitbox-map", data: createMap() })).toEqual(studioMapHitboxes(createMap()));
  });

  it("gives back the hitboxes of a payload already prepared", () => {
    const prepared = prepareStudioMapPayload(createMap());
    const hitboxes = studioMapHitboxes(prepared);
    expect(hitboxes).toEqual(prepared.hitboxes);
    // A copy: changing it does not change the payload
    hitboxes.length = 0;
    expect(prepared.hitboxes.length).toBeGreaterThan(0);
  });

  it("does not change the map it is given", () => {
    const map = createMap();
    const before = JSON.stringify(map);
    studioMapHitboxes(map);
    expect(JSON.stringify(map)).toBe(before);
  });

  it("throws for a map that is not in format v2, as the map payload does", () => {
    const legacy = { ...createMap(), creationDetails: { version: "v1" } };
    expect(() => studioMapHitboxes(legacy)).toThrow("must use format v2");
    expect(() => prepareStudioMapPayload(legacy)).toThrow("must use format v2");
  });

  it("is exported by the package and by its server entry", () => {
    expect(fromPackage).toBe(studioMapHitboxes);
    expect(fromServer).toBe(studioMapHitboxes);
  });
});
