import type { AttachShapeOptions } from "@rpgjs/common";

type ZoneDirection = "up" | "down" | "left" | "right";

/**
 * Radius of an attached shape: `radius`, or half of the largest side when only
 * `width` and `height` are given. `undefined` when neither is provided.
 */
export function resolveAttachedShapeRadius(options: AttachShapeOptions): number | undefined {
  if (options.radius !== undefined) {
    return options.radius;
  }
  if (options.width && options.height) {
    return Math.max(options.width, options.height) / 2;
  }
  return undefined;
}

/**
 * Offset of an attached shape from the owner body center, from its positioning.
 */
export function resolveAttachedShapeOffset(
  positioning: AttachShapeOptions["positioning"],
  owner: { width?: number; height?: number; radius?: number },
): { x: number; y: number } {
  if (!positioning) {
    return { x: 0, y: 0 };
  }
  const width = owner.width || (owner.radius ?? 0) * 2 || 32;
  const height = owner.height || (owner.radius ?? 0) * 2 || 32;

  switch (positioning) {
    case "top":
      return { x: 0, y: -height / 2 };
    case "bottom":
      return { x: 0, y: height / 2 };
    case "left":
      return { x: -width / 2, y: 0 };
    case "right":
      return { x: width / 2, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

/** Zone direction of an attached shape. `Direction` values are already strings. */
export function resolveAttachedShapeDirection(direction: AttachShapeOptions["direction"]): ZoneDirection {
  return direction === undefined ? "down" : (String(direction) as ZoneDirection);
}

/** Zone metadata carrying the shape name and properties, or `undefined` when empty. */
export function buildAttachedShapeMetadata(options: AttachShapeOptions): Record<string, any> | undefined {
  const metadata: Record<string, any> = {};
  if (options.name) {
    metadata.name = options.name;
  }
  if (options.properties) {
    metadata.properties = options.properties;
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined;
}
