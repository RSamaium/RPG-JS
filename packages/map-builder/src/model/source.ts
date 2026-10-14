import type { MapDefinition, MapElement, MapEvent } from "./definition";
import { cloneJson, type JsonValue } from "./json";
import { parseMapDefinition } from "./parse";

export interface MapRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The part of a map that falls inside a rectangle, for streaming large maps. */
export interface MapRegion {
  readonly id: string;
  readonly rect: MapRect;
  readonly elements: readonly MapElement[];
  readonly events: readonly MapEvent[];
}

/** Where a map comes from: code, a JSON file, Tiled, a database, Studio… */
export interface MapSource {
  load(id: string): Promise<MapDefinition>;
  /** Natively loads one region. When absent, {@link loadMapRegion} derives it from `load`. */
  loadRegion?(id: string, rect: MapRect): Promise<MapRegion>;
  list?(): Promise<readonly string[]>;
}

export type MapSourceErrorCode = "not-found" | "load-failed";

export class MapSourceError extends Error {
  readonly code: MapSourceErrorCode;
  readonly mapId: string;

  constructor(code: MapSourceErrorCode, mapId: string, message: string) {
    super(message);
    this.name = "MapSourceError";
    this.code = code;
    this.mapId = mapId;
  }
}

const inside = (x: number, y: number, rect: MapRect, margin: number): boolean =>
  x >= rect.x - margin && x <= rect.x + rect.width + margin && y >= rect.y - margin && y <= rect.y + rect.height + margin;

/**
 * Elements and events whose origin falls in `rect`, grown by `margin` pixels so
 * that objects larger than their origin are not cut off at the border.
 */
export function regionOf(definition: MapDefinition, rect: MapRect, margin = 0): MapRegion {
  return {
    id: definition.id,
    rect,
    elements: definition.elements.filter((element) => inside(element.x, element.y, rect, margin)),
    events: definition.events.filter((entry) => inside(entry.x, entry.y, rect, margin)),
  };
}

export async function loadMapRegion(source: MapSource, id: string, rect: MapRect, margin = 0): Promise<MapRegion> {
  if (source.loadRegion) return source.loadRegion(id, rect);
  return regionOf(await source.load(id), rect, margin);
}

/** Maps written in code (`defineMap`). Every `load` returns a fresh copy. */
export function codeMapSource(maps: readonly MapDefinition[]): MapSource {
  const table = new Map(maps.map((map) => [map.id, map]));
  return {
    async load(id) {
      const map = table.get(id);
      if (!map) throw new MapSourceError("not-found", id, `Unknown map "${id}"`);
      return cloneJson(map as unknown as JsonValue) as unknown as MapDefinition;
    },
    async list() {
      return [...table.keys()];
    },
  };
}

export type JsonMapSourceOptions =
  | { readonly maps: Readonly<Record<string, unknown>> }
  | { readonly read: (id: string) => unknown | Promise<unknown> };

/** Maps stored as JSON (files, a database). Content is validated and migrated on load. */
export function jsonMapSource(options: JsonMapSourceOptions): MapSource {
  return {
    async load(id) {
      let raw: unknown;
      if ("maps" in options) {
        if (!Object.hasOwn(options.maps, id)) throw new MapSourceError("not-found", id, `Unknown map "${id}"`);
        raw = options.maps[id];
      } else {
        raw = await options.read(id);
      }
      return parseMapDefinition(raw);
    },
    async list() {
      return "maps" in options ? Object.keys(options.maps) : [];
    },
  };
}

export interface HttpMapSourceOptions {
  /** Maps are fetched from `${baseUrl}/${id}`, unless `url` is given. */
  readonly baseUrl: string;
  readonly url?: (id: string) => string;
  readonly fetch?: typeof fetch;
  readonly headers?: Readonly<Record<string, string>>;
}

/** Maps served over HTTP as JSON. The `fetch` implementation can be injected. */
export function httpMapSource(options: HttpMapSourceOptions): MapSource {
  const doFetch = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const urlOf = options.url ?? ((id: string) => `${options.baseUrl.replace(/\/$/, "")}/${encodeURIComponent(id)}`);
  return jsonMapSource({
    async read(id) {
      const response = await doFetch(urlOf(id), options.headers ? { headers: { ...options.headers } } : undefined);
      if (response.status === 404) throw new MapSourceError("not-found", id, `Unknown map "${id}"`);
      if (!response.ok) {
        throw new MapSourceError("load-failed", id, `Loading map "${id}" failed with status ${response.status}`);
      }
      return response.json();
    },
  });
}
