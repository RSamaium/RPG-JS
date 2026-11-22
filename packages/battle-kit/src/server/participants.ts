import type { RpgPlayer } from "@rpgjs/server";

/** Who takes part in a battle, once checked. */
export interface BattleParticipants {
  /** Players of the first side, without duplicates, leader first. */
  players: RpgPlayer[];
  /** Players of the opposing side (player versus player), without the ones already in `players`. */
  versus: RpgPlayer[];
  /** `players` then `versus`. */
  everyone: RpgPlayer[];
  /** Players watching from the start. */
  spectators: RpgPlayer[];
}

/** The options every group battle takes, whatever the battle system. */
export interface BattleGroupOptions {
  /** Players of the first side, leader first. Each one commands their own units. */
  players: RpgPlayer[];
  /** Player versus player: the opposing side. */
  versus?: RpgPlayer[];
  /** Players watching from the start (others can join later). */
  spectators?: RpgPlayer[];
}

/** Is the first argument of a `start…` function the group form (`{ players, … }`)? */
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
 * have none (custom rooms, tests).
 */
export function sameBattleMap(a: RpgPlayer, b: RpgPlayer): boolean {
  const ma = mapOf(a);
  const mb = mapOf(b);
  const ia = mapId(ma);
  const ib = mapId(mb);
  return ia !== undefined || ib !== undefined ? ia === ib : ma === mb;
}

/**
 * The name a battle shows for a player: their `name`, or "Player <n>" for a
 * guest that has none (never their id).
 *
 * @param fallback - Label of a player without a name, `{index}` being replaced by their number
 */
export function battlePlayerName(player: RpgPlayer, index = 0, fallback = "Player {index}"): string {
  const raw = read(() => (player as unknown as { name?: unknown }).name);
  const name = typeof raw === "function" ? read(() => (raw as () => unknown)()) : raw;
  return name ? String(name) : fallback.replace("{index}", String(index + 1));
}

/**
 * Checks who takes part in a battle: removes duplicates, keeps a player on one
 * side only, and requires every fighter to be on the leader's map.
 *
 * @param label - Name used in error messages (`[TurnBattle] …`)
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
