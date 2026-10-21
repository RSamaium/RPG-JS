/**
 * The world of a script in an RPGJS game: the player, the event, the map. It implements the port `ScriptWorld` with the API of
 * RPGJS, so a script changes the game the way the code of a game would, and the same script gives the same result in a
 * simulation.
 */
import type { RpgEvent, RpgMap, RpgPlayer, RpgPlayerRoom } from "@rpgjs/server";
import type { Choice, PlayerPort, ScriptWorld, VariableValue } from "../game/impl";
import type { SharedDecl } from "../core/interpreter";

/** A value that RPGJS keeps in a signal is read by calling it. */
const read = <T>(value: unknown): T => (typeof value === "function" ? (value as () => T)() : (value as T));
const number = (value: unknown): number => (typeof value === "number" ? value : 0);

/** Prefix of the properties of a map that belong to scripts, so that a script cannot reach another property of the map. */
export const SHARED_PREFIX = "script_";

/** The longest a script can make a player wait. */
const MAX_WAIT_SECONDS = 60;

const isMap = (place: unknown): place is RpgMap => !!place && typeof (place as { setSync?: unknown }).setSync === "function";

/** What a room is, as a script sees it: `kind` is "map" for a map, otherwise the kind a gameplay room was registered with. */
export function describeRoom(room: RpgPlayerRoom | RpgMap | null | undefined): { id: string; kind: string } {
  if (!room) return { id: "", kind: "" };
  if (isMap(room)) return { id: String((room as { id?: unknown }).id ?? ""), kind: "map" };
  const descriptor = (room as { descriptor?: { id?: string; kind?: string } }).descriptor;
  return { id: String(descriptor?.id ?? (room as { id?: unknown }).id ?? ""), kind: descriptor?.kind ?? "lobby" };
}

/**
 * The properties shared by the players of a room, as a script sees them. In a map they are declared once, with
 * `map.setSync({ name: { $initial, $syncWithClient, $permanent } })`, and live there. In a gameplay room that is not a map they live
 * in the `state` of the room, under the same prefix, which RPGJS synchronizes with the clients. Either way every player of the room
 * reads and changes the same value. A room with neither (a lobby) has nowhere to keep them: using them says so.
 */
export function sharedPropsOf(place: RpgMap | RpgPlayerRoom | null | undefined, declared: readonly SharedDecl[]): ScriptWorld["sharedProps"] {
  const names = new Set(declared.map((d) => d.name));
  const has = (name: string) => names.has(name);

  if (isMap(place)) {
    const map = place as unknown as Record<string, any>;
    for (const d of declared) {
      const key = SHARED_PREFIX + d.name;
      if (map[key] === undefined) map.setSync({ [key]: { $initial: d.initial, $syncWithClient: d.client, $permanent: d.persist } });
    }
    return { has, get: (name) => map[SHARED_PREFIX + name](), set: (name, value) => map[SHARED_PREFIX + name].set(value) };
  }

  const state = (place as { state?: { (): unknown; update?: (fn: (s: any) => any) => void } } | null | undefined)?.state;
  if (typeof state === "function" && typeof state.update === "function") {
    const read = () => (state() ?? {}) as Record<string, unknown>;
    for (const d of declared) {
      const key = SHARED_PREFIX + d.name;
      if (!(key in read())) state.update!((s) => ({ ...(s ?? {}), [key]: d.initial }));
    }
    return {
      has,
      get: (name) => read()[SHARED_PREFIX + name],
      set: (name, value) => state.update!((s) => ({ ...(s ?? {}), [SHARED_PREFIX + name]: value })),
    };
  }

  const nowhere = () => { throw new Error("shared properties need a map or a gameplay room with a state: this room has neither"); };
  return { has, get: nowhere, set: nowhere };
}

/** What the world of a script is built from: the player it acts for, the event and the map, the shared properties it declared, and the payload that fired it. */
export interface RpgjsWorldOptions {
  player: RpgPlayer;
  /** The event the script runs for, if any (`$event`). */
  event?: RpgEvent | null;
  /** The map, when the script runs in one. Default: the map of the player. */
  map?: RpgMap | null;
  /** The room, when it is not the map of the player. Default: the room of the player. */
  room?: RpgPlayerRoom | null;
  /** The shared properties the script declared. */
  shared?: readonly SharedDecl[];
  /** The payload of the signal that fired the script (`$hook`). */
  hook?: Record<string, unknown>;
  /** Where the persistent data of the script's plugin lives. In memory, for the duration of the world, when not given. */
  state?: ScriptWorld["stateProps"];
  /** A whole number between `min` and `max`, both included. */
  rand?: (min: number, max: number) => number;
}

/**
 * The world of a script on a real RPGJS player, event and map: every change goes through the API of RPGJS, so a script changes
 * the game the way the code of a game would. The server owns it: use it where the gameplay state lives.
 *
 * @param options - See `RpgjsWorldOptions`.
 * @returns The world to give to `hostFromApi(GAME_API_DESCRIPTION, GAME_API_IMPL, world)`.
 * @example
 * ```ts
 * const world = createRpgjsWorld({ player, shared: program.shared })
 * await program.call("f", [], hostFromApi(GAME_API_DESCRIPTION, GAME_API_IMPL, world), { steps: 20000, iterations: 100 })
 * ```
 */
export function createRpgjsWorld(options: RpgjsWorldOptions): ScriptWorld {
  const { player, event } = options;
  const p = player as any;
  const map = options.map ?? (player.getCurrentMap() as RpgMap | null) ?? null;
  const room = options.room ?? map ?? player.getCurrentRoom();
  const where = describeRoom(room);
  const data = new Map<string, unknown>();

  const playerPort: PlayerPort = {
    get gold() { return number(p.gold); },
    set gold(value: number) { p.gold = value; },
    get level() { return number(read(p.level)); },
    get name() { return String(read(p.name)); },
    getItem(id) {
      const item = p.getItem(id);
      if (!item) return undefined;
      return { id: String(read(item.id) ?? id), name: String(read(item.name) ?? ""), quantity: number(read(item.quantity)) };
    },
    hasItem: (id) => !!p.getItem(id),
    addItem(id, nb) {
      p.addItem(id, nb);
    },
    removeItem(id, nb) {
      // RPGJS refuses to remove what the player does not have: a script just loses nothing
      if (p.getItem(id)) p.removeItem(id, nb);
    },
    getVariable: (key) => p.getVariable(key),
    setVariable: (key, value: VariableValue) => p.setVariable(key, value),
    hasVariable: (key) => !!p.hasVariable(key),
    removeVariable: (key) => !!p.removeVariable(key),
    async showText(text, opts = {}) {
      await p.showText(text, opts);
    },
    async showChoices(text, choices: Choice[]) {
      const picked = await p.showChoices(text, choices);
      return picked ? { text: String(picked.text), value: picked.value } : null;
    },
    async showNotification(message, opts = {}) {
      await p.showNotification(message, opts);
    },
    async changeMap(mapId, positions) {
      await p.changeMap(mapId, positions);
    },
  };

  return {
    player: playerPort,
    room: where,
    event: {
      get id() { return event?.id ?? ""; },
      get name() { return String(read((event as any)?.name) ?? ""); },
      get x() { return number(read((event as any)?.x)); },
      get y() { return number(read((event as any)?.y)); },
    },
    wait: (seconds) => new Promise<void>((resolve) => setTimeout(resolve, Math.min(Math.max(seconds, 0), MAX_WAIT_SECONDS) * 1000)),
    rand: options.rand ?? ((min, max) => min + Math.floor(Math.random() * (max - min + 1))),
    sharedProps: sharedPropsOf(room, options.shared ?? []),
    stateProps: options.state ?? { get: (key) => data.get(key), set: (key, value) => void data.set(key, value) },
    hook: options.hook ?? {},
  };
}
