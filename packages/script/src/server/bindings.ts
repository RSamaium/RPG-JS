/**
 * The mapping between the hooks of RPGJS and the signals of scripts, as data. Each binding says which hook of which module scope it
 * listens to, and turns the arguments of the hook into what a signal carries and the context it happened in. The default bindings
 * are the signals of the game; add your own with the `bindings` option of `provideScripts`, for example to turn a hook of
 * the projectiles or of a plugin into a signal.
 */
import type { RpgEvent, RpgMap, RpgPlayer } from "@rpgjs/server";
import type { SignalDesc } from "../core/filter";
import type { SignalContext } from "./service";

/** Where a hook lives in a server module of RPGJS: `player`, `event`, `map`, `room`, `engine` or `projectiles`. */
export type HookScope = "player" | "event" | "map" | "room" | "engine" | "projectiles";

/** What a hook gives a signal: its payload, and where it happened (the player the scripts act for, the map, the event). */
export interface SignalEmission {
  payload: Record<string, unknown>;
  context: SignalContext;
}

/**
 * A hook of RPGJS turned into a signal. `TArgs` are the arguments of the hook, in the order RPGJS gives them.
 *
 * @example
 * ```ts
 * signalBinding<[RpgPlayer, SkillChangePayload]>({
 *   signal: "player.skillChange",
 *   scope: "player",
 *   hook: "onSkillChange",
 *   describe: { doc: "A skill is learned or forgotten.", payload: { skill: { type: "string" } } },
 *   emit: (player, change) => {
 *     const map = player.getCurrentMap();
 *     return map ? { payload: { skill: change.skill }, context: { player, map } } : undefined;
 *   },
 * })
 * ```
 */
export interface SignalBinding<TArgs extends unknown[] = unknown[]> {
  /** The name scripts listen to: `<what>.<what happened>`. */
  signal: string;
  scope: HookScope;
  /** The name of the hook in that scope: `onLevelUp`. */
  hook: string;
  /** What the signal carries. Needed for a signal that the game does not already have. */
  describe?: SignalDesc;
  /** Gives the payload and the context of the signal, or nothing to emit nothing (a player who is on no map, say). */
  emit(...args: TArgs): SignalEmission | undefined | Promise<SignalEmission | undefined>;
}

/** Types the arguments of the hook of a binding. */
export function signalBinding<TArgs extends unknown[]>(binding: SignalBinding<TArgs>): SignalBinding {
  return binding as unknown as SignalBinding;
}

const onMapOf = (player: RpgPlayer): RpgMap | null => player.getCurrentMap() ?? null;
const ofPlayer = (player: RpgPlayer, payload: Record<string, unknown>): SignalEmission | undefined => {
  const map = onMapOf(player);
  return map ? { payload, context: { player, map } } : undefined;
};
const eventPayload = (event: RpgEvent) => ({ event: { id: String(event.id ?? ""), name: String(typeof event.name === "function" ? (event.name as () => unknown)() : event.name ?? "") } });
const ofEvent = (event: RpgEvent, player: RpgPlayer): SignalEmission | undefined => {
  const map = onMapOf(player);
  return map ? { payload: eventPayload(event), context: { player, map, event } } : undefined;
};

/** The signals of the game: the hooks `onJoinMap`, `onLeaveMap`, `onLevelUp` and `onDead` of the player, and `onAction` and `onPlayerTouch` of the events. */
export const DEFAULT_SIGNAL_BINDINGS: SignalBinding[] = [
  signalBinding<[RpgPlayer, RpgMap]>({
    signal: "player.joinMap", scope: "player", hook: "onJoinMap",
    emit: (player, map) => ({ payload: { map: String(map.id) }, context: { player, map } }),
  }),
  signalBinding<[RpgPlayer, RpgMap]>({
    signal: "player.leaveMap", scope: "player", hook: "onLeaveMap",
    emit: (player, map) => ({ payload: { map: String(map.id) }, context: { player, map } }),
  }),
  signalBinding<[RpgPlayer, number]>({
    signal: "player.levelUp", scope: "player", hook: "onLevelUp",
    emit: async (player, gained) => {
      // RPGJS sends this hook, then sets the level in the same step: one turn later the player has the new level, whatever the order
      await Promise.resolve();
      return ofPlayer(player, { gained, level: player.level });
    },
  }),
  signalBinding<[RpgPlayer]>({
    signal: "player.dead", scope: "player", hook: "onDead",
    emit: (player) => ofPlayer(player, {}),
  }),
  signalBinding<[RpgEvent, RpgPlayer]>({
    signal: "event.action", scope: "event", hook: "onAction",
    emit: (event, player) => ofEvent(event, player),
  }),
  signalBinding<[RpgEvent, RpgPlayer]>({
    signal: "event.touch", scope: "event", hook: "onPlayerTouch",
    emit: (event, player) => ofEvent(event, player),
  }),
];
