import type { RpgPlayer } from "@rpgjs/server";

/**
 * What every battle handle carries, whatever the battle system: the hooks of a
 * game get it to know who fights and who watches.
 */
export interface BattleHandleBase {
  /** Id of the running battle. */
  id: string;
  /** Player who started the battle (leader of the first side). */
  player: RpgPlayer;
  /** Players of the first side, leader first. */
  players: RpgPlayer[];
  /** Player versus player: the players of the opposing side. */
  versus: RpgPlayer[];
  /** Players watching the battle now. */
  spectators(): RpgPlayer[];
}

/**
 * A running battle as the registry sees it. A battle system implements it
 * once per battle; the registry routes players, spectators and disconnections
 * to it.
 */
export interface BattleSession<H extends BattleHandleBase = BattleHandleBase> {
  readonly handle: H;
  /** Is this player one of the fighters still in the battle (not a spectator)? */
  plays(player: RpgPlayer): boolean;
  /** Takes a player (fighter or spectator) out of the battle: disconnection, `stop`. */
  leave(player: RpgPlayer): void;
  /** Adds a spectator; resolves when they stop watching, `false` when refused. */
  watch(spectator: RpgPlayer): Promise<boolean>;
  /** Resolves once this player's battle screen is closed. */
  closed(player: RpgPlayer): Promise<void>;
}

/** Placeholder of a player whose battle is being prepared (before any `await`). */
const RESERVED = Symbol("reserved");

/**
 * The battles of one battle system on a server, and the player each one holds.
 * It answers the questions every battle system has to answer the same way: is
 * this player busy, which battle do they fight in, can they watch one, what
 * happens when they disconnect.
 *
 * Server only. Each battle system owns one registry (created when its module
 * is provided) and exposes it through its own functions
 * (`isInTurnBattle`, `watchTacticalBattle`…).
 *
 * @example
 * ```ts
 * const battles = new BattleSessions<MyHandle>("MyBattle");
 *
 * export async function startMyBattle(players: RpgPlayer[]) {
 *   const release = battles.reserve(players);   // throws when one of them is busy
 *   try {
 *     const session = createSession(players);
 *     battles.open(session, players);
 *     return await session.result;
 *   } finally {
 *     release();
 *   }
 * }
 * ```
 */
export class BattleSessions<H extends BattleHandleBase = BattleHandleBase> {
  private readonly byPlayer = new Map<string, BattleSession<H> | typeof RESERVED>();
  private readonly byId = new Map<string, BattleSession<H>>();

  /** @param label - Name used in error messages (`[TurnBattle] …`) */
  constructor(readonly label: string) {}

  /**
   * Reserves the players of a battle before anything asynchronous, so a double
   * trigger cannot open two battles.
   *
   * @returns A function that frees the reservations not taken by a session since
   * @throws When a player already fights or watches a battle
   */
  reserve(players: RpgPlayer[]): () => void {
    const busy = players.find((p) => this.byPlayer.has(p.id));
    if (busy) throw new Error(`[${this.label}] Player ${busy.id} is already in a battle`);
    for (const p of players) this.byPlayer.set(p.id, RESERVED);
    return () => {
      for (const p of players) if (this.byPlayer.get(p.id) === RESERVED) this.byPlayer.delete(p.id);
    };
  }

  /** Registers a running battle and seats its players in it. */
  open(session: BattleSession<H>, players: RpgPlayer[]): void {
    this.byId.set(session.handle.id, session);
    for (const p of players) this.byPlayer.set(p.id, session);
  }

  /** Unregisters a finished battle (its players are freed by `release`). */
  close(session: BattleSession<H>): void {
    if (this.byId.get(session.handle.id) === session) this.byId.delete(session.handle.id);
  }

  /**
   * Seats a spectator in a battle before its asynchronous checks.
   *
   * @returns `false` when the player is already in another battle
   */
  seat(player: RpgPlayer, session: BattleSession<H>): boolean {
    const current = this.byPlayer.get(player.id);
    if (current && current !== session) return false;
    this.byPlayer.set(player.id, session);
    return true;
  }

  /** Frees a player, unless they are already in another battle. */
  release(player: RpgPlayer, session: BattleSession<H>): void {
    if (this.byPlayer.get(player.id) === session) this.byPlayer.delete(player.id);
  }

  /** Does this player fight or watch a battle (or is one being prepared for them)? */
  isIn(player: RpgPlayer): boolean {
    return this.byPlayer.has(player.id);
  }

  /** The battle a player fights in (not one they watch), or a battle by id. */
  get(target: RpgPlayer | string): H | undefined {
    if (typeof target === "string") return this.byId.get(target)?.handle;
    const session = this.byPlayer.get(target.id);
    return session && session !== RESERVED && session.plays(target) ? session.handle : undefined;
  }

  /**
   * Lets a spectator watch the battle of `target` (a fighting player or a
   * battle id).
   *
   * @returns `false` when there is nothing to watch or the battle refused them
   */
  async watch(spectator: RpgPlayer, target: RpgPlayer | string): Promise<boolean> {
    const handle = this.get(target);
    const session = handle && this.byId.get(handle.id);
    return session ? session.watch(spectator) : false;
  }

  /** Takes a player out of their battle, as a disconnection does, and waits until their screen is closed. */
  async stop(player: RpgPlayer): Promise<void> {
    const session = this.byPlayer.get(player.id);
    if (!session || session === RESERVED) return;
    session.leave(player);
    await session.closed(player);
  }

  /** A player disconnected: their battle goes on without them (`player.onDisconnected`). */
  disconnect(player: RpgPlayer): void {
    const session = this.byPlayer.get(player.id);
    if (session && session !== RESERVED) session.leave(player);
    this.byPlayer.delete(player.id);
  }
}
