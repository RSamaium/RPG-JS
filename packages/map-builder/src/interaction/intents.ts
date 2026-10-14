import type { AssetResolver } from "../model/assets";
import type { MapState } from "../model/definition";
import type { MapPatch } from "../model/patches";
import type { Rect } from "../renderer/geometry";
import type { DescribeContext } from "../renderer/scene";
import type { TargetRef } from "./picking";

/**
 * Everything a user can ask for, mapped to its payload. Open on purpose: a
 * feature adds its intents by merging into this interface.
 *
 * ```ts
 * declare module "@rpgjs/map-builder/interaction" {
 *   interface IntentRegistry {
 *     "tilling.till": { readonly x: number; readonly y: number };
 *   }
 * }
 * ```
 *
 * An intent is a wish, not a fact: it goes through the pipeline, then becomes
 * patches, which the committer decides to apply.
 */
export interface IntentRegistry {
  "element.move": { readonly id: string; readonly x: number; readonly y: number };
  "element.remove": { readonly id: string };
  /** Put something of the catalog on the map. `id` is generated when omitted. */
  "element.place": { readonly catalogId: string; readonly x: number; readonly y: number; readonly id?: string };
}

export type IntentType = keyof IntentRegistry & string;
export type IntentOf<K extends IntentType> = { readonly type: K } & IntentRegistry[K];
export type MapIntent = { [K in IntentType]: IntentOf<K> }[IntentType];

/** Intents that carry a position, the ones a grid can snap. */
export type PositionedIntentType = {
  [K in IntentType]: IntentRegistry[K] extends { readonly x: number; readonly y: number } ? K : never;
}[IntentType];

/** Why an intent was refused. Structured, so the UI can explain and the server can log. */
export interface Rejection {
  readonly ok: false;
  /** Machine-readable, open: `"occupied"`, `"not-enough-wood"`… */
  readonly reason: string;
  readonly message?: string;
}

/** The space an intent would take, for checks like "is this spot free?". */
export interface Footprint {
  readonly bounds: Rect;
  readonly hitbox?: Rect;
  /** Things that must not count as obstacles: the element being moved itself. */
  readonly ignore?: readonly TargetRef[];
}

export interface IntentContext {
  readonly state: MapState;
  readonly assets: AssetResolver;
  readonly describe: DescribeContext;
  /** Who is acting. Whatever the game decides: a player, a user. */
  readonly actor: unknown;
}

export interface IntentDefinition<K extends IntentType> {
  /** Turns the (validated) intent into patches. */
  resolve(intent: IntentOf<K>, context: IntentContext): MapPatch | readonly MapPatch[] | Rejection;
  /** Where the intent would put things, when it makes sense. */
  footprint?(intent: IntentOf<K>, context: IntentContext): Footprint | undefined;
}
