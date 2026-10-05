import { MAP_DEFINITION_VERSION, type MapDefinition } from "./definition";
import { MapDefinitionError, type MapIssue } from "./errors";
import { cloneJson, isJsonObject, isJsonValue, isPlainObject, type JsonValue } from "./json";

/** Upgrades a raw definition from version `n` to version `n + 1`. */
export type MapMigration = (raw: Record<string, unknown>) => Record<string, unknown>;

/** Migrations keyed by the version they upgrade *from*. Empty until version 2 exists. */
export const defaultMapMigrations: Readonly<Record<number, MapMigration>> = {};

export interface ParseMapOptions {
  readonly migrations?: Readonly<Record<number, MapMigration>>;
  readonly currentVersion?: number;
}

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

/** Problems found in one element or event, with paths relative to `path`. */
export function checkPlaced(value: unknown, path: string, kind: "element" | "event"): MapIssue[] {
  if (!isPlainObject(value)) return [{ path, message: `${kind} must be an object` }];
  const issues: MapIssue[] = [];
  if (!isNonEmptyString(value.id)) issues.push({ path: `${path}.id`, message: "must be a non-empty string" });
  if (!isNonEmptyString(value.kind)) issues.push({ path: `${path}.kind`, message: "must be a non-empty string" });
  if (!isFiniteNumber(value.x)) issues.push({ path: `${path}.x`, message: "must be a finite number" });
  if (!isFiniteNumber(value.y)) issues.push({ path: `${path}.y`, message: "must be a finite number" });
  if (value.data !== undefined && !isJsonObject(value.data)) {
    issues.push({ path: `${path}.data`, message: "must be a JSON object" });
  }
  if (kind === "event" && value.graphic !== undefined && !isNonEmptyString(value.graphic)) {
    issues.push({ path: `${path}.graphic`, message: "must be a non-empty string" });
  }
  if (kind === "element" && value.depth !== undefined) {
    if (!isPlainObject(value.depth)) {
      issues.push({ path: `${path}.depth`, message: "must be an object" });
    } else {
      for (const key of ["z", "anchorY", "height"] as const) {
        const field = value.depth[key];
        if (field !== undefined && !isFiniteNumber(field)) {
          issues.push({ path: `${path}.depth.${key}`, message: "must be a finite number" });
        }
      }
    }
  }
  return issues;
}

function checkList(value: unknown, path: string, kind: "element" | "event", issues: MapIssue[]): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "must be an array" });
    return;
  }
  const seen = new Set<string>();
  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;
    issues.push(...checkPlaced(item, itemPath, kind));
    const id = isPlainObject(item) ? item.id : undefined;
    if (isNonEmptyString(id)) {
      if (seen.has(id)) issues.push({ path: `${itemPath}.id`, message: `duplicate ${kind} id "${id}"` });
      seen.add(id);
    }
  });
}

function migrate(raw: Record<string, unknown>, options: ParseMapOptions): Record<string, unknown> {
  const current = options.currentVersion ?? MAP_DEFINITION_VERSION;
  const migrations = options.migrations ?? defaultMapMigrations;
  let version = raw.version;
  if (!Number.isInteger(version) || (version as number) < 1) {
    throw new MapDefinitionError([{ path: "version", message: "must be a positive integer" }]);
  }
  if ((version as number) > current) {
    throw new MapDefinitionError([
      {
        path: "version",
        message: `version ${version} is newer than the supported version ${current}; upgrade @rpgjs/map-builder`,
      },
    ]);
  }
  let out = raw;
  while ((version as number) < current) {
    const step = migrations[version as number];
    if (!step) {
      throw new MapDefinitionError([
        { path: "version", message: `no migration from version ${version} to ${(version as number) + 1}` },
      ]);
    }
    out = { ...step(out), version: (version as number) + 1 };
    version = out.version;
  }
  return out;
}

/** Canonical form: an empty `data` object is omitted. */
function canonicalPlaced<T extends Record<string, unknown>>(item: T): T {
  return Object.fromEntries(
    Object.entries(item)
      .filter(([key, value]) => value !== undefined && !(key === "data" && isPlainObject(value) && Object.keys(value).length === 0))
      .map(([key, value]) => [key, isJsonValue(value) ? cloneJson(value) : value]),
  ) as T;
}

/**
 * Validates, migrates and copies a raw definition (for instance parsed JSON).
 *
 * - The result shares no structure with the input.
 * - Fields unknown to this version are preserved, so an older tool never destroys
 *   data written by a newer one.
 * - Throws {@link MapDefinitionError} listing every problem found.
 */
export function parseMapDefinition(raw: unknown, options: ParseMapOptions = {}): MapDefinition {
  if (!isPlainObject(raw)) throw new MapDefinitionError([{ path: "", message: "must be an object" }]);
  const source = migrate(raw, options);

  const issues: MapIssue[] = [];
  if (!isNonEmptyString(source.id)) issues.push({ path: "id", message: "must be a non-empty string" });

  const size = source.size;
  if (!Array.isArray(size) || size.length !== 2 || !size.every((n) => isFiniteNumber(n) && n > 0)) {
    issues.push({ path: "size", message: "must be [width, height] in pixels, both positive" });
  }
  if (source.tileSize !== undefined && !(isFiniteNumber(source.tileSize) && source.tileSize > 0)) {
    issues.push({ path: "tileSize", message: "must be a positive number" });
  }
  checkList(source.elements ?? [], "elements", "element", issues);
  checkList(source.events ?? [], "events", "event", issues);
  if (source.extensions !== undefined) {
    if (!isPlainObject(source.extensions) || !isJsonValue(source.extensions)) {
      issues.push({ path: "extensions", message: "must be a JSON object keyed by feature id" });
    }
  }
  if (issues.length > 0) throw new MapDefinitionError(issues);

  const { elements = [], events = [], extensions, ...rest } = source as Record<string, unknown> & {
    elements?: Record<string, unknown>[];
    events?: Record<string, unknown>[];
    extensions?: Record<string, JsonValue>;
  };
  const definition = Object.fromEntries([
    ...Object.entries(rest)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, isJsonValue(value) ? cloneJson(value) : value]),
    ["elements", elements.map(canonicalPlaced)],
    ["events", events.map(canonicalPlaced)],
    ...(extensions !== undefined ? [["extensions", cloneJson(extensions)]] : []),
  ]);
  return definition as unknown as MapDefinition;
}
