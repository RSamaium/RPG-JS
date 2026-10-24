import type { JsonObject, JsonValue } from "./json";

export const MAP_DEFINITION_VERSION = 1 as const;

/** Depth of an element. Reserved from the start so that adding it never reopens the format. */
export interface MapDepth {
  /** Explicit sort order, on top of y-sorting. */
  readonly z?: number;
  /** Y offset (in pixels, from the element origin) used as the sort anchor. */
  readonly anchorY?: number;
  /** Height of the element in pixels, for shadows and occlusion. */
  readonly height?: number;
}

export interface MapElement {
  readonly id: string;
  /** Asset reference (see `AssetResolver`). */
  readonly kind: string;
  /** World position, in pixels. */
  readonly x: number;
  readonly y: number;
  readonly depth?: MapDepth;
  /** Draw scale: one number for both axes, or `[x, y]`. Defaults to 1. */
  readonly scale?: MapScale;
  /** Per-element state that belongs to the map's persistent truth. Omitted when empty. */
  readonly data?: JsonObject;
}

export type MapScale = number | readonly [x: number, y: number];

export interface MapEvent {
  readonly id: string;
  readonly kind: string;
  /** World position, in pixels. */
  readonly x: number;
  readonly y: number;
  readonly graphic?: string;
  readonly data?: JsonObject;
}

/**
 * Neutral description of a map. It knows nothing about projects, bundles or APIs,
 * and is always JSON-serializable.
 *
 * The world is described in pixels. A tile grid is a feature, not the base.
 */
export interface MapDefinition {
  readonly version: typeof MAP_DEFINITION_VERSION;
  readonly id: string;
  /** World size, in pixels. */
  readonly size: readonly [width: number, height: number];
  /** Optional grid size, used by features that need a grid. */
  readonly tileSize?: number;
  readonly elements: readonly MapElement[];
  readonly events: readonly MapEvent[];
  /** Data owned by features, keyed by feature id. Unknown keys are preserved. */
  readonly extensions?: { readonly [featureId: string]: JsonValue };
}

/** Current state of a map held by a model. It has the same shape as a definition. */
export type MapState = MapDefinition;
