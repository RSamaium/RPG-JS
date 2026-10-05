import type { Container } from "pixi.js";
import type { AssetResolver } from "../model/assets";
import type { MapState } from "../model/definition";
import type { MapPatch } from "../model/patches";
import type { ApplyResult, MaybePromise, Unsubscribe } from "../model/result";
import type { InteractionController, ModelApi } from "../interaction/controller";
import type { TextureStore } from "./textures";
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

/** What a feature can reach when the view is created: the model, the interaction layer, the scene. */
export interface FeatureHost<R extends MaybePromise<ApplyResult> = MaybePromise<ApplyResult>> {
  readonly model: ModelApi<R>;
  readonly assets: AssetResolver;
  readonly interaction: InteractionController<R>;
  readonly stages: Readonly<Record<StageName, Container>>;
  readonly textures: TextureStore;
  /** What is drawn right now. */
  describe(): readonly SceneNode[];
  /** Called every frame with the time elapsed, in milliseconds. */
  onTick(listener: (deltaMs: number) => void): Unsubscribe;
}

export interface FeatureInstance<Api extends object = Record<never, never>> {
  /** Exposed on the view under the id of the feature: `view.placement`. */
  readonly api?: Api;
  /** Called when the view is destroyed. */
  dispose?(): void;
}

export interface MapFeature<Id extends string = string, Api extends object = Record<never, never>> {
  readonly id: Id;
  readonly apiVersion: typeof MAP_FEATURE_API_VERSION;
  /** Ids of the features this one cannot work without. */
  readonly requires: readonly string[];
  /** What the feature draws. */
  readonly render?: FeatureRender;
  /**
   * What the feature does besides drawing: registers intents and tools, mounts skins.
   * Runs once, when the view is created.
   */
  readonly setup?: (host: FeatureHost) => FeatureInstance<Api>;
}

/** Names the view already uses: a feature cannot take them as its id. */
export const RESERVED_FEATURE_IDS: readonly string[] = [
  "root",
  "stages",
  "effects",
  "setViewport",
  "tick",
  "mount",
  "whenIdle",
  "describe",
  "destroy",
  "interaction",
  "submit",
  "textures",
];

type UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (value: infer I) => void ? I : never;

/** The APIs features add to the view, keyed by feature id: `view.placement`, `view.selection`. */
export type FeatureApis<F extends readonly MapFeature<string, object>[]> = UnionToIntersection<
  F[number] extends infer Feature
    ? Feature extends MapFeature<infer Id, infer Api>
      ? keyof Api extends never
        ? never
        : { readonly [K in Id]: Api }
      : never
    : never
>;

export class MapFeatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MapFeatureError";
  }
}

export interface MapFeatureDefinition<Id extends string = string, Api extends object = Record<never, never>> {
  readonly id: Id;
  readonly requires?: readonly string[];
  readonly render?: FeatureRender;
  readonly setup?: (host: FeatureHost) => FeatureInstance<Api>;
}

/** Declares a feature. Built-in and third-party features use the same contract. */
export function defineMapFeature<const Id extends string, Api extends object = Record<never, never>>(
  definition: MapFeatureDefinition<Id, Api>,
): MapFeature<Id, Api> {
  if (typeof definition.id !== "string" || definition.id.length === 0) {
    throw new MapFeatureError("A feature needs a non-empty id");
  }
  if (RESERVED_FEATURE_IDS.includes(definition.id)) {
    throw new MapFeatureError(`"${definition.id}" is already a property of the view and cannot be the id of a feature`);
  }
  return Object.freeze({
    id: definition.id,
    apiVersion: MAP_FEATURE_API_VERSION,
    requires: Object.freeze([...(definition.requires ?? [])]),
    ...(definition.render ? { render: definition.render } : {}),
    ...(definition.setup ? { setup: definition.setup } : {}),
  });
}

/** Checks ids and dependencies. Fails at startup, with a message that says what to add. */
export function validateFeatures(features: readonly MapFeature<string, object>[]): void {
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
