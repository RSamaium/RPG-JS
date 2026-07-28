/**
 * Number of persistent slots stored for every player hotbar.
 *
 * A player's `capacity` may expose fewer slots, but snapshots always retain all
 * ten assignments so temporarily locked entries are not lost.
 */
export const HOTBAR_SLOT_COUNT = 10;

/** Built-in or plugin-provided server-authoritative hotbar entry type. */
export type HotbarEntryType = "skill" | "item" | (string & {});

/** Serializable reference stored in a hotbar slot. */
export interface HotbarEntry {
  /** Registered entry type, such as `skill`, `item`, or a plugin type. */
  type: HotbarEntryType;
  /** Database or registry identifier resolved by the entry type. */
  id: string;
}

/** Assigned entry, or `null` when the slot is intentionally empty. */
export type HotbarSlot = HotbarEntry | null;

/**
 * Client activation behavior.
 *
 * `instant` uses the entry immediately, `select` only changes the active slot,
 * and `target` delegates preparation to a registered client activation handler.
 */
export type HotbarActivationMode = "instant" | "select" | "target";

/** Serializable presentation resolved by the authoritative entry definition. */
export interface HotbarEntryPresentation {
  /** Database or registry identifier. */
  id: string;
  /** Registered entry type. */
  type: string;
  /** Player-visible entry name. */
  name: string;
  /** Optional player-visible description. */
  description?: string;
  /** Optional client spritesheet identifier. */
  icon?: string;
  /** Remaining item quantity. */
  quantity?: number;
  /** Display-only resource cost; authoritative use still validates it. */
  cost?: { value: number; label: string };
  /** Optional short status label rendered over the slot. */
  badge?: string;
  /** Whether the server currently considers the entry usable. */
  usable: boolean;
  /** Total cooldown duration in milliseconds. */
  cooldownMs?: number;
  /** Epoch timestamp in milliseconds when the cooldown finishes. */
  readyAt?: number;
  /** Client preparation metadata; it never grants gameplay authority. */
  activation: {
    /** Activation behavior used by the generic client component. */
    mode: HotbarActivationMode;
    /** Optional client activation handler id. */
    handler?: string;
    /** Serializable handler-specific data. */
    payload?: Record<string, unknown>;
  };
}

/** Detached, serializable player hotbar snapshot. */
export interface HotbarState {
  /** Persisted schema version. */
  version: 2;
  /** Whether the initial loadout has already been seeded. */
  initialized: boolean;
  /** Number of slots currently available, clamped between 1 and 10. */
  capacity: number;
  /** Zero-based selected slot, or `null` when no slot is selected. */
  activeSlot: number | null;
  /** Ten persistent assignments, including temporarily locked slots. */
  slots: HotbarSlot[];
}

/** Create a new, uninitialized ten-slot hotbar state. */
export const createHotbarState = (): HotbarState => ({
  version: 2,
  initialized: false,
  capacity: HOTBAR_SLOT_COUNT,
  activeSlot: null,
  slots: Array.from({ length: HOTBAR_SLOT_COUNT }, () => null),
});
