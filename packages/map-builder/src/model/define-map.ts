import type { AssetKind, AssetResolver } from "./assets";
import { MAP_DEFINITION_VERSION, type MapDefinition, type MapDepth, type MapElement, type MapEvent, type MapScale } from "./definition";
import { MapDefinitionError, type MapIssue } from "./errors";
import { isPlainObject, type JsonObject, type JsonValue } from "./json";
import { parseMapDefinition } from "./parse";

export type TypedElement<K extends string = string> = MapElement & { readonly kind: K };
export type TypedEvent<G extends string = string> = MapEvent & { readonly graphic?: G };

export interface ElementInput {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly depth?: MapDepth;
  readonly scale?: MapScale;
  readonly data?: JsonObject;
}

export interface EventInput<G extends string = never> {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly graphic?: G;
  readonly data?: JsonObject;
}

/** An element placed on a map: `el("tree-oak", { id: "t1", x: 128, y: 96 })`. */
export function el<K extends string>(kind: K, input: ElementInput): TypedElement<K> {
  return { ...input, kind };
}

/** An event placed on a map. `graphic`, when given, must be a known asset. */
export function event<G extends string = never>(kind: string, input: EventInput<G>): TypedEvent<G> {
  return { ...input, kind };
}

/** Something that writes the data a feature owns, once the size of the map is known (e.g. `terrain.layers([...])`). */
export interface TerrainBuilder {
  toExtension(size: readonly [width: number, height: number]): JsonValue;
}

export interface MapInput<K extends string = string> {
  readonly id: string;
  /** World size, in pixels. */
  readonly size: readonly [width: number, height: number];
  readonly tileSize?: number;
  readonly elements?: readonly TypedElement<K>[];
  readonly events?: readonly TypedEvent<K>[];
  readonly extensions?: { readonly [featureId: string]: JsonValue };
  /** Painted terrain, from `defineTerrain(...).layers([...])`. Stored under `extensions.terrain`. */
  readonly terrain?: TerrainBuilder;
}

/**
 * Describes a map in code. References to assets are checked by the compiler and
 * again at runtime. Returns a plain, serializable {@link MapDefinition}, so the
 * same map can become a JSON file or travel over the network.
 */
export function defineMap<A extends AssetResolver<string>>(assets: A, input: MapInput<AssetKind<A>>): MapDefinition {
  const definition = parseMapDefinition({
    version: MAP_DEFINITION_VERSION,
    id: input.id,
    size: input.size,
    ...(input.tileSize !== undefined ? { tileSize: input.tileSize } : {}),
    elements: input.elements ?? [],
    events: input.events ?? [],
    ...(input.extensions !== undefined || input.terrain !== undefined
      ? { extensions: { ...(input.extensions ?? {}), ...(input.terrain ? { terrain: input.terrain.toExtension(input.size) } : {}) } }
      : {}),
  });

  const issues: MapIssue[] = [];
  definition.elements.forEach((element, index) => {
    if (!assets.has(element.kind)) {
      issues.push({ path: `elements[${index}].kind`, message: `unknown asset "${element.kind}"` });
    }
  });
  definition.events.forEach((entry, index) => {
    if (entry.graphic !== undefined && !assets.has(entry.graphic)) {
      issues.push({ path: `events[${index}].graphic`, message: `unknown asset "${entry.graphic}"` });
    }
  });
  const terrain = definition.extensions?.terrain;
  const materials = input.terrain && isPlainObject(terrain) ? terrain.materials : undefined;
  if (Array.isArray(materials)) {
    materials.forEach((material, index) => {
      const texture = isPlainObject(material) ? material.texture : undefined;
      if (typeof texture === "string" && !assets.has(texture)) {
        issues.push({ path: `extensions.terrain.materials[${index}].texture`, message: `unknown asset "${texture}"` });
      }
    });
  }
  if (issues.length > 0) throw new MapDefinitionError(issues);
  return definition;
}
