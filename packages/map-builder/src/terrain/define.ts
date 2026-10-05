import type { JsonValue } from "../model/json";
import type { TerrainBuilder } from "../model/define-map";
import { MapDefinitionError } from "../model/errors";
import { createMask, paintShape } from "./mask";
import { TERRAIN_DATA_VERSION, type TerrainData, type TerrainMaterial, type TerrainMode, type TerrainShape, type TerrainTransition } from "./types";

export interface MaterialInput {
  readonly texture: string;
  readonly mode?: TerrainMode;
  readonly priority?: number;
  readonly collision?: boolean;
  readonly specialType?: string;
  readonly renderTileSize?: number;
  readonly renderingStyle?: "pixel-art" | "hd-2d";
}

type Shapes = { readonly [id: string]: MaterialInput };
type Id<M extends Shapes> = Extract<keyof M, string>;

/** One step of the recipe that writes the mask. Later steps paint over earlier ones. */
export interface PaintOp<I extends string = string> {
  readonly material: I | null;
  readonly shape: TerrainShape;
}

export interface LayersOptions {
  /** World pixels per mask pixel. Defaults to 1: pixel-perfect. */
  readonly scale?: number;
  /** Side of a mask chunk, in mask pixels. Defaults to 256. */
  readonly chunk?: number;
  readonly transitions?: readonly TerrainTransition[];
  readonly water?: TerrainData["water"];
}

export interface TerrainDefinition<I extends string> {
  readonly materials: readonly TerrainMaterial[];
  /** The recipe that writes the mask. Pass it to `defineMap({ terrain })`. */
  layers(ops: readonly PaintOp<I>[], options?: LayersOptions): TerrainBuilder;
  /** The terrain of a map of this size, from a recipe. */
  build(size: readonly [number, number], ops: readonly PaintOp<I>[], options?: LayersOptions): TerrainData;
}

/** Ways to write the mask: shapes painted with a material. */
export const paint = {
  fill: <I extends string>(material: I): PaintOp<I> => ({ material, shape: { type: "fill" } }),
  circle: <I extends string>(material: I, options: { x: number; y: number; radius: number }): PaintOp<I> => ({ material, shape: { type: "circle", ...options } }),
  rect: <I extends string>(material: I, options: { x: number; y: number; width: number; height: number }): PaintOp<I> => ({ material, shape: { type: "rect", ...options } }),
  stroke: <I extends string>(material: I, options: { points: readonly (readonly [number, number])[]; radius: number }): PaintOp<I> => ({ material, shape: { type: "stroke", points: options.points, radius: options.radius } }),
  /** Erases: no material under the shape. */
  erase: (shape: TerrainShape): PaintOp<never> => ({ material: null, shape }),
} as const;

/**
 * Declares the materials of a terrain once, so that the recipe that paints them is checked by the compiler.
 *
 * ```ts
 * const terrain = defineTerrain({
 *   grass: { texture: "grass", mode: { type: "fade", width: 18 } },
 *   water: { texture: "water", mode: { type: "water", foam: true }, collision: true },
 * });
 * defineMap(assets, { id: "forest", size: [2560, 1920], terrain: terrain.layers([paint.fill("grass"), paint.circle("water", { x: 800, y: 600, radius: 180 })]) });
 * ```
 */
export function defineTerrain<const M extends Shapes>(materials: M): TerrainDefinition<Id<M>> {
  const list: TerrainMaterial[] = Object.entries(materials).map(([id, input]) => ({ id, ...input }));
  const build = (size: readonly [number, number], ops: readonly PaintOp<Id<M>>[], options: LayersOptions = {}): TerrainData => {
    const scale = options.scale ?? 1;
    if (!(scale > 0) || !Number.isFinite(scale)) throw new MapDefinitionError([{ path: "terrain.scale", message: "must be a positive number" }]);
    let mask = createMask(size[0], size[1], { scale, ...(options.chunk !== undefined ? { chunk: options.chunk } : {}) });
    ops.forEach((op, index) => {
      const value = op.material === null ? 0xffff : list.findIndex((material) => material.id === op.material);
      if (value < 0) throw new MapDefinitionError([{ path: `terrain.layers[${index}]`, message: `material "${String(op.material)}" is not declared` }]);
      mask = paintShape(mask, op.shape, value).mask;
    });
    return {
      version: TERRAIN_DATA_VERSION,
      materials: list,
      ...(options.transitions ? { transitions: options.transitions } : {}),
      mask,
      ...(options.water ? { water: options.water } : {}),
    };
  };
  return {
    materials: list,
    build,
    layers: (ops, options) => ({ toExtension: (size) => build(size, ops, options) as unknown as JsonValue }),
  };
}
