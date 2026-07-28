import type { HotbarEntry, HotbarEntryPresentation } from "@rpgjs/common";

/** Client-ready slot data received by a custom hotbar component or handler. */
export interface HotbarClientSlot extends HotbarEntryPresentation {
  /** Zero-based persistent slot index. */
  index: number;
  /** Serializable authoritative entry reference. */
  entry: HotbarEntry;
  /** Whether the slot is outside the player's current capacity. */
  locked?: boolean;
  /** Optional player-visible explanation for unlocking the slot. */
  lockedHint?: string;
}

/**
 * Operations exposed to a client activation handler.
 *
 * `select()` and `use()` send interactions back to the authoritative server;
 * handlers must not apply gameplay state directly on the client.
 */
export interface HotbarActivationContext {
  /** Slot being activated. */
  slot: HotbarClientSlot;
  /** Select the slot without using its entry. */
  select(): void;
  /** Ask the server to use the entry with optional serializable target data. */
  use(target?: unknown): void;
}

/** Client preparation callback for a serialized activation handler id. */
export type HotbarActivationHandler = (
  context: HotbarActivationContext,
) => boolean | void | Promise<boolean | void>;

const activationHandlers = new Map<string, HotbarActivationHandler>();

/**
 * Register a client preparation handler for a serialized hotbar activation id.
 *
 * Targeting modules can use this to prepare a target and call `context.use()`
 * without coupling the generic hotbar component to their gameplay rules.
 *
 * @param id - Serialized handler id emitted by the server presentation.
 * @param handler - Client-only preparation callback.
 * @returns A function that restores the previous handler for the same id.
 *
 * @example
 * ```ts
 * const unregister = registerHotbarActivationHandler("pick-crop", ({ use }) => {
 *   use({ eventId: "crop-12" });
 * });
 * ```
 */
export function registerHotbarActivationHandler(
  id: string,
  handler: HotbarActivationHandler,
): () => void {
  const previous = activationHandlers.get(id);
  activationHandlers.set(id, handler);
  return () => {
    if (previous) activationHandlers.set(id, previous);
    else activationHandlers.delete(id);
  };
}

/**
 * Activate a client slot according to its serialized activation metadata.
 *
 * Locked and unusable slots are ignored. Unknown handlers fall back to the
 * normal authoritative `useSlot` interaction.
 *
 * @param context - Slot data and server interaction callbacks.
 * @returns A promise resolved after client preparation has completed.
 */
export async function activateHotbarSlot(
  context: HotbarActivationContext,
): Promise<void> {
  const { slot } = context;
  if (slot.locked || slot.usable === false) return;

  context.select();
  if (slot.activation?.mode === "select") return;

  const handlerId = slot.activation?.handler;
  const handler = handlerId ? activationHandlers.get(handlerId) : undefined;
  if (handler) {
    const handled = await handler(context);
    if (handled !== false) return;
  }
  context.use();
}
