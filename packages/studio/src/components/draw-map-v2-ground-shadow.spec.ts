import { describe, expect, it } from "vitest";
// Vite exposes component source through its raw import during tests.
import drawMapV2Source from "./draw-map-v2.ce?raw";

describe("Studio v2 ground-shadow layer", () => {
  it("mounts extracted shadows below the event layer and keeps normal elements in it", () => {
    const groundShadowLayer = drawMapV2Source.indexOf("pixiChildren={groundShadowPixiChildren}");
    const eventLayer = drawMapV2Source.indexOf("<StudioEventLayer");

    expect(groundShadowLayer).toBeGreaterThan(-1);
    expect(eventLayer).toBeGreaterThan(groundShadowLayer);
    expect(drawMapV2Source).toContain("...elementsLowPixiChildren(),");
  });
});
