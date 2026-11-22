import { getKeyboardControlBind, menuGamepadControls, type RpgClientEngine } from "@rpgjs/client";

/**
 * The commands of a battle screen. Their keys come from the keyboard controls
 * of the game (`keyboardControls` of the client config) and the gamepad uses
 * the mapping of the built-in GUIs (`menuGamepadControls`): A confirms
 * (`action`), B or Start goes back (`escape`), the d-pad or the stick moves,
 * L/R are `tabPrev` / `tabNext`.
 */
export type BattleControl = "up" | "down" | "left" | "right" | "action" | "escape" | "tabPrev" | "tabNext";

/** A command of a battle screen that is not one of the standard ones (fast-forward, end the turn…). */
export interface BattleExtraControl {
  /** Keyboard key(s), as CanvasEngine reads them (`"e"`, `"space"`, `["n1", "1"]`). */
  bind: string | string[];
  /** Gamepad button index of the standard layout (2 = X, 3 = Y) that also triggers it. */
  button?: number;
  keyDown(): void;
  keyUp?(): void;
  /** Repeat while the key is held. */
  repeat?: boolean;
}

/** What a standard command does: on press, or on press and on release (a key held to fast-forward). */
export type BattleControlHandler = (() => void) | { keyDown(): void; keyUp?(): void };

/** What a battle screen does on each command. */
export type BattleControlHandlers = Partial<Record<BattleControl, BattleControlHandler>> & {
  /** Commands of this battle screen besides the standard ones, by name. */
  extra?: Record<string, BattleExtraControl>;
  /** When true, the battle leaves every key to another GUI (a dialog opened over the battle). */
  paused?: () => boolean;
};

const DIRECTIONS: BattleControl[] = ["up", "down", "left", "right"];

/**
 * Is the player writing (the chat, a field of another GUI)? Then the keys are
 * letters of their text, not commands of the battle.
 */
export function typingInTextField(): boolean {
  if (typeof document === "undefined") return false;
  const element = document.activeElement as (Element & { isContentEditable?: boolean }) | null;
  return element?.tagName === "INPUT" || element?.tagName === "TEXTAREA" || element?.isContentEditable === true;
}

/**
 * The CanvasEngine `controls` of a battle GUI: give it to the root of the
 * component (`<DOMContainer controls={controls}>`). The battle GUI is opened
 * with `blockPlayerInput`, so the map never sees these keys; while the player
 * writes in a text field (the chat), the keys are left to it. Client only.
 *
 * @param engine - The client engine (its keyboard controls are read)
 * @param handlers - What each command does
 * @returns The controls object, to wrap in a `signal`
 *
 * @example
 * ```ts
 * const controls = signal(
 *   battleControls(engine, {
 *     up: () => moveMenu(-1),
 *     down: () => moveMenu(1),
 *     action: confirm,
 *     escape: back,
 *     tabNext: cycleSpeed,
 *     extra: { endTurn: { bind: "e", button: 3, keyDown: endTurn } },
 *   }),
 * );
 * ```
 */
export function battleControls(engine: RpgClientEngine, handlers: BattleControlHandlers): Record<string, unknown> {
  const keyboard = (engine.globalConfig?.keyboardControls ?? {}) as Record<string, unknown>;
  const run = (fn?: () => void) => () => {
    if (!fn || handlers.paused?.() || typingInTextField()) return;
    fn();
  };
  const controls: Record<string, unknown> = {};
  const binds: Record<BattleControl, unknown> = {
    up: keyboard.up ?? "up",
    down: keyboard.down ?? "down",
    left: keyboard.left ?? "left",
    right: keyboard.right ?? "right",
    action: getKeyboardControlBind(keyboard.action ?? "space"),
    escape: keyboard.escape ?? "escape",
    tabPrev: "pageup",
    tabNext: "tab",
  };
  for (const name of Object.keys(binds) as BattleControl[]) {
    const handler = handlers[name];
    if (!handler) continue;
    const { keyDown, keyUp } = typeof handler === "function" ? { keyDown: handler, keyUp: undefined } : handler;
    controls[name] = {
      bind: binds[name],
      ...(DIRECTIONS.includes(name) ? { repeat: true, throttle: 150 } : {}),
      keyDown: run(keyDown),
      ...(keyUp ? { keyUp: run(keyUp) } : {}),
    };
  }
  const buttonMapping: Record<string, string> = { ...menuGamepadControls.buttonMapping };
  for (const [name, extra] of Object.entries(handlers.extra ?? {})) {
    controls[name] = {
      bind: extra.bind,
      ...(extra.repeat ? { repeat: true, throttle: 150 } : {}),
      keyDown: run(extra.keyDown),
      ...(extra.keyUp ? { keyUp: run(extra.keyUp) } : {}),
    };
    if (extra.button !== undefined) buttonMapping[`button_${extra.button}`] = name;
  }
  controls.gamepad = { ...menuGamepadControls, buttonMapping };
  return controls;
}
