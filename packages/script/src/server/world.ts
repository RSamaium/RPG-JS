/**
 * The world of a script in an RPGJS game: the player, the event, the map. It implements the port `ScriptWorld` with the API of
 * RPGJS, so a script changes the game the way the code of a game would, and the same script gives the same result in a
 * simulation.
 */
import type { RpgEvent, RpgMap, RpgPlayer } from "@rpgjs/server";
import type { GoldOperation, PlayerPort, ScriptWorld, VariableOperation } from "../game/impl";
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
    get level() { return number(read(p.level)); },
    get name() { return String(read(p.name)); },
    itemCount: (id) => number(read(p.getItem(id)?.quantity)),
    getVariable: (id) => p.getVariable(id),
    changeGold(operation: GoldOperation, amount: number) {
      const gold = number(p.gold);
      p.gold = operation === "set" ? amount : operation === "add" ? gold + amount : operation === "sub" ? gold - amount : gold * amount;
    },
    addItem(id, count) {
      p.addItem(id, count);
    },
    removeItem(id, count) {
      if (playerPort.itemCount(id) > 0) p.removeItem(id, count);
    },
    setSwitch: (name, value) => p.setVariable(name, value),
    setSelfSwitch(letter, value) {
      if (!event) throw new Error("this script does not run for an event: it has no self switch");
      p.setVariable(`${event.id}_${letter}`, value);
    },
    changeVariable(name: string, operation: VariableOperation, value: number) {
      const current = number(p.getVariable(name));
      const next: Record<VariableOperation, number> = { set: value, add: current + value, subtract: current - value, multiply: current * value, divide: current / value, modulo: current % value };
      p.setVariable(name, next[operation]);
    },
    async transfer(mapId, x, y, direction) {
      await p.changeMap(mapId, { x, y });
      if (direction) p.changeDirection?.(direction);
    },
  };

  const speakerOf = (speaker?: string): string | undefined =>
    speaker === "$player" ? playerPort.name : speaker === "$this" ? String(read((event as any)?.name) || event?.id || "") || undefined : speaker;

  return {
    player: playerPort,
    event: {
      get id() { return event?.id ?? ""; },
      get x() { return number(read((event as any)?.x)); },
      get y() { return number(read((event as any)?.y)); },
    },
    async say(text, opts = {}) {
      const speaker = speakerOf(opts.speaker);
      await p.showText(text, { ...(opts.position ? { position: opts.position } : {}), ...(speaker ? { speaker } : {}) });
    },
    async notify(message, opts = {}) {
      await p.showNotification(message, opts);
    },
    async choose(choices) {
      const picked = await p.showChoices("", choices.map((text, index) => ({ text, value: index })));
      return picked ? Number(picked.value) : -1;
    },
    wait: (seconds) => new Promise<void>((resolve) => setTimeout(resolve, Math.min(Math.max(seconds, 0), MAX_WAIT_SECONDS) * 1000)),
    rand: options.rand ?? ((min, max) => min + Math.floor(Math.random() * (max - min + 1))),
    sharedProps: sharedPropsOf(map, options.shared ?? []),
    stateProps: options.state ?? { get: (key) => data.get(key), set: (key, value) => void data.set(key, value) },
    hook: options.hook ?? {},
  };
}
