import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildStudioElementSpriteParts, resolveStudioElementMetrics } from "./studio-element-renderer";

/**
 * Reference snapshots of the Studio element geometry, frozen BEFORE the map
 * builder renderer is written (see MAP_BUILDER.md, step 2).
 *
 * For each Studio element this records what the current renderer decides: where
 * the sprite parts are drawn, which part of the source image each one shows, and
 * the sort key that orders elements in depth. `@rpgjs/map-builder` must produce
 * the same geometry for the equivalent map (its renderer spec reads this file).
 *
 * This spec fails if the current Studio renderer stops matching the file. Regenerate
 * it on purpose with: UPDATE_MAP_BUILDER_REFERENCES=1 pnpm vitest run map-builder-references
 */
const REFERENCE_FILE = resolve(
  __dirname,
  "../../../map-builder/src/renderer/__references__/studio-elements.json",
);

const hitbox = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

const element = (overrides: Record<string, unknown> = {}) => ({
  id: "element",
  rect: [0, 0, 48, 48],
  drawIn: [96, 144, 48, 48],
  hitbox: hitbox(12, 30, 24, 14),
  zIndexOffset: 0,
  ...overrides,
});

const CASES: Array<{ name: string; description: string; element: Record<string, unknown> }> = [
  { name: "plain", description: "A sprite drawn at its natural size, sorted by the bottom of its hitbox.", element: element() },
  {
    name: "atlas-frame",
    description: "A sprite cut from a larger tileset image.",
    element: element({ rect: [201, 693, 92, 101], drawIn: [732, 792, 92, 101], hitbox: hitbox(20, 70, 52, 25) }),
  },
  {
    name: "scaled",
    description: "A non-uniform scale grows the drawn size and the hitbox with it.",
    element: element({ scale: { x: 2, y: 1.5 } }),
  },
  {
    name: "scaled-uniform-number",
    description: "A single number scales both axes.",
    element: element({ scale: 0.5 }),
  },
  {
    name: "z-offset-positive",
    description: "zIndexOffset moves the sort key.",
    element: element({ zIndexOffset: 10 }),
  },
  {
    name: "z-offset-negative",
    description: "A negative zIndexOffset sorts the element behind.",
    element: element({ zIndexOffset: -5 }),
  },
  {
    name: "no-hitbox",
    description: "Without a hitbox, the element is sorted by the bottom of its drawn rectangle.",
    element: element({ hitbox: { type: "none", x: 0, y: 0, width: 0, height: 0 } }),
  },
  {
    name: "hitbox-clamped",
    description: "An oversized hitbox is clamped to the element bounds.",
    element: element({ drawIn: [10, 20, 96, 96], hitbox: hitbox(0, 0, 48, 80), zIndexOffset: 3 }),
  },
  {
    name: "hitbox-with-offset-and-draw-size",
    description: "Hitbox bottom is scaled by the ratio between drawn size and source size.",
    element: element({ drawIn: [10, 20, 96, 96], hitbox: hitbox(8, 20, 24, 12), zIndexOffset: 3 }),
  },
  {
    name: "repeat-axis-x",
    description: "A body rectangle repeated along x, the last repetition cut to fit.",
    element: element({
      rect: [0, 0, 16, 16],
      drawIn: [0, 0, 40, 16],
      hitbox: hitbox(0, 8, 16, 8),
      drawRule: { type: "repeat-axis", axis: "x", rects: { body: [0, 0, 16, 16] } },
    }),
  },
  {
    name: "repeat-axis-y",
    description: "A body rectangle repeated along y.",
    element: element({
      rect: [0, 0, 16, 16],
      drawIn: [0, 0, 16, 40],
      hitbox: hitbox(0, 8, 16, 8),
      drawRule: { type: "repeat-axis", axis: "y", rects: { body: [0, 0, 16, 16] } },
    }),
  },
  {
    name: "repeat-axis-scaled",
    description: "Scaling a repeat-axis element repeats along the axis instead of stretching.",
    element: element({
      rect: [0, 0, 16, 16],
      drawIn: [0, 0, 16, 16],
      hitbox: hitbox(0, 8, 16, 8),
      scale: { x: 40 / 16, y: 1 },
      drawRule: { type: "repeat-axis", axis: "x", rects: { body: [0, 0, 16, 16] } },
    }),
  },
  {
    name: "edge-repeat",
    description: "Fixed caps with a repeated middle.",
    element: element({
      rect: [201, 693, 92, 101],
      drawIn: [732, 792, 92, 101],
      hitbox: hitbox(0, 80, 92, 21),
      scale: { x: 384 / 92, y: 1 },
      drawRule: {
        type: "edge-repeat",
        axis: "x",
        rects: { start: [0, 0, 19, 101], middle: [19, 0, 26, 101], end: [45, 0, 47, 101] },
      },
    }),
  },
  {
    name: "edge-repeat-compressed",
    description: "Caps are compressed when the target is smaller than the fixed edges.",
    element: element({
      rect: [0, 0, 30, 10],
      drawIn: [0, 0, 20, 10],
      hitbox: hitbox(0, 5, 30, 5),
      drawRule: {
        type: "edge-repeat",
        axis: "x",
        rects: { start: [0, 0, 15, 10], middle: [15, 0, 1, 10], end: [16, 0, 14, 10] },
      },
    }),
  },
  {
    name: "frame-9slice",
    description: "Nine slices: corners fixed, edges and center stretched.",
    element: element({
      rect: [0, 0, 30, 30],
      drawIn: [0, 0, 50, 50],
      hitbox: hitbox(0, 20, 30, 10),
      drawRule: {
        type: "frame-9slice",
        rects: {
          cornerTL: [0, 0, 10, 10],
          cornerTR: [20, 0, 10, 10],
          cornerBL: [0, 20, 10, 10],
          cornerBR: [20, 20, 10, 10],
          edgeT: [10, 0, 10, 10],
          edgeB: [10, 20, 10, 10],
          edgeL: [0, 10, 10, 10],
          edgeR: [20, 10, 10, 10],
          center: [10, 10, 10, 10],
        },
      },
    }),
  },
];

const capture = () =>
  CASES.map(({ name, description, element: input }) => {
    const metrics = resolveStudioElementMetrics(input);
    return {
      name,
      description,
      input,
      expected: {
        draw: { x: metrics.drawX, y: metrics.drawY, width: metrics.drawWidth, height: metrics.drawHeight },
        hitbox: {
          x: metrics.hitboxX,
          y: metrics.hitboxY,
          width: metrics.hitboxWidth,
          height: metrics.hitboxHeight,
          scaleX: metrics.hitboxScaleX,
          scaleY: metrics.hitboxScaleY,
        },
        hasSortableHitbox: metrics.hasSortableHitbox,
        sortKey: metrics.resolvedZIndex,
        parts: buildStudioElementSpriteParts(input).map((part) => ({
          x: part.x,
          y: part.y,
          width: part.width,
          height: part.height,
          source: part.sourceRect,
        })),
      },
    };
  });

describe("Studio element references for @rpgjs/map-builder", () => {
  it("matches the frozen reference file", () => {
    const current = JSON.parse(JSON.stringify(capture()));
    if (process.env.UPDATE_MAP_BUILDER_REFERENCES) {
      if (!existsSync(dirname(REFERENCE_FILE))) mkdirSync(dirname(REFERENCE_FILE), { recursive: true });
      writeFileSync(REFERENCE_FILE, `${JSON.stringify(current, null, 2)}\n`);
    }
    expect(JSON.parse(readFileSync(REFERENCE_FILE, "utf8"))).toEqual(current);
  });
});
