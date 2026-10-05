import type { AssetDescriptor, AssetResolver, MapDefinition, MapElement } from "@rpgjs/map-builder/model";
import { studioElementToMapBuilder } from "../map-renderer/map-builder-bridge";

/** The three lists a Studio map keeps its elements in. */
export type StudioLayerName = "alwaysLow" | "low" | "high";
export const STUDIO_LAYERS: readonly StudioLayerName[] = ["alwaysLow", "low", "high"];
export const STUDIO_LAYER_NUMBER: Readonly<Record<StudioLayerName, number>> = { alwaysLow: 0, low: 1, high: 2 };

/** The placed elements of a map, as the Studio stores them: `{ id, tilesetId, x, y, width?, height?, scale?… }`. */
export type RawElementLists = Readonly<Record<StudioLayerName, readonly any[]>>;

/** Identifies a placed element for the whole editing session: its layer and its place in the stored list. */
export const editorIdOf = (layer: StudioLayerName, index: number): string => `${layer}:${index}`;

export interface EditableMap {
  readonly definition: MapDefinition;
  /** What the map builder needs to know of the elements (size, hitbox): the Studio draws them itself. */
  readonly assets: AssetResolver;
}

export interface BuildEditableMapInput {
  readonly id: string;
  /** World size, in pixels. */
  readonly size: readonly [number, number];
  readonly raw: RawElementLists;
  /** The element the runtime draws for a placed one, or `null` when its tileset cannot be found (it is then not drawn). */
  readonly resolveOne: (raw: any, layerNumber: number) => any | null;
}

const isLayer = (value: unknown): value is StudioLayerName => value === "alwaysLow" || value === "low" || value === "high";

/**
 * A Studio map as a map builder map: one element per placed element that the runtime can draw, each carrying its
 * stored form (`data.raw`) and its layer, so that what is stored can be rebuilt from the model alone.
 */
export function buildEditableMap(input: BuildEditableMapInput): EditableMap {
  const table = new Map<string, AssetDescriptor>();
  const elements: MapElement[] = [];
  for (const layer of STUDIO_LAYERS) {
    input.raw[layer].forEach((raw, index) => {
      const resolved = input.resolveOne(raw, STUDIO_LAYER_NUMBER[layer]);
      if (!resolved) return;
      const id = editorIdOf(layer, index);
      const converted = studioElementToMapBuilder({ ...resolved, image: resolved.image ?? "studio" }, index, { id, kind: `studio:${id}` });
      table.set(converted.kind, converted.descriptor);
      elements.push({ ...converted.element, data: { layer, raw: JSON.parse(JSON.stringify(raw)) } });
    });
  }
  const assets: AssetResolver = {
    get kinds() {
      return [...table.keys()];
    },
    has: (kind): kind is string => table.has(kind),
    resolve: (kind) => table.get(kind),
  };
  return { definition: { version: 1, id: input.id, size: [Math.max(1, input.size[0]), Math.max(1, input.size[1])], elements, events: [] }, assets };
}

/**
 * The placed elements as they are now, per layer, in the form the runtime resolves: what the model says (position,
 * and what is still there), on top of what was stored. Elements the runtime could not draw are not in the model, so
 * they are not here either: saving is done against the stored lists, not against these.
 */
export function rawListsFromElements(elements: readonly MapElement[]): Record<StudioLayerName, any[]> {
  const lists: Record<StudioLayerName, any[]> = { alwaysLow: [], low: [], high: [] };
  for (const element of elements) {
    const layer = element.data?.layer;
    const raw = element.data?.raw;
    if (!isLayer(layer) || typeof raw !== "object" || raw === null || Array.isArray(raw)) continue;
    lists[layer].push({ ...(raw as Record<string, unknown>), x: Math.round(element.x), y: Math.round(element.y) });
  }
  return lists;
}

/** The runtime's elements, per layer, for a model state. */
export function resolveLists(elements: readonly MapElement[], resolveOne: BuildEditableMapInput["resolveOne"]): Record<StudioLayerName, any[]> {
  const raw = rawListsFromElements(elements);
  const out: Record<StudioLayerName, any[]> = { alwaysLow: [], low: [], high: [] };
  for (const layer of STUDIO_LAYERS) {
    for (const item of raw[layer]) {
      const resolved = resolveOne(item, STUDIO_LAYER_NUMBER[layer]);
      if (resolved) out[layer].push(resolved);
    }
  }
  return out;
}
