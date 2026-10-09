import { describe, expect, it } from "vitest";
import { collectEventGraphics, resolveGeneratedCharacterDisplayScale, scaleEventHitboxToGraphic } from "./event-hitbox-scale";

const merchant = { metadata: { generationMode: "idle", columns: 2, rows: 2, width: 1024, height: 768 } };

describe("event hitbox scale", () => {
  it("displays a generated character with a cell of 128 pixels", () => {
    expect(resolveGeneratedCharacterDisplayScale(merchant)).toBe(0.25);
    expect(resolveGeneratedCharacterDisplayScale({ metadata: { ...merchant.metadata, scale: 2 } })).toBe(0.5);
    expect(resolveGeneratedCharacterDisplayScale({ metadata: { generationMode: "character" } })).toBeUndefined();
  });

  it("scales the hitbox of a generated character and leaves the others", () => {
    expect(scaleEventHitboxToGraphic({ width: 139, height: 117 }, [merchant])).toEqual({ width: 35, height: 29 });
    expect(scaleEventHitboxToGraphic({ width: 139, height: 117 }, [{ metadata: {} }, "graphic-id"])).toEqual({ width: 139, height: 117 });
  });

  it("finds the graphic on the active page first", () => {
    const event = { triggers: [{ graphic: { id: "a" } }, { graphic: { id: "b" } }] };
    expect(collectEventGraphics(event, event.triggers[0])).toEqual([{ id: "a" }, { id: "b" }, { id: "a" }]);
  });
});
