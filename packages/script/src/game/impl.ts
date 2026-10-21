/**
 * What the game API does, written once over the port `ScriptWorld`. The real game (a player, an event, a map) and the
 * simulation each provide a `ScriptWorld`; the behavior of every name is the same in both, so they cannot drift apart.
 * The description (names, types, documentation) is in `description.ts`.
 *
 * The port has the shape of the API of RPGJS (`RpgPlayer`: `gold`, `getItem`, `addItem`, `getVariable`, `showText`, `showChoices`,
 * `showNotification`, `changeMap`…), so that the implementation for RPGJS is a thin layer. Each environment decides how: `@rpgjs/script/server`
 * does it with the API of RPGJS, a simulation does it in memory, a host with its own vocabulary (a block editor, say) maps each
 * operation to it.
 */
import type { ApiImpl } from "../core/api";

/** What a script gets of an item of the inventory: a copy, whose changes change nothing. */
export interface ItemSnapshot { id: string; name: string; quantity: number }
/** A plain value a variable of the player can hold. */
export type VariableValue = string | number | boolean | null | VariableValue[] | { [key: string]: VariableValue };
export interface Choice { text: string; value: string | number | boolean }
export interface DialogOptions { position?: string; speaker?: string; fullWidth?: boolean; autoClose?: boolean; typewriterEffect?: boolean }
export interface NotificationOptions { type?: string; time?: number }

/** The player of the script, with the names of `RpgPlayer`. Every change is the engine's to apply. */
export interface PlayerPort {
  /** Never goes below 0. */
  gold: number;
  readonly level: number;
  readonly name: string;
  getItem(id: string): ItemSnapshot | undefined;
  hasItem(id: string): boolean;
  addItem(id: string, nb: number): void | Promise<void>;
  /** Removes up to `nb`: a player who has fewer loses what they have, a player who has none loses nothing. */
  removeItem(id: string, nb: number): void | Promise<void>;
  getVariable(key: string): unknown;
  setVariable(key: string, value: VariableValue): void | Promise<void>;
  hasVariable(key: string): boolean;
  removeVariable(key: string): boolean | Promise<boolean>;
  /** Shows a dialogue and waits for the player to close it. */
  showText(text: string, options?: DialogOptions): void | Promise<void>;
  /** Asks the player and waits: the choice picked, or null when the player closes it. */
  showChoices(text: string, choices: Choice[]): Promise<Choice | null>;
  showNotification(message: string, options?: NotificationOptions): void | Promise<void>;
  changeMap(map: string, positions?: { x: number; y: number }): void | Promise<void>;
}

/** What a script run needs from its environment. */
export interface ScriptWorld {
  player: PlayerPort;
  event: { id: string; name: string; x: number; y: number };
  /** Pauses the script. */
  wait(seconds: number): void | Promise<void>;
  rand(min: number, max: number): number;
  /** Properties shared by the players of a map. `set` receives the new value, the operator and its operand. */
  sharedProps: { has(name: string): boolean; get(name: string): unknown; set(name: string, value: unknown, op: string, operand: unknown): void };
  /** Persistent data of the script's plugin. */
  stateProps: { get(key: string): unknown; set(key: string, value: unknown): void };
  /** The payload of the signal that fired the script, read as `$hook.xxx`. */
  hook: Record<string, unknown>;
}

const MAX_HOST_TEXT = 2000;
const MAX_STATE_JSON = 10_000;
const MAX_VARIABLE_JSON = 2000;
const text = (v: unknown, what = "text") => {
  if (typeof v !== "string") throw new Error(`${what} must be a text`);
  if (v.length > MAX_HOST_TEXT) throw new Error(`${what} of ${v.length} characters refused (limit ${MAX_HOST_TEXT})`);
  return v;
};
const opts = (v: unknown): Record<string, any> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : {});
const GOLD_OPS: Record<string, (current: number, value: number) => number> = { "=": (_c, v) => v, "+=": (c, v) => c + v, "-=": (c, v) => c - v, "*=": (c, v) => c * v };
const POSITIONS = ["top", "middle", "bottom"];
const NOTIFICATION_TYPES = ["info", "warn", "error"];
const key = (v: unknown) => {
  if (typeof v !== "string" || !v || v.length > 100) throw new Error("a variable is named by a text of 1 to 100 characters");
  return v;
};
const count = (v: unknown) => {
  const n = v === undefined ? 1 : Number(v);
  if (!Number.isFinite(n) || n < 1) throw new Error("a number of items is 1 or more");
  return Math.floor(n);
};
/** A copy of a value that is plain data, or an error. */
function plain(value: unknown, depth = 0): VariableValue {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error("a variable cannot hold a number that is not finite");
    return value as VariableValue;
  }
  if (depth > 6) throw new Error("a variable holds data of 6 levels at most");
  if (Array.isArray(value)) return value.map((v) => plain(v, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v, depth + 1)]));
  throw new Error("a variable holds a text, a number, true/false, null, or plain data; use removeVariable() to remove one");
}
const dialogOptions = (o: unknown): DialogOptions => {
  const x = opts(o), out: DialogOptions = {};
  if (x.position !== undefined) { if (!POSITIONS.includes(x.position)) throw new Error(`position is ${POSITIONS.join(", ")}`); out.position = x.position; }
  if (x.speaker !== undefined) out.speaker = text(x.speaker, "speaker");
  for (const flag of ["fullWidth", "autoClose", "typewriterEffect"] as const) if (x[flag] !== undefined) out[flag] = Boolean(x[flag]);
  return out;
};
const notificationOptions = (o: unknown): NotificationOptions => {
  const x = opts(o), out: NotificationOptions = {};
  if (x.type !== undefined) { if (!NOTIFICATION_TYPES.includes(x.type)) throw new Error(`type is ${NOTIFICATION_TYPES.join(", ")}`); out.type = x.type; }
  if (x.time !== undefined) { const t = Number(x.time); if (!Number.isFinite(t) || t < 0) throw new Error("time is a number of milliseconds"); out.time = t; }
  return out;
};
const choices = (v: unknown): Choice[] => {
  if (!Array.isArray(v) || v.length < 2 || v.length > 8) throw new Error("showChoices() needs 2 to 8 choices: [{ text, value }]");
  return v.map((c) => {
    const x = opts(c);
    if (!["string", "number", "boolean"].includes(typeof x.value)) throw new Error("each choice needs a value (a text, a number or true/false): { text, value }");
    return { text: text(x.text, "the text of a choice"), value: x.value };
  });
};

export const GAME_API_IMPL: ApiImpl<ScriptWorld> = {
  handles: {
    $player: {
      members: {
        gold: {
          read: (w) => w.player.gold,
          write: (w, op, v) => {
            const apply = GOLD_OPS[op];
            if (!apply) throw new Error(`gold accepts only ${Object.keys(GOLD_OPS).join(" ")}`);
            const next = apply(w.player.gold, Number(v));
            if (!Number.isFinite(next)) throw new Error("the gold must stay a finite number");
            w.player.gold = next;
          },
        },
        level: { read: (w) => w.player.level },
        name: { read: (w) => w.player.name },
      },
      methods: {
        getItem: (w, [id]) => w.player.getItem(text(id, "an item id")),
        hasItem: (w, [id]) => w.player.hasItem(text(id, "an item id")),
        addItem: (w, [id, n]) => w.player.addItem(text(id, "an item id"), count(n)),
        removeItem: (w, [id, n]) => w.player.removeItem(text(id, "an item id"), count(n)),
        getVariable: (w, [k]) => w.player.getVariable(key(k)),
        setVariable: (w, [k, v]) => {
          const value = plain(v);
          if (JSON.stringify(value).length > MAX_VARIABLE_JSON) throw new Error(`a variable holds ${MAX_VARIABLE_JSON} characters at most`);
          return w.player.setVariable(key(k), value);
        },
        hasVariable: (w, [k]) => w.player.hasVariable(key(k)),
        removeVariable: (w, [k]) => w.player.removeVariable(key(k)),
        showText: (w, [t, o]) => w.player.showText(text(t), dialogOptions(o)),
        showChoices: (w, [t, c]) => w.player.showChoices(text(t), choices(c)),
        showNotification: (w, [m, o]) => w.player.showNotification(text(m, "a message"), notificationOptions(o)),
        changeMap: (w, [m, p]) => {
          const map = text(m, "a map id");
          if (p === undefined) return w.player.changeMap(map);
          const { x, y } = opts(p);
          if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("positions is { x, y }, two numbers");
          return w.player.changeMap(map, { x, y });
        },
      },
    },
    $event: { members: { id: { read: (w) => w.event.id }, name: { read: (w) => w.event.name }, x: { read: (w) => w.event.x }, y: { read: (w) => w.event.y } } },
    $shared: {
      methods: {
        take: (w, [name, amount, o]) => {
          const k = String(name), cur = w.sharedProps.has(k) ? w.sharedProps.get(k) : undefined, min = Number(opts(o).min ?? 0);
          if (typeof cur !== "number") throw new Error(`"${k}" is not a declared number`);
          if (cur - Number(amount) < min) return false;
          w.sharedProps.set(k, cur - Number(amount), "-=", Number(amount));
          return true;
        },
      },
      dynamic: {
        read: (w, k) => { if (!w.sharedProps.has(k)) throw new Error(`"${k}" is not declared`); return w.sharedProps.get(k); },
        write: (w, k, op, v) => {
          if (!w.sharedProps.has(k)) throw new Error(`"${k}" is not declared`);
          const cur = w.sharedProps.get(k);
          if (!["=", "+=", "-="].includes(op)) throw new Error("a shared property accepts only =, += and -=");
          const next = op === "=" ? v : op === "+=" ? (cur as any) + (v as any) : (cur as any) - (v as any);
          if (cur !== null && typeof next !== typeof cur) throw new Error(`"${k}" holds ${typeof cur}, not ${typeof next}`);
          if (typeof next === "number" && !Number.isFinite(next)) throw new Error(`"${k}" must stay a finite number`);
          if (typeof next === "string" && next.length > 500) throw new Error(`"${k}" is limited to 500 characters`);
          if (next !== null && !["number", "string", "boolean"].includes(typeof next)) throw new Error("a shared property holds a number, a text, true/false or null");
          w.sharedProps.set(k, next, op, v);
        },
      },
    },
    $hook: { dynamic: { read: (w, k) => w.hook[k] } },
    $state: {
      dynamic: {
        read: (w, k) => w.stateProps.get(k),
        write: (w, k, op, v) => {
          if (op !== "=") throw new Error("$state accepts only =");
          const json = JSON.stringify(v ?? null);
          if (json.length > MAX_STATE_JSON) throw new Error(`state "${k}" would be ${json.length} characters (limit ${MAX_STATE_JSON})`);
          w.stateProps.set(k, JSON.parse(json));
        },
      },
    },
  },
  functions: {
    wait: (w, [s]) => w.wait(Number(s)),
    random: (w, [a, b]) => w.rand(Number(a), Number(b)),
    Item: (_w, [id]) => String(id),
    Graphic: (_w, [id]) => String(id),
  },
};
