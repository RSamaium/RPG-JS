import type { RpgPlayer } from "@rpgjs/server";

/**
 * Who takes part in a battle, once checked by `battleParticipants`. Server
 * only.
 *
 * @title BattleParticipants
 * @example
 * ```ts
 * const { everyone, spectators }: BattleParticipants = battleParticipants("MyBattle", group);
 * ```
 */
export interface BattleParticipants {
  /**
   * Players of the first side, without duplicates, leader first.
   *
   * @prop {RpgPlayer[]} players
   * @memberof BattleParticipants
   */
  players: RpgPlayer[];
  /**
   * Players of the opposing side (player versus player), without the ones
   * already in `players`. Empty in a PvE battle.
   *
   * @prop {RpgPlayer[]} versus
   * @memberof BattleParticipants
   */
  versus: RpgPlayer[];
  /**
   * `players` then `versus`.
   *
   * @prop {RpgPlayer[]} everyone
   * @memberof BattleParticipants
   */
  everyone: RpgPlayer[];
  /**
   * Players watching from the start, without duplicates nor fighters.
   *
   * @prop {RpgPlayer[]} spectators
   * @memberof BattleParticipants
   */
  spectators: RpgPlayer[];
}

/**
 * The options every group battle takes, whatever the battle system: the
 * first argument of a `start…` function in its group form. Every player must
 * be on the leader's map. Server only.
 *
 * @title BattleGroupOptions
 * @example
 * ```ts
 * await startTurnBattle({ players: [leader, friend], troop: "slimes", spectators: [fan] });
 * await startTurnBattle({ players: [hero], versus: [rival] }); // player versus player
 * ```
 */
export interface BattleGroupOptions {
  /**
   * Players of the first side, leader first. Each one commands their own units.
   *
   * @prop {RpgPlayer[]} players
   * @memberof BattleGroupOptions
   */
  players: RpgPlayer[];
  /**
   * Player versus player: the opposing side.
   *
   * @prop {RpgPlayer[]} [versus]
   * @memberof BattleGroupOptions
   */
  versus?: RpgPlayer[];
  /**
   * Players watching from the start (others can join later).
   *
   * @prop {RpgPlayer[]} [spectators]
   * @memberof BattleGroupOptions
   */
  spectators?: RpgPlayer[];
}

/**
 * Is the first argument of a `start…` function the group form
 * (`{ players: [...], … }`) rather than a single player? Server only.
 *
 * @title isBattleGroup
 * @method isBattleGroup(value)
 * @param {RpgPlayer | BattleGroupOptions} value - The first argument
 * @returns {boolean} True when it is an object with a `players` array
 * @example
 * ```ts
 * const group = isBattleGroup(target) ? target : { players: [target] };
 * ```
 */
export function isBattleGroup<G extends BattleGroupOptions>(value: RpgPlayer | G): value is G {
  return typeof value === "object" && value !== null && "players" in value && Array.isArray((value as G).players);
}

const unique = (list: RpgPlayer[]) => [...new Map(list.map((p) => [p.id, p])).values()];

const read = <T>(fn: () => T): T | undefined => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};

const mapOf = (player: RpgPlayer) => read(() => player.getCurrentMap()) as { id?: unknown } | null | undefined;
const mapId = (map: { id?: unknown } | null | undefined) => {
  const id = typeof map?.id === "function" ? read(() => (map.id as () => unknown)()) : map?.id;
  return id === undefined || id === null ? undefined : String(id);
};

/**
 * Are two players on the same map (room)? A battle lives in the room of its
 * map (on Cloudflare, one Durable Object per room): its fighters and its
 * spectators are all there. Maps are compared by id, or by identity when they
 * have none (custom rooms, tests). A map that cannot be read counts as none.
 * Server only.
 *
 * @title sameBattleMap
 * @method sameBattleMap(a, b)
 * @param {RpgPlayer} a - A player
 * @param {RpgPlayer} b - Another player
 * @returns {boolean} True when both are on the same map
 * @example
 * ```ts
 * if (!sameBattleMap(spectator, fighter)) return false;
 * ```
 */
export function sameBattleMap(a: RpgPlayer, b: RpgPlayer): boolean {
  const ma = mapOf(a);
  const mb = mapOf(b);
  const ia = mapId(ma);
  const ib = mapId(mb);
  return ia !== undefined || ib !== undefined ? ia === ib : ma === mb;
}

/**
 * The name a battle shows for a player: their `name`, or the label the
 * battle system gives a guest that has none (never their id). The label comes
 * from the i18n service of the battle system, so no language is built in.
 * Server only.
 *
 * @title battlePlayerName
 * @method battlePlayerName(player, guestLabel)
 * @param player - The player
 * @param guestLabel - Label of a player without a name, already translated (`player.t("myBattle.player", { index: 2 })`)
 * @returns The name to show
 * @example
 * ```ts
 * const names = players.map((p, i) => battlePlayerName(p, p.t("myBattle.player", { index: i + 1 })));
 * ```
 */
export function battlePlayerName(player: RpgPlayer, guestLabel: string): string {
  const raw = read(() => (player as unknown as { name?: unknown }).name);
  const name = typeof raw === "function" ? read(() => (raw as () => unknown)()) : raw;
  return name ? String(name) : guestLabel;
}

/**
 * Checks who takes part in a battle: removes duplicates, keeps a player on one
 * side only (the first one), drops spectators who fight, and requires every
 * fighter to be on the leader's map. Server only.
 *
 * @title battleParticipants
 * @method battleParticipants(label, group)
 * @param label - Name used in error messages (`[TurnBattle] …`)
 * @param group - Players, opponents and spectators asked for
 * @returns The checked participants
 * @throws When there is no player, or a player is not on the leader's map
 *
 * @example
 * ```ts
 * const { players, versus, everyone } = battleParticipants("Tactical", group);
 * ```
 */
export function battleParticipants(label: string, group: BattleGroupOptions): BattleParticipants {
  const players = unique(group.players);
  const versus = unique(group.versus ?? []).filter((p) => !players.some((q) => q.id === p.id));
  if (!players.length) throw new Error(`[${label}] No player`);
  const everyone = [...players, ...versus];
  const away = everyone.find((p) => !sameBattleMap(p, players[0]));
  if (away) throw new Error(`[${label}] Player ${away.id} is not on the same map as ${players[0].id}`);
  const spectators = unique(group.spectators ?? []).filter((p) => !everyone.some((q) => q.id === p.id));
  return { players, versus, everyone, spectators };
}
