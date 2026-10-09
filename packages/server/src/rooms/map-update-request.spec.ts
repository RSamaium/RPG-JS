import { describe, expect, it } from "vitest";
import {
  normalizeWorldMapConfigs,
  parseWorldIdFromUpdateUrl,
  unauthorizedUpdateResponse,
  withDefaultDamageFormulas,
} from "./map-update-request";

describe("map update request helpers", () => {
  it("reads the world id from room-local and transport paths", () => {
    expect(parseWorldIdFromUpdateUrl("/world/my%20world/update")).toBe("my world");
    expect(parseWorldIdFromUpdateUrl("http://host/parties/main/map-a/world/w1/update/")).toBe("w1");
    expect(parseWorldIdFromUpdateUrl("/map/update")).toBe("");
    expect(parseWorldIdFromUpdateUrl(undefined)).toBe("");
  });

  it("normalizes world payloads and falls back to current map sizes", () => {
    const fallback = { width: 640, height: 480, tileWidth: 16, tileHeight: 16 };
    const expected = [
      { id: "a", worldX: 10, worldY: 20, width: 640, height: 480, tileWidth: 16, tileHeight: 16 },
    ];

    expect(normalizeWorldMapConfigs([{ id: "a", x: 10, y: 20 }], fallback)).toEqual(expected);
    expect(normalizeWorldMapConfigs({ maps: [{ id: "a", worldX: 10, worldY: 20 }] }, fallback)).toEqual(expected);
    expect(normalizeWorldMapConfigs(null, fallback)).toEqual([]);
    expect(normalizeWorldMapConfigs([{ id: "b", widthPx: 100, heightPx: 50 }], {})).toEqual([
      { id: "b", worldX: 0, worldY: 0, width: 100, height: 50, tileWidth: 32, tileHeight: 32 },
    ]);
  });

  it("keeps published damage formulas over defaults", () => {
    const custom = () => 1;
    const formulas = withDefaultDamageFormulas({ damageSkill: custom });
    expect(formulas.damageSkill).toBe(custom);
    expect(typeof formulas.damagePhysic).toBe("function");
    expect(formulas.coefficientElements).toBeDefined();
  });

  it("builds a 401 JSON response", async () => {
    const response = unauthorizedUpdateResponse("world", "/world/:id/update");
    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("Unauthorized world update");
  });
});
