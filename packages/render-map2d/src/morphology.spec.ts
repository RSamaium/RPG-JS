import { describe, expect, it } from "vitest";
import { resolveTerrainMorphologyLiquidGeometry } from "./morphology";

describe("resolveTerrainMorphologyLiquidGeometry", () => {
  const bounds = { minX: 0, minY: 0, maxX: 199, maxY: 99 };

  it("removes the exposed wall and keeps a narrow contact inset at 100%", () => {
    expect(resolveTerrainMorphologyLiquidGeometry({ bounds, depth: 20, fillHeight: 100, tileSize: 48 }))
      .toMatchObject({ level: 1, dropY: 0, inset: 3, wallAlpha: 0 });
  });

  it("lowers and insets a partially filled liquid", () => {
    const full = resolveTerrainMorphologyLiquidGeometry({ bounds, depth: 20, fillHeight: 100, tileSize: 48 });
    const partial = resolveTerrainMorphologyLiquidGeometry({ bounds, depth: 20, fillHeight: 50, tileSize: 48 });

    expect(partial.dropY).toBeGreaterThan(full.dropY);
    expect(partial.inset).toBeGreaterThan(full.inset);
    expect(partial.wallAlpha).toBeGreaterThan(0);
  });
});
