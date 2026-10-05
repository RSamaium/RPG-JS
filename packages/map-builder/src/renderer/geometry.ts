import type { MapDepth, MapScale } from "../model/definition";

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type Frame = readonly [x: number, y: number, width: number, height: number];

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
/** Pixel sizes are whole numbers, and at least 1. */
const toSize = (value: number): number => Math.max(1, Math.round(value));

export function normalizeScale(scale: MapScale | undefined): { x: number; y: number } {
  if (typeof scale === "number") return scale > 0 && Number.isFinite(scale) ? { x: scale, y: scale } : { x: 1, y: 1 };
  if (Array.isArray(scale)) {
    const [x, y] = scale as readonly [number, number];
    return { x: x > 0 && Number.isFinite(x) ? x : 1, y: y > 0 && Number.isFinite(y) ? y : 1 };
  }
  return { x: 1, y: 1 };
}

export interface GeometryInput {
  /** World position of the top-left corner. */
  readonly x: number;
  readonly y: number;
  readonly scale?: MapScale;
  readonly depth?: MapDepth;
  /** Part of the source image to show. */
  readonly frame?: Frame;
  /**
   * Size of the whole source image, when `frame` is not given. Without it, `size`
   * is taken as the size of the image too.
   */
  readonly sourceSize?: readonly [number, number];
  /** Size at which the asset is drawn before `scale`. Defaults to the size of the frame. */
  readonly size?: readonly [number, number];
  /** `[x, y, width, height]` collision box, in pixels of the source image. */
  readonly hitbox?: Frame;
}

export interface ElementGeometry {
  /** Where the element is drawn, after scale. */
  readonly draw: Rect;
  /** Collision box in source pixels, clamped to the source, with the ratio that maps it to the world. */
  readonly hitbox?: Rect & { readonly scaleX: number; readonly scaleY: number };
  /** Elements with a higher key are drawn in front. */
  readonly sortKey: number;
}

/**
 * Where an element is drawn and in which order, with the rules of the Studio
 * renderer:
 *
 * - sizes are rounded and at least 1 pixel;
 * - the hitbox is clamped to the source image and scaled with the drawing;
 * - the sort key is the bottom of the hitbox (or of the drawing without one),
 *   plus `depth.z`. `depth.anchorY` replaces the bottom with an explicit offset.
 *
 * Returns `undefined` when the size of the source is unknown: no `frame`, no
 * `sourceSize` and no `size`.
 */
export function resolveElementGeometry(input: GeometryInput): ElementGeometry | undefined {
  const source = input.frame ? ([input.frame[2], input.frame[3]] as const) : (input.sourceSize ?? input.size);
  if (!source) return undefined;
  const [sourceWidth, sourceHeight] = source;
  const scale = normalizeScale(input.scale);

  const [baseWidth, baseHeight] = input.size ?? source;
  const draw: Rect = {
    x: input.x,
    y: input.y,
    width: toSize(toSize(baseWidth) * scale.x),
    height: toSize(toSize(baseHeight) * scale.y),
  };
  const z = input.depth?.z ?? 0;

  let hitbox: ElementGeometry["hitbox"];
  if (input.hitbox) {
    const boundsWidth = Math.max(1, sourceWidth);
    const boundsHeight = Math.max(1, sourceHeight);
    const [rawX, rawY, rawWidth, rawHeight] = input.hitbox;
    const x = clamp(rawX, 0, Math.max(0, boundsWidth - 1));
    const y = clamp(rawY, 0, Math.max(0, boundsHeight - 1));
    const right = clamp(rawX + toSize(rawWidth), x + 1, boundsWidth);
    const bottom = clamp(rawY + toSize(rawHeight), y + 1, boundsHeight);
    hitbox = {
      x,
      y,
      width: right - x,
      height: bottom - y,
      scaleX: draw.width / boundsWidth,
      scaleY: draw.height / boundsHeight,
    };
  }

  const anchor =
    input.depth?.anchorY !== undefined
      ? input.depth.anchorY
      : hitbox
        ? (hitbox.y + hitbox.height) * hitbox.scaleY
        : draw.height;

  return { draw, ...(hitbox ? { hitbox } : {}), sortKey: Math.round(draw.y + anchor + z) };
}

export function unionBounds(rects: readonly Rect[]): Rect {
  if (rects.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const rect of rects) {
    left = Math.min(left, rect.x);
    top = Math.min(top, rect.y);
    right = Math.max(right, rect.x + rect.width);
    bottom = Math.max(bottom, rect.y + rect.height);
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** True when the two rectangles overlap or touch. */
export function intersects(a: Rect, b: Rect): boolean {
  return a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height;
}

export function grow(rect: Rect, margin: number): Rect {
  return { x: rect.x - margin, y: rect.y - margin, width: rect.width + margin * 2, height: rect.height + margin * 2 };
}
