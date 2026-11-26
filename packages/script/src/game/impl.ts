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
import type { ApiDescription, ApiImpl, HandleImpl } from "../core/api";
import { checkArguments, checkValue, parseType } from "../core/types";
import { GAME_API_DESCRIPTION } from "./description";

/** What a script gets of an item of the inventory: a copy, whose changes change nothing. */
export interface ItemSnapshot { id: string; name: string; quantity: number }
/** A plain value a variable of the player can hold. */
export type VariableValue = string | number | boolean | null | VariableValue[] | { [key: string]: VariableValue };
/** A choice of `showChoices`: what the player reads, and the value the script gets back. */
export interface Choice { text: string; value: string | number | boolean }
/** The options of a dialogue: where it is, who speaks, and how it shows. */
export interface DialogOptions { position?: string; speaker?: string; fullWidth?: boolean; autoClose?: boolean; typewriterEffect?: boolean }
/** The options of a notification: its `type` and how long it stays, in ms. */
export interface NotificationOptions { type?: string; time?: number }

/** The options of a GUI a script opens: RPGJS has more (`waitingAction`), a script never waits for a GUI, it listens to `gui.action`. */
export interface GuiOptions { blockPlayerInput?: boolean }

/** A direction of the game: where a player or an event faces. */
export type DirectionName = "up" | "down" | "left" | "right";
/** The directions of the game, in the order of `DirectionName`. */
export const DIRECTIONS: readonly DirectionName[] = ["up", "down", "left", "right"];

/** What a script gets of an event of the map: a copy, whose changes change nothing. */
export interface EventSnapshot {
  id: string;
  name: string;
  /** What kind of event it is (`sheriff`, `chest`): scripts find the events of a kind by their tags, never by their name. */
  tags: string[];
  x: number;
  y: number;
  direction: string;
}

/** The tags of a thing of the game: a new list of strings, each once. */
export const tagList = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter((tag): tag is string => typeof tag === "string" && tag.length > 0))] : [];
/** What a script gets of a player of the map. */
export interface PlayerSnapshot { id: string; name: string }
/** An event a script makes, described by plain data: the game builds the real event. */
export interface EventOptions {
  id?: string; x: number; y: number; name?: string; graphic?: string; hitbox?: { width: number; height: number }; through?: boolean;
  /** The event exists for the player of the script only (a scenario event of RPGJS): the others neither see nor touch it. */
  forPlayer?: boolean;
}

/** What a script gets of a zone of the map: a copy. */
export interface ShapeSnapshot { name: string; x: number; y: number; width: number; height: number }
/** A zone a script makes, described by plain data. */
export interface ShapeOptions { name?: string; x: number; y: number; width: number; height: number; z?: number; color?: string; collision?: boolean; properties?: object }
/**
 * A zone attached to an event: it moves with the event, and turns with it when `follow` is "direction". A circle of `radius`, or
 * the circle around `width` x `height`; with `angle` below 360 it is a cone that faces `direction`. With `limitedByWalls`, the
 * walls hide what is behind them.
 */
export interface AttachedShapeOptions {
  name?: string;
  radius?: number;
  width?: number;
  height?: number;
  angle?: number;
  direction?: DirectionName;
  limitedByWalls?: boolean;
  positioning?: "center" | "top" | "bottom" | "left" | "right";
  follow?: "position" | "direction";
  properties?: object;
}
/** Where an event walks: a point of the map (the top-left of the event when it arrives), or the player of the script. */
export type MoveTarget = { x: number; y: number } | "player";
/** How an event walks: its `speed` (set on the event), and whether the script waits for it to arrive. */
export interface MoveEventOptions { speed?: number; wait?: boolean }
/** How far an event stays from the player it follows, or how far it runs from the player it flees, in pixels. */
export interface DistanceOptions { distance?: number }
/** A tile of the map as a script reads it: its cell, whether it blocks, and the properties of its tiles (the top layer wins). */
export interface TileSnapshot { x: number; y: number; collision: boolean; properties: Record<string, unknown>; layers: { properties: Record<string, unknown> }[] }
/** How a sight is tested: how far it reaches, how wide it is (degrees, around the direction of `from`), and whether walls hide. */
export interface SightOptions { range?: number; angle?: number; walls?: boolean }
/** An enemy a script makes appear: an event the game turns into an enemy of the kind `enemy` (an id of its enemies). */
export interface EnemySpawnOptions { enemy: string; x: number; y: number; id?: string; name?: string; forPlayer?: boolean }

/** How a battle ended, as the battle systems of the game tell it. */
export type BattleOutcome = "victory" | "defeat" | "escape";
/** Which battle system plays a troop: a turn-based one, a tactical one, or (without `kind`) the one the game uses. */
export interface BattleOptions { kind?: "turn" | "tactical" }

/** The options of a sound: `volume` from 0 to 1, and whether it loops. */
export interface SoundOptions { volume?: number; loop?: boolean }
/** The options of a screen shake: `intensity` 0 to 100, `duration` in ms up to 10 000, `frequency` 1 to 60, and the `direction`. */
export interface ShakeOptions { intensity?: number; duration?: number; frequency?: number; direction?: "x" | "y" | "both" }
/** The options of a move of the lighting: `duration` in ms up to 600 000, and the `easing`. */
export interface LightingTransition { duration?: number; easing?: "linear" | "easeInOut" }

/** The most events scripts make on one map. */
export const MAX_SCRIPT_EVENTS = 50;
/** The most zones scripts make on one map, attached to events or not. */
export const MAX_SCRIPT_SHAPES = 50;
/** The most events that follow or flee a player for scripts on one map at once. */
export const MAX_SCRIPT_MOVERS = 50;
/** The most timers a player has for scripts at once. */
export const MAX_SCRIPT_TIMERS = 20;
/** The shortest and the longest delay of a timer, in seconds. */
export const MIN_TIMER_SECONDS = 0.1;
export const MAX_TIMER_SECONDS = 3600;
/** The options of a timer: whether it fires again every `seconds` until it is stopped. */
export interface TimerOptions { repeat?: boolean }
/** The options of the camera: whether it glides to its target, and in how many milliseconds. */
export interface CameraOptions { smoothMove?: boolean; time?: number }

/** The longest a script waits for an event to arrive, in seconds: then the event stops where it is. */
export const MAX_MOVE_SECONDS = 60;

/** A record of the database of the game as a script reads it: its fields, its `id` and its `type` (the collection it belongs to). A copy. */
export interface DataRecord { id: string; type: string; [field: string]: unknown }

/** The most records `$data.list` gives. */
export const MAX_DATA_RECORDS = 1000;

/** The database of the game, read only: the records of the collections (`item`, `skill`, and the ones a plugin adds). */
export interface DataPort {
  get(type: string, id: string): DataRecord | undefined;
  list(type: string): DataRecord[];
}

/** What a script gives to launch a projectile from the map. */
export interface ProjectileLaunchOptions {
  /** The type of the projectile: the clients draw it with the look (`projectiles.looks`) or the component registered for this type. */
  projectile: string;
  from: { x: number; y: number };
  /** The point the projectile flies toward. */
  toward: { x: number; y: number };
  /**
   * HP removed from each player or event it hits, as is: no defense, no faction, no hit reaction. For a hit that follows the
   * rules of the battle system, use a skill instead (`$player.useSkill`).
   */
  damage?: number;
  speed?: number;
  range?: number;
  /**
   * Lob the projectile over what stands in its way: it lands on `toward`, or short of it when `toward` is
   * beyond `range`. `true`, or the height of the lob in pixels.
   */
  arc?: boolean | { height?: number };
  /** With `arc`: the players and events within this distance of the landing point are hit, in pixels. */
  landingRadius?: number;
  /** Wind-up before the projectile leaves, in ms. */
  delay?: number;
  /**
   * `"player"`: the player of the script launches it. It flies through them, and `projectile.end` and
   * `event.projectileHit` fire for them. Without it, the projectile has no owner and can hit any player.
   */
  owner?: "player";
}

/** A one-shot visual effect played at a point of the map. */
export interface VisualEffectPlayOptions {
  /** Name of a built-in particle preset, or of the effect described by `preset`. */
  effect: string;
  at: { x: number; y: number };
  /** The resolved particle preset, as plain data (the payload of a Studio Visual Effect). */
  preset?: Record<string, unknown>;
  /** How long it stays drawn, in ms. */
  duration?: number;
  scale?: number;
}

/** What a skill is used on. */
export interface SkillUseOptions {
  /** Id of an event or a player of the map. Without it, the battle system picks a target (or the skill has none). */
  target?: string;
}

/** A slot of the hotbar: a skill, an item, or the entry of a plugin. */
export interface HotbarEntryOptions { type: string; id: string }

/** The map of the script, with the names of `RpgMap`. Not there when the room is not a map. */
export interface MapPort {
  readonly id: string;
  /** Makes an event. Refuses an id that is taken and more than `MAX_SCRIPT_EVENTS` events made by scripts. Gives the id. */
  createDynamicEvent(options: EventOptions): string | Promise<string>;
  getEvent(id: string): EventSnapshot | undefined;
  getEvents(): EventSnapshot[];
  /** Removes an event a script made; the events of the game stay and it gives false. */
  removeEvent(id: string): boolean | Promise<boolean>;
  getPlayers(): PlayerSnapshot[];
  getVariable(key: string): unknown;
  setVariable(key: string, value: VariableValue): void | Promise<void>;
  hasVariable(key: string): boolean;
  removeVariable(key: string): boolean | Promise<boolean>;
  getWeather(): object | null;
  /** Needs an `effect` or a `preset`, or null to clear. */
  setWeather(state: object | null): void | Promise<void>;
  patchWeather(patch: object): void | Promise<void>;
  clearWeather(): void | Promise<void>;
  getLighting(): object | null;
  setLighting(state: object | null): void | Promise<void>;
  patchLighting(patch: object): void | Promise<void>;
  clearLighting(): void | Promise<void>;
  setDay(): void | Promise<void>;
  setNight(): void | Promise<void>;
  transitionLighting(to: object, options?: LightingTransition): void | Promise<void>;
  /** Makes a zone. Refuses a name that is taken and more than `MAX_SCRIPT_SHAPES` zones made by scripts. Gives the name. */
  createShape(options: ShapeOptions): string | Promise<string>;
  getShape(name: string): ShapeSnapshot | undefined;
  getShapes(): ShapeSnapshot[];
  /** Removes a zone a script made; the zones of the game stay and it gives false. */
  removeShape(name: string): boolean | Promise<boolean>;
  playSound(id: string, options?: SoundOptions): void | Promise<void>;
  stopSound(id: string): void | Promise<void>;
  showAnimation(position: { x: number; y: number }, graphic: string, animationName: string): void | Promise<void>;
  showComponentAnimation(id: string, position: { x: number; y: number }, params: object): void | Promise<void>;
  shakeMap(options?: ShakeOptions): void | Promise<void>;
  /** Launches a projectile from a point toward another one. Gives the id of the projectile. */
  launchProjectile(options: ProjectileLaunchOptions): string | Promise<string>;
  /** Plays a one-shot visual effect, as `map.playVisualEffect(position, effect, options)` does. */
  playVisualEffect(options: VisualEffectPlayOptions): void | Promise<void>;
  /** Attaches a zone to an event, as `event.attachShape(name, options)` does. Counts in `MAX_SCRIPT_SHAPES`. Gives its name. */
  attachShape(eventId: string, options: AttachedShapeOptions): string | Promise<string>;
  /**
   * Walks an event to a point or to the player, as `event.moveTo(target)` does, and stops it there. Emits `event.arrived` when it
   * arrives. With `wait`, gives whether it arrived (false when it was stopped, or after `MAX_MOVE_SECONDS`); otherwise true.
   */
  moveEvent(id: string, to: MoveTarget, options: MoveEventOptions): boolean | Promise<boolean>;
  /** Keeps an event at `distance` of the player of the script until `stopEvent`, another move, or the player leaves the map. */
  followPlayer(id: string, options: DistanceOptions): void | Promise<void>;
  /** Keeps an event `distance` away from the player of the script, the same way. */
  fleePlayer(id: string, options: DistanceOptions): void | Promise<void>;
  /** Stops what scripts made an event do (a move, a follow, a flight). The routes of the event itself go on. */
  stopEvent(id: string): void | Promise<void>;
  /** Turns an event to a direction, or toward the player of the script. */
  turnEvent(id: string, direction: DirectionName | "player"): void | Promise<void>;
  /** Puts an event at a position of the map at once. */
  teleportEvent(id: string, position: { x: number; y: number }): void | Promise<void>;
  /** Hides an event (no sprite, collision, touch or action) and shows it again with its state, as `event.suspend()` / `resume()` do. */
  setEventVisible(id: string, visible: boolean): void | Promise<void>;
  /** The tile at a position in pixels, or undefined when the map has no tiles (a map that is not a Tiled map). */
  getTile(x: number, y: number): TileSnapshot | undefined;
  /** Whether nothing that blocks (a wall, a static hitbox) stands between two points. */
  lineOfSight(from: { x: number; y: number }, to: { x: number; y: number }): boolean;
  /** Changes the graphic of an event, as `event.setGraphic(graphic)` does. */
  setEventGraphic(id: string, graphic: string): void | Promise<void>;
  /** Plays an animation of the graphic of an event `times` times, as `event.setAnimation(name, times)` does. */
  playEventAnimation(id: string, animationName: string, times: number): void | Promise<void>;
  /** Shows an emotion bubble above an event, as `event.showEmotionBubble(emotion)` does. */
  showEmotionBubble(id: string, emotion: string): void | Promise<void>;
  /**
   * Makes an event and asks the game to turn it into an enemy (the `scriptEnemy.create(event, enemyId)` hooks of its modules).
   * Counts in `MAX_SCRIPT_EVENTS`. Refuses an enemy the game does not have (the event is then removed). Gives the id of the event.
   */
  spawnEnemy(options: EnemySpawnOptions): string | Promise<string>;
}

/** The player of the script, with the names of `RpgPlayer`. Every change is the engine's to apply. */
export interface PlayerPort {
  /** Never goes below 0. */
  gold: number;
  readonly level: number;
  readonly name: string;
  /** Position on the map, in pixels (the top-left of the hitbox, as `changeMap` and `teleport` take it). */
  readonly x: number;
  readonly y: number;
  /** Where the player faces: "up", "down", "left" or "right". */
  readonly direction: string;
  /** Health points; the engine keeps them between 0 and `maxHp` (0 makes the player dead). */
  hp: number;
  /** Skill points, between 0 and `maxSp`. */
  sp: number;
  /** The maximums of hp and sp; 0 when the game gives the player none. */
  readonly maxHp: number;
  readonly maxSp: number;
  /** Moves the player to a position of the same map at once. */
  teleport(position: { x: number; y: number }): void | Promise<void>;
  /**
   * Plays a troop with the battle systems of the game (the `studioBattle` hooks of its modules: `start`, `startTurnBased`,
   * `startTactical`) and waits for the end. Gives how it ended, or null when no system played it or none told.
   */
  startBattle(troopId: string, options: BattleOptions): Promise<BattleOutcome | null>;
  /** Experience points; RPGJS levels the player up as they grow. */
  exp: number;
  /** Whether the player moves with its inputs: false during a cutscene, as `player.canMove` is. */
  canMove: boolean;
  /** Points the camera of the player at an event, or back at the player, as `player.cameraFollow(target, options)` does. */
  cameraFollow(target: string, options: CameraOptions): void | Promise<void>;
  /** Starts (or restarts) a timer of the player: `timer.fire` is emitted for the player after `seconds`, and again with `repeat`. */
  startTimer(name: string, seconds: number, options: TimerOptions): void | Promise<void>;
  /** Stops a timer of the player. False when there is none of that name. */
  stopTimer(name: string): boolean | Promise<boolean>;
  /** Shows an emotion bubble above the player, as `player.showEmotionBubble(emotion)` does. */
  showEmotionBubble(emotion: string): void | Promise<void>;
  /** Gives a state of the database (poison, sleep…), as `player.addState(id)` does. False when the player already has it. */
  addState(id: string): boolean | Promise<boolean>;
  /** Takes a state away. False when the player does not have it. */
  removeState(id: string): boolean | Promise<boolean>;
  hasState(id: string): boolean;
  /** The ids of the states of the player. */
  getStates(): string[];
  /** Teaches a skill of the database. False when the player already knows it. */
  learnSkill(id: string): boolean | Promise<boolean>;
  /** Makes the player forget a skill. False when the player does not know it. */
  forgetSkill(id: string): boolean | Promise<boolean>;
  hasSkill(id: string): boolean;
  /** The ids of the skills the player knows. */
  getSkills(): string[];
  /** Equips (or takes off) a weapon or an armor of the inventory, as `player.equip(id, equipped)` does. False when it cannot. */
  equip(id: string, equipped: boolean): boolean | Promise<boolean>;
  isEquipped(id: string): boolean;
  /** Uses an item of the inventory, as `player.useItem(id)` does (its effects, then it is consumed). False when it cannot. */
  useItem(id: string): boolean | Promise<boolean>;
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
  /** Opens a GUI of the client with data, as `player.gui(id).open(data, options)` does. */
  openGui(id: string, data?: VariableValue, options?: GuiOptions): void | Promise<void>;
  /** Sends new data to an open GUI, as `player.gui(id).update(data)` does. */
  updateGui(id: string, data: VariableValue): void | Promise<void>;
  /** Closes a GUI, as `player.removeGui(id, data)` does. */
  closeGui(id: string, data?: VariableValue): void | Promise<void>;
  /** Puts a skill, an item or a plugin entry in a slot of the hotbar, as `player.assignHotbarSlot(slot, entry)` does. */
  assignHotbarSlot(slot: number, entry: HotbarEntryOptions): void | Promise<void>;
  /**
   * Uses a skill the player knows, as `player.useSkill(id, target)` does: with Action Battle on the map, a skill with an action
   * follows its rules (projectile, damage formula, factions, SP, cooldown). `target` is the id of an event or a player of the map.
   * Gives false when the skill cannot be used now.
   */
  useSkill(skillId: string, options?: SkillUseOptions): boolean | Promise<boolean>;
}

/**
 * What the environment does for the names of the API that mirror the engine (`engine` in the description): `target` is the name of
 * the engine (`player.flash`, `map.getTick`, `event.flash`), the arguments are already checked against the signature. For an
 * `event.` target the first argument is the id of the event.
 */
export interface EnginePort {
  /** Calls the method; gives what it returns as plain data. */
  call(target: string, args: unknown[]): unknown | Promise<unknown>;
  /** Reads the property, as plain data. */
  read(target: string, args?: unknown[]): unknown;
  /** Writes the property. */
  write(target: string, value: unknown, args?: unknown[]): void | Promise<void>;
}

/** What a script run needs from its environment. */
export interface ScriptWorld {
  /** The names of the API that mirror the engine. */
  engine: EnginePort;
  player: PlayerPort;
  /** The room the script runs in: `kind` is "map" for a map, otherwise the kind of the gameplay room. */
  room: { id: string; kind: string };
  /** The map, when the room is one. */
  map?: MapPort;
  event: { id: string; name: string; x: number; y: number; direction: string };
  /** Pauses the script. */
  wait(seconds: number): void | Promise<void>;
  /** Writes a line of the script where its author reads it (the console of the server, the logs of the service). */
  log(message: string): void;
  rand(min: number, max: number): number;
  /** Properties shared by the players of a map. `set` receives the new value, the operator and its operand. */
  sharedProps: { has(name: string): boolean; get(name: string): unknown; set(name: string, value: unknown, op: string, operand: unknown): void };
  /** The database of the game. */
  data: DataPort;
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
/** A GUI of a plugin is named `<pluginId>_<name>`: the GUIs of the game (`rpg-main-menu`, `rpg-title-screen`…) have a hyphen and are not the scripts'. */
const GUI_ID = /^[a-z][a-z0-9_]{0,99}$/;
const guiId = (v: unknown) => {
  if (typeof v !== "string" || !GUI_ID.test(v)) throw new Error("a GUI is named by a text of a-z, 0-9 and _ (the GUIs of the game, such as rpg-main-menu, are not for scripts)");
  return v;
};
const guiData = (v: unknown): VariableValue => {
  const value = plain(v);
  if (JSON.stringify(value).length > MAX_VARIABLE_JSON) throw new Error(`the data of a GUI holds ${MAX_VARIABLE_JSON} characters at most`);
  return value;
};
const guiOptions = (o: unknown): GuiOptions => {
  const x = opts(o), out: GuiOptions = {};
  for (const name of Object.keys(x)) if (name !== "blockPlayerInput") throw new Error(`a GUI takes the option blockPlayerInput only, not ${name}`);
  if (x.blockPlayerInput !== undefined) out.blockPlayerInput = !!x.blockPlayerInput;
  return out;
};
const collection = (v: unknown) => {
  if (typeof v !== "string" || !v || v.length > 100) throw new Error("a collection is named by a text of 1 to 100 characters");
  return v;
};
/** A record is given as a copy of plain data: a script never holds what the game holds. */
const copyOf = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const EVENT_KEYS = ["id", "x", "y", "name", "graphic", "hitbox", "through", "forPlayer"];
const EVENT_ID = /^[A-Za-z0-9_.-]{1,100}$/;
const COORDINATE = 100_000;
/** What a script describes of an event, checked: plain data, and nothing the game does not know. */
function eventOptions(o: unknown): EventOptions {
  const x = opts(o);
  for (const k of Object.keys(x)) if (!EVENT_KEYS.includes(k)) throw new Error(`an event is described by plain data: ${EVENT_KEYS.join(", ")} (not "${k}")`);
  const inRange = (v: unknown) => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= COORDINATE;
  if (!inRange(x.x) || !inRange(x.y)) throw new Error(`x and y are numbers between -${COORDINATE} and ${COORDINATE}`);
  const out: EventOptions = { x: x.x, y: x.y };
  if (x.id !== undefined) { if (typeof x.id !== "string" || !EVENT_ID.test(x.id)) throw new Error("an event id is 1 to 100 letters, digits, _ . or -"); out.id = x.id; }
  if (x.name !== undefined) out.name = text(x.name, "name");
  if (x.graphic !== undefined) { if (typeof x.graphic !== "string" || x.graphic.length > 200) throw new Error("graphic is the id of a graphic, a text of 200 characters at most"); out.graphic = x.graphic; }
  if (x.hitbox !== undefined) {
    const h = opts(x.hitbox);
    const size = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 2000;
    if (!size(h.width) || !size(h.height)) throw new Error("hitbox is { width, height }, two numbers from 1 to 2000");
    out.hitbox = { width: h.width, height: h.height };
  }
  if (x.through !== undefined) out.through = Boolean(x.through);
  if (x.forPlayer !== undefined) out.forPlayer = Boolean(x.forPlayer);
  return out;
}
const MAX_STATE_DATA = 4000;
/** Plain data for the weather or the lighting: an object of at most `MAX_STATE_DATA` characters. `null` clears, where `nullable` says so. */
function stateData(value: unknown, what: string, nullable = false): object | null {
  if (value === null && nullable) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${what} is plain data { ... }${nullable ? ", or null" : ""}`);
  const data = plain(value) as object;
  if (JSON.stringify(data).length > MAX_STATE_DATA) throw new Error(`${what} holds ${MAX_STATE_DATA} characters at most`);
  return data;
}
const SHAPE_KEYS = ["name", "x", "y", "width", "height", "z", "color", "collision", "properties"];
function shapeOptions(o: unknown): ShapeOptions {
  const x = opts(o);
  for (const k of Object.keys(x)) if (!SHAPE_KEYS.includes(k)) throw new Error(`a zone is described by plain data: ${SHAPE_KEYS.join(", ")} (not "${k}")`);
  const coordinate = (v: unknown) => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= COORDINATE;
  if (!coordinate(x.x) || !coordinate(x.y)) throw new Error(`x and y are numbers between -${COORDINATE} and ${COORDINATE}`);
  const size = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= COORDINATE;
  if (!size(x.width) || !size(x.height)) throw new Error(`width and height are numbers from 1 to ${COORDINATE}`);
  const out: ShapeOptions = { x: x.x, y: x.y, width: x.width, height: x.height };
  if (x.name !== undefined) { if (typeof x.name !== "string" || !EVENT_ID.test(x.name)) throw new Error("a zone name is 1 to 100 letters, digits, _ . or -"); out.name = x.name; }
  if (x.z !== undefined) { if (typeof x.z !== "number" || !Number.isFinite(x.z)) throw new Error("z is a number"); out.z = x.z; }
  if (x.color !== undefined) { if (typeof x.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(x.color)) throw new Error('color is "#rrggbb"'); out.color = x.color; }
  if (x.collision !== undefined) out.collision = Boolean(x.collision);
  if (x.properties !== undefined) { const p = stateData(x.properties, "properties") as object; if (JSON.stringify(p).length > 1000) throw new Error("properties hold 1000 characters at most"); out.properties = p; }
  return out;
}
const range = (v: unknown, min: number, max: number, what: string): number => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) throw new Error(`${what} is a number from ${min} to ${max}`);
  return v;
};
const position = (p: unknown): { x: number; y: number } => {
  const { x, y } = opts(p);
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) throw new Error("position is { x, y }, two numbers");
  return { x, y };
};
const SHAKE_KEYS = ["intensity", "duration", "frequency", "direction"];
function shakeOptions(o: unknown): ShakeOptions {
  const x = opts(o), out: ShakeOptions = {};
  for (const k of Object.keys(x)) if (!SHAKE_KEYS.includes(k)) throw new Error(`a shake is described by ${SHAKE_KEYS.join(", ")} (not "${k}")`);
  if (x.intensity !== undefined) out.intensity = range(x.intensity, 0, 100, "intensity");
  if (x.duration !== undefined) out.duration = range(x.duration, 0, 10_000, "duration");
  if (x.frequency !== undefined) out.frequency = range(x.frequency, 1, 60, "frequency");
  if (x.direction !== undefined) { if (!["x", "y", "both"].includes(x.direction)) throw new Error('direction is "x", "y" or "both"'); out.direction = x.direction; }
  return out;
}
function soundOptions(o: unknown): SoundOptions {
  const x = opts(o), out: SoundOptions = {};
  if (x.volume !== undefined) out.volume = range(x.volume, 0, 1, "volume");
  if (x.loop !== undefined) out.loop = Boolean(x.loop);
  return out;
}
function lightingTransition(o: unknown): LightingTransition {
  const x = opts(o), out: LightingTransition = {};
  if (x.duration !== undefined) out.duration = range(x.duration, 0, 600_000, "duration");
  if (x.easing !== undefined) { if (!["linear", "easeInOut"].includes(x.easing)) throw new Error('easing is "linear" or "easeInOut"'); out.easing = x.easing; }
  return out;
}
const mapOf = (w: ScriptWorld): MapPort => {
  if (!w.map) throw new Error("this script does not run in a map but in a room that is not a map: $room.kind says where it runs");
  return w.map;
};
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

const MAX_PROJECTILE_RANGE = 5000;
const MAX_PROJECTILE_SPEED = 2000;
const MAX_PROJECTILE_ARC_HEIGHT = 500;
const MAX_PROJECTILE_LANDING_RADIUS = 500;
const MAX_PROJECTILE_DELAY = 10000;
const finite = (v: unknown, what: string) => {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`${what} must be a finite number`);
  return v;
};
const launchOptions = (v: unknown): ProjectileLaunchOptions => {
  const o = opts(v);
  const from = position(o.from), toward = position(o.toward);
  if (from.x === toward.x && from.y === toward.y) throw new Error("toward must be another point than from");
  const out: ProjectileLaunchOptions = { projectile: text(o.projectile, "a projectile id"), from, toward };
  if (o.damage !== undefined) out.damage = Math.max(0, finite(o.damage, "damage"));
  if (o.speed !== undefined) out.speed = Math.min(MAX_PROJECTILE_SPEED, Math.max(1, finite(o.speed, "speed")));
  if (o.range !== undefined) out.range = Math.min(MAX_PROJECTILE_RANGE, Math.max(1, finite(o.range, "range")));
  if (o.arc !== undefined && o.arc !== false) {
    if (o.arc === true) out.arc = true;
    else {
      const arc = opts(o.arc);
      out.arc = arc.height === undefined ? {} : { height: Math.min(MAX_PROJECTILE_ARC_HEIGHT, Math.max(0, finite(arc.height, "arc.height"))) };
    }
  }
  if (o.landingRadius !== undefined) {
    if (!out.arc) throw new Error("landingRadius needs arc: only a lob lands");
    out.landingRadius = Math.min(MAX_PROJECTILE_LANDING_RADIUS, Math.max(0, finite(o.landingRadius, "landingRadius")));
  }
  if (o.delay !== undefined) out.delay = Math.min(MAX_PROJECTILE_DELAY, Math.max(0, finite(o.delay, "delay")));
  if (o.owner !== undefined) {
    if (o.owner !== "player") throw new Error('owner is "player" (the player of the script), or not given');
    out.owner = "player";
  }
  return out;
};
const MAX_VISUAL_EFFECT_DURATION = 10000;
const MAX_VISUAL_EFFECT_SCALE = 10;
const visualEffectOptions = (v: unknown): VisualEffectPlayOptions => {
  const o = opts(v);
  const out: VisualEffectPlayOptions = { effect: text(o.effect, "an effect name"), at: position(o.at) };
  if (o.preset !== undefined) {
    const preset = stateData(o.preset, "the preset") as Record<string, unknown>;
    // The clients draw it with the Fx preset of CanvasEngine, which needs its emitters.
    if (!Array.isArray(preset.emitters)) throw new Error("a preset is a particle preset { emitters: [...] }");
    out.preset = preset;
  }
  if (o.duration !== undefined) out.duration = Math.min(MAX_VISUAL_EFFECT_DURATION, Math.max(0, finite(o.duration, "duration")));
  if (o.scale !== undefined) out.scale = Math.min(MAX_VISUAL_EFFECT_SCALE, Math.max(0.1, finite(o.scale, "scale")));
  return out;
};
const skillUseOptions = (v: unknown): SkillUseOptions => {
  if (v === undefined) return {};
  const o = opts(v);
  return o.target === undefined ? {} : { target: text(o.target, "the id of the target") };
};
const hotbarEntry = (v: unknown): HotbarEntryOptions => {
  const o = opts(v);
  return { type: text(o.type, "the type of a hotbar entry"), id: text(o.id, "the id of a hotbar entry") };
};
const hotbarSlot = (v: unknown): number => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 9) throw new Error("a hotbar slot is a whole number from 0 to 9");
  return n;
};

const directionName = (v: unknown, what = "direction"): DirectionName => {
  if (!DIRECTIONS.includes(v as DirectionName)) throw new Error(`${what} is ${DIRECTIONS.map((d) => `"${d}"`).join(", ")}`);
  return v as DirectionName;
};
const POSITIONINGS = ["center", "top", "bottom", "left", "right"];
const ATTACHED_SHAPE_KEYS = ["name", "radius", "width", "height", "angle", "direction", "limitedByWalls", "positioning", "follow", "properties"];
const MAX_ZONE_SIZE = 4000;
function attachedShapeOptions(o: unknown): AttachedShapeOptions {
  const x = opts(o);
  for (const k of Object.keys(x)) if (!ATTACHED_SHAPE_KEYS.includes(k)) throw new Error(`a zone of an event is described by ${ATTACHED_SHAPE_KEYS.join(", ")} (not "${k}")`);
  const out: AttachedShapeOptions = {};
  if (x.radius !== undefined) out.radius = range(x.radius, 1, MAX_ZONE_SIZE / 2, "radius");
  if (x.width !== undefined) out.width = range(x.width, 1, MAX_ZONE_SIZE, "width");
  if (x.height !== undefined) out.height = range(x.height, 1, MAX_ZONE_SIZE, "height");
  if (out.radius === undefined && (out.width === undefined || out.height === undefined)) throw new Error("a zone of an event needs a radius, or a width and a height");
  if (x.name !== undefined) { if (typeof x.name !== "string" || !EVENT_ID.test(x.name)) throw new Error("a zone name is 1 to 100 letters, digits, _ . or -"); out.name = x.name; }
  if (x.angle !== undefined) out.angle = range(x.angle, 1, 360, "angle");
  if (x.direction !== undefined) out.direction = directionName(x.direction);
  if (x.limitedByWalls !== undefined) out.limitedByWalls = Boolean(x.limitedByWalls);
  if (x.positioning !== undefined) { if (!POSITIONINGS.includes(x.positioning)) throw new Error(`positioning is ${POSITIONINGS.join(", ")}`); out.positioning = x.positioning; }
  if (x.follow !== undefined) { if (!["position", "direction"].includes(x.follow)) throw new Error('follow is "position" or "direction"'); out.follow = x.follow; }
  if (x.properties !== undefined) { const p = stateData(x.properties, "properties") as object; if (JSON.stringify(p).length > 1000) throw new Error("properties hold 1000 characters at most"); out.properties = p; }
  return out;
}
const moveTarget = (v: unknown): MoveTarget => {
  if (v === "player") return "player";
  if (!v || typeof v !== "object") throw new Error('an event walks to a position { x, y } or to "player"');
  return position(v);
};
function moveEventOptions(o: unknown): MoveEventOptions {
  const x = opts(o), out: MoveEventOptions = {};
  for (const k of Object.keys(x)) if (!["speed", "wait"].includes(k)) throw new Error(`a move takes speed and wait (not "${k}")`);
  if (x.speed !== undefined) out.speed = range(x.speed, 0.1, 20, "speed");
  if (x.wait !== undefined) out.wait = Boolean(x.wait);
  return out;
}
const MAX_KEEP_DISTANCE = 2000;
function distanceOptions(o: unknown, fallback: number): Required<DistanceOptions> {
  const x = opts(o);
  for (const k of Object.keys(x)) if (k !== "distance") throw new Error(`it takes the option distance only (not "${k}")`);
  return { distance: x.distance === undefined ? fallback : range(x.distance, 0, MAX_KEEP_DISTANCE, "distance") };
}
/** How far an event that follows the player stays from it, and how far one that flees runs, by default, in pixels. */
const FOLLOW_DISTANCE = 48, FLEE_DISTANCE = 160;
/** How far a sight reaches, by default, and how wide it is when `from` faces a direction, in pixels and degrees. */
const SIGHT_RANGE = 200, SIGHT_ANGLE = 90, MAX_SIGHT_RANGE = 5000;
const FACING: Record<DirectionName, { x: number; y: number }> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

/** The distance between two points, in pixels. */
const distanceOf = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(b.x - a.x, b.y - a.y);

/**
 * Whether `to` is in sight of `from`: within `range`, within `angle` degrees of where `from` faces (a full circle when `from`
 * gives no direction), and, with `walls`, with nothing that blocks between them.
 */
function inSight(w: ScriptWorld, from: unknown, to: unknown, o: unknown): boolean {
  const a = position(from), b = position(to), x = opts(o), facing = opts(from).direction;
  for (const k of Object.keys(x)) if (!["range", "angle", "walls"].includes(k)) throw new Error(`a sight takes range, angle and walls (not "${k}")`);
  const reach = x.range === undefined ? SIGHT_RANGE : range(x.range, 0, MAX_SIGHT_RANGE, "range");
  const direction = facing === undefined ? undefined : directionName(facing, "the direction of from");
  const width = x.angle === undefined ? (direction ? SIGHT_ANGLE : 360) : range(x.angle, 1, 360, "angle");
  const d = distanceOf(a, b);
  if (d > reach) return false;
  if (direction && width < 360 && d > 0) {
    const f = FACING[direction];
    const cos = ((b.x - a.x) * f.x + (b.y - a.y) * f.y) / d;
    if ((Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI > width / 2) return false;
  }
  return x.walls ? mapOf(w).lineOfSight(a, b) : true;
}
const OUTCOMES: readonly BattleOutcome[] = ["victory", "defeat", "escape"];
/** An emotion of a bubble: a built-in one ("like", "surprise", "idea"…) or one the game adds. */
const emotion = (v: unknown) => {
  if (typeof v !== "string" || !/^[a-z0-9_-]{1,50}$/i.test(v)) throw new Error('an emotion is a name of 1 to 50 letters, digits, _ or - ("like", "surprise", "idea"…)');
  return v;
};
const MAX_ANIMATION_TIMES = 100;
const SPAWN_KEYS = ["enemy", "x", "y", "id", "name", "forPlayer"];
function spawnOptions(o: unknown): EnemySpawnOptions {
  const x = opts(o);
  for (const k of Object.keys(x)) if (!SPAWN_KEYS.includes(k)) throw new Error(`an enemy is described by ${SPAWN_KEYS.join(", ")} (not "${k}")`);
  const { x: px, y: py } = eventOptions({ x: x.x, y: x.y });
  const out: EnemySpawnOptions = { enemy: text(x.enemy, "the id of an enemy"), x: px, y: py };
  if (x.id !== undefined) { if (typeof x.id !== "string" || !EVENT_ID.test(x.id)) throw new Error("an event id is 1 to 100 letters, digits, _ . or -"); out.id = x.id; }
  if (x.name !== undefined) out.name = text(x.name, "name");
  if (x.forPlayer !== undefined) out.forPlayer = Boolean(x.forPlayer);
  return out;
}
const TIMER_NAME = /^[A-Za-z0-9_.-]{1,50}$/;
const timerName = (v: unknown) => {
  if (typeof v !== "string" || !TIMER_NAME.test(v)) throw new Error("a timer is named by 1 to 50 letters, digits, _ . or -");
  return v;
};
function timerOptions(o: unknown): TimerOptions {
  const x = opts(o);
  for (const k of Object.keys(x)) if (k !== "repeat") throw new Error(`a timer takes the option repeat only (not "${k}")`);
  return x.repeat === undefined ? {} : { repeat: Boolean(x.repeat) };
}
function cameraOptions(o: unknown): CameraOptions {
  const x = opts(o), out: CameraOptions = {};
  for (const k of Object.keys(x)) if (!["smoothMove", "time"].includes(k)) throw new Error(`the camera takes smoothMove and time (not "${k}")`);
  if (x.smoothMove !== undefined) out.smoothMove = Boolean(x.smoothMove);
  if (x.time !== undefined) out.time = range(x.time, 0, 10_000, "time");
  return out;
}
/** What `log` writes of a value: a text as it is, anything else as JSON; 500 characters at most. */
const MAX_LOG = 500;
const logText = (values: unknown[]) => {
  const line = values.map((v) => {
    if (typeof v === "string") return v;
    try { return JSON.stringify(v) ?? String(v); } catch { return String(v); }
  }).join(" ");
  return line.length > MAX_LOG ? `${line.slice(0, MAX_LOG)}…` : line;
};
function battleOptions(o: unknown): BattleOptions {
  const x = opts(o);
  for (const k of Object.keys(x)) if (k !== "kind") throw new Error(`a battle takes the option kind only (not "${k}")`);
  if (x.kind === undefined) return {};
  if (!["turn", "tactical"].includes(x.kind)) throw new Error('kind is "turn" or "tactical"');
  return { kind: x.kind };
}
/** hp and sp take =, +=, -=, *= and stay between 0 and their maximum. */
const pointsWrite = (what: "hp" | "sp", max: "maxHp" | "maxSp") => (w: ScriptWorld, op: string, v: unknown) => {
  const apply = GOLD_OPS[op];
  if (!apply) throw new Error(`${what} accepts only ${Object.keys(GOLD_OPS).join(" ")}`);
  const next = apply(w.player[what], Number(v));
  if (!Number.isFinite(next)) throw new Error(`${what} must stay a finite number`);
  // a maximum of 0: the game gives the player none, and RPGJS caps nothing
  const cap = w.player[max] > 0 ? w.player[max] : Infinity;
  w.player[what] = Math.round(Math.min(cap, Math.max(0, next)));
};

const NUMBER_OPS: Record<string, (current: number, value: number) => number> = { "+=": (c, v) => c + v, "-=": (c, v) => c - v, "*=": (c, v) => c * v };

/** What a mirrored property does: read it from the engine, write it after checking the value against its type. */
function mirroredMember(target: string, type: string, writable: boolean, prefix: unknown[] = []): NonNullable<HandleImpl<ScriptWorld>["members"]>[string] {
  const node = parseType(type);
  return {
    read: (w) => w.engine.read(target, prefix),
    ...(writable ? {
      write: (w: ScriptWorld, op: string, v: unknown) => {
        let value = v;
        if (op !== "=") {
          const apply = NUMBER_OPS[op];
          const current = w.engine.read(target, prefix);
          if (!apply || typeof current !== "number") throw new Error(`${target.split(".")[1]} accepts only =`);
          value = apply(current, Number(v));
        }
        checkValue(value, node, target.split(".")[1]);
        return w.engine.write(target, value, prefix);
      },
    } : {}),
  };
}
/** What a mirrored method does: check the arguments against its signature, then call the engine. */
const mirroredMethod = (label: string, target: string, sig: string) => (w: ScriptWorld, args: unknown[]) => {
  checkArguments(label, sig, args);
  return w.engine.call(target, args);
};

/**
 * Adds to an implementation the names of the description that mirror the engine (`engine`): each is checked against its signature
 * or its type and done by the `engine` of the world. A name the implementation already has keeps its own.
 */
export function withMirrors(desc: ApiDescription, impl: ApiImpl<ScriptWorld>): ApiImpl<ScriptWorld> {
  const handles = { ...impl.handles };
  for (const [name, handle] of Object.entries(desc.handles)) {
    const own = handles[name] ?? {};
    const members = { ...(own.members ?? {}) }, methods = { ...(own.methods ?? {}) };
    for (const [key, member] of Object.entries(handle.members ?? {})) {
      if (member.engine && !members[key]) members[key] = mirroredMember(member.engine, member.type, !!member.writable);
    }
    for (const [key, method] of Object.entries(handle.methods ?? {})) {
      if (method.engine && !methods[key]) methods[key] = mirroredMethod(`${name}.${key}`, method.engine, method.sig);
    }
    handles[name] = { ...own, ...(Object.keys(members).length ? { members } : {}), ...(Object.keys(methods).length ? { methods } : {}) };
  }
  return { ...impl, handles };
}

/** The names of `$player` that mirror a method or a property of a character: an event has them too (`$map.eventCall`). */
function characterMirror(kind: "methods" | "members", name: string) {
  const handle = GAME_API_DESCRIPTION.handles.$player;
  const entry = kind === "methods" ? handle.methods?.[name] : handle.members?.[name];
  if (!entry?.engine?.startsWith("player.")) {
    const available = Object.entries((kind === "methods" ? handle.methods : handle.members) ?? {}).filter(([, d]) => d.engine?.startsWith("player.")).map(([k]) => k);
    throw new Error(`"${name}" is not a ${kind === "methods" ? "method" : "property"} of a character. Available: ${available.join(", ")}`);
  }
  return { target: `event.${entry.engine.slice("player.".length)}`, entry };
}

/**
 * What each name of `GAME_API_DESCRIPTION` does, over a `ScriptWorld`. Written once: the game and a simulation provide a world, and the
 * behavior (checks, limits, what is refused) is the same in both.
 */
const BASE_API_IMPL: ApiImpl<ScriptWorld> = {
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
        x: { read: (w) => w.player.x },
        y: { read: (w) => w.player.y },
        direction: { read: (w) => w.player.direction },
        hp: { read: (w) => w.player.hp, write: pointsWrite("hp", "maxHp") },
        sp: { read: (w) => w.player.sp, write: pointsWrite("sp", "maxSp") },
        maxHp: { read: (w) => w.player.maxHp },
        maxSp: { read: (w) => w.player.maxSp },
        canMove: {
          read: (w) => w.player.canMove,
          write: (w, op, v) => {
            if (op !== "=") throw new Error("canMove accepts only =");
            if (typeof v !== "boolean") throw new Error("canMove is true or false");
            w.player.canMove = v;
          },
        },
        exp: {
          read: (w) => w.player.exp,
          write: (w, op, v) => {
            if (op !== "=" && op !== "+=") throw new Error("exp accepts only = and +=: the experience of a player grows");
            const next = op === "=" ? Number(v) : w.player.exp + Number(v);
            if (!Number.isFinite(next)) throw new Error("exp must stay a finite number");
            w.player.exp = Math.max(0, Math.floor(next));
          },
        },
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
        openGui: (w, [id, d, o]) => w.player.openGui(guiId(id), d === undefined ? undefined : guiData(d), guiOptions(o)),
        updateGui: (w, [id, d]) => w.player.updateGui(guiId(id), guiData(d)),
        closeGui: (w, [id, d]) => w.player.closeGui(guiId(id), d === undefined ? undefined : guiData(d)),
        assignHotbarSlot: (w, [slot, entry]) => w.player.assignHotbarSlot(hotbarSlot(slot), hotbarEntry(entry)),
        useSkill: (w, [id, o]) => w.player.useSkill(text(id, "a skill id"), skillUseOptions(o)),
        teleport: (w, [p]) => w.player.teleport(position(p)),
        showEmotionBubble: (w, [e]) => w.player.showEmotionBubble(emotion(e)),
        cameraFollow: (w, [target, o]) => w.player.cameraFollow(target === "player" ? "player" : text(target, 'an event id (or "player")'), cameraOptions(o)),
        startTimer: (w, [name, seconds, o]) => w.player.startTimer(timerName(name), range(seconds, MIN_TIMER_SECONDS, MAX_TIMER_SECONDS, "seconds"), timerOptions(o)),
        stopTimer: (w, [name]) => w.player.stopTimer(timerName(name)),
        addState: (w, [id]) => w.player.addState(text(id, "a state id")),
        removeState: (w, [id]) => w.player.removeState(text(id, "a state id")),
        hasState: (w, [id]) => w.player.hasState(text(id, "a state id")),
        getStates: (w) => [...w.player.getStates()],
        learnSkill: (w, [id]) => w.player.learnSkill(text(id, "a skill id")),
        forgetSkill: (w, [id]) => w.player.forgetSkill(text(id, "a skill id")),
        hasSkill: (w, [id]) => w.player.hasSkill(text(id, "a skill id")),
        getSkills: (w) => [...w.player.getSkills()],
        equip: (w, [id, on]) => {
          if (on !== undefined && typeof on !== "boolean") throw new Error("equipped is true or false");
          return w.player.equip(text(id, "an item id"), on ?? true);
        },
        isEquipped: (w, [id]) => w.player.isEquipped(text(id, "an item id")),
        useItem: (w, [id]) => w.player.useItem(text(id, "an item id")),
        startBattle: async (w, [id, o]) => {
          const outcome = await w.player.startBattle(text(id, "a troop id"), battleOptions(o));
          return outcome && OUTCOMES.includes(outcome) ? outcome : null;
        },
        changeMap: (w, [m, p]) => {
          const map = text(m, "a map id");
          if (p === undefined) return w.player.changeMap(map);
          const { x, y } = opts(p);
          if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("positions is { x, y }, two numbers");
          return w.player.changeMap(map, { x, y });
        },
      },
    },
    $map: {
      members: { id: { read: (w) => mapOf(w).id } },
      methods: {
        createDynamicEvent: (w, [o]) => mapOf(w).createDynamicEvent(eventOptions(o)),
        getEvent: (w, [id]) => mapOf(w).getEvent(text(id, "an event id")),
        getEvents: (w) => mapOf(w).getEvents(),
        removeEvent: (w, [id]) => mapOf(w).removeEvent(text(id, "an event id")),
        getPlayers: (w) => mapOf(w).getPlayers(),
        getVariable: (w, [k]) => mapOf(w).getVariable(key(k)),
        setVariable: (w, [k, v]) => {
          const value = plain(v);
          if (JSON.stringify(value).length > MAX_VARIABLE_JSON) throw new Error(`a variable holds ${MAX_VARIABLE_JSON} characters at most`);
          return mapOf(w).setVariable(key(k), value);
        },
        hasVariable: (w, [k]) => mapOf(w).hasVariable(key(k)),
        removeVariable: (w, [k]) => mapOf(w).removeVariable(key(k)),
        getWeather: (w) => mapOf(w).getWeather(),
        setWeather: (w, [s]) => mapOf(w).setWeather(stateData(s, "the weather", true)),
        patchWeather: (w, [p]) => mapOf(w).patchWeather(stateData(p, "the weather patch") as object),
        clearWeather: (w) => mapOf(w).clearWeather(),
        getLighting: (w) => mapOf(w).getLighting(),
        setLighting: (w, [s]) => mapOf(w).setLighting(stateData(s, "the lighting", true)),
        patchLighting: (w, [p]) => mapOf(w).patchLighting(stateData(p, "the lighting patch") as object),
        clearLighting: (w) => mapOf(w).clearLighting(),
        setDay: (w) => mapOf(w).setDay(),
        setNight: (w) => mapOf(w).setNight(),
        transitionLighting: (w, [to, o]) => mapOf(w).transitionLighting(stateData(to, "the lighting") as object, lightingTransition(o)),
        createShape: (w, [o]) => mapOf(w).createShape(shapeOptions(o)),
        getShape: (w, [name]) => mapOf(w).getShape(text(name, "a zone name")),
        getShapes: (w) => mapOf(w).getShapes(),
        removeShape: (w, [name]) => mapOf(w).removeShape(text(name, "a zone name")),
        playSound: (w, [id, o]) => mapOf(w).playSound(text(id, "a sound id"), soundOptions(o)),
        stopSound: (w, [id]) => mapOf(w).stopSound(text(id, "a sound id")),
        showAnimation: (w, [p, graphic, name]) => mapOf(w).showAnimation(position(p), text(graphic, "a graphic id"), name === undefined ? "default" : text(name, "an animation name")),
        showComponentAnimation: (w, [id, p, params]) => mapOf(w).showComponentAnimation(text(id, "an animation id"), position(p), params === undefined ? {} : (stateData(params, "params") as object)),
        shakeMap: (w, [o]) => mapOf(w).shakeMap(shakeOptions(o)),
        launchProjectile: (w, [o]) => mapOf(w).launchProjectile(launchOptions(o)),
        playVisualEffect: (w, [o]) => mapOf(w).playVisualEffect(visualEffectOptions(o)),
        attachShape: (w, [id, o]) => mapOf(w).attachShape(text(id, "an event id"), attachedShapeOptions(o)),
        moveEvent: (w, [id, to, o]) => mapOf(w).moveEvent(text(id, "an event id"), moveTarget(to), moveEventOptions(o)),
        followPlayer: (w, [id, o]) => mapOf(w).followPlayer(text(id, "an event id"), distanceOptions(o, FOLLOW_DISTANCE)),
        fleePlayer: (w, [id, o]) => mapOf(w).fleePlayer(text(id, "an event id"), distanceOptions(o, FLEE_DISTANCE)),
        stopEvent: (w, [id]) => mapOf(w).stopEvent(text(id, "an event id")),
        turnEvent: (w, [id, d]) => mapOf(w).turnEvent(text(id, "an event id"), d === "player" ? "player" : directionName(d, 'direction (or "player")')),
        teleportEvent: (w, [id, p]) => mapOf(w).teleportEvent(text(id, "an event id"), position(p)),
        setEventVisible: (w, [id, v]) => {
          if (typeof v !== "boolean") throw new Error("visible is true or false");
          return mapOf(w).setEventVisible(text(id, "an event id"), v);
        },
        setEventGraphic: (w, [id, graphic]) => {
          if (typeof graphic !== "string" || !graphic || graphic.length > 200) throw new Error("graphic is the id of a graphic, a text of 200 characters at most");
          return mapOf(w).setEventGraphic(text(id, "an event id"), graphic);
        },
        playEventAnimation: (w, [id, name, times]) =>
          mapOf(w).playEventAnimation(text(id, "an event id"), text(name, "an animation name"), times === undefined ? 1 : Math.floor(range(times, 1, MAX_ANIMATION_TIMES, "times"))),
        showEmotionBubble: (w, [id, e]) => mapOf(w).showEmotionBubble(text(id, "an event id"), emotion(e)),
        spawnEnemy: (w, [o]) => mapOf(w).spawnEnemy(spawnOptions(o)),
        eventCall: (w, [id, method, ...args]) => {
          const eventId = text(id, "an event id");
          const { target, entry } = characterMirror("methods", text(method, "a method name"));
          checkArguments(`${String(method)}`, (entry as { sig: string }).sig, args);
          return w.engine.call(target, [eventId, ...args]);
        },
        eventGet: (w, [id, member]) => {
          const eventId = text(id, "an event id");
          const { target } = characterMirror("members", text(member, "a property name"));
          return w.engine.read(target, [eventId]);
        },
        eventSet: (w, [id, member, value]) => {
          const eventId = text(id, "an event id");
          const { target, entry } = characterMirror("members", text(member, "a property name"));
          if (!(entry as { writable?: boolean }).writable) throw new Error(`"${String(member)}" of an event cannot be assigned`);
          checkValue(value, parseType((entry as { type: string }).type), String(member));
          return w.engine.write(target, value, [eventId]);
        },
        getTile: (w, [x, y]) => {
          const tile = mapOf(w).getTile(finite(x, "x"), finite(y, "y"));
          return tile ? copyOf(tile) : undefined;
        },
      },
    },
    $data: {
      methods: {
        get: (w, [type, id]) => {
          const record = w.data.get(collection(type), text(id, "a record id"));
          return record ? copyOf(record) : undefined;
        },
        list: (w, [type]) => w.data.list(collection(type)).slice(0, MAX_DATA_RECORDS).map(copyOf),
      },
    },
    $room: { members: { kind: { read: (w) => w.room.kind }, id: { read: (w) => w.room.id } } },
    $event: { members: { id: { read: (w) => w.event.id }, name: { read: (w) => w.event.name }, x: { read: (w) => w.event.x }, y: { read: (w) => w.event.y }, direction: { read: (w) => w.event.direction } } },
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
    distance: (_w, [a, b]) => distanceOf(position(a), position(b)),
    log: (w, values) => w.log(logText(values)),
    inSight: (w, [from, to, o]) => inSight(w, from, to, o),
    Item: (_w, [id]) => String(id),
    Graphic: (_w, [id]) => String(id),
  },
};

/**
 * What each name of `GAME_API_DESCRIPTION` does, over a `ScriptWorld`: written once for the names that need it, and generated from the
 * signature for the names that mirror the engine. The game and a simulation provide a world, and the behavior (checks, limits, what is
 * refused) is the same in both.
 */
export const GAME_API_IMPL: ApiImpl<ScriptWorld> = withMirrors(GAME_API_DESCRIPTION, BASE_API_IMPL);
