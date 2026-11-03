/**
 * The mapping between the hooks of RPGJS and the signals of scripts, as data. Each binding says which hook of which module scope it
 * listens to, and turns the arguments of the hook into what a signal carries and the context it happened in. The default bindings
 * are the signals of the game; add your own with the `bindings` option of `provideScripts`, for example to turn a hook of
 * the projectiles or of a plugin into a signal.
 */
import type { RpgEvent, RpgGoldChangePayload, RpgItemChangePayload, RpgMap, RpgMapTickPayload, RpgPlayer, RpgPlayerRoom } from "@rpgjs/server";
import type { SignalDesc } from "../core/filter";
import type { SignalContext } from "./service";
import { describeRoom } from "./world";
import type { RpgShape } from "@rpgjs/common";

/** Where a hook lives in a server module of RPGJS: `player`, `event`, `map`, `room`, `engine` or `projectiles`. */
export type HookScope = "player" | "event" | "map" | "room" | "engine" | "projectiles";

/** What a hook gives a signal: its payload, and where it happened (the player the scripts act for, the map, the event). */
export interface SignalEmission {
  payload: Record<string, unknown>;
  context: SignalContext;
}

/**
 * What the `emit` of a binding returns: one emission, one per player, or nothing.
 *
 * @example
 * ```ts
 * signalBinding<[RpgMap]>({
 *   signal: "map.dawn", scope: "map", hook: "onDawn",
 *   describe: { doc: "The sun rises on a map.", payload: {} },
 *   // once for each player of the map, since a script acts for a player
 *   emit: (map) => map.getPlayers().map((player) => ({ payload: {}, context: { player, map } })),
 * })
 * ```
 */
export type SignalEmissions = SignalEmission | SignalEmission[] | undefined;

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
 *     return { payload: { skill: change.skill }, context: { player } };
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
  /**
   * The hook does not wait for the scripts, and a player whose scripts still run for this signal skips it. For a hook that RPGJS
   * waits for and calls often, such as `onTick` of a map: a script that waits (`wait`, `showText`) would otherwise stop the map.
   */
  background?: boolean;
  /**
   * Gives the payload and the context of the signal, or nothing to emit nothing (a player who is on no map, say). A list emits the
   * signal once per entry: a hook of a map, for each of its players. Not called while no script listens to the signal.
   */
  emit(...args: TArgs): SignalEmissions | Promise<SignalEmissions>;
}

/** Types the arguments of the hook of a binding. */
export function signalBinding<TArgs extends unknown[]>(binding: SignalBinding<TArgs>): SignalBinding {
  return binding as unknown as SignalBinding;
}

/**
 * The zone of an `onInShape` / `onOutShape` hook. The map sends `execMethod("onInShape", [player, shape])`, which gives a module
 * hook `(player, player, shape)`, so the zone is the argument that is one rather than the second one.
 */
const zoneOf = (args: unknown[]): RpgShape | undefined =>
  args.find((a): a is RpgShape => !!a && typeof (a as { playerIsIn?: unknown }).playerIsIn === "function");
const shapePayload = (shape: RpgShape) => ({ shape: { name: String(shape.name), x: Number(shape.x), y: Number(shape.y), width: Number(shape.width), height: Number(shape.height) } });
const eventPayload = (event: RpgEvent) => ({ event: { id: String(event.id ?? ""), name: String(typeof event.name === "function" ? (event.name as () => unknown)() : event.name ?? "") } });
/** A signal of an event: events exist in maps only, so the map is the one of the player. */
const ofEvent = (event: RpgEvent, player: RpgPlayer): SignalEmission => ({ payload: eventPayload(event), context: { player, event } });
const itemPayload = (change: RpgItemChangePayload) => ({ item: String(change.itemId), quantity: Number(change.quantity) });

/**
 * The signals of the game: the hooks `onJoinRoom`, `onLeaveRoom`, `onJoinMap`, `onLeaveMap`, `onInShape`, `onOutShape`, `onLevelUp`, `onDead`,
 * `onItemAdd`, `onItemRemove`, `onItemUse`, `onItemEquip` and `onGoldChange` of the player, `onAction` and `onPlayerTouch` of the events,
 * and `onTick` of the maps. The ones of the player fire in every kind of room, a map or not.
 */
export const DEFAULT_SIGNAL_BINDINGS: SignalBinding[] = [
  signalBinding<[RpgPlayer, RpgPlayerRoom]>({
    signal: "player.joinRoom", scope: "player", hook: "onJoinRoom",
    emit: (player, room) => ({ payload: { ...describeRoom(room) }, context: { player, room } }),
  }),
  signalBinding<[RpgPlayer, RpgPlayerRoom]>({
    signal: "player.leaveRoom", scope: "player", hook: "onLeaveRoom",
    emit: (player, room) => ({ payload: { ...describeRoom(room) }, context: { player, room } }),
  }),
  signalBinding<[RpgPlayer, RpgMap]>({
    signal: "player.joinMap", scope: "player", hook: "onJoinMap",
    emit: (player, map) => ({ payload: { map: String(map.id) }, context: { player, map } }),
  }),
  signalBinding<[RpgPlayer, RpgMap]>({
    signal: "player.leaveMap", scope: "player", hook: "onLeaveMap",
    emit: (player, map) => ({ payload: { map: String(map.id) }, context: { player, map } }),
  }),
  signalBinding<[RpgPlayer, { guiId: string; name: string; data?: unknown }]>({
    signal: "gui.action", scope: "player", hook: "onGuiInteraction",
    emit: (player, interaction) => ({ payload: { gui: String(interaction.guiId), event: String(interaction.name), data: interaction.data ?? {} }, context: { player } }),
  }),
  signalBinding<[RpgPlayer, number]>({
    signal: "player.levelUp", scope: "player", hook: "onLevelUp",
    emit: async (player, gained) => {
      // RPGJS sends this hook, then sets the level in the same step: one turn later the player has the new level, whatever the order
      await Promise.resolve();
      return { payload: { gained, level: player.level }, context: { player } };
    },
  }),
  signalBinding<[RpgPlayer, ...unknown[]]>({
    signal: "player.inShape", scope: "player", hook: "onInShape",
    emit: (player, ...args) => { const shape = zoneOf(args); return shape ? { payload: shapePayload(shape), context: { player } } : undefined; },
  }),
  signalBinding<[RpgPlayer, ...unknown[]]>({
    signal: "player.outShape", scope: "player", hook: "onOutShape",
    emit: (player, ...args) => { const shape = zoneOf(args); return shape ? { payload: shapePayload(shape), context: { player } } : undefined; },
  }),
  signalBinding<[RpgPlayer]>({
    signal: "player.dead", scope: "player", hook: "onDead",
    emit: (player) => ({ payload: {}, context: { player } }),
  }),
  signalBinding<[RpgPlayer, RpgItemChangePayload]>({
    signal: "player.itemAdd", scope: "player", hook: "onItemAdd",
    emit: (player, change) => ({ payload: itemPayload(change), context: { player } }),
  }),
  signalBinding<[RpgPlayer, RpgItemChangePayload]>({
    signal: "player.itemRemove", scope: "player", hook: "onItemRemove",
    emit: (player, change) => ({ payload: itemPayload(change), context: { player } }),
  }),
  signalBinding<[RpgPlayer, RpgItemChangePayload]>({
    signal: "player.itemUse", scope: "player", hook: "onItemUse",
    emit: (player, change) => ({ payload: itemPayload(change), context: { player } }),
  }),
  signalBinding<[RpgPlayer, RpgItemChangePayload & { equipped: boolean }]>({
    signal: "player.itemEquip", scope: "player", hook: "onItemEquip",
    emit: (player, change) => ({ payload: { ...itemPayload(change), equipped: !!change.equipped }, context: { player } }),
  }),
  signalBinding<[RpgPlayer, RpgGoldChangePayload]>({
    signal: "player.goldChange", scope: "player", hook: "onGoldChange",
    emit: (player, change) => ({ payload: { gold: Number(change.gold), delta: Number(change.delta) }, context: { player } }),
  }),
  signalBinding<[RpgMap, RpgMapTickPayload]>({
    signal: "map.tick", scope: "map", hook: "onTick", background: true,
    // A script acts for a player: the tick runs once for each player of the map
    emit: (map, tick) => map.getPlayers().map((player) => ({
      payload: { map: String(map.id), deltaMs: Number(tick.deltaMs), tick: Number(tick.tick) },
      context: { player, map },
    })),
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
