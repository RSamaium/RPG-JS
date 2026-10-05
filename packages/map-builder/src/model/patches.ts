import type { MapDepth, MapElement, MapEvent, MapScale, MapState } from "./definition";
import type { MapRejection, RejectionCode } from "./errors";
import type { JsonObject, JsonValue } from "./json";

/**
 * Every patch type the model understands, mapped to its payload.
 *
 * The registry is open: a feature adds its own patch types by merging into this
 * interface, and gets them checked everywhere `MapPatch` is used.
 *
 * ```ts
 * declare module "@rpgjs/map-builder/model" {
 *   interface PatchRegistry {
 *     "tilling.till": { x: number; y: number };
 *   }
 * }
 * ```
 *
 * Payloads must be JSON-serializable: patches are sent over the network, stored
 * and replayed.
 */
export interface PatchRegistry {
  "element.add": { readonly element: MapElement; readonly index?: number };
  "element.remove": { readonly id: string };
  "element.move": { readonly id: string; readonly x: number; readonly y: number };
  /** `kind` replaces the asset reference. `depth: null` and `scale: null` clear them. */
  "element.update": {
    readonly id: string;
    readonly set: {
      readonly kind?: string;
      readonly depth?: MapDepth | null;
      readonly scale?: MapScale | null;
    };
  };
  /** Merges `set` into the element data, then removes the `unset` keys. */
  "element.data": { readonly id: string; readonly set?: JsonObject; readonly unset?: readonly string[] };
  "event.add": { readonly event: MapEvent; readonly index?: number };
  "event.remove": { readonly id: string };
  "event.move": { readonly id: string; readonly x: number; readonly y: number };
  /** Sets the data a feature owns. An absent `value` removes it. */
  "extension.set": { readonly id: string; readonly value?: JsonValue };
}

export type PatchType = keyof PatchRegistry & string;

export type MapPatchOf<K extends PatchType> = {
  readonly type: K;
  /**
   * Revision the patch was computed against. The authority rejects (or rebases)
   * a patch built on a stale revision.
   */
  readonly baseRevision?: number;
} & PatchRegistry[K];

/** Discriminated union on `type`, derived from the registry. */
export type MapPatch = { [K in PatchType]: MapPatchOf<K> }[PatchType];

export type PatchOutcome =
  | {
      readonly ok: true;
      readonly state: MapState;
      /** Patches that undo this one, in the order they must be applied. */
      readonly inverse: readonly MapPatch[];
    }
  | { readonly ok: false; readonly rejection: MapRejection };

/** How a patch type changes the state, and how it is undone. Pure: never mutate `state`. */
export interface PatchHandler<K extends PatchType> {
  apply(state: MapState, patch: MapPatchOf<K>): PatchOutcome;
}

export type PatchHandlers = { readonly [K in PatchType]?: PatchHandler<K> };

export const patchOk = (state: MapState, inverse: readonly MapPatch[]): PatchOutcome => ({ ok: true, state, inverse });

export const patchFail = (code: RejectionCode, message: string): PatchOutcome => ({
  ok: false,
  rejection: { code, message },
});

/** Declares handlers with their types checked against the registry. */
export function definePatchHandlers(handlers: PatchHandlers): PatchHandlers {
  return handlers;
}
