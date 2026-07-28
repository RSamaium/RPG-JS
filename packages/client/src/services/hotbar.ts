import type { HotbarEntry, HotbarEntryPresentation } from "@rpgjs/common";

export interface HotbarClientSlot extends HotbarEntryPresentation {
  index: number;
  entry: HotbarEntry;
  locked?: boolean;
  lockedHint?: string;
}

export interface HotbarActivationContext {
  slot: HotbarClientSlot;
  select(): void;
  use(target?: unknown): void;
}

export type HotbarActivationHandler = (
  context: HotbarActivationContext,
) => boolean | void | Promise<boolean | void>;

const activationHandlers = new Map<string, HotbarActivationHandler>();

/**
 * Register a client preparation handler for a serialized hotbar activation id.
 *
 * Targeting modules can use this to prepare a target and call `context.use()`
 * without coupling the generic hotbar component to their gameplay rules.
 */
export const registerHotbarActivationHandler = (
  id: string,
  handler: HotbarActivationHandler,
): (() => void) => {
  const previous = activationHandlers.get(id);
  activationHandlers.set(id, handler);
  return () => {
    if (previous) activationHandlers.set(id, previous);
    else activationHandlers.delete(id);
  };
};

export const activateHotbarSlot = async (
  context: HotbarActivationContext,
): Promise<void> => {
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
};
