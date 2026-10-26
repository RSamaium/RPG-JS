import type { AssetResolver } from "../model/assets";
import type { MapState } from "../model/definition";
import type { SceneNode } from "../renderer/scene";
import type { Footprint, IntentOf, IntentType, Rejection } from "./intents";

export type PipelineAccepted<K extends IntentType> = { readonly ok: true; readonly intent: IntentOf<K> };
/** A rejection carries the intent as it was when it was refused, e.g. already snapped to the grid. */
export type PipelineRejected<K extends IntentType> = Rejection & { readonly intent?: IntentOf<K> };
export type PipelineResult<K extends IntentType = IntentType> = PipelineAccepted<K> | PipelineRejected<K>;

export interface PipelineContext {
  readonly state: MapState;
  readonly assets: AssetResolver;
  /**
   * What can get in the way: what is drawn right now, with the sizes and hitboxes the
   * player sees, minus the elements the intents are moving or removing.
   */
  readonly nodes: readonly SceneNode[];
  /** Everything that is drawn, including what the intents are moving or removing. */
  readonly scene: readonly SceneNode[];
  /** Who is acting. Whatever the game decides: a player, a user. */
  readonly actor: unknown;
  /**
   * True when the pipeline only previews (a ghost following the pointer) and nothing
   * will happen. Steps with a side effect, such as `rateLimit`, must not act then.
   */
  readonly preview: boolean;
  /** The space the intent would take, or `undefined` when it does not apply. */
  footprint(intent: IntentOf<IntentType>): Footprint | undefined;
  /** Refuses the intent: `return ctx.reject("not-enough-wood")`. */
  reject(reason: string, message?: string): Rejection;
}

/**
 * One link of the chain, in the style of Koa. It may modify the intent
 * (`next({ ...intent, x: 32 })`), refuse it (`ctx.reject(reason)`) or pass it on (`next()`).
 */
export type PipelineStep<K extends IntentType = IntentType> = (
  intent: IntentOf<K>,
  context: PipelineContext,
  next: (intent?: IntentOf<K>) => PipelineResult<K>,
) => PipelineResult<K>;

/** Runs `steps` in order. Pure and synchronous, so the same chain can preview on the client and validate on the server. */
export function runPipeline<K extends IntentType>(
  steps: readonly PipelineStep<K>[],
  intent: IntentOf<K>,
  context: PipelineContext,
): PipelineResult<K> {
  const dispatch = (index: number, current: IntentOf<K>): PipelineResult<K> => {
    const step = steps[index];
    if (!step) return { ok: true, intent: current };
    const result = step(current, context, (replacement) => dispatch(index + 1, replacement ?? current));
    return result.ok || result.intent !== undefined ? result : { ...result, intent: current };
  };
  return dispatch(0, intent);
}

/** Chains several steps into one, to give a catalog item or a game a reusable rule set. */
export const compose =
  <K extends IntentType>(...steps: readonly PipelineStep<K>[]): PipelineStep<K> =>
  (intent, context, next) => {
    const result = runPipeline(steps, intent, context);
    return result.ok ? next(result.intent) : result;
  };
