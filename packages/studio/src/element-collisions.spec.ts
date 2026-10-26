import { describe, expect, it, vi } from "vitest";
import { buildStudioElementCollisions, isStudioElementHitboxId, rebuildStudioElementCollisions, STUDIO_ELEMENT_COLLISIONS_CHANNEL } from "./element-collisions";

const data = (extra: Record<string, unknown> = {}) => ({
  params: {
    width: 4,
    height: 2,
    ...(extra.scale ? { scale: extra.scale } : {}),
    tileset: {
      _id: "tileset",
      metadata: {
        elements: JSON.stringify([
          { id: 0, rect: [0, 0, 48, 48], hitbox: { x: 0, y: 24, width: 48, height: 24 } },
          { id: 1, rect: [48, 0, 48, 48] },
        ]),
      },
    },
  },
  ...extra,
});

describe("the collisions of the placed elements", () => {
  it("recognizes the ids of the hitboxes that come from the elements", () => {
    expect(isStudioElementHitboxId("studio-element:3")).toBe(true);
    expect(isStudioElementHitboxId("element_3_tree")).toBe(true);
    expect(isStudioElementHitboxId("__map_stream__:0:0:1:studio-element:3")).toBe(true);
    expect(isStudioElementHitboxId("studio-polygon:0")).toBe(false);
    expect(isStudioElementHitboxId("map-width-left")).toBe(false);
  });

  it("makes the hitbox of each placed element that blocks, at its place", () => {
    const hitboxes = buildStudioElementCollisions(data(), [
      { id: 0, tilesetId: "tileset", x: 96, y: 48 },
      { id: 1, tilesetId: "tileset", x: 0, y: 0 },
      { id: 0, tilesetId: "tileset", x: 200, y: 0 },
    ]);
    expect(hitboxes).toEqual([
      expect.objectContaining({ id: "studio-element:0", x: 96, y: 72, width: 48, height: 24 }),
      expect.objectContaining({ id: "studio-element:2", x: 200, y: 24, width: 48, height: 24 }),
    ]);
  });

  it("puts them in the scaled pixels of the world, as the direct load does", () => {
    const [hitbox] = buildStudioElementCollisions(data({ scale: 2 }), [{ id: 0, tilesetId: "tileset", x: 96, y: 48 }]);
    expect(hitbox).toMatchObject({ x: 192, y: 144, width: 96, height: 48 });
  });

  it("gives nothing for no element, or for an element of a tileset the map does not have", () => {
    expect(buildStudioElementCollisions(data(), [])).toEqual([]);
    expect(buildStudioElementCollisions(data(), [{ id: 0, tilesetId: "other", x: 0, y: 0 }])).toEqual([]);
  });

  it("rebuilds them on the client scene and tells the server", () => {
    const replaceStaticHitboxes = vi.fn();
    const emit = vi.fn();
    const placed = [{ id: 0, tilesetId: "tileset", x: 96, y: 48 }];
    rebuildStudioElementCollisions({ scene: { replaceStaticHitboxes }, socket: { emit }, mapData: data() }, placed);
    expect(replaceStaticHitboxes).toHaveBeenCalledWith(isStudioElementHitboxId, [expect.objectContaining({ id: "studio-element:0", y: 72 })]);
    expect(emit).toHaveBeenCalledWith(STUDIO_ELEMENT_COLLISIONS_CHANNEL, { elementsLow: placed });
  });

  it("does what it can when the scene or the socket is not there", () => {
    expect(() => rebuildStudioElementCollisions({ scene: undefined, socket: undefined, mapData: data() }, [])).not.toThrow();
  });
});
