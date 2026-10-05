import type { MapState } from "../model/definition";
import type { MapPatch } from "../model/patches";
import type { StageName, SceneNode, DescribeContext } from "./scene";

/** Version of the contract between the renderer and a feature. */
export const MAP_FEATURE_API_VERSION = 1 as const;

/** How a feature contributes to the scene. */
export interface FeatureRender {
  readonly stage: StageName;
  /** Every node of the feature for `state`. */
  describeAll(state: MapState, context: DescribeContext): readonly SceneNode[];
  /** The node with this id, or `undefined` when there is none (removed, not drawable yet). */
  describeOne(state: MapState, id: string, context: DescribeContext): SceneNode | undefined;
  /**
   * Ids of the nodes a patch may have changed. `"all"` re-describes the whole
   * feature (for patches the feature does not understand), `"none"` ignores the patch.
   */
  affected(patch: MapPatch): readonly string[] | "all" | "none";
}

export interface MapFeature {
  readonly id: string;
  readonly apiVersion: typeof MAP_FEATURE_API_VERSION;
  /** Ids of the features this one cannot work without. */
  readonly requires: readonly string[];
  readonly render?: FeatureRender;
}

export class MapFeatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MapFeatureError";
  }
}

export interface MapFeatureDefinition {
  readonly id: string;
  readonly requires?: readonly string[];
  readonly render?: FeatureRender;
}

/** Declares a feature. Built-in and third-party features use the same contract. */
export function defineMapFeature(definition: MapFeatureDefinition): MapFeature {
  if (typeof definition.id !== "string" || definition.id.length === 0) {
    throw new MapFeatureError("A feature needs a non-empty id");
  }
  return Object.freeze({
    id: definition.id,
    apiVersion: MAP_FEATURE_API_VERSION,
    requires: Object.freeze([...(definition.requires ?? [])]),
    ...(definition.render ? { render: definition.render } : {}),
  });
}

/** Checks ids and dependencies. Fails at startup, with a message that says what to add. */
export function validateFeatures(features: readonly MapFeature[]): void {
  const seen = new Set<string>();
  for (const feature of features) {
    if (feature.apiVersion !== MAP_FEATURE_API_VERSION) {
      throw new MapFeatureError(
        `Feature "${feature.id}" was built for feature API version ${String(feature.apiVersion)}, this renderer supports version ${MAP_FEATURE_API_VERSION}`,
      );
    }
    if (seen.has(feature.id)) throw new MapFeatureError(`Feature "${feature.id}" is listed twice`);
    seen.add(feature.id);
  }
  for (const feature of features) {
    for (const required of feature.requires) {
      if (!seen.has(required)) {
        throw new MapFeatureError(`Feature "${feature.id}" requires "${required}", which is not in the features list`);
      }
    }
  }
}
