// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { AssetDescriptor, AssetResolver } from "../model/assets";
import type { MapElement, MapScale } from "../model/definition";
import references from "./__references__/studio-elements.json";
import { resolveElementGeometry } from "./geometry";
import { describeElement } from "./scene";

/**
 * Parity with the Studio element renderer.
 *
 * `__references__/studio-elements.json` was frozen from the Studio renderer
 * BEFORE this renderer was written (a Studio spec keeps it honest). Each Studio
 * element is converted to a map element and an asset, rendered here, and compared
 * with what Studio decided: draw rectangle, scaled hitbox, sort key and sprite parts.
 *
 * Documented difference: Studio cuts an element into several parts with its own
 * drawing rules (repeat-axis, edge-repeat, frame-9slice). That segmentation stays
 * in Studio and reaches this renderer through the `resolveElementSprite` hook, so
 * for those cases the parts are taken from the reference. What is verified is that
 * they are placed, sorted and bounded exactly as Studio does.
 */
interface StudioInput {
  rect: [number, number, number, number];
  drawIn: [number, number, number, number];
  hitbox: { x: number; y: number; width: number; height: number; type?: string };
  scale?: number | { x: number; y: number };
  zIndexOffset?: number;
  drawRule?: unknown;
}
interface Reference {
  name: string;
  description: string;
  input: StudioInput;
  expected: {
    draw: { x: number; y: number; width: number; height: number };
    hitbox: { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number };
    hasSortableHitbox: boolean;
    sortKey: number;
    parts: Array<{ x: number; y: number; width: number; height: number; source: { x: number; y: number; width: number; height: number } }>;
  };
}

const cases = references as unknown as Reference[];

const toScale = (scale: StudioInput["scale"]): MapScale | undefined =>
  scale === undefined ? undefined : typeof scale === "number" ? scale : [scale.x, scale.y];

function convert(reference: Reference) {
  const { input, expected } = reference;
  const descriptor: AssetDescriptor = {
    src: "tileset.png",
    frame: input.rect,
    size: [input.drawIn[2], input.drawIn[3]],
    ...(expected.hasSortableHitbox
      ? { hitbox: [input.hitbox.x, input.hitbox.y, input.hitbox.width, input.hitbox.height] as const }
      : {}),
  };
  const element: MapElement = {
    id: reference.name,
    kind: "studio-element",
    x: input.drawIn[0],
    y: input.drawIn[1],
    ...(toScale(input.scale) !== undefined ? { scale: toScale(input.scale)! } : {}),
    ...(input.zIndexOffset ? { depth: { z: input.zIndexOffset } } : {}),
  };
  const assets: AssetResolver = {
    kinds: ["studio-element"],
    has: (kind): kind is string => kind === "studio-element",
    resolve: (kind) => (kind === "studio-element" ? descriptor : undefined),
  };
  const hooks = input.drawRule
    ? {
        resolveElementSprite: () => ({
          parts: expected.parts.map((part) => ({
            x: part.x - input.drawIn[0],
            y: part.y - input.drawIn[1],
            width: part.width,
            height: part.height,
            frame: [part.source.x, part.source.y, part.source.width, part.source.height] as const,
          })),
        }),
      }
    : undefined;
  return { descriptor, element, assets, hooks };
}

describe("parity with the Studio element renderer", () => {
  it("covers the cases frozen in the reference file", () => {
    expect(cases.map((c) => c.name)).toEqual(
      expect.arrayContaining(["plain", "atlas-frame", "scaled", "no-hitbox", "repeat-axis-x", "edge-repeat", "frame-9slice"]),
    );
    expect(cases.length).toBeGreaterThanOrEqual(15);
  });

  describe.each(cases)("$name", (reference) => {
    const { expected } = reference;
    const { descriptor, element, assets, hooks } = convert(reference);
    const node = describeElement(element, { assets, ...(hooks ? { hooks } : {}) });

    it("draws the element where Studio draws it", () => {
      const geometry = resolveElementGeometry({
        x: element.x,
        y: element.y,
        ...(element.scale !== undefined ? { scale: element.scale } : {}),
        ...(element.depth ? { depth: element.depth } : {}),
        frame: descriptor.frame!,
        size: descriptor.size!,
        ...(descriptor.hitbox ? { hitbox: descriptor.hitbox } : {}),
      });
      expect(geometry?.draw).toEqual(expected.draw);
    });

    it("scales and clamps the hitbox like Studio", () => {
      const geometry = resolveElementGeometry({
        x: element.x,
        y: element.y,
        ...(element.scale !== undefined ? { scale: element.scale } : {}),
        frame: descriptor.frame!,
        size: descriptor.size!,
        ...(descriptor.hitbox ? { hitbox: descriptor.hitbox } : {}),
      });
      if (!expected.hasSortableHitbox) {
        expect(geometry?.hitbox).toBeUndefined();
        return;
      }
      expect(geometry?.hitbox).toEqual(expected.hitbox);
    });

    it("orders the element in depth with the same sort key", () => {
      expect(node?.sortKey).toBe(expected.sortKey);
    });

    it("produces the same sprite parts", () => {
      expect(node?.parts).toHaveLength(expected.parts.length);
      node?.parts.forEach((part, index) => {
        const want = expected.parts[index]!;
        expect({ x: part.x, y: part.y, width: part.width, height: part.height }).toEqual({
          x: want.x,
          y: want.y,
          width: want.width,
          height: want.height,
        });
        expect(part.frame).toEqual([want.source.x, want.source.y, want.source.width, want.source.height]);
        expect(part.src).toBe("tileset.png");
      });
    });

    it("bounds the element by the union of its parts", () => {
      const left = Math.min(...expected.parts.map((p) => p.x));
      const top = Math.min(...expected.parts.map((p) => p.y));
      const right = Math.max(...expected.parts.map((p) => p.x + p.width));
      const bottom = Math.max(...expected.parts.map((p) => p.y + p.height));
      expect(node?.bounds).toEqual({ x: left, y: top, width: right - left, height: bottom - top });
    });
  });
});
