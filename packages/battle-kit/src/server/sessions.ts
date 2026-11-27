import type { RpgPlayer } from "@rpgjs/server";

/**
 * What every battle handle carries, whatever the battle system: the hooks of a
 * game get it to know who fights and who watches. A battle system extends it
 * with its own fields. Server only.
 *
 * @title BattleHandleBase
 * @example
 * ```ts
 * interface MyHandle extends BattleHandleBase {
 *   turn(): number;
 * }
 * function everyoneIn(battle: BattleHandleBase): RpgPlayer[] {
 *   return [...battle.players, ...battle.versus, ...battle.spectators()];
 * }
 * ```
 */
export interface BattleHandleBase {
  /**
   * Id of the running battle.
   *
   * @prop {string} id
   * @memberof BattleHandleBase
   */
  id: string;
  /**
   * Player who started the battle (leader of the first side).
   *
   * @prop {RpgPlayer} player
   * @memberof BattleHandleBase
   */
  player: RpgPlayer;
  /**
   * Players of the first side, leader first.
   *
   * @prop {RpgPlayer[]} players
   * @memberof BattleHandleBase
   */
  players: RpgPlayer[];
  /**
   * Player versus player: the players of the opposing side (empty otherwise).
   *
   * @prop {RpgPlayer[]} versus
   * @memberof BattleHandleBase
   */
  versus: RpgPlayer[];
  /**
   * Players watching the battle now.
   *
   * @method battle.spectators()
   * @returns {RpgPlayer[]} The current spectators
   * @memberof BattleHandleBase
   * @example
   * ```ts
   * const watching = battle.spectators().length;
   * ```
   */
  spectators(): RpgPlayer[];
}

/**
 * A running battle as the registry (`BattleSessions`) sees it. A battle
 * system implements it once per battle; the registry routes players,
 * spectators and disconnections to it. Server only.
 *
 * @title BattleSession
 * @example
 * ```ts
 * const session: BattleSession<MyHandle> = {
 *   handle,
 *   plays: (p) => fighters.has(p.id),
 *   leave: (p) => removeFromBattle(p),
 *   watch: (p) => addSpectator(p),
 *   closed: (p) => screenClosed(p),
 * };
 * ```
 */
export interface BattleSession<H extends BattleHandleBase = BattleHandleBase> {
  /**
   * The handle of the battle, given to the hooks and returned by `BattleSessions.get`.
   *
   * @prop {H} handle
   * @memberof BattleSession
   */
  readonly handle: H;
  /**
   * Is this player one of the fighters still in the battle (not a spectator)?
   *
   * @method session.plays(player)
   * @param {RpgPlayer} player - The player
   * @returns {boolean} True for a fighter still in
   * @memberof BattleSession
   * @example
   * ```ts
   * if (session.plays(player)) return session.handle;
   * ```
   */
  plays(player: RpgPlayer): boolean;
  /**
   * Takes a player (fighter or spectator) out of the battle: disconnection,
   * `stop`. The battle goes on without them.
   *
   * @method session.leave(player)
   * @param {RpgPlayer} player - The player who leaves
   * @returns {void}
   * @memberof BattleSession
   * @example
   * ```ts
   * session.leave(player);
   * ```
   */
  leave(player: RpgPlayer): void;
  /**
   * Adds a spectator.
   *
   * @method session.watch(spectator)
   * @param {RpgPlayer} spectator - The player who wants to watch
   * @returns {Promise<boolean>} Resolves when they stop watching, `false` when refused
   * @memberof BattleSession
   * @example
   * ```ts
   * const watched = await session.watch(fan);
   * ```
   */
  watch(spectator: RpgPlayer): Promise<boolean>;
  /**
   * Waits until this player's battle screen is closed.
   *
   * @method session.closed(player)
   * @param {RpgPlayer} player - The player
   * @returns {Promise<void>} Resolves once the screen is closed
   * @memberof BattleSession
   * @example
   * ```ts
   * await session.closed(player);
   * ```
   */
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
 * (`isInTurnBattle`, `watchTacticalBattle`…). Players are keyed by id, so a
 * player is in at most one battle of this system at a time.
 *
 * @title BattleSessions
 * @example
 * ```ts
 * const battles = new BattleSessions<MyHandle>("MyBattle");
 *
 * export async function startMyBattle(players: RpgPlayer[]) {
 *   const release = battles.reserve(players);   // throws when one of them is busy
 *   const session = createSession(players);
 *   try {
 *     await callStartHooks(players);              // may await: a player may disconnect meanwhile
 *     battles.open(session, players);             // a player gone meanwhile leaves here
 *     return await session.result;
 *   } finally {
 *     release();                                  // frees what `open` did not take
 *     for (const p of players) battles.release(p, session);
 *     battles.close(session);
 *   }
 * }
 * ```
 */
export class BattleSessions<H extends BattleHandleBase = BattleHandleBase> {
  private readonly byPlayer = new Map<string, BattleSession<H> | typeof RESERVED>();
  private readonly byId = new Map<string, BattleSession<H>>();
  /** Players who disconnected while their battle was being prepared: `open` takes them out. */
  private readonly gone = new Set<string>();

  /**
   * @param label - Name used in error messages (`[TurnBattle] …`)
   */
  constructor(readonly label: string) {}

  /**
   * Reserves the players of a battle before anything asynchronous, so a double
   * trigger cannot open two battles.
   *
   * @title reserve
   * @method battles.reserve(players)
   * @param {RpgPlayer[]} players - The fighters of the battle being prepared
   * @returns {() => void} A function that frees the reservations not taken by a session since
   * @throws When a player already fights or watches a battle (nobody is reserved then)
   * @memberof BattleSessions
   * @example
   * ```ts
   * const release = battles.reserve(players);
   * try { await prepare(); } finally { release(); }
   * ```
   */
  reserve(players: RpgPlayer[]): () => void {
    const busy = players.find((p) => this.byPlayer.has(p.id));
    if (busy) throw new Error(`[${this.label}] Player ${busy.id} is already in a battle`);
    for (const p of players) {
      this.byPlayer.set(p.id, RESERVED);
      this.gone.delete(p.id);
    }
    return () => {
      for (const p of players) {
        if (this.byPlayer.get(p.id) === RESERVED) this.byPlayer.delete(p.id);
        this.gone.delete(p.id);
      }
    };
  }

  /**
   * Registers a running battle and seats its players in it. A player who
   * disconnected while the battle was being prepared (during an asynchronous
   * hook) leaves it right away, through `session.leave`: call `open` once the
   * session can handle a departure.
   *
   * @title open
   * @method battles.open(session, players)
   * @param {BattleSession} session - The running battle
   * @param {RpgPlayer[]} players - Its fighters (reserved before)
   * @returns {void}
   * @memberof BattleSessions
   * @example
   * ```ts
   * battles.open(session, players);
   * ```
   */
  open(session: BattleSession<H>, players: RpgPlayer[]): void {
    this.byId.set(session.handle.id, session);
    const left: RpgPlayer[] = [];
    for (const p of players) {
      if (this.gone.delete(p.id)) {
        left.push(p);
        if (this.byPlayer.get(p.id) === RESERVED) this.byPlayer.delete(p.id);
      } else this.byPlayer.set(p.id, session);
    }
    for (const p of left) session.leave(p);
  }

  /**
   * Unregisters a finished battle (its players are freed by `release`).
   *
   * @title close
   * @method battles.close(session)
   * @param {BattleSession} session - The finished battle
   * @returns {void}
   * @memberof BattleSessions
   * @example
   * ```ts
   * battles.close(session);
   * ```
   */
  close(session: BattleSession<H>): void {
    if (this.byId.get(session.handle.id) === session) this.byId.delete(session.handle.id);
  }

  /**
   * Seats a spectator in a battle before its asynchronous checks. Free them
   * with `release` when they stop watching or are refused.
   *
   * @title seat
   * @method battles.seat(player, session)
   * @param {RpgPlayer} player - The spectator
   * @param {BattleSession} session - The battle they watch
   * @returns {boolean} `false` when the player is already in another battle
   * @memberof BattleSessions
   * @example
   * ```ts
   * if (!battles.seat(fan, session)) return false;
   * ```
   */
  seat(player: RpgPlayer, session: BattleSession<H>): boolean {
    const current = this.byPlayer.get(player.id);
    if (current && current !== session) return false;
    this.byPlayer.set(player.id, session);
    return true;
  }

  /**
   * Frees a player, unless they are already in another battle.
   *
   * @title release
   * @method battles.release(player, session)
   * @param {RpgPlayer} player - The player
   * @param {BattleSession} session - The battle they leave
   * @returns {void}
   * @memberof BattleSessions
   * @example
   * ```ts
   * for (const p of players) battles.release(p, session);
   * ```
   */
  release(player: RpgPlayer, session: BattleSession<H>): void {
    if (this.byPlayer.get(player.id) === session) this.byPlayer.delete(player.id);
  }

  /**
   * Does this player fight or watch a battle (or is one being prepared for them)?
   *
   * @title isIn
   * @method battles.isIn(player)
   * @param {RpgPlayer} player - The player
   * @returns {boolean} True when busy with a battle of this system
   * @memberof BattleSessions
   * @example
   * ```ts
   * export const isInMyBattle = (player: RpgPlayer) => battles.isIn(player);
   * ```
   */
  isIn(player: RpgPlayer): boolean {
    return this.byPlayer.has(player.id);
  }

  /**
   * The battle a player fights in (not one they watch), or a battle by id.
   *
   * @title get
   * @method battles.get(target)
   * @param {RpgPlayer | string} target - A player or a battle id
   * @returns {H | undefined} The handle of the battle, undefined when there is none (or it is still being prepared)
   * @memberof BattleSessions
   * @example
   * ```ts
   * const battle = battles.get(player);
   * ```
   */
  get(target: RpgPlayer | string): H | undefined {
    if (typeof target === "string") return this.byId.get(target)?.handle;
    const session = this.byPlayer.get(target.id);
    return session && session !== RESERVED && session.plays(target) ? session.handle : undefined;
  }

  /**
   * Lets a spectator watch the battle of `target` (a fighting player or a
   * battle id).
   *
   * @title watch
   * @method battles.watch(spectator, target)
   * @param {RpgPlayer} spectator - The player who wants to watch
   * @param {RpgPlayer | string} target - A fighting player or a battle id
   * @returns {Promise<boolean>} Resolves when they stop watching; `false` when there is nothing to watch or the battle refused them
   * @memberof BattleSessions
   * @example
   * ```ts
   * const watched = await battles.watch(fan, "battle-12");
   * ```
   */
  async watch(spectator: RpgPlayer, target: RpgPlayer | string): Promise<boolean> {
    const handle = this.get(target);
    const session = handle && this.byId.get(handle.id);
    return session ? session.watch(spectator) : false;
  }

  /**
   * Takes a player out of their battle, as a disconnection does, and waits
   * until their screen is closed. Does nothing when they are in no battle or
   * their battle is still being prepared.
   *
   * @title stop
   * @method battles.stop(player)
   * @param {RpgPlayer} player - The player
   * @returns {Promise<void>} Resolves once their battle screen is closed
   * @memberof BattleSessions
   * @example
   * ```ts
   * await battles.stop(player);
   * player.changeMap("town");
   * ```
   */
  async stop(player: RpgPlayer): Promise<void> {
    const session = this.byPlayer.get(player.id);
    if (!session || session === RESERVED) return;
    session.leave(player);
    await session.closed(player);
  }

  /**
   * A player disconnected: their battle goes on without them, and they are
   * freed. During the preparation of their battle, `open` takes them out. Call
   * it from the `onDisconnected` player hook.
   *
   * @title disconnect
   * @method battles.disconnect(player)
   * @param {RpgPlayer} player - The player who left
   * @returns {void}
   * @memberof BattleSessions
   * @example
   * ```ts
   * defineModule<RpgServer>({ player: { onDisconnected: (player) => battles.disconnect(player) } });
   * ```
   */
  disconnect(player: RpgPlayer): void {
    const session = this.byPlayer.get(player.id);
    // Still reserved: the battle being prepared takes them out when it opens (or frees them if it fails), so no other battle can
    // reserve them meanwhile.
    if (session === RESERVED) return void this.gone.add(player.id);
    if (session) session.leave(player);
    this.byPlayer.delete(player.id);
  }
}
