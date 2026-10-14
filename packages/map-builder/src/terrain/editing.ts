import type { Unsubscribe } from "../model/result";
import type { InteractionController, Tool } from "../interaction/controller";
import type { PointerInput } from "../interaction/input";
import type { IntentDefinition } from "../interaction/intents";
import type { PipelineStep } from "../interaction/pipeline";
import { tryReadTerrain } from "./data";
import { covers, readRect, shapeBounds } from "./mask";
import { MAX_PAINT_COST, paintCost } from "./patches";
import { NO_MATERIAL, type TerrainShape } from "./types";

declare module "../interaction/intents" {
  interface IntentRegistry {
    /** Paint a shape of the terrain with a material, or erase it with `null`. */
    "terrain.paint": { readonly shape: TerrainShape; readonly material: string | null };
  }
}

/** The `terrain.paint` intent: one patch, after the rules of the pipeline. */
export const terrainPaintIntent: IntentDefinition<"terrain.paint"> = {
  resolve(intent, { state }) {
    if (!tryReadTerrain(state)) return { ok: false, reason: "no-terrain", message: "This map has no terrain" };
    return { type: "terrain.paint", shape: intent.shape, material: intent.material };
  },
};

/** Registers the intent, unless a feature already did. */
export function registerTerrainIntents(controller: InteractionController): Unsubscribe {
  return controller.hasIntent("terrain.paint") ? () => undefined : controller.registerIntent("terrain.paint", terrainPaintIntent);
}

/**
 * Only paint over certain materials: `requireTerrain(["grass", "dirt"])` lets a game till grass and nothing else.
 * Checks every pixel the shape would cover. Pixels outside the map count as wrong ground.
 */
export function requireTerrain(materials: readonly string[]): PipelineStep<"terrain.paint"> {
  return (intent, context, next) => {
    const terrain = tryReadTerrain(context.state);
    if (!terrain) return context.reject("no-terrain", "This map has no terrain");
    const allowed = new Set(materials.map((id) => terrain.materials.findIndex((material) => material.id === id)).filter((index) => index >= 0));
    const bounds = shapeBounds(terrain.mask, intent.shape);
    if (!bounds) return context.reject("outside-map", "Nothing of this lies on the map");
    // The check below tests every pixel against the shape: bound it as the patch does.
    if (paintCost(terrain.mask, intent.shape) > MAX_PAINT_COST) return context.reject("too-large", "This is too large to paint at once");
    // One read of the whole region: reading pixel by pixel would decode a chunk for each of them.
    const values = readRect(terrain.mask, bounds);
    for (let y = bounds.y; y < bounds.y + bounds.height; y += 1) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x += 1) {
        if (!covers(terrain.mask, intent.shape, x, y)) continue;
        const value = values[(y - bounds.y) * bounds.width + (x - bounds.x)]!;
        if (value === NO_MATERIAL || !allowed.has(value)) {
          return context.reject("wrong-ground", `Can only be painted over ${materials.join(", ")}`);
        }
      }
    }
    return next();
  };
}

/** Refuses shapes that reach outside the map. Without it they are clipped. */
export function withinTerrain(): PipelineStep<"terrain.paint"> {
  return (intent, context, next) => {
    const terrain = tryReadTerrain(context.state);
    if (!terrain) return context.reject("no-terrain", "This map has no terrain");
    const shape = intent.shape;
    const width = terrain.mask.width * terrain.mask.scale;
    const height = terrain.mask.height * terrain.mask.scale;
    const box = shape.type === "fill" ? { x0: 0, y0: 0, x1: width, y1: height } : shape.type === "circle" ? { x0: shape.x - shape.radius, y0: shape.y - shape.radius, x1: shape.x + shape.radius, y1: shape.y + shape.radius }
      : shape.type === "rect" ? { x0: shape.x, y0: shape.y, x1: shape.x + shape.width, y1: shape.y + shape.height }
        : { x0: Math.min(...shape.points.map((p) => p[0])) - shape.radius, y0: Math.min(...shape.points.map((p) => p[1])) - shape.radius, x1: Math.max(...shape.points.map((p) => p[0])) + shape.radius, y1: Math.max(...shape.points.map((p) => p[1])) + shape.radius };
    if (box.x0 < 0 || box.y0 < 0 || box.x1 > width || box.y1 > height) return context.reject("outside-map", "This reaches outside the map");
    return next();
  };
}

/** Keeps a brush from being bigger than a game wants. */
export function maxRadius(limit: number): PipelineStep<"terrain.paint"> {
  return (intent, _context, next) => {
    const shape = intent.shape;
    if ((shape.type === "circle" || shape.type === "stroke") && shape.radius > limit) return next({ ...intent, shape: { ...shape, radius: limit } });
    return next();
  };
}

export interface BrushOptions {
  /** Material to paint, or `null` to erase. */
  readonly material: string | null;
  /** Radius in world pixels. */
  readonly radius: number;
  /** Distance between two points of a stroke, in world pixels. Defaults to a third of the radius. */
  readonly spacing?: number;
}

export interface BrushApi {
  /** Starts painting with the pointer: pressing paints, dragging paints a line, releasing ends the stroke. */
  start(options: BrushOptions): void;
  stop(): void;
  readonly active: BrushOptions | null;
}

export interface BrushTool {
  readonly tool: Tool;
  readonly api: BrushApi;
}

let strokes = 0;

/**
 * The tool that paints. Each press-drag-release is one undo step, however many patches it made. It only
 * submits intents: whatever rules the pipeline has, and wherever the model commits (here or on an authority),
 * apply as for anything else.
 */
export function terrainBrush(options: { readonly modes?: readonly string[] } = {}): BrushTool {
  let brush: BrushOptions | null = null;
  let last: { x: number; y: number } | null = null;
  let key = "";

  const paintAt = (controller: InteractionController, shape: TerrainShape): void => {
    if (!brush) return;
    controller.submit({ type: "terrain.paint", shape, material: brush.material }, { coalesce: key });
  };

  const end = (): void => {
    last = null;
    key = "";
  };

  const tool: Tool = {
    id: "terrain-brush",
    modes: options.modes ?? ["edit"],
    // Painting comes before selecting: while a brush is in hand, a press paints.
    priority: 90,
    pointerDown(input: PointerInput, controller) {
      if (!brush || input.button !== 0) return false;
      strokes += 1;
      key = `terrain-stroke-${strokes}`;
      last = { x: input.x, y: input.y };
      paintAt(controller, { type: "circle", x: input.x, y: input.y, radius: brush.radius });
      return true;
    },
    pointerMove(input: PointerInput, controller) {
      if (!brush || !last) return false;
      const spacing = brush.spacing ?? Math.max(1, brush.radius / 3);
      if (Math.hypot(input.x - last.x, input.y - last.y) < spacing) return true;
      paintAt(controller, { type: "stroke", points: [[last.x, last.y], [input.x, input.y]], radius: brush.radius });
      last = { x: input.x, y: input.y };
      return true;
    },
    pointerUp: end,
    cancel: end,
  };

  return {
    tool,
    api: {
      start(next) {
        brush = next;
      },
      stop() {
        brush = null;
        end();
      },
      get active() {
        return brush;
      },
    },
  };
}
