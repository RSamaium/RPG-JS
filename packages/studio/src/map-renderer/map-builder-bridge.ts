import type { Container } from "pixi.js";
import type { AssetDescriptor, AssetResolver } from "@rpgjs/map-builder/model";
import {
  buildStudioElementSpriteParts,
  normalizeStudioElementDrawRule,
  resolveStudioElementLightSpotOverlay,
  resolveStudioElementMetrics,
  resolveStudioElementShadowCaster,
  type StudioElementRenderOptions,
} from "./studio-element-renderer";
import { normalizeElementSubmersion } from "./element-submersion";

/**
 * Temporary link between the Studio runtime and `@rpgjs/map-builder` (MAP_BUILDER.md, step 6).
 *
 * Behind a flag (`mapBuilderRenderer` in the game configuration), the elements the new renderer
 * knows how to draw go through it; the others (shadows, lights, liquid submersion, drawing rules,
 * debug overlays) stay on `StudioElementRenderer` until milestone 2 brings them. The two sets never
 * overlap: an element is drawn by exactly one renderer.
 */
const read = <T>(value: T | (() => T)): T => (typeof value === "function" ? (value as () => T)() : value);

/**
 * Why an element stays on the Studio renderer, or `undefined` when the map builder can draw it.
 * Decided with the very functions the Studio renderer uses, so both agree on what is "special".
 */
export function studioOnlyReason(element: any, options: StudioElementRenderOptions = {}): string | undefined {
  if (options.debugCollisions === true) return "debug-collisions";
  const image = read(element?.image);
  if (typeof image !== "string" || image === "") return "no-image";
  if (normalizeStudioElementDrawRule(read(element?.drawRule))) return "draw-rule";
  if (read(element?.extractGroundShadow) === true) return "ground-shadow";
  if (normalizeElementSubmersion(read(element?.submersion))) return "submersion";
  if (buildStudioElementSpriteParts(element).length !== 1) return "several-parts";
  const metrics = resolveStudioElementMetrics(element);
  // Without the shadow budget: asking must not use it up.
  const { shadowBudget: _budget, ...withoutBudget } = options;
  if (resolveStudioElementShadowCaster(element, metrics, withoutBudget)) return "shadow";
  if (resolveStudioElementLightSpotOverlay(element, metrics).enabled) return "light";
  return undefined;
}

export interface PartitionedElements {
  /** Drawn by the map builder, in their original order. */
  readonly builder: any[];
  /** Drawn by the Studio renderer, in their original order. */
  readonly studio: any[];
}

export function partitionStudioElements(elements: readonly any[], options: StudioElementRenderOptions = {}): PartitionedElements {
  const builder: any[] = [];
  const studio: any[] = [];
  for (const element of elements) (studioOnlyReason(element, options) === undefined ? builder : studio).push(element);
  return { builder, studio };
}

const number = (value: unknown, fallback: number): number => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

/**
 * A Studio element as a map element and the asset it refers to. Same conversion as the parity spec.
 * `id` and `kind` are made from the index unless given.
 */
export function studioElementToMapBuilder(element: any, index: number, names: { readonly id?: string; readonly kind?: string } = {}) {
  const rect = (read(element?.rect) ?? [0, 0, 0, 0]) as number[];
  const drawIn = (read(element?.drawIn) ?? []) as number[];
  const metrics = resolveStudioElementMetrics(element);
  const hitbox = read(element?.hitbox) as { x: number; y: number; width: number; height: number } | undefined;
  const scale = read(element?.scale) as number | { x: number; y: number } | undefined;
  const zIndexOffset = number(read(element?.zIndexOffset), 0);
  const kind = names.kind ?? `studio-${index}`;
  const descriptor: AssetDescriptor = {
    src: read(element.image) as string,
    frame: [number(rect[0], 0), number(rect[1], 0), number(rect[2], 0), number(rect[3], 0)],
    size: [number(drawIn[2], number(rect[2], 0)), number(drawIn[3], number(rect[3], 0))],
    ...(metrics.hasSortableHitbox && hitbox ? { hitbox: [hitbox.x, hitbox.y, hitbox.width, hitbox.height] as const } : {}),
  };
  const id = names.id ?? `${String(read(element?.id) ?? `element-${index}`)}#${index}`;
  return {
    kind,
    descriptor,
    element: {
      id,
      kind,
      x: number(drawIn[0], 0),
      y: number(drawIn[1], 0),
      ...(scale === undefined || scale === null ? {} : { scale: typeof scale === "number" ? scale : ([scale.x, scale.y] as [number, number]) }),
      ...(zIndexOffset ? { depth: { z: zIndexOffset } } : {}),
    },
  };
}

export type BuilderElementMode = "world" | "objects";

export interface MapBuilderElementLayer {
  /**
   * Draws the elements. `"world"` returns the root of a view (a layer by itself); `"objects"` returns
   * one container per element, each carrying its sort key, so that they can be sorted with the
   * characters in the event layer.
   *
   * What is returned is not on screen yet: call `commit()` once it is mounted. Only then is what
   * was mounted two commits ago destroyed, so nothing the scene still holds is ever destroyed.
   */
  render(elements: readonly any[], mode: BuilderElementMode, size: readonly [number, number]): Promise<Container[]>;
  /** The last result of `render` is now on screen. */
  commit(): void;
  destroy(): void;
}

/** One layer of elements drawn by the map builder. Loaded on demand: a game without the flag never imports it. */
export async function createMapBuilderElementLayer(): Promise<MapBuilderElementLayer> {
  const [{ createMapModel, MAP_DEFINITION_VERSION }, { elements }, { createMapView }] = await Promise.all([
    import("@rpgjs/map-builder/model"),
    import("@rpgjs/map-builder/features"),
    import("@rpgjs/map-builder/renderer"),
  ]);

  interface Generation {
    readonly view?: ReturnType<typeof createMapView>;
    readonly owned: Container[];
  }
  let live: Generation | undefined; // on screen
  let retired: Generation | undefined; // was on screen before; destroyed at the next commit
  let candidate: Generation | undefined; // returned by the last render, not mounted yet
  let serial = 0;

  const dispose = (generation: Generation | undefined): void => {
    if (!generation) return;
    generation.view?.destroy();
    for (const container of generation.owned) if (!container.destroyed) container.destroy({ children: true });
  };

  return {
    async render(list, mode, size) {
      const current = ++serial;
      // A result that was never committed was never shown.
      dispose(candidate);
      candidate = undefined;
      if (list.length === 0) {
        candidate = { owned: [] };
        return [];
      }
      const converted = list.map((element, index) => studioElementToMapBuilder(element, index));
      const table = new Map(converted.map(({ kind, descriptor }) => [kind, descriptor]));
      const assets: AssetResolver = {
        kinds: [...table.keys()],
        has: (kind): kind is string => table.has(kind),
        resolve: (kind) => table.get(kind),
      };
      const model = createMapModel({
        version: MAP_DEFINITION_VERSION,
        id: "studio-elements",
        size: [Math.max(1, size[0]), Math.max(1, size[1])],
        elements: converted.map(({ element }) => element),
        events: [],
      });
      // Nothing to click on: the Studio runtime is the game, not the editor.
      const view = createMapView({ model, assets, features: [elements()], interactive: false });
      await view.whenIdle();
      const children = mode === "world" ? [view.root] : [...view.stages.objects.children];
      const generation: Generation = { view, owned: mode === "world" ? [] : children };
      if (current !== serial) {
        dispose(generation);
        return [];
      }
      candidate = generation;
      return children;
    },
    commit() {
      if (!candidate) return;
      dispose(retired);
      retired = live;
      live = candidate;
      candidate = undefined;
    },
    destroy() {
      serial += 1;
      for (const generation of [candidate, retired, live]) dispose(generation);
      candidate = retired = live = undefined;
    },
  };
}
