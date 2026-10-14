import { describe, expect, it } from "vitest";
import { buildElementPolygonHitboxes } from "./element-polygon-hitbox";
import { prepareStudioMapPayload } from "./map-streaming";

const polygon = {
  type: "polygon",
  x: 10,
  y: 20,
  width: 20,
  height: 20,
  polygons: [[[10, 20], [30, 20], [30, 40], [10, 40]]],
  parts: [[[10, 20], [30, 20], [30, 40], [10, 40]]],
};

describe("buildElementPolygonHitboxes", () => {
  it("translates and scales each convex part", () => {
    const [hitbox] = buildElementPolygonHitboxes(polygon, { x: 100, y: 200 }, { x: 2, y: 3 }, "e")!;
    expect(hitbox.points).toEqual([[120, 260], [160, 260], [160, 320], [120, 320]]);
    expect(hitbox).toMatchObject({ id: "e:0", x: 120, y: 260, width: 40, height: 60 });
  });

  it("returns null for rectangles so that the caller keeps its fallback", () => {
    expect(buildElementPolygonHitboxes({ type: "rectangle", x: 0, y: 0, width: 4, height: 4 }, { x: 0, y: 0 }, { x: 1, y: 1 }, "e")).toBeNull();
    expect(buildElementPolygonHitboxes({ type: "polygon", parts: [] }, { x: 0, y: 0 }, { x: 1, y: 1 }, "e")).toBeNull();
  });

  it("drops the parts the physics engine would reject", () => {
    const hitboxes = buildElementPolygonHitboxes(
      { type: "polygon", parts: [[[0, 0], [5, 5]], [[0, 0], [4, 0], [4, 4]], [[1, 1], [1, 1], [1, 1]], [["a", 0], [1, 1], [2, 0]]] },
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      "e"
    );
    expect(hitboxes).toHaveLength(1);
    expect(hitboxes![0].id).toBe("e:1");
  });
});

describe("streamed map with a polygon element", () => {
  it("emits the convex parts as point hitboxes at the placement", () => {
    const prepared = prepareStudioMapPayload({
      _id: "m",
      updatedAt: "1",
      creationDetails: { version: "v2" },
      params: {
        width: 4,
        height: 4,
        tileset: { _id: "t", fileName: "t.png", metadata: { elements: JSON.stringify([{ id: 0, rect: [0, 0, 48, 48], hitbox: polygon }]) } },
      },
      elementsAlwaysLow: "[]",
      elementsLow: JSON.stringify([{ id: 0, tilesetId: "t", x: 48, y: 48 }]),
      elementsHigh: "[]",
      terrain: JSON.stringify([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]),
      terrainMorphologyLayer: { features: [] },
    });
    const found = (prepared as any).hitboxes?.find((h: any) => h.points);
    expect(found?.points).toEqual([[58, 68], [78, 68], [78, 88], [58, 88]]);
  });
});
