import type { SaveSlotMeta } from "@rpgjs/common";

/** A value returned either immediately or asynchronously by a server hook. */
export type MaybePromise<T> = T | Promise<T>;

export interface RpgSyncPropertyOptions<T = unknown> {
  $default?: T;
  $syncWithClient?: boolean;
  $permanent?: boolean;
}

export type RpgSyncProperty =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ObjectConstructor
  | ArrayConstructor
  | RpgSyncPropertyOptions
  | RpgSyncSchema
  | readonly [RpgSyncProperty];

/** Recursive schema accepted by player props and map synchronization. */
export interface RpgSyncSchema {
  [key: string]: RpgSyncProperty;
}

/**
 * Serializable player state produced by {@link RpgPlayer.snapshot}.
 *
 * Games may add their own synchronized properties through module augmentation,
 * so unknown keys deliberately remain supported without leaking `any`.
 */
export interface RpgPlayerSnapshot {
  [key: string]: unknown;
  id?: string;
  name?: string;
  map?: string;
  x?: number;
  y?: number;
  z?: number;
  speed?: number;
  canMove?: boolean;
  locale?: string;
  items?: unknown[];
  skills?: unknown[];
  states?: unknown[];
  equipments?: unknown[];
  expCurve?: Record<string, number>;
}

/** Minimal map descriptor passed to `RpgPlayerHooks.canChangeMap`. */
export interface RpgMapChangeTarget {
  id: string;
}

/** Successful result returned when a player is saved into a slot. */
export interface RpgPlayerSaveResult {
  index: number;
  meta: SaveSlotMeta;
}

/** Result returned after applying a snapshot directly. */
export interface RpgPlayerSnapshotLoadResult {
  ok: true;
  snapshot: RpgPlayerSnapshot;
}

/** Successful result returned after loading a storage slot. */
export interface RpgPlayerSlotLoadSuccess {
  ok: true;
  slot: SaveSlotMeta;
  index: number;
}

/** A slot load can be denied by policy or fail because the slot is empty. */
export interface RpgPlayerSlotLoadFailure {
  ok: false;
}

export type RpgPlayerSlotLoadResult =
  | RpgPlayerSlotLoadSuccess
  | RpgPlayerSlotLoadFailure;
