import { getKeyboardControlBind } from "@rpgjs/client";

/** How many entries the action menu of a unit can show (each one has a key: `entry1` is the move, the others follow the menu). */
export const MENU_ENTRIES = 6;

/**
 * A control of the tactical HUD, whatever key or button gives it. Its key is
 * the `keyboardControls` entry of the same name in the client config:
 * `up`…`right`, `action`, `escape` and `tabNext` (the next unit) are the
 * standard ones; `endPhase` (default `e`), `danger` (default `r`) and
 * `entry1`…`entry6` (default: the `hotbar1`…`hotbar6` keys, `1`…`6`) are the
 * ones of the tactical battle. Client only.
 *
 * @example
 * ```ts
 * provideClientGlobalConfig({ keyboardControls: { endPhase: "enter", danger: "d", entry2: "a" } });
 * ```
 */
export type TacticalControl =
  | "up"
  | "down"
  | "left"
  | "right"
  | "action"
  | "escape"
  | "nextUnit"
  | "endPhase"
  | "danger"
  | `entry${1 | 2 | 3 | 4 | 5 | 6}`;

/** A key as CanvasEngine reads it (`"e"`, `"page down"`), or several. */
export type KeyBind = string | string[];

const entries = Array.from({ length: MENU_ENTRIES }, (_, i) => i + 1);

/**
 * The keys of the tactical HUD, read from the `keyboardControls` of the game.
 * The standard controls are the ones of every battle screen (`up`…`right`,
 * `action`, `escape`, `tabNext` for the next unit); the controls of the
 * tactical battle take the same names in `keyboardControls`, with defaults:
 * `endPhase` (`e`), `danger` (`r`) and `entry1`…`entry6` (the hotbar keys of
 * the game, `1`…`6` by default).
 *
 * @param keyboard - The `keyboardControls` of the client config
 * @returns The key(s) of each control
 */
export function tacticalBinds(keyboard: Record<string, unknown> = {}): Record<TacticalControl, KeyBind> {
  const bind = (value: unknown, fallback: KeyBind): KeyBind => {
    const key = getKeyboardControlBind(value);
    return typeof key === "string" || Array.isArray(key) ? (key as KeyBind) : fallback;
  };
  const binds = {
    up: bind(keyboard.up, "up"),
    down: bind(keyboard.down, "down"),
    left: bind(keyboard.left, "left"),
    right: bind(keyboard.right, "right"),
    action: bind(keyboard.action, "space"),
    escape: bind(keyboard.escape, "escape"),
    nextUnit: bind(keyboard.tabNext, "page down"),
    endPhase: bind(keyboard.endPhase, "e"),
    danger: bind(keyboard.danger, "r"),
  } as Record<TacticalControl, KeyBind>;
  for (const n of entries) binds[`entry${n}` as TacticalControl] = bind(keyboard[`entry${n}`] ?? keyboard[`hotbar${n}`], `n${n}`);
  return binds;
}

const ARROWS: Record<string, string> = { up: "↑", down: "↓", left: "←", right: "→" };

/**
 * The name of a key as the HUD shows it: an arrow, a digit (`n2` → `2`), the
 * `tactical.key.<name>` text of the i18n service (`tactical.key.space`…), or
 * the key in capitals. Only the first key of a list is named.
 *
 * @param bind - The key(s) of a control
 * @param translate - The i18n service (`t`)
 * @returns The label of the key
 */
export function keyLabel(bind: KeyBind | undefined, translate: (key: string) => string): string {
  const name = String((Array.isArray(bind) ? bind[0] : bind) ?? "").toLowerCase();
  if (!name) return "";
  if (ARROWS[name]) return ARROWS[name];
  if (/^n\d$/.test(name)) return name.slice(1);
  const id = `tactical.key.${name.replace(/\s+/g, "")}`;
  const said = translate(id);
  if (said && said !== id) return said;
  return name.length === 1 ? name.toUpperCase() : name.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

/**
 * The labels of the keys of the HUD, as the i18n parameters of its texts:
 * `{up}`, `{down}`, `{left}`, `{right}`, `{action}`, `{escape}`, `{next}`
 * (next unit), `{end}` (end of the phase), `{danger}` and `{entries}` (the
 * keys of the action menu, like `2–6`).
 *
 * @param keyboard - The `keyboardControls` of the client config
 * @param translate - The i18n service (`t`)
 * @returns The parameters to give to `t`
 */
export function keyParams(keyboard: Record<string, unknown> | undefined, translate: (key: string) => string): Record<string, string> {
  const binds = tacticalBinds(keyboard);
  const label = (control: TacticalControl) => keyLabel(binds[control], translate);
  return {
    up: label("up"),
    down: label("down"),
    left: label("left"),
    right: label("right"),
    action: label("action"),
    escape: label("escape"),
    next: label("nextUnit"),
    end: label("endPhase"),
    danger: label("danger"),
    entries: `${label("entry2")}–${label(`entry${MENU_ENTRIES}` as TacticalControl)}`,
  };
}
