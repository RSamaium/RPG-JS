/**
 * A game without the game: a player, an event and some shared state, enough to run a script and see what it did. Every operation
 * a script asks for is applied to in-memory state and recorded in `effects`, so a test can say what the script did.
 */
import { type EnginePort, type CameraOptions, type EnemySpawnOptions, MAX_SCRIPT_TIMERS, type TimerOptions, MAX_SCRIPT_EVENTS, MAX_SCRIPT_MOVERS, MAX_SCRIPT_SHAPES, type AttachedShapeOptions, type BattleOptions, type BattleOutcome, type DirectionName, type DistanceOptions, type MoveEventOptions, type MoveTarget, type TileSnapshot, type Choice, type DataPort, type DataRecord, type DialogOptions, type EventOptions, type EventSnapshot, type HotbarEntryOptions, type GuiOptions, type ItemSnapshot, type LightingTransition, type MapPort, type NotificationOptions, type PlayerPort, type PlayerSnapshot, type ProjectileLaunchOptions, type ScriptWorld, type ShakeOptions, type ShapeOptions, type ShapeSnapshot, type SoundOptions, type VariableValue, type VisualEffectPlayOptions, type SkillUseOptions, tagList } from "../game/impl";

/** The player of a simulation: the state of the player in memory, and what the script asked for recorded as it happens. */
export class SimPlayer implements PlayerPort {
  private amount = 100;
  level = 3;
  name = "Hero";
  map = "start";
  x = 100;
  y = 100;
  direction = "down";
  maxHp = 100;
  maxSp = 50;
  private points = { hp: 100, sp: 50 };
  /** How the battles the script starts end, in order; `null` when the game has no battle system for it. */
  battles: (BattleOutcome | null)[] = [];
  private experience = 0;
  private movable = true;
  /** The timers the scripts started: their delay and whether they repeat. A test emits `timer.fire` to make one fire. */
  timers = new Map<string, { seconds: number; repeat: boolean }>();
  states = new Set<string>();
  skills = new Set<string>();
  /** The items that can be equipped, and the ones that are. */
  equipment = new Set<string>();
  equipped = new Set<string>();
  /** The items that can be used. Every item can when it is empty. */
  usable = new Set<string>();
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
  /** Sets hp and sp without recording an effect: the starting point of a simulation. */
  startPoints(hp: number, sp: number) { this.points = { hp, sp }; }

  get hp() { return this.points.hp; }
  set hp(value: number) {
    this.points.hp = Math.min(this.maxHp > 0 ? this.maxHp : Infinity, Math.max(0, value));
    this.record("hp", { value: this.points.hp });
  }
  get sp() { return this.points.sp; }
  set sp(value: number) {
    this.points.sp = Math.min(this.maxSp > 0 ? this.maxSp : Infinity, Math.max(0, value));
    this.record("sp", { value: this.points.sp });
  }
  get canMove() { return this.movable; }
  set canMove(value: boolean) {
    this.movable = value;
    this.record("canMove", { value });
  }
  cameraFollow(target: string, options: CameraOptions = {}) { this.record("cameraFollow", { target, ...options }); }
  startTimer(name: string, seconds: number, options: TimerOptions = {}) {
    if (!this.timers.has(name) && this.timers.size >= MAX_SCRIPT_TIMERS) throw new Error(`a player has ${MAX_SCRIPT_TIMERS} timers at most`);
    this.record("startTimer", { name, seconds, ...options });
    this.timers.set(name, { seconds, repeat: !!options.repeat });
  }
  stopTimer(name: string) {
    if (!this.timers.delete(name)) return false;
    this.record("stopTimer", { name });
    return true;
  }
  get exp() { return this.experience; }
  set exp(value: number) {
    this.experience = value;
    this.record("exp", { value });
  }
  /** Sets the experience without recording an effect: the starting point of a simulation. */
  startExp(value: number) { this.experience = value; }
  showEmotionBubble(emotion: string) { this.record("showEmotionBubble", { emotion }); }
  hasState(id: string) { return this.states.has(id); }
  getStates() { return [...this.states]; }
  addState(id: string) {
    if (this.states.has(id)) return false;
    this.record("addState", { id });
    this.states.add(id);
    return true;
  }
  removeState(id: string) {
    if (!this.states.delete(id)) return false;
    this.record("removeState", { id });
    return true;
  }
  hasSkill(id: string) { return this.skills.has(id); }
  getSkills() { return [...this.skills]; }
  learnSkill(id: string) {
    if (this.skills.has(id)) return false;
    this.record("learnSkill", { id });
    this.skills.add(id);
    return true;
  }
  forgetSkill(id: string) {
    if (!this.skills.delete(id)) return false;
    this.record("forgetSkill", { id });
    return true;
  }
  isEquipped(id: string) { return this.equipped.has(id); }
  equip(id: string, equipped: boolean) {
    if (!this.hasItem(id) || !this.equipment.has(id) || this.equipped.has(id) === equipped) return false;
    this.record("equip", { id, equipped });
    if (equipped) this.equipped.add(id); else this.equipped.delete(id);
    return true;
  }
  useItem(id: string) {
    if (!this.hasItem(id) || (this.usable.size > 0 && !this.usable.has(id))) return false;
    this.record("useItem", { id });
    const left = (this.items.get(id) ?? 0) - 1;
    if (left > 0) this.items.set(id, left); else this.items.delete(id);
    return true;
  }
  teleport(position: { x: number; y: number }) {
    this.record("teleport", position);
    this.x = position.x;
    this.y = position.y;
  }
  async startBattle(troopId: string, options: BattleOptions = {}): Promise<BattleOutcome | null> {
    this.record("startBattle", { troopId, ...options });
    return this.battles.length ? this.battles.shift()! : "victory";
  }

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
  openGui(id: string, data?: VariableValue, options: GuiOptions = {}) {
    this.record("openGui", { id, ...(data !== undefined ? { data } : {}), ...options });
  }
  updateGui(id: string, data: VariableValue) {
    this.record("updateGui", { id, data });
  }
  closeGui(id: string, data?: VariableValue) {
    this.record("closeGui", { id, ...(data !== undefined ? { data } : {}) });
  }
  changeMap(map: string, positions?: { x: number; y: number }) {
    this.record("changeMap", { map, ...(positions ? { positions } : {}) });
    this.map = map;
  }
  assignHotbarSlot(slot: number, entry: HotbarEntryOptions) {
    this.record("assignHotbarSlot", { slot, ...entry });
  }
  useSkill(skillId: string, options: SkillUseOptions = {}) {
    this.record("useSkill", { skillId, ...options });
    return true;
  }
}

/** The map of a simulation: events and variables in memory, with the rules of the real map (the events of the game stay, 50 events from scripts at most). */
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** The map of a simulation, as `$map` sees it. */
export class SimMap implements MapPort {
  events = new Map<string, EventSnapshot>();
  vars = new Map<string, unknown>();
  private made = new Set<string>();
  private counter = 0;
  constructor(readonly id: string, private player: SimPlayer, private record: (effect: string, params: unknown) => void) {}

  createDynamicEvent(options: EventOptions): string {
    if (this.made.size >= MAX_SCRIPT_EVENTS) throw new Error(`a script makes ${MAX_SCRIPT_EVENTS} events on a map at most`);
    const id = options.id ?? `script-event-${++this.counter}`;
    if (this.events.has(id)) throw new Error(`an event "${id}" is already on the map`);
    this.record("createDynamicEvent", options);
    this.events.set(id, { id, name: options.name ?? "", tags: [], x: options.x, y: options.y, direction: "down" });
    this.made.add(id);
    return id;
  }
  getEvent(id: string): EventSnapshot | undefined {
    const event = this.events.get(id);
    return event ? { ...event, tags: [...event.tags] } : undefined;
  }
  getEvents(): EventSnapshot[] { return [...this.events.values()].map((e) => ({ ...e, tags: [...e.tags] })); }
  removeEvent(id: string): boolean {
    if (!this.made.has(id)) return false;
    this.record("removeEvent", { id });
    this.events.delete(id);
    this.made.delete(id);
    return true;
  }
  getPlayers(): PlayerSnapshot[] { return [{ id: "player_1", name: this.player.name }]; }
  getVariable(key: string) { return this.vars.get(key); }
  setVariable(key: string, value: VariableValue) { this.record("setMapVariable", { key, value }); this.vars.set(key, value); }
  hasVariable(key: string) { return this.vars.has(key); }
  removeVariable(key: string) { this.record("removeMapVariable", { key }); return this.vars.delete(key); }

  weather: Record<string, any> | null = null;
  lighting: Record<string, any> | null = null;
  getWeather() { return this.weather ? clone(this.weather) : null; }
  setWeather(state: object | null) {
    if (state && !("effect" in state) && !("preset" in state)) throw new Error("setWeather: 'effect' or 'preset' is required when weather is not null.");
    this.record("setWeather", { state });
    this.weather = state ? clone(state) : null;
  }
  patchWeather(patch: Record<string, any>) {
    if (!this.weather && !patch.effect && !patch.preset) throw new Error("patchWeather: 'effect' or 'preset' is required when no weather is currently set.");
    this.record("patchWeather", { patch });
    this.weather = { ...(this.weather ?? {}), ...patch, params: { ...(this.weather?.params ?? {}), ...(patch.params ?? {}) } };
  }
  clearWeather() { this.record("clearWeather", {}); this.weather = null; }
  getLighting() { return this.lighting ? clone(this.lighting) : null; }
  setLighting(state: object | null) { this.record("setLighting", { state }); this.lighting = state ? clone(state) : null; }
  patchLighting(patch: object) { this.record("patchLighting", { patch }); this.lighting = { ...(this.lighting ?? {}), ...patch }; }
  clearLighting() { this.record("clearLighting", {}); this.lighting = null; }
  setDay() { this.record("setDay", {}); }
  setNight() { this.record("setNight", {}); }
  transitionLighting(to: object, options: LightingTransition = {}) { this.record("transitionLighting", { to, ...options }); this.lighting = { ...(this.lighting ?? {}), ...to }; }

  shapes = new Map<string, ShapeSnapshot>();
  private madeShapes = new Set<string>();
  /** The zones scripts attached to events: the event, and the options. */
  attached = new Map<string, { eventId: string } & AttachedShapeOptions>();
  /** The events that are hidden. */
  hidden = new Map<string, EventSnapshot>();
  /** What each event does for scripts: "follow", "flee", or nothing. */
  moving = new Map<string, "follow" | "flee">();
  /** Tiles of the map, by cell (`x,y`), and their size in pixels. */
  tiles = new Map<string, { collision: boolean; properties: Record<string, unknown> }>();
  tileSize = 32;
  /** What blocks the sight: rectangles of the map. */
  walls: { x: number; y: number; width: number; height: number }[] = [];

  private eventOf(id: string): EventSnapshot {
    const event = this.events.get(id);
    if (!event) throw new Error(`there is no event "${id}" on the map`);
    return event;
  }
  attachShape(eventId: string, options: AttachedShapeOptions): string {
    this.eventOf(eventId);
    if (this.madeShapes.size >= MAX_SCRIPT_SHAPES) throw new Error(`a script makes ${MAX_SCRIPT_SHAPES} zones on a map at most`);
    const name = options.name ?? `script-zone-${++this.counter}`;
    if (this.shapes.has(name) || this.madeShapes.has(name)) throw new Error(`a zone "${name}" is already on the map`);
    this.record("attachShape", { eventId, ...options });
    this.attached.set(name, { eventId, ...options, name });
    this.madeShapes.add(name);
    return name;
  }
  /** In a simulation an event arrives at once: where it was sent, or next to the player. */
  moveEvent(id: string, to: MoveTarget, options: MoveEventOptions = {}): boolean {
    const event = this.eventOf(id);
    this.record("moveEvent", { id, to, ...options });
    this.moving.delete(id);
    const goal = to === "player" ? { x: this.player.x, y: this.player.y + 32 } : to;
    Object.assign(event, goal);
    return true;
  }
  private keep(id: string, mode: "follow" | "flee", options: DistanceOptions) {
    this.eventOf(id);
    if (!this.moving.has(id) && this.moving.size >= MAX_SCRIPT_MOVERS) throw new Error(`scripts move ${MAX_SCRIPT_MOVERS} events of a map at most at once`);
    this.record(mode === "follow" ? "followPlayer" : "fleePlayer", { id, ...options });
    this.moving.set(id, mode);
  }
  followPlayer(id: string, options: DistanceOptions = {}) { this.keep(id, "follow", options); }
  fleePlayer(id: string, options: DistanceOptions = {}) { this.keep(id, "flee", options); }
  stopEvent(id: string) {
    this.eventOf(id);
    this.record("stopEvent", { id });
    this.moving.delete(id);
  }
  turnEvent(id: string, direction: DirectionName | "player") {
    const event = this.eventOf(id);
    this.record("turnEvent", { id, direction });
    if (direction !== "player") { event.direction = direction; return; }
    const dx = this.player.x - event.x, dy = this.player.y - event.y;
    event.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
  }
  teleportEvent(id: string, position: { x: number; y: number }) {
    const event = this.eventOf(id);
    this.record("teleportEvent", { id, ...position });
    this.moving.delete(id);
    Object.assign(event, position);
  }
  setEventVisible(id: string, visible: boolean) {
    if (visible) {
      const event = this.hidden.get(id);
      if (!event) { this.eventOf(id); return; }
      this.record("setEventVisible", { id, visible });
      this.hidden.delete(id);
      this.events.set(id, event);
      return;
    }
    const event = this.eventOf(id);
    this.record("setEventVisible", { id, visible });
    this.moving.delete(id);
    this.events.delete(id);
    this.hidden.set(id, event);
  }
  getTile(x: number, y: number): TileSnapshot | undefined {
    if (this.tiles.size === 0) return undefined;
    const cx = Math.floor(x / this.tileSize), cy = Math.floor(y / this.tileSize);
    const tile = this.tiles.get(`${cx},${cy}`) ?? { collision: false, properties: {} };
    return { x: cx, y: cy, collision: tile.collision, properties: clone(tile.properties), layers: [{ properties: clone(tile.properties) }] };
  }
  /** The enemies the game has; any enemy when it is empty. */
  enemies = new Set<string>();
  setEventGraphic(id: string, graphic: string) {
    this.eventOf(id);
    this.record("setEventGraphic", { id, graphic });
  }
  playEventAnimation(id: string, animationName: string, times: number) {
    this.eventOf(id);
    this.record("playEventAnimation", { id, animationName, times });
  }
  showEmotionBubble(id: string, emotion: string) {
    this.eventOf(id);
    this.record("showEmotionBubble", { id, emotion });
  }
  spawnEnemy(options: EnemySpawnOptions): string {
    if (this.enemies.size > 0 && !this.enemies.has(options.enemy)) throw new Error(`the game has no enemy "${options.enemy}": a module of the game makes its enemies with scriptEnemy.create(event, enemyId)`);
    if (this.made.size >= MAX_SCRIPT_EVENTS) throw new Error(`a script makes ${MAX_SCRIPT_EVENTS} events on a map at most`);
    const id = options.id ?? `script-enemy-${++this.counter}`;
    if (this.events.has(id)) throw new Error(`an event "${id}" is already on the map`);
    this.record("spawnEnemy", options);
    this.events.set(id, { id, name: options.name ?? options.enemy, tags: [], x: options.x, y: options.y, direction: "down" });
    this.made.add(id);
    return id;
  }
  /** Whether the segment between two points crosses no wall. */
  lineOfSight(from: { x: number; y: number }, to: { x: number; y: number }): boolean {
    return !this.walls.some((wall) => segmentHitsRect(from, to, wall));
  }
  createShape(options: ShapeOptions): string {
    if (this.madeShapes.size >= MAX_SCRIPT_SHAPES) throw new Error(`a script makes ${MAX_SCRIPT_SHAPES} zones on a map at most`);
    const name = options.name ?? `script-zone-${++this.counter}`;
    if (this.shapes.has(name)) throw new Error(`a zone "${name}" is already on the map`);
    this.record("createShape", options);
    this.shapes.set(name, { name, x: options.x, y: options.y, width: options.width, height: options.height });
    this.madeShapes.add(name);
    return name;
  }
  getShape(name: string): ShapeSnapshot | undefined {
    const shape = this.shapes.get(name);
    return shape ? { ...shape } : undefined;
  }
  getShapes(): ShapeSnapshot[] { return [...this.shapes.values()].map((s) => ({ ...s })); }
  removeShape(name: string): boolean {
    if (!this.madeShapes.has(name)) return false;
    this.record("removeShape", { name });
    this.shapes.delete(name);
    this.attached.delete(name);
    this.madeShapes.delete(name);
    return true;
  }

  playSound(id: string, options: SoundOptions = {}) { this.record("playSound", { id, ...options }); }
  stopSound(id: string) { this.record("stopSound", { id }); }
  showAnimation(position: { x: number; y: number }, graphic: string, animationName: string) { this.record("showAnimation", { position, graphic, animationName }); }
  showComponentAnimation(id: string, position: { x: number; y: number }, params: object) { this.record("showComponentAnimation", { id, position, params }); }
  shakeMap(options: ShakeOptions = {}) { this.record("shakeMap", options); }
  private projectileCount = 0;
  playVisualEffect(options: VisualEffectPlayOptions) {
    this.record("playVisualEffect", options);
  }

  launchProjectile(options: ProjectileLaunchOptions) {
    this.record("launchProjectile", options);
    return `projectile-${++this.projectileCount}`;
  }
}

/** Whether a segment crosses a rectangle (Liang-Barsky clipping). */
function segmentHitsRect(a: { x: number; y: number }, b: { x: number; y: number }, r: { x: number; y: number; width: number; height: number }): boolean {
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dy = b.y - a.y;
  const edges: [number, number][] = [[-dx, a.x - r.x], [dx, r.x + r.width - a.x], [-dy, a.y - r.y], [dy, r.y + r.height - a.y]];
  for (const [p, q] of edges) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}

/** Properties shared by the players of a map: in the game, map.setSync({ name: { $initial, $syncWithClient, $permanent } }). */
export class SharedStore {
  values: Record<string, unknown> = {};
  decl: Record<string, { client: boolean; persist: boolean }> = {};
  /** Declares the properties of the room: the ones of each player (`scope: "player"`) live on the player (`SimWorld.playerShared`). */
  declare(list: { name: string; initial: unknown; client: boolean; persist: boolean; scope?: string }[]) {
    for (const d of list) if (d.scope !== "player" && !(d.name in this.values)) { this.values[d.name] = d.initial; this.decl[d.name] = { client: d.client, persist: d.persist }; }
  }
}

/** The starting point of a simulation: the player (gold, level, name, items), their variables and switches, the data of `$state` and `$hook`, preset shared properties, forced dice and answers. */
export interface WorldInit {
  player?: {
    gold?: number; level?: number; name?: string; items?: Record<string, number>;
    x?: number; y?: number; direction?: string; hp?: number; sp?: number; maxHp?: number; maxSp?: number;
    /** Values of the properties of the player declared with `shared({ name: { scope: "player" } })`, read as `$player.shared.name`. */
    shared?: Record<string, unknown>;
  };
  /** What the player has of its character sheet: experience, states, skills, the items that can be equipped and the ones that are, the items that can be used (every item when not given). */
  sheet?: { exp?: number; states?: string[]; skills?: string[]; equipment?: string[]; equipped?: string[]; usable?: string[] };
  /**
   * What the engine gives the names of the API that mirror it, by target: the value of a property (`"player.speed": 4`), what a
   * method gives back (`"player.getParamValue": 120`). An event: `"event.speed#guard"`. A call or a change is recorded in the effects
   * under its target (`player.flash`).
   */
  engine?: Record<string, unknown>;
  /** The enemies the game has, for $map.spawnEnemy (any when not given). */
  enemies?: string[];
  /** How the battles the script starts end, in order ("victory" when not given); null when the game has no battle system. */
  battles?: (BattleOutcome | null)[];
  /** The tiles of the map, by cell (x and y in tiles), and their size (32 pixels by default). */
  tiles?: { x: number; y: number; collision?: boolean; properties?: Record<string, unknown> }[];
  tileSize?: number;
  /** What hides the sight of `inSight(..., { walls: true })`: rectangles of the map, in pixels. */
  walls?: { x: number; y: number; width: number; height: number }[];
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
  /** Zones of the game that are on the map: scripts can read them, and cannot remove them. */
  shapes?: { name: string; x?: number; y?: number; width?: number; height?: number }[];
  /** Events of the game that are on the map: scripts can read them, and cannot remove them. */
  events?: { id: string; name?: string; tags?: string[]; x?: number; y?: number; direction?: string }[];
  /** The records of the database of the game, by collection: a script reads them with `$data`. Each has an `id`. */
  data?: Record<string, { id: string; [field: string]: unknown }[]>;
  /** The event the script runs for. */
  event?: { id?: string; name?: string; x?: number; y?: number; direction?: string };
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
  /** The map, when the room is one. */
  map?: SimMap;
  event = { id: "event_1", name: "", x: 5, y: 3, direction: "down" };
  state: Record<string, unknown> = {};
  /** The database of the game: the records of each collection. */
  private readonly records: Record<string, { id: string; [field: string]: unknown }[]>;
  hook: Record<string, unknown> = {};
  shared: SharedStore;
  effects: { name: string; params: unknown }[] = [];
  private seed: number;
  private dice: number[] = [];

  constructor(init: WorldInit = {}) {
    this.player.start(init.player?.gold ?? 100);
    Object.assign(this.player, {
      level: init.player?.level ?? 3, name: init.player?.name ?? "Hero",
      x: init.player?.x ?? 100, y: init.player?.y ?? 100, direction: init.player?.direction ?? "down",
      maxHp: init.player?.maxHp ?? 100, maxSp: init.player?.maxSp ?? 50,
    });
    this.player.startPoints(init.player?.hp ?? this.player.maxHp, init.player?.sp ?? this.player.maxSp);
    this.player.battles = [...(init.battles ?? [])];
    for (const [key, value] of Object.entries(init.engine ?? {})) this.engineValues.set(key, clone(value));
    const sheet = init.sheet ?? {};
    this.player.startExp(sheet.exp ?? 0);
    this.player.states = new Set(sheet.states ?? []);
    this.player.skills = new Set(sheet.skills ?? []);
    this.player.equipment = new Set([...(sheet.equipment ?? []), ...(sheet.equipped ?? [])]);
    this.player.equipped = new Set(sheet.equipped ?? []);
    this.player.usable = new Set(sheet.usable ?? []);
    for (const [k, v] of Object.entries(init.player?.items ?? {})) this.player.items.set(k, v);
    this.playerSharedPresets = clone(init.player?.shared ?? {});
    for (const [k, v] of Object.entries(init.vars ?? {})) this.player.vars.set(k, v);
    Object.assign(this.state, JSON.parse(JSON.stringify(init.state ?? {})));
    Object.assign(this.hook, init.hook ?? {});
    this.shared = init.shared ?? new SharedStore();
    this.records = JSON.parse(JSON.stringify(init.data ?? {}));
    this.seed = init.seed ?? 1;
    this.dice = [...(init.dice ?? [])];
    this.player.answers = [...(init.choices ?? [])];
    this.player.chooser = init.choose;
    Object.assign(this.event, init.event ?? {});
    Object.assign(this.room, init.room ?? {});
    if (this.room.kind === "map") {
      this.map = new SimMap(this.room.id, this.player, (name, params) => this.effects.push({ name, params }));
      for (const s of init.shapes ?? []) this.map.shapes.set(s.name, { name: s.name, x: s.x ?? 0, y: s.y ?? 0, width: s.width ?? 1, height: s.height ?? 1 });
      for (const e of init.events ?? []) this.map.events.set(e.id, { id: e.id, name: e.name ?? "", tags: tagList(e.tags), x: e.x ?? 0, y: e.y ?? 0, direction: e.direction ?? "down" });
      for (const t of init.tiles ?? []) this.map.tiles.set(`${t.x},${t.y}`, { collision: !!t.collision, properties: clone(t.properties ?? {}) });
      if (init.tileSize) this.map.tileSize = init.tileSize;
      this.map.walls = clone(init.walls ?? []);
      this.map.enemies = new Set(init.enemies ?? []);
    }
  }

  /** The values of the engine for the names that mirror it (see `WorldInit.engine`). */
  engineValues = new Map<string, unknown>();

  /** The engine of a simulation: calls and changes are recorded under their target, values come from `WorldInit.engine`. */
  readonly engine: EnginePort = {
    call: (target, args) => {
      const [own, rest] = target.startsWith("event.") ? [`${target}#${String(args[0])}`, args.slice(1)] : [target, args];
      this.effects.push({ name: target, params: target.startsWith("event.") ? { id: args[0], args: rest } : { args } });
      const value = this.engineValues.has(own) ? this.engineValues.get(own) : this.engineValues.get(target);
      return value === undefined ? undefined : clone(value);
    },
    read: (target, args = []) => {
      const key = target.startsWith("event.") ? `${target}#${String(args[0])}` : target;
      const value = this.engineValues.has(key) ? this.engineValues.get(key) : this.engineValues.get(target);
      return value === undefined ? undefined : clone(value);
    },
    write: (target, value, args = []) => {
      const key = target.startsWith("event.") ? `${target}#${String(args[0])}` : target;
      this.effects.push({ name: target, params: target.startsWith("event.") ? { id: args[0], value } : { value } });
      this.engineValues.set(key, clone(value));
    },
  };

  /** The values of the properties of the player (`scope: "player"`), by name: only the declared ones exist. */
  playerShared: Record<string, unknown> = {};
  private playerSharedPresets: Record<string, unknown> = {};

  /** Declares the properties of the player of the simulation, starting from the values the world gives it. */
  declarePlayerShared(list: { name: string; initial: unknown; scope?: string }[]) {
    for (const d of list) {
      if (d.scope !== "player" || d.name in this.playerShared) continue;
      this.playerShared[d.name] = d.name in this.playerSharedPresets ? clone(this.playerSharedPresets[d.name]) : d.initial;
    }
  }

  /** The properties of the player, as the game API sees them: every change is recorded as a `sync` effect with `scope: "player"`. */
  readonly playerSharedProps: ScriptWorld["playerSharedProps"] = {
    has: (name) => name in this.playerShared,
    get: (name) => this.playerShared[name],
    set: (name, value, op, operand) => { this.playerShared[name] = value; this.effects.push({ name: "sync", params: { name, op, value: operand, scope: "player" } }); },
  };

  /** The properties shared by the players, as the game API sees them: every change is recorded as a `sync` effect. */
  readonly sharedProps: ScriptWorld["sharedProps"] = {
    has: (name) => name in this.shared.values,
    get: (name) => this.shared.values[name],
    set: (name, value, op, operand) => { this.shared.values[name] = value; this.effects.push({ name: "sync", params: { name, op, value: operand } }); },
  };

  readonly data: DataPort = {
    get: (type, id) => this.recordsOf(type).find((record) => record.id === id),
    list: (type) => this.recordsOf(type),
  };

  private recordsOf(type: string): DataRecord[] {
    return (this.records[type] ?? []).map((record) => ({ ...record, type }));
  }

  readonly stateProps: ScriptWorld["stateProps"] = {
    get: (key) => this.state[key],
    set: (key, value) => { this.effects.push({ name: "state", params: { key } }); this.state[key] = value; },
  };

  log(message: string) {
    this.effects.push({ name: "log", params: { message } });
  }

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
      player: {
        gold: this.player.gold, level: this.player.level, name: this.player.name, map: this.player.map, items: Object.fromEntries(this.player.items),
        x: this.player.x, y: this.player.y, hp: this.player.hp, sp: this.player.sp, exp: this.player.exp, canMove: this.player.canMove,
        timers: Object.fromEntries(this.player.timers),
        states: [...this.player.states], skills: [...this.player.skills], equipped: [...this.player.equipped],
        shared: this.playerShared,
      },
      /** The events of the map, by id: where they are, where they face, and whether they follow or flee the player. */
      events: Object.fromEntries([...(this.map?.events.values() ?? [])].map((e) => [e.id, { ...e, moving: this.map?.moving.get(e.id) ?? null }])),
      vars: Object.fromEntries(this.player.vars),
      mapVars: Object.fromEntries(this.map?.vars ?? []),
      state: this.state,
      shared: this.shared.values,
    };
  }
}
