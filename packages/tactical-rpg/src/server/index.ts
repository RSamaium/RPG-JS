import { nativeDamageHook } from "../core/formulas";
import { DEFAULT_BOARD } from "../core/board";
import { createModule } from "@rpgjs/common";
import { defineModule, type RpgPlayer, type RpgServer } from "@rpgjs/server";
import {
  BattleServerHooks,
  BattleSessions,
  sameBattleMap,
  battleParticipants,
  battlePlayerName,
  databaseRecord,
  isBattleGroup,
  plainValue,
  readBattlePlayer,
  writeBattlePlayer,
  type BattleGroupOptions,
  type BattleHandleBase,
  type BattleSession,
  type BattleHookArgs,
} from "@rpgjs/battle-kit/server";
import {
  TACTICAL_GUI,
  TACTICAL_I18N,
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
  damageTable,
  type TacticalUnitRecord,
  type TacticalUnitData,
  type Placement,
  eventDuration,
  hold,
  type BattleEvent,
} from "../core";

// The public surface of the server side: the data helpers of the database, the objective types of plugins, and the types the
// options and hooks use. The rules, the board and the AI stay internal.
export { tacticalEncounter, tacticalItem, tacticalRole, tacticalSkill, tacticalUnit } from "../core/data";
export { registerObjectiveType, unregisterObjectiveType } from "../core/objectives";
export type { ObjectiveType } from "../core/objectives";
export type { RulesHooks } from "../core/rules";
export type { TacticalAi } from "../core/ai";
export type {
  Placement,
  TacticalEncounterData,
  TacticalEncounterRecord,
  TacticalItemRecord,
  TacticalRoleData,
  TacticalRoleRecord,
  TacticalSkillData,
  TacticalSkillRecord,
  TacticalUnitData,
  TacticalUnitRecord,
} from "../core/data";
export type {
  AttackStyle,
  BattleEvent,
  BattlePlayer,
  BattleRules,
  BattleState,
  Board,
  Cell,
  Command,
  CommandEnvelope,
  EncounterMeta,
  Hold,
  ItemDef,
  Objective,
  Role,
  RoleDef,
  SkillDef,
  SkillShape,
  SkillVisual,
  TacticalResult,
  Team,
  Unit,
  UnitParams,
} from "../core/types";

/**
 * A running tactical battle, as the hooks and `getTacticalBattle` see it.
 * `players` keeps the players who left. Server only: the server owns the state.
 *
 * @example
 * ```ts
 * const battle = getTacticalBattle(player);
 * if (battle && battle.state().round > 5) await stopTacticalBattle(player);
 * ```
 */
export interface TacticalBattleHandle extends BattleHandleBase {
  /** Current authoritative state (read-only for hooks). */
  state(): BattleState;
}

/** What a rule hook of a game also gets: the leader of the battle and the battle. Server only. */
export interface TacticalRuleContext {
  player: RpgPlayer;
  battle: TacticalBattleHandle;
}
type WithBattle<K extends keyof RulesHooks> = NonNullable<RulesHooks[K]> extends (ctx: infer C) => infer R ? (ctx: C & TacticalRuleContext) => R : never;

/**
 * Server hooks of the tactical battle: a game module declares them under the
 * `tactical` key (`provideTacticalServer({ hooks })` takes them too). They run
 * on the server, which owns the battle; standalone RPG and MMORPG.
 *
 * @example
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
export interface TacticalServerHooks extends Omit<RulesHooks, (typeof RULE_HOOKS)[number]> {
  onDamage?: WithBattle<"onDamage">;
  onJudge?: WithBattle<"onJudge">;
  onAction?: WithBattle<"onAction">;
  onMove?: WithBattle<"onMove">;
  onDefeat?: WithBattle<"onDefeat">;
  onPhase?: WithBattle<"onPhase">;
  /** The battle is created and not shown yet: change `state` (units, rules, objective) before the first display. Called once, for the leader. */
  onSetup?(player: RpgPlayer, battle: TacticalBattleHandle, state: BattleState): void | Promise<void>;
  onStart?(player: RpgPlayer, battle: TacticalBattleHandle): void | Promise<void>;
  /** Return `false` to refuse a player command. */
  onCommand?(player: RpgPlayer, battle: TacticalBattleHandle, env: CommandEnvelope): boolean | void | Promise<boolean | void>;
  onEnd?(player: RpgPlayer, battle: TacticalBattleHandle, result: TacticalResult): void | Promise<void>;
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
    battle: TacticalBattleHandle;
  }): Command | null | void | Promise<Command | null | void>;
  /** Return `false` to refuse a spectator (private battle, distance, friends only…). */
  onSpectate?(spectator: RpgPlayer, battle: TacticalBattleHandle): boolean | void | Promise<boolean | void>;
}

declare module "@rpgjs/server" {
  interface RpgServer {
    /** Server hooks of the tactical battle (`@rpgjs/tactical-rpg`). */
    tactical?: TacticalServerHooks;
  }
}

/**
 * Options of `provideTacticalServer`. Server only.
 *
 * @example
 * ```ts
 * provideTacticalServer({
 *   enemyDelay: 1200,
 *   turnSeconds: 45,
 *   // The heroes of the players are mages, whatever their class.
 *   hero: () => ({ role: "mage" }),
 * });
 * ```
 */
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
  /**
   * How the hero of a player fights (a `hero: true` placement): its role, battler, range, move… Its HP, SP, parameters, skills and
   * items are read from the player. By default the role is the `tactical.role` of the class of the player (`warrior` otherwise) and
   * the battler is the graphic of the player.
   */
  hero?: (player: RpgPlayer, ctx: { side: Team; seat: number }) => Partial<TacticalUnitData>;
  /** Hooks declared without a module. */
  hooks?: TacticalServerHooks;
}

/**
 * Options of a tactical battle, solo or in a group. Server only.
 *
 * @example
 * ```ts
 * await startTacticalBattle(player, "sanctuary", { origin: { x: 320, y: 240 } });
 * ```
 */
export interface StartTacticalBattleOptions {
  /** World position of the grid's top-left corner (map pixels), if the encounter gives none. */
  origin?: Cell;
}

/**
 * Several players: coop against the encounter's enemies (`players`), each
 * commanding their own allies, or PvP (`versus` commands the enemies, no AI).
 * `spectators` watch from the start (see `watchTacticalBattle` to join later).
 * Server only.
 *
 * @example
 * ```ts
 * await startTacticalBattle({ players: [alice, bob], encounter: "sanctuary", spectators: [carol] });
 * ```
 */
export interface TacticalBattleGroupOptions extends StartTacticalBattleOptions, BattleGroupOptions {
  encounter: string | TacticalEncounterRecord;
}

type Session = BattleSession<TacticalBattleHandle>;

let options: TacticalServerOptions = {};
/** The running tactical battles and the players they hold (fighters and spectators). */
const battles = new BattleSessions<TacticalBattleHandle>("Tactical");
let hooks = new BattleServerHooks<TacticalServerHooks>("tactical");
/** Graphics hidden by a battle, waiting to be restored (per player). */
const stashed = new Map<string, string[]>();

const read = <T>(fn: () => T): T | undefined => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};
const val = plainValue;
const dbRecord = <T>(player: RpgPlayer, id: string): T | undefined => databaseRecord<T>(player, id);

/** Resolve an encounter and everything it needs (options first, then the database). */
function resolveEncounter(player: RpgPlayer, encounter: string | TacticalEncounterRecord): EncounterSetup {
  const record =
    typeof encounter === "string" ? options.encounters?.[encounter] ?? dbRecord<TacticalEncounterRecord>(player, encounter) : encounter;
  if (!record?.tactical) throw new Error(`[Tactical] Unknown encounter "${String(encounter)}"`);
  const units: Record<string, TacticalUnitRecord> = {};
  const skills: Record<string, TacticalSkillRecord> = {};
  const roles: Record<string, TacticalRoleRecord> = {};
  const items: Record<string, TacticalItemRecord> = {};
  for (const p of [...record.tactical.allies, ...record.tactical.enemies]) {
    // A hero is read from its player when the battle starts (see `withHeroes`).
    if (p.hero || !p.unit || units[p.unit]) continue;
    const unit = options.units?.[p.unit] ?? dbRecord<TacticalUnitRecord>(player, p.unit);
    if (!unit?.tactical) throw new Error(`[Tactical] Unknown unit "${p.unit}"`);
    units[p.unit] = { ...unit, name: String(val(unit.name) ?? p.unit) };
    // Custom roles come from the options or the database; the built-in ones need nothing.
    const roleId = unit.tactical.role;
    const role = roles[roleId] ?? options.roles?.[roleId] ?? dbRecord<TacticalRoleRecord>(player, roleId);
    if (role?.tactical) roles[roleId] = { ...role, name: String(val(role.name) ?? roleId) };
    for (const id of unit.tactical.skills ?? []) {
      const skill = skillRecord(player, id);
      if (skill) skills[id] = skill;
    }
    for (const id of Object.keys(unit.tactical.items ?? {})) {
      const item = itemRecord(player, id);
      if (item) items[id] = item;
    }
  }
  return { name: record.name ? String(val(record.name)) : undefined, data: record.tactical, units, skills, items, roles };
}

/** A skill a tactical battle can use (it has a `tactical` field), from the options or the database. */
function skillRecord(player: RpgPlayer, id: string): TacticalSkillRecord | undefined {
  const skill = options.skills?.[id] ?? dbRecord<TacticalSkillRecord>(player, id);
  return skill?.tactical ? { ...skill, name: String(val(skill.name) ?? id) } : undefined;
}

/** An item a tactical battle can use (it restores HP or SP), from the options or the database. */
function itemRecord(player: RpgPlayer, id: string): TacticalItemRecord | undefined {
  const item = options.items?.[id] ?? dbRecord<TacticalItemRecord>(player, id);
  if (!item || !(Number(item.hpValue) > 0 || Number(item.spValue) > 0)) return undefined;
  return { ...item, name: String(val(item.name) ?? id) };
}

/** Id of the unit record of the hero of a player. */
const heroUnitId = (player: RpgPlayer) => `hero:${player.id}`;

/**
 * The hero of a player as a unit: HP, SP and parameters of the player (equipment and states included), the skills it knows and the
 * items it carries that a tactical battle can use. `hero` option and the class of the player give its role, battler, range and move.
 */
function heroUnit(player: RpgPlayer, side: Team, seat: number, setup: EncounterSetup, index = seat): TacticalUnitRecord {
  const me = readBattlePlayer(player);
  const own = options.hero?.(player, { side, seat }) ?? {};
  const classId = String(val((read(() => (player as unknown as { _class?: () => { id?: unknown } })._class?.()) as { id?: unknown } | undefined)?.id) ?? "");
  const classRole = classId ? dbRecord<{ tactical?: { role?: string } }>(player, classId)?.tactical?.role : undefined;
  const maxHp = me.params.maxHp || own.stats?.hp || 100;
  const maxSp = me.params.maxSp || own.stats?.sp || 20;
  // The HP and SP of the player, when the player has native ones (a `maxHp` / `maxSp` parameter, from a class): a knocked-out
  // player (0 HP) then joins knocked out. A player without them (no class) fights with full HP and SP, like the turn-based battle.
  const rawHp = Number(read(() => val((player as unknown as { hp?: unknown }).hp)));
  const rawSp = Number(read(() => val((player as unknown as { sp?: unknown }).sp)));
  const hpNow = me.params.maxHp > 0 && Number.isFinite(rawHp) ? Math.min(maxHp, Math.max(0, rawHp)) : maxHp;
  const spNow = me.params.maxSp > 0 && Number.isFinite(rawSp) ? Math.min(maxSp, Math.max(0, rawSp)) : maxSp;
  const skills = [...new Set([...(own.skills ?? []), ...me.skills])].filter((id) => {
    const skill = skillRecord(player, id);
    if (skill) setup.skills[id] = skill;
    return !!skill;
  });
  const items: Record<string, number> = {};
  for (const [id, quantity] of Object.entries(me.items)) {
    const item = itemRecord(player, id);
    if (!item) continue;
    setup.items = { ...setup.items, [id]: item };
    items[id] = quantity;
  }
  const role = own.role ?? classRole ?? "warrior";
  const roleRecord = setup.roles?.[role] ?? options.roles?.[role] ?? dbRecord<TacticalRoleRecord>(player, role);
  if (roleRecord?.tactical) setup.roles = { ...setup.roles, [role]: { ...roleRecord, name: String(val(roleRecord.name) ?? role) } };
  return {
    // A guest is named like in the list of the players of the battle (the other side counted after the first one).
    name: me.name ?? nameOf(player, index),
    tactical: {
      role,
      // Right after another battle, the map sprite is still the hidden one: take the graphic it stashed.
      battler: own.battler ?? (me.graphic === TACTICAL_HIDDEN_GRAPHIC ? stashed.get(player.id)?.[0] : me.graphic) ?? "hero",
      ...(own.portrait ? { portrait: own.portrait } : {}),
      ...(own.tint !== undefined ? { tint: own.tint } : {}),
      stats: {
        hp: maxHp,
        sp: maxSp,
        power: own.stats?.power ?? (me.params.str || me.params.atk || 20),
        range: own.stats?.range ?? 1,
        move: own.stats?.move ?? 3,
      },
      skills,
      items,
      params: { ...me.params, ...own.params },
      // A knocked-out player (0 HP) joins knocked out: a battle is no free revival.
      current: { hp: hpNow, sp: spNow },
      player: player.id,
    },
  };
}

/**
 * Replaces the `hero: true` placements of an encounter by the heroes of the players of the battle: `seat` is the index of the player
 * in its side; without it, the placements take the players of the side in order. A hero without a player (a seat nobody takes) is
 * left out; two placements on one seat are refused.
 */
function withHeroes(setup: EncounterSetup, players: RpgPlayer[], versus: RpgPlayer[]): EncounterSetup {
  const place = (side: Team, list: Placement[], sidePlayers: RpgPlayer[]) => {
    // Without a `seat`, a hero placement takes the first player of the side that no other placement takes: two placements never
    // take the same player.
    const explicit = new Set(list.filter((p) => p.hero && p.seat !== undefined).map((p) => p.seat!));
    const taken = new Set<number>();
    let next = 0;
    return list.flatMap((p) => {
      if (!p.hero) return [p];
      let seat = p.seat;
      if (seat === undefined) {
        while (taken.has(next) || explicit.has(next)) next++;
        seat = next;
      }
      if (taken.has(seat)) throw new Error(`[Tactical] Two hero placements of the ${side} side take the seat ${seat}`);
      taken.add(seat);
      const player = sidePlayers[seat];
      if (!player) return [];
      setup.units[heroUnitId(player)] = heroUnit(player, side, seat, setup, side === "enemy" ? players.length + seat : seat);
      return [{ ...p, unit: heroUnitId(player) }];
    });
  };
  const data = { ...setup.data, allies: place("ally", setup.data.allies, players), enemies: place("enemy", setup.data.enemies, versus) };
  return { ...setup, data };
}

const RULE_HOOKS = ["onDamage", "onJudge", "onAction", "onMove", "onDefeat", "onPhase"] as const;

/** The damage formulas of the map of a player (`damagePhysic`, `damageSkill`) as a rule hook. */
const formulaHook = (player: RpgPlayer): RulesHooks =>
  nativeDamageHook((name) => {
    try {
      return (player as any).getFormulas?.(name);
    } catch {
      return undefined;
    }
  });

/** Rule hooks of the plugin option and of game modules (`tactical: { onDamage }`). */
function ruleHooks(player: RpgPlayer, battle: () => TacticalBattleHandle): RulesHooks[] {
  // The damage is the one of the formulas of the map (as in the turn-based battle); the hooks of the game adjust it
  const list: RulesHooks[] = [formulaHook(player)];
  // The rule hooks of a game also get the leader and the battle (`TacticalRuleContext`)
  const withBattle = (fn: (ctx: never) => unknown) => (ctx: object) => fn({ ...ctx, player, battle: battle() } as never);
  for (const name of RULE_HOOKS)
    for (const fn of hooks.functions(player, name)) list.push({ [name]: withBattle(fn as (ctx: never) => unknown) } as RulesHooks);
  return list;
}

/** Async hooks (option, then game modules): their results. */
const callHooks = <K extends keyof TacticalServerHooks & string>(player: RpgPlayer, name: K, ...args: BattleHookArgs<TacticalServerHooks, K>) =>
  hooks.call(player, name, ...args);

/** The width of a tile of the player's map: the size of a cell when the encounter gives none, so the battle is drawn at the scale of the map. */
function mapTile(player: RpgPlayer): number | undefined {
  const width = Number(read(() => val((player.getCurrentMap() as unknown as { tileWidth?: unknown } | null)?.tileWidth)));
  return width > 0 ? width : undefined;
}

/** The grid centred on the player when the encounter does not place it, its cells on the tiles of the map. */
function aroundPlayer(player: RpgPlayer, setup: EncounterSetup, cellSize?: number): Cell {
  const cell = setup.data.board?.cellSize ?? cellSize ?? DEFAULT_BOARD.cellSize;
  const columns = setup.data.board?.columns ?? DEFAULT_BOARD.columns;
  const rows = setup.data.board?.rows ?? DEFAULT_BOARD.rows;
  const x = Number(read(() => val((player as any).x))) || 0;
  const y = Number(read(() => val((player as any).y))) || 0;
  const tile = mapTile(player) ?? cell;
  // The player's tile is the centre cell (or the one left/above it when the count is even).
  const snap = (v: number) => Math.floor(v / tile) * tile;
  return { x: snap(x) - Math.floor((columns - 1) / 2) * cell, y: snap(y) - Math.floor((rows - 1) / 2) * cell };
}

/**
 * Starts a tactical battle and waits for its outcome. The map stays loaded:
 * the grid is drawn on it (component animation) and the HUD is a GUI. The
 * server owns the battle; the heroes of the players (`hero: true` placements)
 * are read from them and their HP, SP and spent items are written back before
 * `tactical.onEnd` runs. Standalone RPG and MMORPG; in MMORPG every player must
 * be on the leader's map.
 *
 * @title startTacticalBattle
 * @method startTacticalBattle(player, encounter, options?)
 * @param {RpgPlayer} player - The player who fights (solo), or the group options
 * @param {string | TacticalEncounterRecord} encounter - An encounter of the database (id) or an encounter object
 * @param {StartTacticalBattleOptions} [options] - Where the grid goes
 * @returns {Promise<TacticalResult>} The outcome as the first side lives it
 * @example
 * ```ts
 * import { startTacticalBattle } from "@rpgjs/tactical-rpg/server";
 *
 * const result = await startTacticalBattle(player, "sanctuary");
 * // Coop: each player commands their own allies (placement `seat`, dealt in turn otherwise).
 * await startTacticalBattle({ players: [alice, bob], encounter: "sanctuary" });
 * // PvP: the opposing side commands the enemies of the encounter.
 * await startTacticalBattle({ players: [alice], versus: [bob], encounter: "arena" });
 * ```
 */
export function startTacticalBattle(player: RpgPlayer, encounter: string | TacticalEncounterRecord, options?: StartTacticalBattleOptions): Promise<TacticalResult>;
export function startTacticalBattle(group: TacticalBattleGroupOptions): Promise<TacticalResult>;
export async function startTacticalBattle(
  a: RpgPlayer | TacticalBattleGroupOptions,
  encounterArg?: string | TacticalEncounterRecord,
  startArg: StartTacticalBattleOptions = {},
): Promise<TacticalResult> {
  const group = isBattleGroup(a) ? a : null;
  const { players, versus, everyone, spectators } = battleParticipants("Tactical", group ?? { players: [a as RpgPlayer] });
  const encounter = group ? group.encounter : encounterArg!;
  const start = group ?? startArg;
  // Reserve the players before any await: a double trigger must not open two battles.
  const release = battles.reserve(everyone);
  try {
    return await run(players, versus, encounter, start, spectators);
  } finally {
    // Seats free their own player when their HUD closes; this only covers a failed start.
    release();
  }
}

/**
 * Takes a player out of their battle (as a disconnection does: their units go
 * to a partner, a side left without players loses) and waits until their HUD
 * is closed. Server only.
 *
 * @title stopTacticalBattle
 * @method stopTacticalBattle(player)
 * @param {RpgPlayer} player - A fighter or a spectator
 * @returns {Promise<void>} Resolves once the HUD of the player is closed
 * @example
 * ```ts
 * await stopTacticalBattle(player);
 * ```
 */
export function stopTacticalBattle(player: RpgPlayer): Promise<void> {
  return battles.stop(player);
}

/**
 * A text of the battle in the language of a player (the i18n service of the server, where the game overrides the `tactical.*`
 * keys), the English default when the player has no i18n service.
 */
function playerText(player: RpgPlayer, key: string, params: Record<string, string | number> = {}): string {
  const said = read(() => player.t?.(key, params));
  if (typeof said === "string" && said && said !== key) return said;
  const text = (TACTICAL_I18N.en as Record<string, string>)[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/** The name of a player: a guest of an online game has none, and is called by the `tactical.player` text with their seat, never by their id. */
const nameOf = (player: RpgPlayer, index = 0) => battlePlayerName(player, playerText(player, "tactical.player", { index: index + 1 }));

/**
 * Hide the player's map sprite during the battle. Kept hidden: a map module may
 * apply the hero's appearance later (Studio does it asynchronously). A
 * transparent graphic, not an empty list: the client keeps the previous sprite
 * when the list is emptied. Returns the restore function.
 */
function hidePlayer(player: RpgPlayer): (now?: boolean) => void {
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
  let restored = false;
  return (now = false) => {
    if (restored) return;
    restored = true;
    clearInterval(hidden);
    if (!graphics.length) return;
    const restore = graphics;
    // A player who leaves (disconnection, stop) gets their graphics back at once: their session is saved right after, and
    // must not keep the hidden graphic.
    if (now) {
      stashed.delete(player.id);
      read(() => player.setGraphic(restore));
      return;
    }
    // Otherwise restored on the next tick, unless a new battle started meanwhile (no flicker between two battles).
    stashed.set(player.id, restore);
    setTimeout(() => {
      if (battles.isIn(player)) return;
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
  restore: (now?: boolean) => void;
}

/** A spectator: their GUI (read-only HUD). */
interface Watcher {
  player: RpgPlayer;
  gui: ReturnType<RpgPlayer["gui"]>;
  done: Promise<void>;
  restore: (now?: boolean) => void;
}

async function run(
  players: RpgPlayer[],
  versus: RpgPlayer[],
  encounter: string | TacticalEncounterRecord,
  start: StartTacticalBattleOptions,
  spectators: RpgPlayer[],
) {
  const leader = players[0];
  const setup = withHeroes(resolveEncounter(leader, encounter), players, versus);
  const cellSize = mapTile(leader);
  let state = createTacticalBattle(setup, {
    id: `${leader.id}:${Date.now().toString(36)}`,
    cellSize,
    origin: start.origin ?? aroundPlayer(leader, setup, cellSize),
    players: players.map((p, index) => ({ id: p.id, name: nameOf(p, index) })),
    versus: versus.map((p, index) => ({ id: p.id, name: nameOf(p, players.length + index) })),
  });
  // A player who would command nothing (no hero placement for them, no unit dealt to them) is not taken into the battle.
  const idle = [...players, ...versus].find((p) => !state.units.some((u) => u.owner === p.id));
  if (idle) throw new Error(`[Tactical] Player ${idle.id} has no unit in this encounter: give it a hero placement (seat) for each player`);
  const watchers = new Map<string, Watcher>();
  const handle: TacticalBattleHandle = {
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
  // The forecast of a client is the damage of the map's formulas, which only the server has. The hooks of the game are left out:
  // they may do more than return an amount, and they run when the action is played.
  const formulas = [formulaHook(leader)];
  const shown = (seat?: Seat, damage = damageTable(state, formulas)): BattleState => ({
    ...state,
    ...(Object.keys(damage).length ? { damage } : {}),
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
    const damage = damageTable(state, formulas);
    for (const seat of present()) seat.gui.update({ ...packet, state: shown(seat, damage) });
    for (const watcher of watchers.values()) watcher.gui.update({ ...packet, state: shown(undefined, damage) });
  };
  /** Items each hero carried when the battle began: what is missing at the end was spent. */
  const heroItems = new Map(state.units.filter((u) => u.player).map((u) => [u.player!, { ...u.items }]));
  /**
   * Writes the outcome of their hero on each player still in the battle: HP, SP and spent items. Nothing between players (PvP), and
   * nothing for a player who left.
   */
  const commit = () => {
    if (versus.length) return;
    for (const seat of present()) {
      const hero = state.units.find((u) => u.player === seat.player.id);
      if (!hero) continue;
      const before = heroItems.get(seat.player.id) ?? {};
      const usedItems = Object.fromEntries(Object.entries(before).map(([id, n]) => [id, n - (hero.items[id] ?? 0)]).filter(([, n]) => (n as number) > 0));
      writeBattlePlayer(seat.player, { hp: hero.hp, sp: hero.sp, usedItems }, "Tactical");
    }
  };
  const finish = async () => {
    if (ended || !state.winner) return;
    ended = true;
    clearTimeout(timer);
    clearTimeout(clock);
    clearTimeout(readyClock);
    commit();
    for (const seat of present()) await callHooks(seat.player, "onEnd", seat.player, handle, result(seat.team));
  };
  // Enemy phase: one AI action every `enemyDelay` ms (the clients play each one).
  /** How long the last action of the AI plays: the next one waits for it. */
  let aiLength = 0;
  const schedule = () => {
    // PvP: the enemies are players, no AI.
    if (versus.length || state.phase !== "enemy" || state.winner || !state.started || !present().length) return;
    /** Plays a command of the AI; `false` when the rules refuse it. */
    const play = (command: Command): boolean => {
      try {
        const out = transition(state, command, "enemy", hooks);
        state = out.state;
        busyUntil = 0;
        aiLength = wait(out.event, command.type === "move" ? 1100 : 1450, 50) * pace();
        arm();
        send({ event: out.event });
      } catch (error) {
        console.warn("[Tactical] AI command refused", command, error);
        return false;
      }
      if (state.winner) void finish().catch((error) => console.error("[Tactical] end of battle failed", error));
      else schedule();
      return true;
    };
    /** The AI has nothing (or nothing valid) to play: the enemy phase ends, so the battle never stops there. */
    const giveUp = () => {
      if (state.winner || state.phase !== "enemy" || !present().length) return;
      if (!play({ type: "endPhase" })) console.error("[Tactical] the enemy phase could not end");
    };
    timer = setTimeout(async () => {
      let suggested: Command | null | undefined;
      try {
        suggested = ai(state);
      } catch (error) {
        console.warn("[Tactical] AI failed", error);
      }
      if (!suggested) return giveUp();
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
      if (!play(command)) giveUp();
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
    (queue = queue
      .then(async () => {
        if (!deadline || ended || state.winner || !present().length) return;
        // Actions played meanwhile gave their time back
        if (Date.now() < deadline) return watch();
        const out = transition(state, { type: "endPhase" }, state.phase, hooks);
        state = out.state;
        arm();
        send({ event: { ...out.event, timeout: true } });
        if (state.winner) await finish();
        else schedule();
      })
      // A failing hook must not reject the queue: every later order would be skipped.
      .catch((error) => console.error("[Tactical] end of the phase failed", error)));

  // Orders one at a time, whoever gives them (veto hooks are async).
  let queue = Promise.resolve();
  /** Started once a player is ready and the others are not (`turnSeconds`): the battle then starts without them. */
  let readyClock: ReturnType<typeof setTimeout> | undefined;
  const startAnyway = (seat: Seat) =>
    (queue = queue
      .then(async () => {
        if (ended || state.started || state.winner || !present().length) return;
        const who = seat.present ? seat : present()[0];
        const out = transition(state, { type: "start" }, who.team, hooks, who.player.id);
        state = { ...out.state, ready: [] };
        wait(out.event, 1200, 300);
        arm();
        send({ event: out.event });
        if (state.winner) await finish();
        else schedule();
      })
      .catch((error) => console.error("[Tactical] start failed", error)));
  const order = (seat: Seat, env: CommandEnvelope) =>
    (queue = queue.then(async () => {
      if (!seat.present) return;
      try {
        if (!env?.command) throw new Error("tactical.error.action");
        // Coop: a partner may have acted meanwhile. Their order still goes
        // through if the rules accept it, once the current animation is over.
        const coop = seats.size > 1;
        if (env.revision !== state.revision && !coop) throw new Error("tactical.error.stale");
        if (Date.now() < busyUntil) {
          if (!coop) throw new Error("tactical.error.busy");
          await new Promise((resolve) => setTimeout(resolve, busyUntil - Date.now()));
          if (!seat.present || state.winner) return;
        }
        const vetoed = (await callHooks(seat.player, "onCommand", seat.player, handle, env)).includes(false);
        if (vetoed) throw new Error("tactical.error.refused");
        if (env.command.type === "start") {
          // Coop: the battle starts once every player is ready.
          if (state.started) throw new Error("tactical.error.started");
          state = { ...state, ready: [...new Set([...state.ready, seat.player.id])] };
          if (present().some((s) => !state.ready.includes(s.player.id))) {
            // A partner who never presses Begin does not hold the others: the battle starts after the time of a phase.
            if (limit > 0 && !readyClock) readyClock = setTimeout(() => startAnyway(seat), limit * 1000);
            return send({});
          }
        }
        const out = transition(state, env.command, seat.team, hooks, seat.player.id);
        state = { ...out.state, ready: [] };
        if (env.command.type === "start") clearTimeout(readyClock);
        // A move sent with its action was already walked on the screen of the player who gave it: alone, nobody else plays it,
        // so the server waits only for the action (the next order would be refused as too early).
        if (!(env.then && env.command.type === "move" && !coop)) wait(out.event, env.command.type === "move" ? 900 : 1200, 300);
        arm();
        send({ event: out.event });
        // The action that follows a move, in the same order: clients queue its
        // packet behind the move animation.
        if (env.then && !state.winner) {
          const next = { revision: state.revision, command: env.then };
          if ((await callHooks(seat.player, "onCommand", seat.player, handle, next)).includes(false)) throw new Error("tactical.error.refused");
          const after = transition(state, env.then, seat.team, hooks, seat.player.id);
          state = { ...after.state, ready: [] };
          wait(after.event, 1200, 300);
          arm();
          send({ event: after.event });
        }
        // The order went through: a hook of the end that fails is logged, not answered as a refused order.
        if (state.winner) await finish().catch((error) => console.error("[Tactical] end of battle failed", error));
        else schedule();
      } catch (error) {
        // A refusal of the rules is a text of the battle; anything else (a hook of the game that failed) is logged, and the
        // player reads that the order did not go through.
        const refusal = error instanceof Error && error.message.startsWith("tactical.");
        if (!refusal) console.error("[Tactical] order failed", error);
        seat.gui.update({ state: shown(seat), error: refusal ? error.message : "tactical.error.action" });
      }
    }).catch((error) => console.error("[Tactical] order failed", error)));

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
        if (cell) seat.gui.update({ state: shown(seat), error: error instanceof Error ? error.message : "tactical.error.move" });
      }
    }).catch((error) => console.error("[Tactical] hold failed", error)));

  /**
   * A player leaves (disconnection, stopTacticalBattle): their units go to a partner
   * of their side. PvP: a side left without players loses by forfeit.
   */
  const leave = (player: RpgPlayer) => {
    const watcher = watchers.get(player.id);
    if (watcher) {
      watcher.restore(true);
      return void watcher.gui.close(null);
    }
    const seat = seats.get(player.id);
    if (!seat?.present) return;
    seat.present = false;
    seat.restore(true);
    battles.release(player, session);
    seat.gui.close(null);
    if (!present().length) {
      clearTimeout(timer);
      clearTimeout(clock);
      return;
    }
    const heir = present().find((s) => s.team === seat.team);
    // A duel as it was before they left: their side forfeits it below.
    const before = state;
    state = {
      ...state,
      holds: (state.holds ?? []).filter((h) => h.owner !== player.id),
      ready: state.ready.filter((id) => id !== player.id),
      players: state.players.filter((p) => p.id !== player.id),
      versus: state.versus.filter((p) => p.id !== player.id),
      units: heir ? state.units.map((u) => (u.owner === player.id ? { ...u, owner: heir.player.id } : u)) : state.units,
    };
    // The name the battle gave them (a guest has the one of their seat).
    send({ left: [...before.players, ...before.versus].find((p) => p.id === player.id)?.name ?? nameOf(player), leftTeam: seat.team });
    if (!heir) {
      if (state.winner) return;
      const winner = (seat.team === "ally" ? "enemy" : "ally") as Team;
      const out = state.started
        ? transition(before, { type: "surrender" }, seat.team, hooks)
        : { state: { ...state, started: true, winner }, event: { kind: "surrender" as const, team: seat.team } };
      // The outcome of the forfeit, with the players who are still there.
      state = { ...state, started: true, winner: out.state.winner, revision: out.state.revision };
      arm();
      send({ event: out.event });
      void finish().catch((error) => console.error("[Tactical] end of battle failed", error));
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
      if (battles.isIn(spectator) || !present().length) return false;
      if (!sameBattleMap(spectator, leader)) return false;
      // Seated before the (async) veto: no double watch.
      if (!battles.seat(spectator, session)) return false;
      let done: () => void = () => {};
      const watcher: Watcher = { player: spectator, gui: spectator.gui(TACTICAL_GUI), done: new Promise<void>((r) => (done = r)), restore: () => {} };
      try {
        const refused = (await callHooks(spectator, "onSpectate", spectator, handle)).includes(false);
        if (refused || !present().length) return false;
        watchers.set(spectator.id, watcher);
        if (options.hidePlayer !== false) watcher.restore = hidePlayer(spectator);
        // A spectator can leave at any time.
        watcher.gui.on("close", () => watcher.gui.close(null));
        state = { ...state, spectators: watchers.size };
        send({});
        try {
          await watcher.gui.open({ state: shown() } satisfies BattlePacket, { waitingAction: true, blockPlayerInput: true });
        } finally {
          watchers.delete(spectator.id);
          watcher.restore();
          state = { ...state, spectators: watchers.size };
          send({});
        }
        return true;
      } finally {
        battles.release(spectator, session);
        done();
      }
    },
  };
  battles.open(session, [...players, ...versus]);

  for (const player of [...players, ...versus]) {
    const gui = player.gui(TACTICAL_GUI);
    const seat: Seat = { player, team: versus.includes(player) ? "enemy" : "ally", gui, present: true, pace: 1, done: Promise.resolve(), restore: () => {} };
    seats.set(player.id, seat);
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
  try {
    await callHooks(leader, "onSetup", leader, handle, state);
    for (const seat of seats.values()) await callHooks(seat.player, "onStart", seat.player, handle);
  } catch (error) {
    // The battle does not open: its players are shown again and freed, and the game gets the error.
    clearTimeout(timer);
    clearTimeout(clock);
    for (const seat of seats.values()) {
      seat.present = false;
      seat.restore(true);
      battles.release(seat.player, session);
    }
    battles.close(session);
    throw error;
  }
  for (const spectator of spectators)
    session.watch(spectator).catch((error) => console.error("[Tactical] a spectator could not join", spectator.id, error));
  for (const seat of seats.values()) {
    seat.done = (async () => {
      try {
        if (seat.present)
          await seat.gui.open({ state: shown(seat) } satisfies BattlePacket, { waitingAction: true, blockPlayerInput: true });
      } finally {
        seat.present = false;
        battles.release(seat.player, session);
        seat.restore();
      }
    })();
  }
  try {
    await Promise.all([...seats.values()].map((s) => s.done));
  } finally {
    clearTimeout(timer);
    clearTimeout(clock);
    battles.close(session);
    // Every player has left: the spectators go back to the map.
    for (const watcher of watchers.values()) watcher.gui.close(null);
  }
  return result();
}

/**
 * Does the player fight or watch a tactical battle (or is one being prepared
 * for them)? Server only.
 *
 * @title isInTacticalBattle
 * @method isInTacticalBattle(player)
 * @param {RpgPlayer} player - The player
 * @returns {boolean} True while the player is in a battle
 * @example
 * ```ts
 * if (isInTacticalBattle(player)) return;
 * ```
 */
export function isInTacticalBattle(player: RpgPlayer): boolean {
  return battles.isIn(player);
}

/**
 * The battle a player plays in (not one they watch), or a battle by id.
 * Server only.
 *
 * @title getTacticalBattle
 * @method getTacticalBattle(target)
 * @param {RpgPlayer | string} target - A fighting player or a battle id
 * @returns {TacticalBattleHandle | undefined} The running battle
 * @example
 * ```ts
 * getTacticalBattle(player)?.state().round;
 * ```
 */
export function getTacticalBattle(target: RpgPlayer | string): TacticalBattleHandle | undefined {
  return battles.get(target);
}

/**
 * Watches a running battle: the spectator sees every action live (even
 * joining mid-fight) but commands nothing, and leaves with the back control.
 * Resolves when the spectator leaves; `false` when there is nothing to watch,
 * the spectator is busy or on another map, or `tactical.onSpectate` refused.
 * Server only.
 *
 * @title watchTacticalBattle
 * @method watchTacticalBattle(spectator, target)
 * @param {RpgPlayer} spectator - The player who watches
 * @param {RpgPlayer | string} target - A fighting player or a battle id
 * @returns {Promise<boolean>} Whether the spectator watched
 * @example
 * ```ts
 * await watchTacticalBattle(player, fighter);
 * ```
 */
export function watchTacticalBattle(spectator: RpgPlayer, target: RpgPlayer | string): Promise<boolean> {
  return battles.watch(spectator, target);
}

/**
 * Server side of the tactical battle: the rules and the AI, the sessions
 * (solo, coop, PvP, spectators), the battle data read from the RPGJS database
 * (the `tactical` field of skills, units, roles and encounters; the native
 * fields of skills and items), the heroes read from the players and the
 * hooks. Pair it with `provideTacticalClient`. Standalone RPG and MMORPG.
 *
 * @title provideTacticalServer
 * @method provideTacticalServer(options?)
 * @param {TacticalServerOptions} [options] - Data, AI, timing, hero, hooks
 * @returns {RpgProvider[]} The providers of the server module
 * @example
 * ```ts
 * import { provideTacticalServer } from "@rpgjs/tactical-rpg/server";
 *
 * export default createServer({
 *   providers: [provideTacticalServer({ turnSeconds: 45 }), provideServerModules([])],
 * });
 * ```
 */
export function provideTacticalServer(opts: TacticalServerOptions = {}) {
  options = opts;
  hooks = new BattleServerHooks<TacticalServerHooks>("tactical", opts.hooks);
  return createModule("Tactical", [
    {
      server: defineModule<RpgServer>({
        i18n: TACTICAL_I18N,
        player: {
          onDisconnected(player: RpgPlayer) {
            battles.disconnect(player);
          },
        },
      } as RpgServer),
    },
  ]);
}
