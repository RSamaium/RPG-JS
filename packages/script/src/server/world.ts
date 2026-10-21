/**
 * The world of a script in an RPGJS game: the player, the event, the map. It implements the port `ScriptWorld` with the API of
 * RPGJS, so a script changes the game the way the code of a game would, and the same script gives the same result in a
 * simulation.
 */
import type { RpgEvent, RpgMap, RpgPlayer } from "@rpgjs/server";
import type { Choice, PlayerPort, ScriptWorld, VariableValue } from "../game/impl";
import type { SharedDecl } from "../core/interpreter";

/** A value that RPGJS keeps in a signal is read by calling it. */
const read = <T>(value: unknown): T => (typeof value === "function" ? (value as () => T)() : (value as T));
const number = (value: unknown): number => (typeof value === "number" ? value : 0);

/** Prefix of the properties of a map that belong to scripts, so that a script cannot reach another property of the map. */
export const SHARED_PREFIX = "script_";

/** The longest a script can make a player wait. */
const MAX_WAIT_SECONDS = 60;

/**
 * The properties shared by the players of a map, as a script sees them. They are declared on the map once, with
 * `map.setSync({ name: { $initial, $syncWithClient, $permanent } })`, and live there: every player of the map reads and changes
 * the same value.
 */
export function sharedPropsOf(map: RpgMap, declared: readonly SharedDecl[]): ScriptWorld["sharedProps"] {
  const room = map as unknown as Record<string, any>;
  const names = new Set(declared.map((d) => d.name));
  for (const d of declared) {
    const key = SHARED_PREFIX + d.name;
    if (room[key] === undefined) room.setSync({ [key]: { $initial: d.initial, $syncWithClient: d.client, $permanent: d.persist } });
  }
  return {
    has: (name) => names.has(name),
    get: (name) => room[SHARED_PREFIX + name](),
    set: (name, value) => room[SHARED_PREFIX + name].set(value),
  };
}

/** What the world of a script is built from: the player it acts for, the event and the map, the shared properties it declared, and the payload that fired it. */
export interface RpgjsWorldOptions {
  player: RpgPlayer;
  /** The event the script runs for, if any (`$event`, `$self`). */
  event?: RpgEvent | null;
  map: RpgMap;
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
 * const world = createRpgjsWorld({ player, map: player.getCurrentMap()!, shared: program.shared })
 * await program.call("f", [], hostFromApi(GAME_API_DESCRIPTION, GAME_API_IMPL, world), { steps: 20000, iterations: 100 })
 * ```
 */
export function createRpgjsWorld(options: RpgjsWorldOptions): ScriptWorld {
  const { player, event, map } = options;
  const p = player as any;
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
    event: {
      get id() { return event?.id ?? ""; },
      get name() { return String(read((event as any)?.name) ?? ""); },
      get x() { return number(read((event as any)?.x)); },
      get y() { return number(read((event as any)?.y)); },
    },
    wait: (seconds) => new Promise<void>((resolve) => setTimeout(resolve, Math.min(Math.max(seconds, 0), MAX_WAIT_SECONDS) * 1000)),
    rand: options.rand ?? ((min, max) => min + Math.floor(Math.random() * (max - min + 1))),
    sharedProps: sharedPropsOf(map, options.shared ?? []),
    stateProps: options.state ?? { get: (key) => data.get(key), set: (key, value) => void data.set(key, value) },
    hook: options.hook ?? {},
  };
}
