import type { JsonObject } from "../model/json";

/** Version of the terrain data stored under `extensions.terrain`. */
export const TERRAIN_DATA_VERSION = 1 as const;

/** The extension id the terrain feature owns. */
export const TERRAIN_EXTENSION_ID = "terrain";

/** What a mask pixel holds when no material is painted there. */
export const NO_MATERIAL = 0xffff;

export type TerrainMode =
  | { readonly type: "hard" }
  | { readonly type: "fade"; readonly width?: number; readonly curve?: "linear" | "smooth" | "sharp" }
  | { readonly type: "nine-slice"; readonly center: { readonly x: number; readonly y: number; readonly width: number; readonly height: number } }
  | { readonly type: "water"; readonly border?: boolean; readonly foam?: boolean }
  | { readonly type: "custom"; readonly shaderKey: string; readonly params?: JsonObject };

/** One material of the palette. Its position in `materials` is the value stored in the mask. */
export interface TerrainMaterial {
  readonly id: string;
  /** Asset reference of the texture (see `AssetResolver`). */
  readonly texture: string;
  readonly mode?: TerrainMode;
  /** Painted over lower priorities. Defaults to the position in the palette. */
  readonly priority?: number;
  /** Collision polygons come from the mask where this material is painted. */
  readonly collision?: boolean;
  readonly specialType?: string;
  /** Period, in world pixels, at which the texture repeats. */
  readonly renderTileSize?: number;
  readonly renderingStyle?: "pixel-art" | "hd-2d";
}

export interface TerrainTransition {
  readonly from: string;
  readonly to: string;
  readonly mode: TerrainMode;
  readonly priority?: number;
}

/**
 * The control mask: which material is under each pixel. Stored by chunks of run-length encoded
 * values, so that a patch only rewrites the chunks it touches and the others are shared between states.
 */
export interface TerrainMask {
  /** World pixels per mask pixel. 1 is pixel-perfect; more is cheaper in memory. */
  readonly scale: number;
  /** Size of the mask, in mask pixels. */
  readonly width: number;
  readonly height: number;
  /** Side of a chunk, in mask pixels. */
  readonly chunk: number;
  /** Material index of the chunks that are not in `chunks`. */
  readonly fill: number;
  /** `"col,row"` to the run-length encoding of the chunk (see `encodeRuns`). */
  readonly chunks: { readonly [key: string]: string };
}

export interface TerrainData {
  readonly version: typeof TERRAIN_DATA_VERSION;
  readonly materials: readonly TerrainMaterial[];
  readonly transitions?: readonly TerrainTransition[];
  readonly mask: TerrainMask;
  /** Holes and walls drawn by strokes, as the kernel takes them (`@rpgjs/render-map2d`). */
  readonly morphology?: readonly JsonObject[];
  readonly water?: { readonly enabled: boolean; readonly speed: number; readonly intensity: number; readonly direction: number };
}

/** A region of the mask, in mask pixels. */
export interface MaskRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type TerrainShape =
  | { readonly type: "fill" }
  | { readonly type: "circle"; readonly x: number; readonly y: number; readonly radius: number }
  | { readonly type: "rect"; readonly x: number; readonly y: number; readonly width: number; readonly height: number }
  | { readonly type: "stroke"; readonly points: readonly (readonly [x: number, y: number])[]; readonly radius: number };
