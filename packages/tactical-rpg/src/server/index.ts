import { nativeDamageHook } from "../core/formulas";
import { createModule } from "@rpgjs/common";
import { defineModule, type RpgPlayer, type RpgServer } from "@rpgjs/server";
import {
  TACTICAL_GUI,
  TACTICAL_HIDDEN_GRAPHIC,
  chooseAction,
  createTacticalBattle,
  transition,
  type BattlePacket,
  type BattleState,
  type Cell,
  type CommandEnvelope,
  type EncounterSetup,
  type RulesHooks,
  type TacticalAi,
  type TacticalEncounterRecord,
  type TacticalResult,
  type Team,
  type TacticalSkillRecord,
  type TacticalItemRecord,
  type TacticalRoleRecord,
  type Command,
  type Unit,
  chooseFor,
  type TacticalUnitRecord,
  eventDuration,
  hold,
  type BattleEvent,
} from "../core";

export * from "../core";

/** A running tactical battle, as seen by hooks. */
export interface TacticalHandle {
  id: string;
  /** The leader (first player). */
  player: RpgPlayer;
  /** Players of the allied side (coop: several), including those who left. */
  players: RpgPlayer[];
  /** PvP: players of the enemy side. */
  versus: RpgPlayer[];
  /** Players watching the battle right now. */
  spectators(): RpgPlayer[];
  /** Current authoritative state (read-only for hooks). */
  state(): BattleState;
}

/**
 * Hooks any game module can implement:
 *
 * ```ts
 * defineModule<RpgServer>({
 *   tactical: {
 *     onSetup(player, battle, state) { state.units.push(reinforcement) },  // before the first display: the state may be changed
 *     onStart(player, battle) {},
 *     onCommand(player, battle, env) { return false },       // refuse a command
 *     onDamage({ attacker, target, skill, amount }) { return amount + 2 },
 *     onJudge({ state }) { return state.round > 9 ? "enemy" : undefined },  // ends the battle: the side that has won
 *     onAction({ state, command, event }) {},
 *     onMove({ state, unit, from, path }) {},            // a trap, a zone
 *     onDefeat({ state, unit, by }) {},                  // loot, a revival
 *     onPhase({ state, phase, round }) {},               // poison, reinforcements
 *     onEnd(player, battle, result) {},
 *   },
 * })
 * ```
 * Rule hooks (`onDamage`, `onJudge`, `onAction`, `onMove`, `onDefeat`, `onPhase`) are synchronous. A type of objective is added with `registerObjectiveType`.
 */
/** What a rule hook of a game also gets: the leader of the battle and the battle. */
export interface TacticalRuleContext {
  player: RpgPlayer;
  battle: TacticalHandle;
}
type WithBattle<K extends keyof RulesHooks> = NonNullable<RulesHooks[K]> extends (ctx: infer C) => infer R ? (ctx: C & TacticalRuleContext) => R : never;

export interface TacticalServerHooks extends Omit<RulesHooks, (typeof RULE_HOOKS)[number]> {
  onDamage?: WithBattle<"onDamage">;
  onJudge?: WithBattle<"onJudge">;
  onAction?: WithBattle<"onAction">;
  onMove?: WithBattle<"onMove">;
  onDefeat?: WithBattle<"onDefeat">;
  onPhase?: WithBattle<"onPhase">;
  /** The battle is created and not shown yet: change `state` (units, rules, objective) before the first display. Called once, for the leader. */
  onSetup?(player: RpgPlayer, battle: TacticalHandle, state: BattleState): void | Promise<void>;
  onStart?(player: RpgPlayer, battle: TacticalHandle): void | Promise<void>;
  /** Return `false` to refuse a player command. */
  onCommand?(player: RpgPlayer, battle: TacticalHandle, env: CommandEnvelope): boolean | void | Promise<boolean | void>;
  onEnd?(player: RpgPlayer, battle: TacticalHandle, result: TacticalResult): void | Promise<void>;
  /**
   * AI, for each action of an AI-controlled unit: return a command to play
   * instead of `suggested` (the default AI's), or nothing to keep it. A
   * command the rules refuse falls back to `suggested`.
   */
  onChooseAction?(ctx: {
    state: BattleState;
    /** The unit about to act. */
    unit: Unit;
    suggested: Command;
    battle: TacticalHandle;
  }): Command | null | void | Promise<Command | null | void>;
  /** Return `false` to refuse a spectator (private battle, distance, friends only…). */
  onSpectate?(spectator: RpgPlayer, battle: TacticalHandle): boolean | void | Promise<boolean | void>;
}

declare module "@rpgjs/server" {
  interface RpgServer {
    tactical?: TacticalServerHooks;
  }
}

export interface TacticalServerOptions {
  /** Data outside the RPGJS database (the database is read otherwise). */
  units?: Record<string, TacticalUnitRecord>;
  skills?: Record<string, TacticalSkillRecord>;
  items?: Record<string, TacticalItemRecord>;
  roles?: Record<string, TacticalRoleRecord>;
  encounters?: Record<string, TacticalEncounterRecord>;
  /** Enemy AI (default: attack the weakest target in range, otherwise close in). */
  ai?: TacticalAi;
  /** Delay between two enemy actions (ms). Default 1650. */
  enemyDelay?: number;
  /**
   * Seconds a side has to play its phase when several players are in the battle (coop, duel); what was not played then waits and the
   * next phase begins. Default 60; 0: no limit. An encounter sets its own with `battle.turnSeconds`. A battle played alone has none.
   */
  turnSeconds?: number;
  /** Hide the player's map sprite during the battle (restored after). Default true. */
  hidePlayer?: boolean;
  /** Hooks declared without a module. */
  hooks?: TacticalServerHooks;
}

export interface StartTacticalOptions {
  /** World position of the grid's top-left corner (map pixels), if the encounter gives none. */
  origin?: Cell;
}

/** Coop: several players against the encounter's enemies, each commanding their own allies. */
export interface TacticalGroupOptions extends StartTacticalOptions {
  players: RpgPlayer[];
  encounter: string | TacticalEncounterRecord;
  /** Players watching from the start (see `watchTactical` to join later). */
  spectators?: RpgPlayer[];
  /** PvP: the opposing side, commanding the encounter's enemies (no AI). */
  versus?: RpgPlayer[];
}

interface Session {
  handle?: TacticalHandle;
  /** Take this player (or spectator) out of the battle (disconnection, `stopTactical`). */
  leave(player: RpgPlayer): void;
  /** Resolves once this player's HUD is closed. */
  closed(player: RpgPlayer): Promise<void>;
  /** Watch the battle until the spectator leaves; `false` when refused. */
  watch(spectator: RpgPlayer): Promise<boolean>;
  /** Is this player one of the battle's players (not a spectator)? */
  plays(player: RpgPlayer): boolean;
}

let options: TacticalServerOptions = {};
const sessions = new Map<string, Session>();
/** Running battles by id. */
const battles = new Map<string, Session>();
/** Graphics hidden by a battle, waiting to be restored (per player). */
const stashed = new Map<string, string[]>();

const read = <T>(fn: () => T): T | undefined => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};
const val = (v: unknown) => (typeof v === "function" ? (v as () => unknown)() : v);

/** A record of the RPGJS database (plain object or decorated class). */
function dbRecord<T>(player: RpgPlayer, id: string): T | undefined {
  const raw = read(() => (player as any).databaseById(id));
  if (!raw) return undefined;
  return (typeof raw === "function" ? { ...raw.prototype, ...raw.prototype?.options } : raw) as T;
}

/** Resolve an encounter and everything it needs (options first, then the database). */
export function resolveEncounter(player: RpgPlayer, encounter: string | TacticalEncounterRecord): EncounterSetup {
  const record =
    typeof encounter === "string" ? options.encounters?.[encounter] ?? dbRecord<TacticalEncounterRecord>(player, encounter) : encounter;
  if (!record?.battle) throw new Error(`[Tactical] Unknown encounter "${String(encounter)}"`);
  const units: Record<string, TacticalUnitRecord> = {};
  const skills: Record<string, TacticalSkillRecord> = {};
  const roles: Record<string, TacticalRoleRecord> = {};
  const items: Record<string, TacticalItemRecord> = {};
  for (const p of [...record.battle.allies, ...record.battle.enemies]) {
    if (units[p.unit]) continue;
    const unit = options.units?.[p.unit] ?? dbRecord<TacticalUnitRecord>(player, p.unit);
    if (!unit?.battle) throw new Error(`[Tactical] Unknown unit "${p.unit}"`);
    units[p.unit] = { ...unit, name: String(val(unit.name) ?? p.unit) };
    // Custom roles come from the options or the database; the built-in ones need nothing.
    const roleId = unit.battle.role;
    const role = roles[roleId] ?? options.roles?.[roleId] ?? dbRecord<TacticalRoleRecord>(player, roleId);
    if (role?.battle) roles[roleId] = { ...role, name: String(val(role.name) ?? roleId) };
    for (const id of unit.battle.skills ?? []) {
      const skill = options.skills?.[id] ?? dbRecord<TacticalSkillRecord>(player, id);
      if (skill?.battle) skills[id] = { ...skill, name: String(val(skill.name) ?? id) };
    }
    for (const id of Object.keys(unit.battle.items ?? {})) {
      const item = options.items?.[id] ?? dbRecord<TacticalItemRecord>(player, id);
      if (item?.battle) items[id] = { ...item, name: String(val(item.name) ?? id) };
    }
  }
  return { name: record.name ? String(val(record.name)) : undefined, data: record.battle, units, skills, items, roles };
}

const RULE_HOOKS = ["onDamage", "onJudge", "onAction", "onMove", "onDefeat", "onPhase"] as const;

/** Rule hooks of the plugin option and of game modules (`tactical: { onDamage }`). */
function ruleHooks(player: RpgPlayer, battle: () => TacticalHandle): RulesHooks[] {
  // The damage is the one of the formulas of the map (as in the turn-based battle); the hooks of the game adjust it
  const list: RulesHooks[] = [nativeDamageHook((name) => {
    try {
      return (player as any).getFormulas?.(name);
    } catch {
      return undefined;
    }
  })];
  // The rule hooks of a game also get the leader and the battle (`TacticalRuleContext`)
  const withBattle = (fn: (ctx: any) => unknown) => (ctx: object) => fn({ ...ctx, player, battle: battle() });
  if (options.hooks) list.push(...RULE_HOOKS.flatMap((name) => (options.hooks![name] ? [{ [name]: withBattle(options.hooks![name] as never) }] : [])));
  const hooks = (player as any).hooks;
  if (hooks?.getHookFunctions)
    for (const name of RULE_HOOKS)
      for (const fn of hooks.getHookFunctions(`server-tactical-${name}`) as ((...a: any[]) => any)[]) list.push({ [name]: withBattle(fn) });
  return list;
}

/** Async hooks (plugin option + game modules); resolves with their results. */
async function callHooks(player: RpgPlayer, name: string, ...args: unknown[]): Promise<unknown[]> {
  const results: unknown[] = [];
  const own = (options.hooks as Record<string, any> | undefined)?.[name];
  if (own) results.push(await own(...args));
  const hooks = (player as any).hooks;
  if (!hooks?.callHooks) return results;
  await new Promise<void>((resolve, reject) =>
    hooks.callHooks(`server-tactical-${name}`, ...args).subscribe({
      next: (v: unknown) => results.push(...(Array.isArray(v) ? v : [v])),
      error: reject,
      complete: () => resolve(),
    }),
  );
  return results;
}

/** The grid centred on the player when the encounter does not place it. */
function aroundPlayer(player: RpgPlayer, setup: EncounterSetup): Cell {
  const cell = setup.data.board?.cellSize ?? 64;
  const columns = setup.data.board?.columns ?? 9;
  const rows = setup.data.board?.rows ?? 7;
  const x = Number(read(() => val((player as any).x))) || 0;
  const y = Number(read(() => val((player as any).y))) || 0;
  return { x: Math.round(x - (columns * cell) / 2), y: Math.round(y - (rows * cell) / 2) };
}

/**
 * Start a tactical battle and wait for its outcome. The map stays loaded: the
 * grid is drawn on it (component animation) and the HUD is a GUI.
 *
 * ```ts
 * const result = await startTactical(player, "sanctuary");
 * // Coop: each player commands their own allies (placement `seat`, dealt in turn otherwise).
 * const result = await startTactical({ players: [alice, bob], encounter: "sanctuary" });
 * ```
 */
export function startTactical(player: RpgPlayer, encounter: string | TacticalEncounterRecord, start?: StartTacticalOptions): Promise<TacticalResult>;
export function startTactical(group: TacticalGroupOptions): Promise<TacticalResult>;
export async function startTactical(
  a: RpgPlayer | TacticalGroupOptions,
  encounterArg?: string | TacticalEncounterRecord,
  startArg: StartTacticalOptions = {},
): Promise<TacticalResult> {
  const group = "players" in a && Array.isArray(a.players) ? a : null;
  const unique = (list: RpgPlayer[]) => [...new Map(list.map((p) => [p.id, p])).values()];
  const players = group ? unique(group.players) : [a as RpgPlayer];
  const versus = group?.versus ? unique(group.versus).filter((p) => !players.some((q) => q.id === p.id)) : [];
  const encounter = group ? group.encounter : encounterArg!;
  const start = group ?? startArg;
  if (!players.length) throw new Error("[Tactical] No player");
  const everyone = [...players, ...versus];
  // The battle lives in the room of the leader's map.
  const map = read(() => players[0].getCurrentMap());
  const away = everyone.find((p) => read(() => p.getCurrentMap()) !== map);
  if (away) throw new Error(`[Tactical] Player ${away.id} is not on the same map as ${players[0].id}`);
  const busy = everyone.find((p) => sessions.has(p.id));
  if (busy) throw new Error(`[Tactical] Player ${busy.id} already in a battle`);
  // Reserve the slots before any await: a double trigger must not open two battles.
  const pending: Session = { leave: () => {}, closed: async () => {}, watch: async () => false, plays: () => true };
  for (const p of everyone) sessions.set(p.id, pending);
  try {
    return await run(players, versus, encounter, start, group?.spectators ?? []);
  } finally {
    // Seats free their own slot when their HUD closes; this only covers a failed start.
    for (const p of everyone) if (sessions.get(p.id) === pending) sessions.delete(p.id);
  }
}

/** Take a player out of their battle (like a disconnection) and wait until their HUD is closed. */
export async function stopTactical(player: RpgPlayer): Promise<void> {
  const session = sessions.get(player.id);
  if (!session) return;
  session.leave(player);
  await session.closed(player);
}

/** The name of a player: a guest of an online game has none, and is not called by their id. */
const nameOf = (player: RpgPlayer, index = 0) => String(read(() => val((player as any).name)) || `Player ${index + 1}`);

/**
 * Hide the player's map sprite during the battle. Kept hidden: a map module may
 * apply the hero's appearance later (Studio does it asynchronously). A
 * transparent graphic, not an empty list: the client keeps the previous sprite
 * when the list is emptied. Returns the restore function.
 */
function hidePlayer(player: RpgPlayer): () => void {
  const currentGraphics = () => [...((read(() => val((player as any).graphics)) as string[] | undefined) ?? [])];
  const isHidden = (g: string[]) => g.length === 1 && g[0] === TACTICAL_HIDDEN_GRAPHIC;
  // Right after another battle, its restore is still pending: take its graphics.
  let graphics = currentGraphics();
  if (isHidden(graphics)) graphics = stashed.get(player.id) ?? [];
  read(() => player.setGraphic(TACTICAL_HIDDEN_GRAPHIC));
  const hidden = setInterval(() => {
    const now = currentGraphics();
    if (isHidden(now)) return;
    if (now.length) graphics = now;
    read(() => player.setGraphic(TACTICAL_HIDDEN_GRAPHIC));
  }, 250);
  return () => {
    clearInterval(hidden);
    if (!graphics.length) return;
    // Restored on the next tick, unless a new battle started meanwhile (no
    // flicker between two battles).
    const restore = graphics;
    stashed.set(player.id, restore);
    setTimeout(() => {
      if (sessions.has(player.id)) return;
      stashed.delete(player.id);
      read(() => player.setGraphic(restore));
    }, 0);
  };
}

/** One player in a battle: their GUI and whether they are still there. */
interface Seat {
  player: RpgPlayer;
  /** Side commanded: `ally` (players) or `enemy` (versus). */
  team: Team;
  gui: ReturnType<RpgPlayer["gui"]>;
  present: boolean;
  /** Duel: the animation speed of this player (each one has their own). */
  pace: number;
  done: Promise<void>;
  restore: () => void;
}

/** A spectator: their GUI (read-only HUD). */
interface Watcher {
  player: RpgPlayer;
  gui: ReturnType<RpgPlayer["gui"]>;
  done: Promise<void>;
}

async function run(
  players: RpgPlayer[],
  versus: RpgPlayer[],
  encounter: string | TacticalEncounterRecord,
  start: StartTacticalOptions,
  spectators: RpgPlayer[],
) {
  const leader = players[0];
  const setup = resolveEncounter(leader, encounter);
  let state = createTacticalBattle(setup, {
    id: `${leader.id}:${Date.now().toString(36)}`,
    origin: start.origin ?? aroundPlayer(leader, setup),
    players: players.map((p, index) => ({ id: p.id, name: nameOf(p, index) })),
    versus: versus.map((p, index) => ({ id: p.id, name: nameOf(p, players.length + index) })),
  });
  const watchers = new Map<string, Watcher>();
  const handle: TacticalHandle = {
    id: state.id,
    player: leader,
    players,
    versus,
    spectators: () => [...watchers.values()].map((w) => w.player),
    state: () => state,
  };
  const hooks = ruleHooks(leader, () => handle);
  const ai = options.ai ?? chooseAction;
  const enemyDelay = options.enemyDelay ?? 1650;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let busyUntil = 0;
  let ended = false;
  const seats = new Map<string, Seat>();
  const present = () => [...seats.values()].filter((s) => s.present);
  /** Animation speed the server paces on: the shared one, or in a duel the slowest player's (each has their own). */
  const pace = () => (versus.length ? Math.min(...present().map((s) => s.pace), 3) : state.pace) || 1;
  /** Seconds a side has to play its phase: only with several players, a battle played alone has all its time. */
  const limit = players.length + versus.length > 1 ? Math.max(0, Number(setup.data.turnSeconds ?? options.turnSeconds ?? 60) || 0) : 0;
  /** When the phase being played ends by itself (0: it is not timed), and which phase that is. */
  let deadline = 0;
  let timedPhase = "";
  let clock: ReturnType<typeof setTimeout> | undefined;
  /** The state as a player is sent it: their own speed in a duel, and what is left of the time of the phase. */
  const shown = (seat?: Seat): BattleState => ({
    ...state,
    ...(versus.length && seat ? { pace: seat.pace } : {}),
    ...(deadline ? { timer: { seconds: limit, left: Math.max(0, deadline - Date.now()) } } : {}),
  });
  /** How long the server waits after an event before the next order, at the current speed: the time it plays on the screens. */
  const wait = (event: BattleEvent, least: number, margin: number) => {
    const length = (event.kind === "move" ? least : Math.max(least, eventDuration(state, event) - margin)) / pace();
    busyUntil = Math.max(busyUntil, Date.now()) + length;
    // The time of the phase does not run while an action plays
    if (deadline) deadline += length;
    return length;
  };
  /** The outcome seen from a side (PvP: each side has its own). */
  const result = (team: Team = "ally"): TacticalResult => ({
    outcome: !state.winner ? "abandon" : state.escaped ? "escape" : state.winner === team ? "victory" : "defeat",
    rounds: state.round,
    survivors: state.units.filter((u) => u.team === team && u.hp > 0).length,
    winners: !state.winner ? [] : (state.winner === "ally" ? players : versus).map((p) => p.id),
  });
  const send = (packet: Omit<BattlePacket, "state">) => {
    for (const seat of present()) seat.gui.update({ ...packet, state: shown(seat) });
    for (const watcher of watchers.values()) watcher.gui.update({ ...packet, state: shown() });
  };
  const finish = async () => {
    if (ended || !state.winner) return;
    ended = true;
    clearTimeout(timer);
    clearTimeout(clock);
    for (const seat of present()) await callHooks(seat.player, "onEnd", seat.player, handle, result(seat.team));
  };
  // Enemy phase: one AI action every `enemyDelay` ms (the clients play each one).
  /** How long the last action of the AI plays: the next one waits for it. */
  let aiLength = 0;
  const schedule = () => {
    // PvP: the enemies are players, no AI.
    if (versus.length || state.phase !== "enemy" || state.winner || !state.started || !present().length) return;
    timer = setTimeout(async () => {
      const suggested = ai(state);
      if (!suggested) return;
      // Per-unit AI hook: another command for the unit about to act.
      const unit = "unitId" in suggested ? state.units.find((u) => u.id === suggested.unitId) : undefined;
      let command = suggested;
      if (unit) {
        const results = await callHooks(leader, "onChooseAction", { state, unit, suggested, battle: handle }).catch((error) => {
          console.warn("[Tactical] onChooseAction failed, default AI instead:", error);
          return [] as unknown[];
        });
        const chosen = results.find((c): c is Command => !!c && typeof c === "object" && "type" in c);
        if (chosen) {
          try {
            transition(state, chosen, "enemy", []);
            command = chosen;
          } catch (error) {
            console.warn("[Tactical] onChooseAction command refused, default AI instead:", error instanceof Error ? error.message : error);
          }
        }
        if (state.winner || !present().length) return;
      }
      try {
        const out = transition(state, command, "enemy", hooks);
        state = out.state;
        busyUntil = 0;
        aiLength = wait(out.event, command.type === "move" ? 1100 : 1450, 50) * pace();
        arm();
        send({ event: out.event });
        if (state.winner) void finish();
        else schedule();
      } catch (error) {
        console.warn("[Tactical] AI command refused", error);
      }
    }, Math.max(enemyDelay, aiLength + 200) / pace());
    aiLength = 0;
  };

  /** Starts the time of a phase that players command when it begins, and stops it when the phase is the AI's or the battle is over. */
  const arm = () => {
    const timed = limit > 0 && state.started && !state.winner && (state.phase === "ally" || versus.length > 0);
    const phase = timed ? `${state.round}:${state.phase}` : "";
    if (phase === timedPhase) return;
    timedPhase = phase;
    clearTimeout(clock);
    deadline = 0;
    if (!timed) return;
    deadline = Math.max(Date.now(), busyUntil) + limit * 1000;
    watch();
  };
  const watch = () => {
    clearTimeout(clock);
    clock = setTimeout(expire, Math.max(0, deadline - Date.now()));
  };
  /** The time of the phase is over: the units that did not play wait, and the next phase begins. */
  const expire = () =>
    (queue = queue.then(async () => {
      if (!deadline || ended || state.winner || !present().length) return;
      // Actions played meanwhile gave their time back
      if (Date.now() < deadline) return watch();
      const out = transition(state, { type: "endPhase" }, state.phase, hooks);
      state = out.state;
      arm();
      send({ event: { ...out.event, timeout: true } });
      if (state.winner) await finish();
      else schedule();
    }));

  // Orders one at a time, whoever gives them (veto hooks are async).
  let queue = Promise.resolve();
  const order = (seat: Seat, env: CommandEnvelope) =>
    (queue = queue.then(async () => {
      if (!seat.present) return;
      try {
        if (!env?.command) throw new Error("t.error.action");
        // Coop: a partner may have acted meanwhile. Their order still goes
        // through if the rules accept it, once the current animation is over.
        const coop = seats.size > 1;
        if (env.revision !== state.revision && !coop) throw new Error("t.error.stale");
        if (Date.now() < busyUntil) {
          if (!coop) throw new Error("t.error.busy");
          await new Promise((resolve) => setTimeout(resolve, busyUntil - Date.now()));
          if (!seat.present || state.winner) return;
        }
        const vetoed = (await callHooks(seat.player, "onCommand", seat.player, handle, env)).includes(false);
        if (vetoed) throw new Error("t.error.refused");
        if (env.command.type === "start") {
          // Coop: the battle starts once every player is ready.
          if (state.started) throw new Error("t.error.started");
          state = { ...state, ready: [...new Set([...state.ready, seat.player.id])] };
          if (present().some((s) => !state.ready.includes(s.player.id))) return send({});
        }
        const out = transition(state, env.command, seat.team, hooks, seat.player.id);
        state = { ...out.state, ready: [] };
        wait(out.event, env.command.type === "move" ? 900 : 1200, 300);
        arm();
        send({ event: out.event });
        // The action that follows a move, in the same order: clients queue its
        // packet behind the move animation.
        if (env.then && !state.winner) {
          const next = { revision: state.revision, command: env.then };
          if ((await callHooks(seat.player, "onCommand", seat.player, handle, next)).includes(false)) throw new Error("t.error.refused");
          const after = transition(state, env.then, seat.team, hooks, seat.player.id);
          state = { ...after.state, ready: [] };
          wait(after.event, 1200, 300);
          arm();
          send({ event: after.event });
        }
        if (state.winner) await finish();
        else schedule();
      } catch (error) {
        seat.gui.update({ state: shown(seat), error: error instanceof Error ? error.message : "t.error.action" });
      }
    }));

  /** A player holds the cell their unit is about to move to, or lets it go (`cell: null`): the others no longer aim at it. */
  const reserve = (seat: Seat, data?: { unitId?: unknown; cell?: Cell | null }) =>
    (queue = queue.then(() => {
      if (!seat.present || seats.size < 2) return;
      const cell = data?.cell && Number.isInteger(data.cell.x) && Number.isInteger(data.cell.y) ? { x: data.cell.x, y: data.cell.y } : null;
      try {
        state = hold(state, String(data?.unitId ?? ""), cell, seat.team, seat.player.id);
        send({});
      } catch (error) {
        // Letting go of a cell that is no longer held (the phase ended meanwhile) is nothing to tell
        if (cell) seat.gui.update({ state: shown(seat), error: error instanceof Error ? error.message : "t.error.move" });
      }
    }));

  /**
   * A player leaves (disconnection, stopTactical): their units go to a partner
   * of their side. PvP: a side left without players loses by forfeit.
   */
  const leave = (player: RpgPlayer) => {
    const watcher = watchers.get(player.id);
    if (watcher) return void watcher.gui.close(null);
    const seat = seats.get(player.id);
    if (!seat?.present) return;
    seat.present = false;
    sessions.delete(player.id);
    seat.gui.close(null);
    if (!present().length) {
      clearTimeout(timer);
      clearTimeout(clock);
      return;
    }
    const heir = present().find((s) => s.team === seat.team);
    state = {
      ...state,
      holds: (state.holds ?? []).filter((h) => h.owner !== player.id),
      ready: state.ready.filter((id) => id !== player.id),
      players: state.players.filter((p) => p.id !== player.id),
      versus: state.versus.filter((p) => p.id !== player.id),
      units: heir ? state.units.map((u) => (u.owner === player.id ? { ...u, owner: heir.player.id } : u)) : state.units,
    };
    send({ left: nameOf(player) });
    if (!heir) {
      if (state.winner) return;
      const out = state.started
        ? transition(state, { type: "surrender" }, seat.team, hooks)
        : { state: { ...state, started: true, winner: (seat.team === "ally" ? "enemy" : "ally") as Team }, event: { kind: "surrender" as const, team: seat.team } };
      state = out.state;
      arm();
      send({ event: out.event });
      void finish();
      return;
    }
    // The last one waiting for them may now start.
    if (!state.started && state.ready.length && present().every((s) => state.ready.includes(s.player.id))) {
      const out = transition(state, { type: "start" }, "ally", hooks, heir.player.id);
      state = { ...out.state, ready: [] };
      arm();
      send({ event: out.event });
    }
  };
  const session: Session = {
    handle,
    leave,
    closed: (player) => watchers.get(player.id)?.done ?? seats.get(player.id)?.done ?? Promise.resolve(),
    plays: (player) => !!seats.get(player.id)?.present,
    watch: async (spectator) => {
      if (sessions.has(spectator.id) || !present().length) return false;
      if (read(() => spectator.getCurrentMap()) !== read(() => leader.getCurrentMap())) return false;
      // Reserve before the (async) veto: no double watch.
      sessions.set(spectator.id, session);
      let done: () => void = () => {};
      const watcher: Watcher = { player: spectator, gui: spectator.gui(TACTICAL_GUI), done: new Promise<void>((r) => (done = r)) };
      try {
        const refused = (await callHooks(spectator, "onSpectate", spectator, handle)).includes(false);
        if (refused || !present().length) return false;
        watchers.set(spectator.id, watcher);
        const restore = options.hidePlayer !== false ? hidePlayer(spectator) : () => {};
        // A spectator can leave at any time.
        watcher.gui.on("close", () => watcher.gui.close(null));
        state = { ...state, spectators: watchers.size };
        send({});
        try {
          await watcher.gui.open({ state: shown() } satisfies BattlePacket, { waitingAction: true, blockPlayerInput: true });
        } finally {
          watchers.delete(spectator.id);
          restore();
          state = { ...state, spectators: watchers.size };
          send({});
        }
        return true;
      } finally {
        if (sessions.get(spectator.id) === session) sessions.delete(spectator.id);
        done();
      }
    },
  };
  battles.set(state.id, session);

  for (const player of [...players, ...versus]) {
    const gui = player.gui(TACTICAL_GUI);
    const seat: Seat = { player, team: versus.includes(player) ? "enemy" : "ally", gui, present: true, pace: 1, done: Promise.resolve(), restore: () => {} };
    seats.set(player.id, seat);
    sessions.set(player.id, session);
    gui.on<CommandEnvelope>("command", (env) => void order(seat, env));
    gui.on<{ unitId?: unknown; cell?: Cell | null }>("hold", (data) => void reserve(seat, data));
    // Speed (1, 2, or 3 while fast-forwarding the enemy turn): shared by everyone, but in a duel, where each player has their own.
    gui.on<{ pace?: number }>("pace", (data) => {
      const value = [1, 2, 3].includes(Number(data?.pace)) ? Number(data!.pace) : 1;
      if (!seat.present) return;
      if (versus.length) {
        if (value === seat.pace) return;
        seat.pace = value;
        return void seat.gui.update({ state: shown(seat) });
      }
      if (value === state.pace) return;
      state = { ...state, pace: value };
      send({});
    });
    gui.on("close", () => {
      if (state.winner) gui.close(result(seat.team));
    });
    if (options.hidePlayer !== false) seat.restore = hidePlayer(player);
  }
  await callHooks(leader, "onSetup", leader, handle, state);
  for (const seat of seats.values()) await callHooks(seat.player, "onStart", seat.player, handle);
  for (const spectator of spectators) void session.watch(spectator);
  for (const seat of seats.values()) {
    seat.done = (async () => {
      try {
        if (seat.present)
          await seat.gui.open({ state: shown(seat) } satisfies BattlePacket, { waitingAction: true, blockPlayerInput: true });
      } finally {
        seat.present = false;
        if (sessions.get(seat.player.id) === session) sessions.delete(seat.player.id);
        seat.restore();
      }
    })();
  }
  try {
    await Promise.all([...seats.values()].map((s) => s.done));
  } finally {
    clearTimeout(timer);
    clearTimeout(clock);
    battles.delete(state.id);
    // Every player has left: the spectators go back to the map.
    for (const watcher of watchers.values()) watcher.gui.close(null);
  }
  return result();
}

/** Is the player in a battle, playing or watching? */
export function isInTactical(player: RpgPlayer) {
  return sessions.has(player.id);
}

/** The battle a player is playing in (not watching), or a battle by id. */
export function getTactical(target: RpgPlayer | string): TacticalHandle | undefined {
  if (typeof target === "string") return battles.get(target)?.handle;
  const session = sessions.get(target.id);
  return session?.plays(target) ? session.handle : undefined;
}

/**
 * Watch a running battle: the spectator sees every action live (even joining
 * mid-fight) but commands nothing, and leaves with Escape / "Quitter".
 * `target` is a player of the battle or a battle id. Resolves when the
 * spectator leaves; `false` when there is nothing to watch, the spectator is
 * already in a battle or on another map, or `onSpectate` refused.
 */
export async function watchTactical(spectator: RpgPlayer, target: RpgPlayer | string): Promise<boolean> {
  const handle = getTactical(target);
  const session = handle && battles.get(handle.id);
  if (!session) return false;
  return session.watch(spectator);
}

/**
 * Server side of the tactical plugin. Install before `provideServerModules([])`.
 */
export function provideTacticalServer(opts: TacticalServerOptions = {}) {
  options = opts;
  return createModule("Tactical", [
    {
      server: defineModule<RpgServer>({
        player: {
          onDisconnected(player: RpgPlayer) {
            sessions.get(player.id)?.leave(player);
            sessions.delete(player.id);
          },
        },
      } as RpgServer),
    },
  ]);
}
