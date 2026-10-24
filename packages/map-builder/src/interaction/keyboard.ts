import type { Unsubscribe } from "../model/result";
import type { InteractionController } from "./controller";
import type { KeyInput } from "./input";

/** The part of a `KeyboardEvent` that is used. */
export interface KeyEventLike {
  readonly key: string;
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly altKey?: boolean;
  readonly metaKey?: boolean;
  readonly target?: unknown;
  preventDefault?(): void;
}

/** Anything that emits key events: `window`, `document`, an element. */
export interface KeyTarget {
  addEventListener(type: "keydown", listener: (event: KeyEventLike) => void): void;
  removeEventListener(type: "keydown", listener: (event: KeyEventLike) => void): void;
}

const isTyping = (target: unknown): boolean => {
  const element = target as { tagName?: string; isContentEditable?: boolean } | null | undefined;
  const tag = element?.tagName?.toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || element?.isContentEditable === true;
};

export const toKeyInput = (event: KeyEventLike): KeyInput => ({
  key: event.key,
  modifiers: { shift: !!event.shiftKey, ctrl: !!event.ctrlKey, alt: !!event.altKey, meta: !!event.metaKey },
});

/**
 * Gives key presses to the interaction layer: Escape cancels, Delete removes.
 * Keys typed in a text field are left alone, and a key a tool took is not passed
 * on to the browser. Returns the function that stops listening.
 */
export function bindKeyboard(controller: Pick<InteractionController, "feedKey">, target: KeyTarget): Unsubscribe {
  const listener = (event: KeyEventLike): void => {
    if (isTyping(event.target)) return;
    if (controller.feedKey(toKeyInput(event))) event.preventDefault?.();
  };
  target.addEventListener("keydown", listener);
  return () => target.removeEventListener("keydown", listener);
}
