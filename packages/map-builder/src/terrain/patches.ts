import type { JsonObject, JsonValue } from "../model/json";
import { cloneJson, isFiniteNumberValue, isPlainObject } from "../model/json";
import type { MapState } from "../model/definition";
import { definePatchHandlers, patchFail, patchOk, type MapPatch, type PatchHandlers } from "../model/patches";
import { terrainIssues } from "./data";
import { clipRect, paintShape, readRect, writeRect } from "./mask";
import { decodeRuns, encodeRuns } from "./rle";
import { TERRAIN_EXTENSION_ID, type MaskRect, type TerrainData, type TerrainMaterial, type TerrainShape, NO_MATERIAL } from "./types";

declare module "../model/patches" {
  interface PatchRegistry {
    /** Paints a shape of the mask with a material, or erases it with `null`. */
    "terrain.paint": { readonly shape: TerrainShape; readonly material: string | null };
    /** Replaces a rectangle of the mask (mask pixels) with run-length encoded values. It is the inverse of a paint. */
    "terrain.region": MaskRect & { readonly runs: string };
    /** Replaces the palette. Existing materials keep their id and their position: the mask refers to positions. */
    "terrain.materials": { readonly materials: readonly TerrainMaterial[] };
    /** Replaces the morphology features (holes and walls). */
    "terrain.morphology": { readonly features: readonly JsonObject[] };
  }
}

function terrainOf(state: MapState): TerrainData | { readonly failure: string } {
  const value = state.extensions?.[TERRAIN_EXTENSION_ID];
  if (value === undefined) return { failure: "this map has no terrain" };
  const issues = terrainIssues(value);
  return issues.length > 0 ? { failure: `the terrain of this map is invalid (${issues[0]!.path}: ${issues[0]!.message})` } : (value as unknown as TerrainData);
}

const withTerrain = (state: MapState, terrain: TerrainData): MapState => ({
  ...state,
  extensions: { ...(state.extensions ?? {}), [TERRAIN_EXTENSION_ID]: terrain as unknown as JsonValue },
});

const validShape = (shape: unknown): shape is TerrainShape => {
  if (!isPlainObject(shape)) return false;
  const finite = (...values: unknown[]) => values.every(isFiniteNumberValue);
  switch (shape.type) {
    case "fill":
      return true;
    case "circle":
      return finite(shape.x, shape.y, shape.radius) && (shape.radius as number) >= 0;
    case "rect":
      return finite(shape.x, shape.y, shape.width, shape.height);
    case "stroke":
      return finite(shape.radius) && (shape.radius as number) >= 0 && Array.isArray(shape.points) && shape.points.length > 0 && shape.points.length <= 10_000
        && shape.points.every((p: unknown) => Array.isArray(p) && p.length === 2 && finite(p[0], p[1]));
    default:
      return false;
  }
};

const regionPatch = (rect: MaskRect, values: Uint16Array): MapPatch => ({ type: "terrain.region", ...rect, runs: encodeRuns(values) });

/** Handlers of the terrain patches. Pass them to `createMapModel({ patchHandlers: [terrainPatchHandlers] })`. */
export const terrainPatchHandlers: PatchHandlers = definePatchHandlers({
  "terrain.paint": {
    apply(state, patch) {
      const terrain = terrainOf(state);
      if ("failure" in terrain) return patchFail("invalid-patch", terrain.failure);
      if (!validShape(patch.shape)) return patchFail("invalid-patch", "shape is not valid");
      let value: number;
      if (patch.material === null) value = NO_MATERIAL;
      else {
        value = terrain.materials.findIndex((material) => material.id === patch.material);
        if (value < 0) return patchFail("not-found", `material "${String(patch.material)}" is not in the palette`);
      }
      const result = paintShape(terrain.mask, patch.shape, value);
      if (!result.changed) return patchOk(state, []);
      return patchOk(withTerrain(state, { ...terrain, mask: result.mask }), [regionPatch(result.changed, result.before!)]);
    },
  },

  "terrain.region": {
    apply(state, patch) {
      const terrain = terrainOf(state);
      if ("failure" in terrain) return patchFail("invalid-patch", terrain.failure);
      const rect: MaskRect = { x: patch.x, y: patch.y, width: patch.width, height: patch.height };
      if (![rect.x, rect.y, rect.width, rect.height].every((n) => Number.isInteger(n)) || rect.width <= 0 || rect.height <= 0) {
        return patchFail("invalid-patch", "region must be a rectangle of whole pixels");
      }
      const clipped = clipRect(terrain.mask, rect);
      if (!clipped || clipped.x !== rect.x || clipped.y !== rect.y || clipped.width !== rect.width || clipped.height !== rect.height) {
        return patchFail("invalid-patch", "region is outside the mask");
      }
      let values: Uint16Array;
      try {
        values = decodeRuns(patch.runs, rect.width * rect.height);
      } catch (error) {
        return patchFail("invalid-patch", (error as Error).message);
      }
      const limit = terrain.materials.length;
      if (values.some((value) => value !== NO_MATERIAL && value >= limit)) return patchFail("invalid-patch", "region uses a material that is not in the palette");
      const result = writeRect(terrain.mask, rect, values);
      if (!result.changed) return patchOk(state, []);
      return patchOk(withTerrain(state, { ...terrain, mask: result.mask }), [regionPatch(result.changed, result.before!)]);
    },
  },

  "terrain.materials": {
    apply(state, patch) {
      const terrain = terrainOf(state);
      if ("failure" in terrain) return patchFail("invalid-patch", terrain.failure);
      if (!Array.isArray(patch.materials)) return patchFail("invalid-patch", "materials must be an array");
      const candidate = { ...terrain, materials: cloneJson(patch.materials as unknown as JsonValue) as unknown as TerrainMaterial[] };
      const issues = terrainIssues(candidate as unknown as JsonValue);
      if (issues.length > 0) return patchFail("invalid-patch", `${issues[0]!.path}: ${issues[0]!.message}`);
      // Positions are what the mask stores: what stays must stay where it is, and only unused materials at the end may go.
      const kept = terrain.materials.every((material, index) => candidate.materials[index] === undefined || candidate.materials[index]!.id === material.id);
      if (!kept) return patchFail("invalid-patch", "existing materials must keep their id and position (the mask refers to positions)");
      if (candidate.materials.length < terrain.materials.length) {
        const limit = candidate.materials.length;
        const inUse = terrain.mask.fill !== NO_MATERIAL && terrain.mask.fill >= limit
          || Object.entries(terrain.mask.chunks).some(([, encoded]) => decodeRuns(encoded, terrain.mask.chunk * terrain.mask.chunk).some((value) => value !== NO_MATERIAL && value >= limit));
        if (inUse) return patchFail("invalid-patch", "a material that is removed is still painted on the mask");
      }
      return patchOk(withTerrain(state, candidate), [{ type: "terrain.materials", materials: terrain.materials }]);
    },
  },

  "terrain.morphology": {
    apply(state, patch) {
      const terrain = terrainOf(state);
      if ("failure" in terrain) return patchFail("invalid-patch", terrain.failure);
      const candidate = { ...terrain, morphology: cloneJson(patch.features as unknown as JsonValue) as unknown as JsonObject[] };
      const issues = terrainIssues(candidate as unknown as JsonValue);
      if (issues.length > 0) return patchFail("invalid-patch", `${issues[0]!.path}: ${issues[0]!.message}`);
      return patchOk(withTerrain(state, candidate), [{ type: "terrain.morphology", features: terrain.morphology ?? [] }]);
    },
  },
});

export { readRect };
