/**
 * A game without the game: a player, an event and some shared state, enough to run a script and see what it did. Every operation
 * a script asks for is applied to in-memory state and recorded in `effects`, so a test can say what the script did.
 */
import type { Choice, DialogOptions, ItemSnapshot, NotificationOptions, PlayerPort, ScriptWorld, VariableValue } from "../game/impl";

/** The player of a simulation: the state of the player in memory, and what the script asked for recorded as it happens. */
export class SimPlayer implements PlayerPort {
  private amount = 100;
  level = 3;
  name = "Hero";
  map = "start";
  items = new Map<string, number>();
  vars = new Map<string, unknown>();
  /** The answers `showChoices` gives, in order (the index of the choice, -1 to close it). */
  answers: number[] = [];
  /** Answers `showChoices` instead of `answers`, for a test that has to wait (the player thinks). */
  chooser?: (text: string, choices: Choice[]) => Promise<Choice | null>;
  constructor(private record: (effect: string, params: unknown) => void = () => {}) {}

  get gold() { return this.amount; }
  set gold(value: number) {
    this.amount = Math.max(0, value);
    this.record("gold", { value: this.amount });
  }
  /** Sets the gold without recording an effect: the starting point of a simulation. */
  start(gold: number) { this.amount = gold; }

  getItem(id: string): ItemSnapshot | undefined {
    const quantity = this.items.get(id) ?? 0;
    return quantity > 0 ? { id, name: id, quantity } : undefined;
  }
  hasItem(id: string) { return (this.items.get(id) ?? 0) > 0; }
  addItem(id: string, nb: number) {
    this.record("addItem", { id, nb });
    this.items.set(id, (this.items.get(id) ?? 0) + nb);
  }
  removeItem(id: string, nb: number) {
    this.record("removeItem", { id, nb });
    const left = (this.items.get(id) ?? 0) - nb;
    if (left > 0) this.items.set(id, left);
    else this.items.delete(id);
  }
  getVariable(key: string) { return this.vars.get(key); }
  setVariable(key: string, value: VariableValue) {
    this.record("setVariable", { key, value });
    this.vars.set(key, value);
  }
  hasVariable(key: string) { return this.vars.has(key); }
  removeVariable(key: string) {
    this.record("removeVariable", { key });
    return this.vars.delete(key);
  }
  showText(text: string, options: DialogOptions = {}) {
    this.record("showText", { text, ...options });
  }
  async showChoices(text: string, choices: Choice[]): Promise<Choice | null> {
    this.record("showChoices", { text, choices });
    if (this.chooser) return this.chooser(text, choices);
    const answer = this.answers.length ? this.answers.shift()! : 0;
    return choices[answer] ?? null;
  }
  showNotification(message: string, options: NotificationOptions = {}) {
    this.record("showNotification", { message, ...options });
  }
  changeMap(map: string, positions?: { x: number; y: number }) {
    this.record("changeMap", { map, ...(positions ? { positions } : {}) });
    this.map = map;
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

/** The starting point of a simulation: the player (gold, level, name, items), their variables and switches, the data of `$state` and `$hook`, preset shared properties, forced dice and answers. */
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
  /** Answers `showChoices` in order: the index of the choice picked, -1 when the player closes it. */
  choices?: number[];
  /** The room the script runs in (a map called `start` by default). */
  room?: { id?: string; kind?: string };
  /** The event the script runs for. */
  event?: { id?: string; name?: string; x?: number; y?: number };
  /** Answers `showChoices`, after any delay, instead of `choices`. */
  choose?: (text: string, choices: Choice[]) => Promise<Choice | null>;
  seed?: number;
}

/**
 * A game without the game: it implements `ScriptWorld` in memory and records every effect, so a test can say what a script did.
 *
 * @example
 * ```ts
 * const world = new SimWorld({ player: { gold: 50 } })
 * await world.player.changeGold("sub", 10)
 * world.snapshot().player.gold // 40
 * ```
 */
export class SimWorld implements ScriptWorld {
  player = new SimPlayer((name, params) => this.effects.push({ name, params }));
  room = { id: "start", kind: "map" };
  event = { id: "event_1", name: "", x: 5, y: 3 };
  state: Record<string, unknown> = {};
  hook: Record<string, unknown> = {};
  shared: SharedStore;
  effects: { name: string; params: unknown }[] = [];
  private seed: number;
  private dice: number[] = [];

  constructor(init: WorldInit = {}) {
    this.player.start(init.player?.gold ?? 100);
    Object.assign(this.player, { level: init.player?.level ?? 3, name: init.player?.name ?? "Hero" });
    for (const [k, v] of Object.entries(init.player?.items ?? {})) this.player.items.set(k, v);
    for (const [k, v] of Object.entries(init.vars ?? {})) this.player.vars.set(k, v);
    Object.assign(this.state, JSON.parse(JSON.stringify(init.state ?? {})));
    Object.assign(this.hook, init.hook ?? {});
    this.shared = init.shared ?? new SharedStore();
    this.seed = init.seed ?? 1;
    this.dice = [...(init.dice ?? [])];
    this.player.answers = [...(init.choices ?? [])];
    this.player.chooser = init.choose;
    Object.assign(this.event, init.event ?? {});
    Object.assign(this.room, init.room ?? {});
  }

  /** The properties shared by the players, as the game API sees them: every change is recorded as a `sync` effect. */
  readonly sharedProps: ScriptWorld["sharedProps"] = {
    has: (name) => name in this.shared.values,
    get: (name) => this.shared.values[name],
    set: (name, value, op, operand) => { this.shared.values[name] = value; this.effects.push({ name: "sync", params: { name, op, value: operand } }); },
  };

  readonly stateProps: ScriptWorld["stateProps"] = {
    get: (key) => this.state[key],
    set: (key, value) => { this.effects.push({ name: "state", params: { key } }); this.state[key] = value; },
  };

  async wait(seconds: number) {
    this.effects.push({ name: "wait", params: { seconds } });
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

  snapshot() {
    return {
      player: { gold: this.player.gold, level: this.player.level, name: this.player.name, map: this.player.map, items: Object.fromEntries(this.player.items) },
      vars: Object.fromEntries(this.player.vars),
      state: this.state,
      shared: this.shared.values,
    };
  }
}
