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
/** A choice of `showChoices`: what the player reads, and the value the script gets back. */
export interface Choice { text: string; value: string | number | boolean }
/** The options of a dialogue: where it is, who speaks, and how it shows. */
export interface DialogOptions { position?: string; speaker?: string; fullWidth?: boolean; autoClose?: boolean; typewriterEffect?: boolean }
/** The options of a notification: its `type` and how long it stays, in ms. */
export interface NotificationOptions { type?: string; time?: number }

/** The options of a GUI a script opens: RPGJS has more (`waitingAction`), a script never waits for a GUI, it listens to `gui.action`. */
export interface GuiOptions { blockPlayerInput?: boolean }

/** What a script gets of an event of the map: a copy, whose changes change nothing. */
export interface EventSnapshot { id: string; name: string; x: number; y: number }
/** What a script gets of a player of the map. */
export interface PlayerSnapshot { id: string; name: string }
/** An event a script makes, described by plain data: the game builds the real event. */
export interface EventOptions { id?: string; x: number; y: number; name?: string; graphic?: string; hitbox?: { width: number; height: number }; through?: boolean }

/** What a script gets of a zone of the map: a copy. */
export interface ShapeSnapshot { name: string; x: number; y: number; width: number; height: number }
/** A zone a script makes, described by plain data. */
export interface ShapeOptions { name?: string; x: number; y: number; width: number; height: number; z?: number; color?: string; collision?: boolean; properties?: object }
/** The options of a sound: `volume` from 0 to 1, and whether it loops. */
export interface SoundOptions { volume?: number; loop?: boolean }
/** The options of a screen shake: `intensity` 0 to 100, `duration` in ms up to 10 000, `frequency` 1 to 60, and the `direction`. */
export interface ShakeOptions { intensity?: number; duration?: number; frequency?: number; direction?: "x" | "y" | "both" }
/** The options of a move of the lighting: `duration` in ms up to 600 000, and the `easing`. */
export interface LightingTransition { duration?: number; easing?: "linear" | "easeInOut" }

/** The most events scripts make on one map. */
export const MAX_SCRIPT_EVENTS = 50;
/** The most zones scripts make on one map. */
export const MAX_SCRIPT_SHAPES = 50;

/** A record of the database of the game as a script reads it: its fields, its `id` and its `type` (the collection it belongs to). A copy. */
export interface DataRecord { id: string; type: string; [field: string]: unknown }

/** The most records `$data.list` gives. */
export const MAX_DATA_RECORDS = 1000;

/** The database of the game, read only: the records of the collections (`item`, `skill`, and the ones a plugin adds). */
export interface DataPort {
  get(type: string, id: string): DataRecord | undefined;
  list(type: string): DataRecord[];
}

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
}

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
  /** Opens a GUI of the client with data, as `player.gui(id).open(data, options)` does. */
  openGui(id: string, data?: VariableValue, options?: GuiOptions): void | Promise<void>;
  /** Sends new data to an open GUI, as `player.gui(id).update(data)` does. */
  updateGui(id: string, data: VariableValue): void | Promise<void>;
  /** Closes a GUI, as `player.removeGui(id, data)` does. */
  closeGui(id: string, data?: VariableValue): void | Promise<void>;
}

/** What a script run needs from its environment. */
export interface ScriptWorld {
  player: PlayerPort;
  /** The room the script runs in: `kind` is "map" for a map, otherwise the kind of the gameplay room. */
  room: { id: string; kind: string };
  /** The map, when the room is one. */
  map?: MapPort;
  event: { id: string; name: string; x: number; y: number };
  /** Pauses the script. */
  wait(seconds: number): void | Promise<void>;
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
const EVENT_KEYS = ["id", "x", "y", "name", "graphic", "hitbox", "through"];
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

/**
 * What each name of `GAME_API_DESCRIPTION` does, over a `ScriptWorld`. Written once: the game and a simulation provide a world, and the
 * behavior (checks, limits, what is refused) is the same in both.
 */
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
        openGui: (w, [id, d, o]) => w.player.openGui(guiId(id), d === undefined ? undefined : guiData(d), guiOptions(o)),
        updateGui: (w, [id, d]) => w.player.updateGui(guiId(id), guiData(d)),
        closeGui: (w, [id, d]) => w.player.closeGui(guiId(id), d === undefined ? undefined : guiData(d)),
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
