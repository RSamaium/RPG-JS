import { describe, expect, it } from "vitest";
import { studioTilesetElementRenderingSchema } from "./tileset-element";

describe("Studio tileset element rendering schema", () => {
  it("exposes embedded ground-shadow extraction as an opt-in option", () => {
    expect(studioTilesetElementRenderingSchema.properties.extractGroundShadow).toMatchObject({
      type: "boolean",
      default: false,
    });
  });
});
