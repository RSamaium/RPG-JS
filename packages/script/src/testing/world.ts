/**
 * A game without the game: a player, an event and some shared state, enough to run a script and see what it did. Every operation
 * a script asks for is applied to in-memory state and recorded in `effects`, so a test can say what the script did.
 */
import type { GoldOperation, PlayerPort, ScriptWorld, VariableOperation } from "../game/impl";

const num = (v: unknown, fallback = 0) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : fallback);

/** The player of a simulation: the state of the player in memory, and what the script asked for recorded as it happens. */
export class SimPlayer implements PlayerPort {
  gold = 100;
  level = 3;
  name = "Hero";
  map = "start";
  pos = { x: 0, y: 0 };
  items = new Map<string, number>();
  vars = new Map<string, unknown>();
  texts: string[] = [];
  notes: string[] = [];
  /** Id of the event of the script, which names its self switches. */
  eventId = "event_1";
  constructor(private record: (effect: string, params: unknown) => void = () => {}) {}
  itemCount(id: string) { return this.items.get(id) ?? 0; }
  getVariable(id: string) { return this.vars.get(id); }
  setVariable(id: string, v: unknown) { this.vars.set(id, v); }

  changeGold(operation: GoldOperation, amount: number) {
    this.record("change_gold", { type: "constant", operation, amount });
    if (operation === "set") this.gold = amount;
    else if (operation === "add") this.gold += amount;
    else if (operation === "sub") this.gold = Math.max(0, this.gold - amount);
    else if (operation === "mul") this.gold *= amount;
  }
  addItem(id: string, count: number) {
    this.record("change_item", { itemId: id, operation: "add", amountType: "constant", amount: count });
    this.items.set(id, this.itemCount(id) + count);
  }
  removeItem(id: string, count: number) {
    this.record("change_item", { itemId: id, operation: "remove", amountType: "constant", amount: count });
    this.items.set(id, Math.max(0, this.itemCount(id) - count));
  }
  setSwitch(name: string, value: boolean) {
    this.record("set_switch", { switchName: name, value });
    this.vars.set(name, value);
  }
  setSelfSwitch(letter: string, value: boolean) {
    this.record("self_switch", { switchName: letter, value });
    this.vars.set(this.eventId + "_" + letter, value);
  }
  changeVariable(name: string, operation: VariableOperation, value: number) {
    this.record("set_variable", { variableId: name, operation, valueSource: "constant", value: String(value) });
    const current = num(this.vars.get(name));
    const next: Record<VariableOperation, number> = { set: value, add: current + value, subtract: current - value, multiply: current * value, divide: current / value, modulo: current % value };
    this.vars.set(name, next[operation]);
  }
  transfer(map: string, x: number, y: number, direction?: string) {
    this.record("transfer_player", { destination: { mapId: map, x, y }, ...(direction ? { direction } : {}) });
    this.map = map;
    this.pos = { x, y };
  }
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

export class SimWorld implements ScriptWorld {
  player = new SimPlayer((block, params) => this.effects.push({ block, params }));
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
    this.player.eventId = this.event.id;
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

  async say(text: string, options: { speaker?: string; position?: string } = {}) {
    this.effects.push({ block: "show_text", params: { text, ...options } });
    this.player.texts.push(text);
  }

  async notify(message: string, options: { type?: string; time?: number } = {}) {
    this.effects.push({ block: "show_notification", params: { message, ...options } });
    this.player.notes.push(message);
  }

  async wait(seconds: number) {
    this.effects.push({ block: "wait", params: { duration: seconds } });
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
