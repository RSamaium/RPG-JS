/**
 * What the game API does, written once over the port `ScriptWorld`. The real game (a player, an event, a map) and the
 * simulation each provide a `ScriptWorld`; the behavior of every name is the same in both, so they cannot drift apart.
 * The description (names, types, documentation) is in `description.ts`.
 */
import type { ApiImpl } from "../core/api";

/** What a script run needs from its environment. */
export interface ScriptWorld {
  player: { gold: number; level: number; name: string; itemCount(id: string): number; getVariable(id: string): unknown };
  event: { id: string; x: number; y: number };
  /** Runs a block of the Studio (change_gold, show_text...) with the executors of the environment. */
  perform(block: string, params: unknown): Promise<void>;
  rand(min: number, max: number): number;
  choose(options: string[]): Promise<number>;
  /** Properties shared by the players of a map. `set` receives the new value, the operator and its operand. */
  sharedProps: { has(name: string): boolean; get(name: string): unknown; set(name: string, value: unknown, op: string, operand: unknown): void };
  /** Persistent data of the script's plugin. */
  stateProps: { get(key: string): unknown; set(key: string, value: unknown): void };
  hook: Record<string, unknown>;
}

const MAX_HOST_TEXT = 2000;
const MAX_STATE_JSON = 10_000;
const text = (v: unknown) => {
  const s = String(v);
  if (s.length > MAX_HOST_TEXT) throw new Error(`text of ${s.length} characters refused (limit ${MAX_HOST_TEXT})`);
  return s;
};
const opts = (v: unknown): Record<string, any> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : {});
const OPS: Record<string, string> = { "=": "set", "+=": "add", "-=": "sub", "*=": "mul" };
const VAR_OPS: Record<string, string> = { "=": "set", "+=": "add", "-=": "subtract", "*=": "multiply", "/=": "divide", "%=": "modulo" };
const SELF = new Set(["A", "B", "C", "D", "E", "F"]);

export const GAME_API_IMPL: ApiImpl<ScriptWorld> = {
  handles: {
    $player: {
      members: {
        gold: {
          read: (w) => w.player.gold,
          write: (w, op, v) => {
            const operation = OPS[op];
            if (!operation) throw new Error(`gold accepts only ${Object.keys(OPS).join(" ")}`);
            return w.perform("change_gold", { type: "constant", operation, amount: Number(v) });
          },
        },
        level: { read: (w) => w.player.level },
        name: { read: (w) => w.player.name },
      },
      methods: {
        itemCount: (w, [id]) => w.player.itemCount(String(id)),
        hasItem: (w, [id]) => w.player.itemCount(String(id)) > 0,
        addItem: (w, [id, n]) => w.perform("change_item", { itemId: String(id), operation: "add", amountType: "constant", amount: Number(n ?? 1) }),
        removeItem: (w, [id, n]) => w.perform("change_item", { itemId: String(id), operation: "remove", amountType: "constant", amount: Number(n ?? 1) }),
      },
    },
    $event: { members: { id: { read: (w) => w.event.id }, x: { read: (w) => w.event.x }, y: { read: (w) => w.event.y } } },
    $switch: {
      dynamic: {
        read: (w, k) => w.player.getVariable(k) == 1,
        write: (w, k, op, v) => { if (op !== "=") throw new Error("a switch accepts only ="); return w.perform("set_switch", { switchName: k, value: Boolean(v) }); },
      },
    },
    $self: {
      dynamic: {
        read: (w, k) => { if (!SELF.has(k)) throw new Error("self switches are named A to F"); return w.player.getVariable(w.event.id + "_" + k) == 1; },
        write: (w, k, op, v) => {
          if (!SELF.has(k)) throw new Error("self switches are named A to F");
          if (op !== "=") throw new Error("a self switch accepts only =");
          return w.perform("self_switch", { switchName: k, value: Boolean(v) });
        },
      },
    },
    $var: {
      dynamic: {
        read: (w, k) => { const v = w.player.getVariable(k); return typeof v === "number" ? v : 0; },
        write: (w, k, op, v) => {
          const operation = VAR_OPS[op];
          if (!operation) throw new Error(`a variable accepts only ${Object.keys(VAR_OPS).join(" ")}`);
          return w.perform("set_variable", { variableId: k, operation, valueSource: "constant", value: String(Number(v)) });
        },
      },
    },
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
    say: (w, [t, o]) => w.perform("show_text", { text: text(t), ...(opts(o).speaker ? { speaker: String(opts(o).speaker) } : {}), ...(opts(o).position ? { position: String(opts(o).position) } : {}) }),
    notify: (w, [m, o]) => w.perform("show_notification", { message: text(m), ...(opts(o).type ? { type: String(opts(o).type) } : {}), ...(opts(o).time ? { time: Number(opts(o).time) } : {}) }),
    choice: (w, [o]) => {
      if (!Array.isArray(o) || o.length < 2 || o.length > 4) throw new Error("choice() needs 2 to 4 options");
      return w.choose(o.map(text));
    },
    wait: (w, [s]) => w.perform("wait", { duration: Number(s) }),
    transfer: (w, [m, x, y, o]) => w.perform("transfer_player", { destination: { mapId: String(m), x: Number(x), y: Number(y) }, ...(opts(o).direction ? { direction: String(opts(o).direction) } : {}) }),
    random: (w, [a, b]) => w.rand(Number(a), Number(b)),
    Item: (_w, [id]) => String(id),
    Graphic: (_w, [id]) => String(id),
  },
};
