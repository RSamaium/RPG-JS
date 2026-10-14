import type { MapRejection } from "./errors";
import type { MapPatch } from "./patches";

export type MaybePromise<T> = T | Promise<T>;
export type Unsubscribe = () => void;

export interface ApplySuccess {
  readonly ok: true;
  /** Revision of the map after the change. A batch gets a single revision. */
  readonly revision: number;
  /** Patches that were applied. */
  readonly patches: readonly MapPatch[];
  /** Patches that undo the change, in the order they must be applied. */
  readonly inverse: readonly MapPatch[];
}

export interface ApplyFailure {
  readonly ok: false;
  readonly rejection: MapRejection;
}

export type ApplyResult = ApplySuccess | ApplyFailure;

export const isThenable = <T>(value: MaybePromise<T>): value is Promise<T> =>
  typeof value === "object" && value !== null && typeof (value as { then?: unknown }).then === "function";

/** Runs `next` on a value that may or may not be a promise, keeping sync values sync. */
export function chain<T, U>(value: MaybePromise<T>, next: (value: T) => U): MaybePromise<U> {
  return isThenable(value) ? value.then(next) : next(value);
}
