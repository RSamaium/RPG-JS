/**
 * A game without the game: a player, an event and some shared state, enough to run a script and see what it did. Every operation
 * a script asks for is applied to in-memory state and recorded in `effects`, so a test can say what the script did.
 */
import type { ScriptWorld } from "../game/impl";

export class SimPlayer {
  gold = 100;
  level = 3;
  name = "Hero";
  map = "start";
  pos = { x: 0, y: 0 };
  items = new Map<string, number>();
  vars = new Map<string, unknown>();
  texts: string[] = [];
  notes: string[] = [];
  itemCount(id: string) { return this.items.get(id) ?? 0; }
  getVariable(id: string) { return this.vars.get(id); }
  setVariable(id: string, v: unknown) { this.vars.set(id, v); }
}

/** Properties shared by the players of a map: in the game, map.setSync({ name: { $initial, $syncWithClient, $permanent } }). */
export class SharedStore {
  values: Record<string, unknown> = {};
  decl: Record<string, { client: boolean; persist: boolean }> = {};
  declare(list: { name: string; initial: unknown; client: boolean; persist: boolean }[]) {
    for (const d of list) if (!(d.name in this.values)) { this.values[d.name] = d.initial; this.decl[d.name] = { client: d.client, persist: d.persist }; }
  }
}

export interface WorldInit {
  player?: { gold?: number; level?: number; name?: string; items?: Record<string, number> };
  vars?: Record<string, unknown>;
  state?: Record<string, unknown>;
  hook?: Record<string, unknown>;
  shared?: SharedStore;
  /** Preset values of shared properties. */
  sharedValues?: Record<string, unknown>;
  /** Forces the next values of random(), in order. */
  dice?: number[];
  /** Answers choice() in order (index of the option). */
  choices?: number[];
  seed?: number;
  choice?: (options: string[]) => Promise<number>;
}

const num = (v: unknown, fallback = 0) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : fallback);

export class SimWorld implements ScriptWorld {
  player = new SimPlayer();
  event = { id: "event_1", x: 5, y: 3 };
  state: Record<string, unknown> = {};
  hook: Record<string, unknown> = {};
  shared: SharedStore;
  effects: { block: string; params: unknown }[] = [];
  private seed: number;
  private choiceFn?: (options: string[]) => Promise<number>;
  private dice: number[] = [];
  private answers: number[] = [];

  constructor(init: WorldInit = {}) {
    Object.assign(this.player, { gold: init.player?.gold ?? 100, level: init.player?.level ?? 3, name: init.player?.name ?? "Hero" });
    for (const [k, v] of Object.entries(init.player?.items ?? {})) this.player.items.set(k, v);
    for (const [k, v] of Object.entries(init.vars ?? {})) this.player.vars.set(k, v);
    Object.assign(this.state, JSON.parse(JSON.stringify(init.state ?? {})));
    Object.assign(this.hook, init.hook ?? {});
    this.shared = init.shared ?? new SharedStore();
    this.seed = init.seed ?? 1;
    this.choiceFn = init.choice;
    this.dice = [...(init.dice ?? [])];
    this.answers = [...(init.choices ?? [])];
  }

  /** The properties shared by the players, as the game API sees them: every change is recorded as a `sync` effect. */
  readonly sharedProps: ScriptWorld["sharedProps"] = {
    has: (name) => name in this.shared.values,
    get: (name) => this.shared.values[name],
    set: (name, value, op, operand) => { this.shared.values[name] = value; this.effects.push({ block: "sync", params: { name, op, value: operand } }); },
  };

  readonly stateProps: ScriptWorld["stateProps"] = {
    get: (key) => this.state[key],
    set: (key, value) => { this.effects.push({ block: "state", params: { key } }); this.state[key] = value; },
  };

  async perform(block: string, params: any) {
    this.effects.push({ block, params });
    const p = this.player;
    switch (block) {
      case "change_gold": {
        const amount = num(params.amount);
        if (params.operation === "set") p.gold = amount;
        else if (params.operation === "add") p.gold += amount;
        else if (params.operation === "sub") p.gold = Math.max(0, p.gold - amount);
        else if (params.operation === "mul") p.gold *= amount;
        break;
      }
      case "change_item": {
        const amount = num(params.amount, 1);
        if (params.operation === "add") p.items.set(params.itemId, p.itemCount(params.itemId) + amount);
        else p.items.set(params.itemId, Math.max(0, p.itemCount(params.itemId) - amount));
        break;
      }
      case "set_switch": p.setVariable(params.switchName, params.value); break;
      case "self_switch": p.setVariable(this.event.id + "_" + params.switchName, params.value); break;
      case "set_variable": {
        const current = num(p.getVariable(params.variableId));
        const value = num(params.value);
        const next: Record<string, number> = { set: value, add: current + value, subtract: current - value, multiply: current * value, divide: current / value, modulo: current % value };
        p.setVariable(params.variableId, next[params.operation]);
        break;
      }
      case "show_text": p.texts.push(params.text); break;
      case "show_notification": p.notes.push(params.message); break;
      case "transfer_player": p.map = params.destination.mapId; p.pos = { x: params.destination.x, y: params.destination.y }; break;
    }
  }

  rand(min: number, max: number) {
    if (this.dice.length) return Math.min(max, Math.max(min, this.dice.shift()!));
    return this.randSeeded(min, max);
  }

  private randSeeded(min: number, max: number) { // mulberry32: the same seed gives the same dice in a simulation
    this.seed = (this.seed + 0x6d2b79f5) | 0;
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return min + Math.floor(r * (max - min + 1));
  }

  async choose(options: string[]) {
    this.effects.push({ block: "show_choices", params: { choices: options } });
    if (this.choiceFn) return this.choiceFn(options);
    return this.answers.length ? this.answers.shift()! : 0;
  }

  snapshot() {
    return {
      player: { gold: this.player.gold, level: this.player.level, name: this.player.name, map: this.player.map, pos: this.player.pos, items: Object.fromEntries(this.player.items) },
      vars: Object.fromEntries(this.player.vars),
      state: this.state,
      shared: this.shared.values,
    };
  }
}
