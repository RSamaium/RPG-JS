// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { defineAssets } from "../model/assets";
import type { MapElement, MapEvent } from "../model/definition";
import { describeElement, describeEvent, type DescribeContext } from "./scene";

const assets = defineAssets({
  tree: { src: "/tree.png", size: [64, 96], hitbox: [16, 70, 32, 20] },
  atlas: { src: "/tileset.png", frame: [32, 64, 16, 16], size: [32, 32] },
  unsized: { src: "/unsized.png" },
  chest: { src: "/chest.png", size: [16, 16] },
});

const element = (overrides: Partial<MapElement> = {}): MapElement => ({ id: "e1", kind: "tree", x: 100, y: 200, ...overrides });
const context = (extra: Partial<DescribeContext> = {}): DescribeContext => ({ assets, ...extra });

describe("describeElement", () => {
  it("describes a plain element as one part at its position", () => {
    const node = describeElement(element(), context())!;
    expect(node).toMatchObject({ key: "elements/e1", id: "e1", type: "element", kind: "tree", stage: "objects" });
    expect(node.parts).toEqual([{ key: "default", x: 100, y: 200, width: 64, height: 96, src: "/tree.png" }]);
    expect(node.bounds).toEqual({ x: 100, y: 200, width: 64, height: 96 });
  });

  it("sorts by the bottom of the hitbox and exposes it in world coordinates", () => {
    const node = describeElement(element(), context())!;
    expect(node.sortKey).toBe(200 + 70 + 20);
    expect(node.hitbox).toEqual({ x: 116, y: 270, width: 32, height: 20 });
  });

  it("applies the scale of the element to the drawing and to the hitbox", () => {
    const node = describeElement(element({ scale: 2 }), context())!;
    expect(node.parts[0]).toMatchObject({ width: 128, height: 192 });
    expect(node.hitbox).toEqual({ x: 132, y: 340, width: 64, height: 40 });
    expect(node.sortKey).toBe(200 + 90 * 2);
  });

  it("uses depth.z and depth.anchorY", () => {
    expect(describeElement(element({ depth: { z: 7 } }), context())!.sortKey).toBe(290 + 7);
    expect(describeElement(element({ depth: { anchorY: 0 } }), context())!.sortKey).toBe(200);
  });

  it("carries the frame of an asset cut out of a larger image", () => {
    const node = describeElement(element({ kind: "atlas" }), context())!;
    expect(node.parts[0]).toEqual({ key: "default", x: 100, y: 200, width: 32, height: 32, src: "/tileset.png", frame: [32, 64, 16, 16] });
  });

  describe("unknown assets and sizes", () => {
    it("reports an unknown asset and draws nothing", () => {
      const onMissingAsset = vi.fn();
      expect(describeElement(element({ kind: "nope" }), context({ hooks: { onMissingAsset } }))).toBeUndefined();
      expect(onMissingAsset).toHaveBeenCalledWith("nope", { type: "element", id: "e1" });
    });

    it("waits for the size of an asset that does not declare one", () => {
      expect(describeElement(element({ kind: "unsized" }), context())).toBeUndefined();
      const measure = vi.fn(() => undefined);
      expect(describeElement(element({ kind: "unsized" }), context({ measure }))).toBeUndefined();
      expect(measure).toHaveBeenCalledWith("/unsized.png");
    });

    it("uses the measured size once the image is known", () => {
      const node = describeElement(element({ kind: "unsized" }), context({ measure: () => [40, 30] }))!;
      expect(node.parts[0]).toMatchObject({ width: 40, height: 30 });
      expect(node.sortKey).toBe(230);
    });

    it("does not measure when a frame already gives the size", () => {
      const measure = vi.fn();
      describeElement(element({ kind: "atlas" }), context({ measure }));
      expect(measure).not.toHaveBeenCalled();
    });
  });

  describe("hooks", () => {
    it("resolveElementSprite can replace the image with parts relative to the element", () => {
      const hooks = {
        resolveElementSprite: () => ({
          parts: [
            { x: 0, y: 0, width: 16, height: 16, frame: [0, 0, 16, 16] as const },
            { x: 16, y: 0, width: 8, height: 16, frame: [0, 0, 8, 16] as const, src: "/other.png" },
          ],
        }),
      };
      const node = describeElement(element({ x: 10, y: 20 }), context({ hooks }))!;
      expect(node.parts.map((p) => [p.x, p.y, p.width, p.src])).toEqual([
        [10, 20, 16, "/tree.png"],
        [26, 20, 8, "/other.png"],
      ]);
      expect(node.parts.map((p) => p.key)).toEqual(["elements/e1#0", "elements/e1#1"]);
      expect(node.bounds).toEqual({ x: 10, y: 20, width: 24, height: 16 });
    });

    it("resolveElementSprite receives the asset descriptor and can override size, frame and hitbox", () => {
      const resolveElementSprite = vi.fn(() => ({ size: [10, 10] as const, hitbox: [0, 0, 10, 5] as const, frame: [0, 0, 20, 20] as const }));
      const node = describeElement(element(), context({ hooks: { resolveElementSprite } }))!;
      expect(resolveElementSprite).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }), { descriptor: assets.resolve("tree") });
      expect(node.parts[0]).toMatchObject({ width: 10, height: 10, frame: [0, 0, 20, 20] });
      expect(node.sortKey).toBe(Math.round(200 + 5 * (10 / 20)));
    });

    it("can draw an element whose kind is not an asset, when the hook provides everything", () => {
      const hooks = { resolveElementSprite: () => ({ src: "/x.png", size: [8, 8] as const, frame: [0, 0, 8, 8] as const }) };
      expect(describeElement(element({ kind: "virtual" }), context({ hooks }))?.parts[0]).toMatchObject({ src: "/x.png", width: 8 });
    });

    it("onBeforeRenderElement can adjust the node, or leave it alone", () => {
      const adjusted = describeElement(element(), context({ hooks: { onBeforeRenderElement: (node) => ({ ...node, sortKey: 1 }) } }))!;
      expect(adjusted.sortKey).toBe(1);
      const untouched = describeElement(element(), context({ hooks: { onBeforeRenderElement: () => undefined } }))!;
      expect(untouched.sortKey).toBe(290);
    });
  });
});

describe("describeEvent", () => {
  const event = (overrides: Partial<MapEvent> = {}): MapEvent => ({ id: "ev", kind: "loot", x: 5, y: 6, graphic: "chest", ...overrides });

  it("draws the graphic of an event", () => {
    const node = describeEvent(event(), context())!;
    expect(node).toMatchObject({ key: "events/ev", type: "event", kind: "loot", stage: "objects", sortKey: 22 });
    expect(node.parts).toEqual([{ key: "default", x: 5, y: 6, width: 16, height: 16, src: "/chest.png" }]);
  });

  it("draws nothing for an event without a graphic", () => {
    expect(describeEvent(event({ graphic: undefined }), context())).toBeUndefined();
  });

  it("reports a graphic nobody knows", () => {
    const onMissingAsset = vi.fn();
    expect(describeEvent(event({ graphic: "nope" }), context({ hooks: { onMissingAsset } }))).toBeUndefined();
    expect(onMissingAsset).toHaveBeenCalledWith("nope", { type: "event", id: "ev" });
  });

  it("keeps an event and an element with the same id apart", () => {
    expect(describeEvent(event({ id: "e1" }), context())!.key).not.toBe(describeElement(element(), context())!.key);
  });
});
