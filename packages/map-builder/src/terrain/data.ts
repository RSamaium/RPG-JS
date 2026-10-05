import type { MapIssue } from "../model/errors";
import { MapDefinitionError } from "../model/errors";
import type { MapState } from "../model/definition";
import { isFiniteNumberValue, isJsonValue, isPlainObject, type JsonValue } from "../model/json";
import { TERRAIN_DATA_VERSION, TERRAIN_EXTENSION_ID, type TerrainData } from "./types";

const MODES = new Set(["hard", "fade", "nine-slice", "water", "custom"]);

/** Problems of a terrain extension value, with their paths. Empty when it is valid. */
export function terrainIssues(value: unknown, path = "extensions.terrain"): MapIssue[] {
  const issues: MapIssue[] = [];
  const bad = (where: string, message: string) => issues.push({ path: `${path}${where}`, message });
  if (!isPlainObject(value) || !isJsonValue(value)) return [{ path, message: "must be a JSON object" }];
  if (value.version !== TERRAIN_DATA_VERSION) bad(".version", `must be ${TERRAIN_DATA_VERSION}`);

  const ids = new Set<string>();
  if (!Array.isArray(value.materials)) bad(".materials", "must be an array");
  else {
    if (value.materials.length > 0xfffe) bad(".materials", "too many materials");
    value.materials.forEach((material: unknown, index: number) => {
      if (!isPlainObject(material)) return bad(`.materials[${index}]`, "must be an object");
      if (typeof material.id !== "string" || material.id.length === 0) bad(`.materials[${index}].id`, "must be a non-empty string");
      else if (ids.has(material.id)) bad(`.materials[${index}].id`, `"${material.id}" is used twice`);
      else ids.add(material.id);
      if (typeof material.texture !== "string" || material.texture.length === 0) bad(`.materials[${index}].texture`, "must be an asset reference");
      if (material.mode !== undefined && (!isPlainObject(material.mode) || !MODES.has(String(material.mode.type)))) bad(`.materials[${index}].mode`, "must be a render mode");
    });
  }

  if (value.transitions !== undefined) {
    if (!Array.isArray(value.transitions)) bad(".transitions", "must be an array");
    else value.transitions.forEach((rule: unknown, index: number) => {
      if (!isPlainObject(rule) || !ids.has(String(rule.from)) || !ids.has(String(rule.to))) bad(`.transitions[${index}]`, "must link two materials of the palette");
    });
  }

  const mask = value.mask;
  if (!isPlainObject(mask)) bad(".mask", "must be an object");
  else {
    for (const field of ["scale", "width", "height", "chunk"] as const) {
      if (!isFiniteNumberValue(mask[field]) || (mask[field] as number) <= 0) bad(`.mask.${field}`, "must be a positive number");
    }
    for (const field of ["width", "height", "chunk"] as const) {
      if (isFiniteNumberValue(mask[field]) && !Number.isInteger(mask[field])) bad(`.mask.${field}`, "must be an integer");
    }
    if (!isFiniteNumberValue(mask.fill) || !Number.isInteger(mask.fill) || mask.fill < 0 || mask.fill > 0xffff) bad(".mask.fill", "must be a material index or 65535");
    else if (mask.fill !== 0xffff && Array.isArray(value.materials) && mask.fill >= value.materials.length) bad(".mask.fill", "points past the palette");
    if (!isPlainObject(mask.chunks)) bad(".mask.chunks", "must be an object");
    else for (const [chunkKey, encoded] of Object.entries(mask.chunks)) {
      if (!/^\d+,\d+$/.test(chunkKey) || typeof encoded !== "string") bad(`.mask.chunks["${chunkKey}"]`, "must be a string under a `col,row` key");
    }
  }
  if (value.morphology !== undefined && (!Array.isArray(value.morphology) || !value.morphology.every((item: unknown) => isPlainObject(item) && typeof item.id === "string"))) {
    bad(".morphology", "must be an array of features with an id");
  }
  if (value.water !== undefined && !isPlainObject(value.water)) bad(".water", "must be an object");
  return issues;
}

/** The terrain of a state. `undefined` when the map has none; throws when what it has is invalid. */
export function readTerrain(state: MapState): TerrainData | undefined {
  const value = state.extensions?.[TERRAIN_EXTENSION_ID] as JsonValue | undefined;
  if (value === undefined) return undefined;
  const issues = terrainIssues(value);
  if (issues.length > 0) throw new MapDefinitionError(issues);
  return value as unknown as TerrainData;
}

/** Same, without throwing: for code that decides what to draw. */
export function tryReadTerrain(state: MapState): TerrainData | undefined {
  try {
    return readTerrain(state);
  } catch {
    return undefined;
  }
}
