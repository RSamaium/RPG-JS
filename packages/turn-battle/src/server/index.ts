import { createModule } from "@rpgjs/common";
import { defineModule, type RpgPlayer, type RpgServer } from "@rpgjs/server";
import {
  BattleServerHooks,
  BattleSessions,
  sameBattleMap,
  battleParticipants,
  isBattleGroup,
  plainValue,
  type BattleGroupOptions,
  type BattleHandleBase,
  type BattleSession,
  type BattleHookArgs,
} from "@rpgjs/battle-kit/server";
import {
  TURN_BATTLE_GUI,
  TURN_BATTLE_I18N,
  beginBattle,
  createBattle,
  createRng,
  createRules,
  forfeit,
  mirrorBeats,
  mirrorResult,
  mirrorView,
  runAuto,
  runCommand,
  setAuto,
  syncVitals,
  toView,
  withHooks,
  type AiFn,
  type Beat,
  type TriggerCall,
  type BattlePacket,
  type BattleResult,
  type BattleState,
  type BattleView,
  type Catalog,
  type Combatant,
  type CombatantDef,
  type CommandEnvelope,
  type CommandType,
  type Formulas,
  type ItemDef,
  type RulesContext,
  type RulesHooks,
  type Side,
  type SkillDef,
  type TroopDef,
  commandInfo,
  type CustomCommand,
  type SummonDef,
} from "../core";
import { commandFromDb, skillCommandFromDb, dbRecord, enemyFromDb, heroFromDb, itemFromDb, skillFromDb, summonFromDb, summonFromEnemy, troopFromDb, weaponFromDb, type EnemyDef, type HeroDef } from "./database";
import { nativeFormulas } from "./native-formulas";
import { commitPlayer, heroIdOf, playerText, readInventory, readPlayer } from "./snapshot";

// Public surface of `@rpgjs/turn-battle/server`: the data helpers, the texts and the types a game writes or reads in its
// options and hooks. The battle engine itself (rules, turn order, synchronisation) stays internal.
export { DEFAULT_HERO_STATS } from "./snapshot";
export type { EnemyDef, HeroDef } from "./database";
export {
  TURN_BATTLE_I18N,
  defaultAi,
  defaultFormulas,
  turnBattleAction,
  turnBattleCommand,
  turnBattleEnemy,
  turnBattleItem,
  turnBattleSkill,
  turnBattleSummon,
  turnBattleTroop,
  turnBattleWeapon,
} from "../core";
export type {
  // Battle model (hooks, `getTurnBattle(...).state()`, results)
  AttackStyle,
  BattleResult,
  BattleState,
  BattleView,
  Beat,
  Catalog,
  Combatant,
  CombatantDef,
  Command,
  CommandEnvelope,
  CommandInfo,
  CommandOptionInfo,
  CommandRule,
  CommandType,
  ForbiddenCommand,
  Hit,
  ItemDef,
  Rewards,
  Side,
  SkillDef,
  SkillKind,
  SkillPhase,
  SkillVisualEffects,
  Snap,
  StagePosition,
  Stats,
  SummonDef,
  TargetScope,
  TriggerCall,
  TroopDef,
  TroopMember,
  // Rules: hooks, AI, formulas, custom commands
  AiContext,
  AiFn,
  CommandActions,
  CommandContext,
  CustomCommand,
  Formulas,
  HitContext,
  Loot,
  Rng,
  RulesHooks,
  // Database records (`turnBattle*` helpers)
  ActionEffect,
  BattleActionRecord,
  BattleParameters,
  BuiltinFxName,
  EffectTarget,
  ElementName,
  EnemyBattleData,
  EnemyReward,
  FxName,
  FxPresetName,
  ItemBattleData,
  ParameterCurve,
  SkillBattleData,
  SummonBattleData,
  SummonChoice,
  TroopBattleData,
  TurnBattleEnemyBattleRecord,
  TurnBattleEnemyRecord,
  TurnBattleItemRecord,
  TurnBattleSkillRecord,
  TurnBattleSummonRecord,
  TurnBattleTroopBattleRecord,
  TurnBattleTroopRecord,
  TurnBattleWeaponRecord,
  WeaponBattleData,
  WeaponType,
} from "../core";

/**
 * A running turn-based battle, as the hooks and `getTurnBattle` see it.
 * Server only: the server owns the state of the battle.
 */
export interface TurnBattleHandle extends BattleHandleBase {
  /** Every player fighting (coop, PvP), leader first. */
  players: RpgPlayer[];
  troop: TroopDef;
  /** Current authoritative state (read-only for hooks). */
  state(): BattleView;
}

/**
 * Server hooks of the turn-based battle. A game module declares them under
 * the `turnBattle` key; `provideTurnBattleServer({ hooks })` takes them too.
 *
 * ```ts
 * defineModule<RpgServer>({
 *   turnBattle: {
 *     onStart(player, battle) {},
 *     onCommand(player, battle, env) { return false }, // veto
 *     onDamage({ target, amount }) { return amount * 2 },
 *     onEnd(player, battle, result) {},
 *   },
 * })
 * ```
 *
 * Rule hooks (`onDamage`, `onTurnStart`, `onChooseAction`, `onAction`) are synchronous.
 */
export interface TurnBattleServerHooks extends RulesHooks {
  /** The battle starts, for each fighting player. */
  onStart?(player: RpgPlayer, battle: TurnBattleHandle): void | Promise<void>;
  /** Return `false` to refuse a hero command. */
  onCommand?(player: RpgPlayer, battle: TurnBattleHandle, env: CommandEnvelope): boolean | void | Promise<boolean | void>;
  /** The battle is over, for each fighting player (after the result is written on the player). */
  onEnd?(player: RpgPlayer, battle: TurnBattleHandle, result: BattleResult): void | Promise<void>;
  /** A player wants to watch the battle: return `false` to refuse (private fight, distance…). */
  onSpectate?(spectator: RpgPlayer, battle: TurnBattleHandle): boolean | void | Promise<boolean | void>;
}

declare module "@rpgjs/server" {
  interface RpgServer {
    /** Server hooks of the turn-based battle (`@rpgjs/turn-battle`). */
    turnBattle?: TurnBattleServerHooks;
  }
}

export interface TurnBattleServerOptions {
  /** Extra battle data; the RPGJS database is read first (see `database.ts`). */
  skills?: Record<string, SkillDef>;
  items?: Record<string, ItemDef>;
  enemies?: Record<string, EnemyDef>;
  troops?: Record<string, TroopDef>;
  /** How the player's own character looks and fights (battler id, limit, fallback stats…). */
  hero?: (player: RpgPlayer, ctx: PartyContext) => Partial<CombatantDef> & { battler: string };
  /** Companions fighting next to the player (owned and commanded by the player). */
  party?: (player: RpgPlayer, ctx: PartyContext) => CombatantDef[];
  /**
   * Seconds a player has to pick a command before guarding automatically.
   * Default: 30 in coop, none in solo. `false` disables it.
   */
  turnTimer?: number | false;
  /**
   * Read HP/SP and parameters from the RpgPlayer (default). Set to false when
   * the map game uses another balance: `hero().stats` is used instead.
   */
  nativeStats?: boolean;
  /**
   * Damage formulas. `"native"` (default) uses the formulas of the map (`damagePhysic`, `damageSkill`,
   * `damageCritical`, `damageGuard`) when it has them, `"plugin"` always the ones of the plugin, and an object
   * overrides some of the plugin ones.
   */
  formulas?: "native" | "plugin" | Partial<Formulas>;
  /** Battler of the units whose record has none: the hero and companions (`ally`) or the enemies (`enemy`). */
  battlers?: { ally?: string; enemy?: string };
  /**
   * Turns a record of another source into the shape the plugin reads, per kind of record (an enemy shaped as an
   * RPGJS actor, a troop with `enemies`, a skill with the native fields…). Called with the raw record, its id and
   * `lookup`, which reads another record of the database by id (the Visual Effect a skill names).
   */
  adapt?: Partial<Record<"enemy" | "troop" | "skill" | "item" | "weapon" | "summon" | "command", (raw: Record<string, unknown>, id: string, lookup?: (id: string) => Record<string, unknown> | undefined) => Record<string, unknown> | undefined>>;
  ai?: Record<string, AiFn>;
  weights?: Partial<Record<CommandType, number>>;
  /** Hooks declared by the plugin user without a module. */
  hooks?: TurnBattleServerHooks;
  /**
   * Custom commands ("Steal", "Scan"…), given to units with `commands: [...]`
   * (hero, companions, enemies). See `turnBattleCommand`.
   */
  commands?: Record<string, CustomCommand>;
  /**
   * Runs a trigger of a skill (`cast`, `impact`, `defeat`: what the skill does besides the battle) for the player who used it
   * (the first player when an enemy did). Called once the action is sent to the players, in the order of the battle; an
   * error is logged and the battle goes on.
   */
  runTrigger?: (player: RpgPlayer, call: TriggerCall) => void | Promise<void>;
  /**
   * Tells whether a member of a troop that has a `condition` fights this time: called with the player who starts the battle
   * (the first one in coop) and the condition of the member. A member for which it returns false is left out of the troop.
   */
  enemyCondition?: (player: RpgPlayer, condition: unknown) => boolean;
  /**
   * Creatures for `act.summon(id)`. Database records (`turnBattleSummon`) are
   * found too when their id is an option of a command.
   */
  summons?: Record<string, SummonDef>;
}

/** Who is fighting, given to `hero` / `party` (e.g. fewer companions in coop). */
export interface PartyContext {
  /** Players of this player's side. */
  players: RpgPlayer[];
  /** Index of this player in `players` (0 = leader of the side). */
  index: number;
  /** `enemy` for the challenged side of a PvP battle. */
  side: Side;
  /** Player versus player battle. */
  pvp: boolean;
}

/** Options of a turn-based battle, solo or in a group. */
export interface StartTurnBattleOptions {
  seed?: number;
  /** Music of the battle when the troop has none (`troop.bgm` wins). */
  bgm?: string;
  /** Music of the victory when the troop has none (`troop.victoryBgm` wins). */
  victoryBgm?: string;
  /** Background of the battle when the troop has none (`troop.background` wins). */
  background?: string;
  /** Replace the configured companions for this battle (solo). */
  party?: CombatantDef[];
  /**
   * Fight with these allies instead of the hero of the player and its companions (solo): each one needs its `name`,
   * `battler` and `stats`, and is commanded by the player. For a test, or a story where the party is not the
   * player's character. The battle gives them their ids: the first is the hero of the player (`heroId`), the
   * others `ally<n>:<player id>`.
   */
  heroes?: HeroDef[];
  /**
   * The heroes of some players of a group battle, by player id: the hero a player chose (an actor of the database, at a level) replaces the one
   * read from the player; the players that are not here keep theirs.
   */
  heroesByPlayer?: Record<string, HeroDef[]>;
  /** Override the `turnTimer` option for this battle. */
  turnTimer?: number | false;
}

/**
 * Several players: coop against a troop (`players` + `troop`), or PvP
 * (`players` against `versus`, optionally with monsters from `troop`).
 * `spectators` watch from the start (see `watchTurnBattle` to join later).
 */
export interface TurnBattleGroupOptions extends StartTurnBattleOptions, BattleGroupOptions {
  troop?: TroopDef | string;
  /** Backdrop / music of a PvP battle without troop. */
  background?: string;
  bgm?: string;
}

/** One connected player in a battle: their GUI, and whether they are still there. */
interface Seat {
  player: RpgPlayer;
  /** PvP: this player gave up (the side forfeits once all its players did). */
  surrendered?: boolean;
  /** Side of a fighter; its client sees the battle from there (PvP). */
  side: Side;
  /** Spectators receive every packet but cannot command anything. */
  role: "fighter" | "spectator";
  gui: ReturnType<RpgPlayer["gui"]>;
  /** Resolves when this player closes the result screen (or leaves). */
  done?: Promise<unknown>;
  left: boolean;
  /** This fighter closed the result screen: their GUI may already show another battle, nothing is sent to it any more. */
  closed?: boolean;
}

interface Session extends BattleSession<TurnBattleHandle> {
  seats: Map<string, Seat>;
}

let options: TurnBattleServerOptions = {};
let rules: RulesContext = createRules();
/** The running turn-based battles and the players they hold (fighters and spectators). */
const battles = new BattleSessions<TurnBattleHandle>("TurnBattle");
let hooks = new BattleServerHooks<TurnBattleServerHooks>("turnBattle");

const RULE_HOOKS = ["onTurnStart", "onChooseAction", "onDamage", "onAction"] as const;

/** Rule hooks declared in game modules (`turnBattle: { onDamage }`), read synchronously. The option's are in `rules`. */
function moduleRuleHooks(player: RpgPlayer): RulesHooks[] {
  const modules = new BattleServerHooks<TurnBattleServerHooks>("turnBattle");
  return RULE_HOOKS.flatMap((name) => modules.functions(player, name).map((fn) => ({ [name]: fn }) as RulesHooks));
}

/** Async hooks (option, then game modules): their results. */
const callHooks = <K extends keyof TurnBattleServerHooks & string>(player: RpgPlayer, name: K, ...args: BattleHookArgs<TurnBattleServerHooks, K>) =>
  hooks.call(player, name, ...args);

/** A record of the RPGJS database, converted by the `adapt` option of its kind when there is one. */
function record(player: RpgPlayer, kind: keyof NonNullable<TurnBattleServerOptions["adapt"]>, id: string) {
  const raw = dbRecord(player, id);
  return raw ? (options.adapt?.[kind]?.(raw, id, (other) => dbRecord(player, other)) as Record<string, any> | undefined) ?? raw : raw;
}

/**
 * The target a native hook of a skill gets: the event of the map a fighter stands for when there is one, else a light object
 * with what the hook can read of the fighter (`id`, `name`, `hp`) and `isEvent()` saying it is not an event of the map.
 */
function targetOf(player: RpgPlayer, call: TriggerCall, fighter?: Combatant) {
  const event = call.targetMap ? (player.getCurrentMap() as any)?.getEvent?.(call.targetMap) : undefined;
  return event ?? { id: call.target, name: fighter?.name, hp: fighter?.hp, isEvent: () => false };
}

/** The skills whose triggers nothing runs, already warned about. */
let unrun = new Set<string>();

/** Rules of a battle: the formulas of the map of the player, unless the options choose others. */
function rulesFor(player: RpgPlayer): RulesContext {
  if (typeof options.formulas === "object" || options.formulas === "plugin") return rules;
  const native = nativeFormulas((name) => {
    try {
      return (player as any).getFormulas?.(name);
    } catch {
      return undefined;
    }
  });
  return native ? { ...rules, formulas: { ...rules.formulas, ...native } } : rules;
}

function resolveTroop(player: RpgPlayer, troop: TroopDef | string): TroopDef {
  if (typeof troop !== "string") return troop;
  const found = options.troops?.[troop] ?? troopFromDb(troop, record(player, "troop", troop));
  if (!found) throw new Error(`[TurnBattle] Unknown troop "${troop}"`);
  return found;
}

/**
 * The custom commands of a battle: the ones of the options, and the actions of the database (`_type: "command"`) that the
 * units carry, which the options do not already give.
 */
function commandsFor(player: RpgPlayer, ids: Iterable<string>): Record<string, CustomCommand> {
  const found: Record<string, CustomCommand> = {};
  for (const id of ids) {
    const command = options.commands?.[id] ?? commandFromDb(record(player, "command", id)) ?? skillCommandFromDb(id, record(player, "skill", id));
    if (command) found[id] = command;
  }
  return found;
}

/** Average level of the players of a battle: what a member of a troop at the level `"party"` fights at. */
function partyLevel(players: RpgPlayer[]): number {
  const levels = players.map((p) => Number(val((p as any).level))).filter((n) => Number.isFinite(n) && n > 0);
  return levels.length ? Math.round(levels.reduce((sum, n) => sum + n, 0) / levels.length) : 1;
}

function enemyDefs(player: RpgPlayer, troop: TroopDef, players: RpgPlayer[] = [player], seed?: number): CombatantDef[] {
  const rng = createRng((seed ?? Math.floor(Math.random() * 2 ** 31)) ^ 0x5bd1e995);
  // The members that only fight under a condition are left out when it does not hold for the player
  const fighting = troop.enemies.filter(
    (entry) => typeof entry !== "object" || !("enemy" in entry) || entry.condition === undefined || !options.enemyCondition || options.enemyCondition(player, entry.condition),
  );
  if (troop.enemies.length > 0 && fighting.length === 0) throw new Error(`[TurnBattle] Troop "${troop.id}" has no enemy left for this player`);
  return fighting.map((entry, i) => {
    const member = typeof entry === "object" && "enemy" in entry ? entry : undefined;
    const enemyId = member ? member.enemy : typeof entry === "string" ? entry : undefined;
    // A level of the member: its own, or the one of the party, shifted by up to `levelSpread` levels.
    const spread = Math.max(0, Math.floor(member?.levelSpread ?? 0));
    const base = member?.level === "party" ? partyLevel(players) : member?.level;
    const level = base === undefined ? undefined : base + (spread ? Math.floor(rng.next() * (2 * spread + 1)) - spread : 0);
    const def =
      enemyId !== undefined
        ? options.enemies?.[enemyId] ?? enemyFromDb(record(player, "enemy", enemyId), level)
        : (entry as CombatantDef);
    if (!def) throw new Error(`[TurnBattle] Unknown enemy "${enemyId ?? entry}"`);
    const key = enemyId ?? ("id" in (entry as CombatantDef) ? (entry as CombatantDef).id : "enemy");
    const battler = def.battler ?? options.battlers?.enemy;
    if (!battler) throw new Error(`[TurnBattle] Enemy "${key}" has no battler: give it one, or set the \`battlers.enemy\` option`);
    return withWeapon(player, {
      ...def,
      ...(member?.invincible ? { invincible: true } : {}),
      ...(member?.position ? { position: member.position } : {}),
      battler,
      id: `${key}#${i}`,
      side: "enemy",
    } as CombatantDef);
  });
}

/** `weapon: "<db id>"` on a companion or an enemy: attack style + weapon atk. */
function withWeapon(player: RpgPlayer, def: CombatantDef): CombatantDef {
  if (!def.weapon) return def;
  const w = weaponFromDb(record(player, "weapon", def.weapon));
  if (!w) return def;
  return { ...def, stats: { ...def.stats, atk: def.stats.atk + w.atk }, attack: { ...w.attack, ...def.attack } };
}

const read = (fn: () => unknown) => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};
const val = plainValue;

/** Skills and items used by this battle, resolved from options then the RPGJS database. */
function buildCatalog(player: RpgPlayer, combatants: CombatantDef[], dbCommands: Record<string, CustomCommand> = {}): Catalog {
  const commandsById = { ...dbCommands, ...options.commands };
  // Summons reachable from the commands of these units (options) or declared in the options.
  const commandIds = new Set(combatants.flatMap((c) => c.commands ?? []));
  const summons: Record<string, SummonDef> = { ...options.summons };
  for (const id of commandIds) {
    for (const o of commandsById[id]?.options ?? []) {
      if (summons[o.id]) continue;
      const def = summonFromDb(record(player, "summon", o.id));
      if (def) summons[o.id] = def;
    }
    // An action calls an enemy of the database as a creature
    for (const [summonId, source] of Object.entries(commandsById[id]?.summons ?? {})) {
      if (summons[summonId] || !source.enemy) continue;
      const enemy = options.enemies?.[source.enemy] ?? enemyFromDb(record(player, "enemy", source.enemy), source.level);
      const def = enemy ? summonFromEnemy({ ...enemy, battler: enemy.battler ?? options.battlers?.enemy }, source) : undefined;
      if (def) summons[summonId] = def;
    }
  }
  for (const [id, def] of Object.entries(summons)) summons[id] = withWeapon(player, { ...def, id, side: "ally" } as CombatantDef) as SummonDef;
  combatants = [...combatants, ...(Object.values(summons) as CombatantDef[])];
  const skillIds = new Set<string>();
  for (const c of combatants) {
    c.skills?.forEach((id) => skillIds.add(id));
    if (c.limit) skillIds.add(c.limit.skill);
  }
  for (const s of (read(() => (player as any).skills?.()) ?? []) as unknown[])
    skillIds.add(String(val((s as any)?.id)));
  for (const c of combatants) c.commands?.forEach((id) => commandIds.add(id));
  const itemIds = new Set<string>(Object.keys(options.items ?? {}));
  for (const it of (read(() => (player as any).items?.()) ?? []) as unknown[])
    itemIds.add(String(val((it as any)?.id)));
  for (const c of combatants) c.rewards?.items?.forEach((d) => itemIds.add(d.id));

  const skills: Record<string, SkillDef> = {};
  for (const id of skillIds) {
    // A skill that does several things, recharges… is a command: it is not in the skills
    if (commandsById[id]) {
      commandIds.add(id);
      continue;
    }
    const s = options.skills?.[id] ?? skillFromDb(id, record(player, "skill", id));
    if (s) skills[id] = s;
  }
  const items: Record<string, ItemDef> = {};
  for (const id of itemIds) {
    const it = options.items?.[id] ?? itemFromDb(id, record(player, "item", id));
    if (it) items[id] = it;
  }
  const commands = Object.fromEntries(
    [...commandIds].filter((id) => commandsById[id]).map((id) => [id, commandInfo(id, commandsById[id]!)]),
  );
  // A creature of an action with no name of its own is shown by the name of its enemy
  for (const info of Object.values(commands))
    if (info.options) info.options = info.options.map((o) => (o.label === o.id && summons[o.id]?.name ? { ...o, label: String(summons[o.id]!.name) } : o));
  // Summons are stored without the id / side added for the lookup above.
  for (const def of Object.values(summons)) {
    delete (def as Partial<CombatantDef>).id;
    delete (def as Partial<CombatantDef>).side;
  }
  return { skills, items, commands, summons };
}

/** Persisted battle data (player prop `turnBattle`, JSON text). */
function savedData(player: RpgPlayer): { limits?: Record<string, number> } {
  const raw = read(() => (player as any).turnBattle?.());
  if (!raw) return {};
  if (typeof raw === "object") return raw as { limits?: Record<string, number> };
  try {
    return JSON.parse(String(raw));
  } catch {
    return {};
  }
}

/** Save the persisted battle data of a player (prop `turnBattle`). */
function saveData(player: RpgPlayer, data: { limits?: Record<string, number> }) {
  read(() => (player as any).turnBattle?.set(JSON.stringify(data)));
}

/**
 * The combatant id of a player's own hero in a turn-based battle (`player:<player id>`). Companions use the ids given by
 * the `party` option. Use it to find the hero in `getTurnBattle(player).state().combatants`, or to name the hero's limit
 * gauge. Server only; standalone RPG and MMORPG.
 *
 * @title heroId
 * @method heroId(player)
 * @param {RpgPlayer} player - The player whose hero it is
 * @returns {string} The combatant id of the hero
 * @example
 * ```ts
 * import { getTurnBattle, heroId } from "@rpgjs/turn-battle/server";
 *
 * const hero = getTurnBattle(player)?.state().combatants.find((c) => c.id === heroId(player));
 * ```
 */
export const heroId: (player: RpgPlayer) => string = heroIdOf;

const unitId = (player: RpgPlayer, unit?: string) => (!unit || unit === "hero" ? heroId(player) : unit);

/**
 * Reads the limit gauge of a unit of the player. Limit gauges persist between battles: they are stored on the player
 * (prop `turnBattle`, saved with the player, not synchronised with the client). A battle in progress keeps its own
 * gauges; what the battle charged is written back when it ends. Server only; standalone RPG and MMORPG.
 *
 * @title getLimit
 * @method getLimit(player, unit?)
 * @param {RpgPlayer} player - The player who owns the unit
 * @param {string} [unit] - `"hero"` (default) or the id of a companion given by the `party` option
 * @returns {number} The value of the gauge (0 when it was never charged)
 * @example
 * ```ts
 * import { getLimit } from "@rpgjs/turn-battle/server";
 *
 * getLimit(player);                     // the hero's gauge
 * getLimit(player, `fina:${player.id}`); // a companion's gauge
 * ```
 */
export function getLimit(player: RpgPlayer, unit?: string): number {
  return savedData(player).limits?.[unitId(player, unit)] ?? 0;
}

/**
 * Sets the limit gauge of a unit of the player (a negative or invalid value is saved as 0). The change applies to the
 * next battle: a battle in progress keeps its own gauges. Server only; standalone RPG and MMORPG.
 *
 * @title setLimit
 * @method setLimit(player, value, unit?)
 * @param {RpgPlayer} player - The player who owns the unit
 * @param {number} value - The new value of the gauge (the limit is ready when it reaches the `max` of the unit's limit, 100 by default)
 * @param {string} [unit] - `"hero"` (default) or the id of a companion given by the `party` option
 * @returns {void}
 * @example
 * ```ts
 * import { setLimit } from "@rpgjs/turn-battle/server";
 *
 * setLimit(player, 100);                     // the hero's limit is ready next battle
 * setLimit(player, 50, `fina:${player.id}`); // a companion
 * ```
 */
export function setLimit(player: RpgPlayer, value: number, unit?: string): void {
  const data = savedData(player);
  const v = Math.max(0, Number.isFinite(value) ? value : 0);
  saveData(player, { ...data, limits: { ...data.limits, [unitId(player, unit)]: v } });
}

/**
 * Reads every limit gauge saved on the player (hero and companions), by combatant id. Server only; standalone RPG and
 * MMORPG.
 *
 * @title getLimits
 * @method getLimits(player)
 * @param {RpgPlayer} player - The player
 * @returns {Record<string, number>} The gauges by combatant id (a copy: changing it changes nothing)
 * @example
 * ```ts
 * import { getLimits } from "@rpgjs/turn-battle/server";
 *
 * getLimits(player); // { "player:abc": 100, "fina:abc": 50 }
 * ```
 */
export function getLimits(player: RpgPlayer): Record<string, number> {
  return { ...savedData(player).limits };
}

/**
 * Resets every limit gauge of the player (hero and companions) to 0. The change applies to the next battle. Server only;
 * standalone RPG and MMORPG.
 *
 * @title clearLimits
 * @method clearLimits(player)
 * @param {RpgPlayer} player - The player
 * @returns {void}
 * @example
 * ```ts
 * import { clearLimits } from "@rpgjs/turn-battle/server";
 *
 * clearLimits(player); // new game+: every gauge starts empty
 * ```
 */
export function clearLimits(player: RpgPlayer): void {
  const { limits: _limits, ...rest } = savedData(player);
  saveData(player, rest);
}

/**
 * Starts a turn-based battle and waits for its outcome. The map stays loaded
 * underneath: the battle is a full-screen GUI rendered above it, for every
 * player. The server owns the battle; the result (HP, SP, EXP, gold, items) is
 * written on the players before `turnBattle.onEnd` runs. Standalone RPG and
 * MMORPG; in MMORPG every player must be on the leader's map.
 *
 * In a group battle the promise resolves once every player has left the result
 * screen; each player gets the full rewards and `onStart` / `onEnd` run per
 * player.
 *
 * @title startTurnBattle
 * @method startTurnBattle(player, troop, options?)
 * @param {RpgPlayer} player - The player who fights (solo), or the group options
 * @param {TroopDef | string} troop - A troop of the database (id) or a troop object
 * @param {StartTurnBattleOptions} [options] - Seed, music, background, party, heroes, turn timer
 * @returns {Promise<BattleResult>} The outcome as the leader lives it (`winners` in PvP)
 * @example
 * ```ts
 * import { startTurnBattle } from "@rpgjs/turn-battle/server";
 *
 * const result = await startTurnBattle(player, "goblins");
 * if (result.outcome === "victory") await player.showText("Bravo!");
 *
 * // Coop: each player commands their own hero (and companions).
 * await startTurnBattle({ players: [alice, bob], troop: "ambush" });
 * // PvP, with a spectator
 * await startTurnBattle({ players: [alice], versus: [bob], spectators: [carol] });
 * ```
 */
export function startTurnBattle(player: RpgPlayer, troop: TroopDef | string, options?: StartTurnBattleOptions): Promise<BattleResult>;
export function startTurnBattle(group: TurnBattleGroupOptions): Promise<BattleResult>;
export async function startTurnBattle(
  a: RpgPlayer | TurnBattleGroupOptions,
  troopArg?: TroopDef | string,
  startArg: StartTurnBattleOptions = {},
): Promise<BattleResult> {
  const group = isBattleGroup(a) ? a : null;
  const { players, versus, everyone, spectators } = battleParticipants("TurnBattle", group ?? { players: [a as RpgPlayer] });
  const troop = group ? group.troop : troopArg;
  const start = group ?? startArg;
  if (!troop && !versus.length) throw new Error("[TurnBattle] A troop or opponents (versus) are required");
  // Reserve the players before any await: a double trigger must not open two battles.
  const release = battles.reserve(everyone);
  try {
    return await runBattle(players, versus, troop, start, spectators);
  } finally {
    release();
  }
}

const noResult = (turns: number): BattleResult => ({ outcome: "escape", exp: 0, gold: 0, items: [], bonuses: [], turns });

/** Rough duration of a choreography on a client, so the turn timer starts after it. */
function playbackMs(beats: Beat[]): number {
  let ms = 0;
  for (const b of beats) {
    if (b.t === "action") ms += 1600 + 350 * b.waves.length + (b.cutin ? (b.cutin.video ? 14000 : 2500) : 0);
    else if (b.t === "intro" || b.t === "end") ms += 1800;
    else ms += b.t === "turn" ? 300 : 800;
  }
  return ms;
}

async function runBattle(
  players: RpgPlayer[],
  versus: RpgPlayer[],
  troopInput: TroopDef | string | undefined,
  start: StartTurnBattleOptions & { background?: string; bgm?: string },
  spectators: RpgPlayer[],
) {
  const leader = players[0];
  const pvp = versus.length > 0;
  const troop: TroopDef = troopInput
    ? resolveTroop(leader, troopInput)
    : { id: "pvp", enemies: [], canEscape: false, background: start.background, bgm: start.bgm };
  const everyone = [...players, ...versus];
  const multi = everyone.length > 1;
  const nativeStats = options.nativeStats !== false;
  const timerOpt = start.turnTimer ?? options.turnTimer;
  const turnTimer = timerOpt === false ? 0 : (timerOpt ?? (multi ? 30 : 0));

  // Each player brings their hero and companions, owned by them.
  const teams = everyone.map((player) => {
    const side: Side = players.includes(player) ? "ally" : "enemy";
    const mates = side === "ally" ? players : versus;
    const ctx: PartyContext = { players: mates, index: mates.indexOf(player), side, pvp };
    const heroBase = { battler: options.battlers?.ally ?? "hero", ...options.hero?.(player, ctx) };
    const companions = (!multi && start.party) || options.party?.(player, ctx) || [];
    const party = companions.map((c) => withWeapon(player, { ...c, owner: player.id }));
    const given = start.heroesByPlayer?.[player.id] ?? (!multi ? start.heroes : undefined);
    const heroes = given?.map((c, i) => withWeapon(player, { ...c, id: i === 0 ? heroIdOf(player) : `ally${i}:${player.id}`, side, owner: player.id }));
    return { player, side, heroBase, party, heroes };
  });
  /** The players who fight with given heroes instead of their own. */
  const standIns = new Set(teams.filter((t) => t.heroes).map((t) => t.player.id));
  const monsters = enemyDefs(leader, troop, players, start.seed);
  // The actions the units carry: the ones of the options, and the actions of the database
  // (and the skills of the units, which can be commands: several effects, a recharge)
  const defs = [...teams.flatMap((t) => [...(t.heroes ?? [t.heroBase as CombatantDef, ...t.party])]), ...monsters];
  const learned = teams.flatMap((t) => ((read(() => (t.player as any).skills?.()) ?? []) as unknown[]).map((s) => String(val((s as any)?.id) ?? "")));
  const dbCommands = commandsFor(leader, new Set([...defs.flatMap((c) => [...(c.commands ?? []), ...(c.skills ?? [])]), ...learned.filter(Boolean)]));
  const catalog = mergeCatalogs(
    teams.map((t) => buildCatalog(t.player, [...(t.heroes ?? [t.heroBase as CombatantDef, ...t.party]), ...monsters], dbCommands)),
  );
  const sideDefs = (side: Side) =>
    teams
      .filter((t) => t.side === side)
      .flatMap(({ player, heroBase, party, heroes }) => {
        if (heroes) return heroes.map((c) => ({ ...c, side }));
        const gauges = savedData(player).limits ?? {};
        const hero = readPlayer(player, heroBase, catalog, { nativeStats, record: (id) => record(player, "weapon", id) });
        return [hero, ...party].map((c) => ({
          ...c,
          side,
          ...(c.limit ? { limit: { ...c.limit, value: c.limit.value ?? gauges[c.id] ?? 0 } } : {}),
        }));
      });

  const battleId = `${leader.id}:${Date.now().toString(36)}`;
  let state = createBattle({
    id: battleId,
    seed: start.seed,
    allies: sideDefs("ally"),
    enemies: [...sideDefs("enemy"), ...monsters],
    catalog,
    inventories: Object.fromEntries(everyone.map((p) => [p.id, readInventory(p, catalog)])),
    canEscape: pvp ? false : troop.canEscape,
    forbid: pvp ? undefined : troop.forbid,
    heroesPosition: pvp ? undefined : troop.heroesPosition,
    background: troop.background ?? start.background,
    bgm: troop.bgm ?? start.bgm,
    victoryBgm: troop.victoryBgm ?? start.victoryBgm,
  });
  const battleRules = withHooks({ ...rulesFor(leader), commands: { ...dbCommands, ...rulesFor(leader).commands } }, moduleRuleHooks(leader));
  const handle: TurnBattleHandle = {
    id: battleId,
    player: leader,
    players: everyone,
    versus,
    troop,
    state: () => toView(state),
    spectators: () => watchers().map((s) => s.player),
  };
  // A player without a name is "Player <n>" (the `turnBattle.player` key, in the language of that player).
  const names = Object.fromEntries(
    everyone.map((p, i) => [p.id, String(read(() => val((p as any).name)) || playerText(p, "turnBattle.player", { index: i + 1 }))]),
  );

  const sideOf = (p: RpgPlayer): Side => (players.includes(p) ? "ally" : "enemy");
  const seats = new Map<string, Seat>(
    everyone.map((p) => [p.id, { player: p, side: sideOf(p), role: "fighter", gui: p.gui(TURN_BATTLE_GUI), left: false }]),
  );
  const active = () => [...seats.values()].filter((s) => !s.left);
  const fighters = () => active().filter((s) => s.role === "fighter");
  const watchers = () => active().filter((s) => s.role === "spectator");
  // PvP: the challenged side sees the battle mirrored (its team on the right).
  const packet = (seat: Seat, beats: Beat[], error?: string): BattlePacket => ({
    battleId,
    revision: state.revision,
    state: seat.side === "enemy" ? mirrorView(toView(state)) : toView(state),
    beats: seat.side === "enemy" ? mirrorBeats(beats) : beats,
    error,
    viewer: seat.player.id,
    players: names,
    turnTimer: turnTimer || undefined,
    pvp: pvp || undefined,
    spectator: seat.role === "spectator" || undefined,
    spectators: watchers().length,
  });
  /** Same state, new audience: refresh the spectator count on every screen. */
  const refreshAudience = () => {
    for (const seat of active()) if (!seat.closed) seat.gui.update(packet(seat, []));
  };

  /** The result as a player of `side` lives it (PvP), with the winners' ids. */
  const resultFor = (side: Side): BattleResult => {
    const r = state.result!;
    const winners = r.outcome === "victory" ? players : r.outcome === "defeat" ? versus : [];
    const own = side === "enemy" ? mirrorResult(r) : r;
    return pvp ? { ...own, winners: winners.map((p) => p.id) } : own;
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  let committed = false;
  const finish = async () => {
    if (committed || !state.result) return;
    committed = true;
    clearTimeout(timer);
    for (const { player, side } of fighters()) {
      // PvP: nobody loses HP for real, used items are spent. A player whose heroes were given (`heroes`, `heroesByPlayer`) did not
      // fight with their own hero: its HP, SP and limit gauge are not theirs to keep.
      const standIn = standIns.has(player.id);
      commitPlayer(player, state, resultFor(side), { nativeStats, vitals: !pvp && !standIn });
      if (standIn) continue;
      const saved = savedData(player);
      const limits = { ...saved.limits };
      for (const c of state.combatants) if (c.owner === player.id && c.limit && !c.summon) limits[c.id] = c.limit.value;
      saveData(player, { ...saved, limits });
    }
    for (const { player, side } of fighters()) await callHooks(player, "onEnd", player, handle, resultFor(side));
  };

  /** New authoritative state: send it to everyone, arm the turn timer. */
  const publishState = (beats: Beat[]) => {
    for (const seat of active()) if (!seat.closed) seat.gui.update(packet(seat, beats));
    arm(beats);
  };
  /** Commit a finished battle, or give the acting player `turnTimer` seconds once `beats` are played. */
  const arm = (beats: Beat[]) => {
    clearTimeout(timer);
    // A failing `onEnd` hook must not leave a rejection nobody handles (it stops the server).
    if (state.result) return void finish().catch((error) => console.error("[TurnBattle] end of battle failed", error));
    if (!turnTimer || !state.actor) return;
    const revision = state.revision;
    timer = setTimeout(() => {
      // In the queue of the commands: never between the checks and the result of one.
      queue = queue
        .then(() => {
          if (state.revision !== revision || state.result) return;
          // Too slow: the hero guards (keeps the coop moving).
          apply(runAuto(state, battleRules, { type: "guard" }));
        })
        .catch((error) => console.error("[TurnBattle] turn timer failed", error));
    }, turnTimer * 1000 + playbackMs(beats));
  };
  /** The triggers skills asked for, run one after the other in the order of the battle. */
  let ranCalls = 0;
  let calling = Promise.resolve();
  const runCalls = () => {
    const pending = (state.calls ?? []).slice(ranCalls);
    ranCalls += pending.length;
    if (!pending.length) return;
    // A trigger nothing runs is a skill that does less than its record says: tell it once, with the skill
    for (const call of pending) {
      const native = call.phase === "impact" && typeof record(leader, "skill", call.skill)?.onUse === "function";
      if (options.runTrigger || native || unrun.has(call.skill)) continue;
      unrun.add(call.skill);
      const phases = state.catalog.commands?.[call.skill]?.triggers ?? state.catalog.skills[call.skill]?.triggers ?? [call.phase];
      console.warn(`[TurnBattle] The skill "${call.skill}" has triggers (${phases.join(", ")}) but the option \`runTrigger\` is not given: nothing runs them.`);
    }
    calling = calling.then(async () => {
      for (const call of pending) {
        const unit = state.combatants.find((c) => c.id === call.actor);
        const player = fighters().find((f) => f.player.id === unit?.owner)?.player ?? leader;
        // What the trigger sets on the player (life, SP) is taken by their unit: the battle holds them until its end
        const before = { hp: Number((player as any).hp), sp: Number((player as any).sp) };
        try {
          // The native hook of the skill (`onUse(player, target)`) runs once for each target the skill reached
          const onUse = call.phase === "impact" ? record(player, "skill", call.skill)?.onUse : undefined;
          if (typeof onUse === "function") await onUse(player, targetOf(player, call, state.combatants.find((c) => c.id === call.target)));
          await options.runTrigger?.(player, call);
        } catch (error) {
          console.error("[TurnBattle] trigger failed", call.skill, call.phase, error);
        }
        if (nativeStats && !pvp && !state.result) {
          const now = { hp: Number((player as any).hp), sp: Number((player as any).sp) };
          const changed = { ...(now.hp !== before.hp ? { hp: now.hp } : {}), ...(now.sp !== before.sp ? { sp: now.sp } : {}) };
          if (changed.hp !== undefined || changed.sp !== undefined) apply(syncVitals(state, heroIdOf(player), changed));
        }
      }
    }).catch((error) => console.error("[TurnBattle] triggers failed", error));
  };
  const apply = (out: { state: BattleState; beats: Beat[] }) => {
    if (out.state === state) return;
    state = out.state;
    publishState(out.beats);
    runCalls();
  };

  // Commands are handled one at a time (veto hooks are async).
  let queue = Promise.resolve();
  const onCommand = (seat: Seat, env: CommandEnvelope) =>
    (queue = queue.then(async () => {
      if (seat.left) return;
      let out: ReturnType<typeof runCommand>;
      try {
        const vetoed = (await callHooks(seat.player, "onCommand", seat.player, handle, env)).includes(false);
        out = vetoed ? { state, beats: [], error: "turnBattle.error.refused" } : runCommand(state, env, battleRules, seat.player.id);
      } catch (error) {
        // A hook or a command of the game failed: the order does not go through, and the player gets their menu back.
        console.error("[TurnBattle] command failed", error);
        out = { state, beats: [], error: "turnBattle.error.invalid" };
      }
      if (out.error) return void seat.gui.update(packet(seat, [], out.error));
      apply(out);
    }).catch((error) => console.error("[TurnBattle] command failed", error)));

  const leave = (playerId: string) => {
    const seat = seats.get(playerId);
    if (!seat || seat.left) return;
    seat.left = true;
    battles.release(seat.player, session);
    seat.gui.close(null);
    if (seat.role === "spectator") return refreshAudience();
    // Nothing is committed for a player who left; their units fight on with the AI.
    if (!fighters().length) {
      // No fighter left: the battle is over for everyone watching too.
      clearTimeout(timer);
      watchers().forEach((w) => leave(w.player.id));
      return;
    }
    if (state.result) return;
    // Called from a disconnection: a failing rule hook must not throw there.
    try {
      // PvP: a side with nobody left forfeits; otherwise the AI plays for the missing player.
      const mates = fighters().filter((f) => f.side === seat.side);
      if (pvp && mates.every((f) => f.surrendered)) return apply(forfeit(state, seat.side));
      state = setAuto(state, playerId, true);
      const actor = state.combatants.find((c) => c.id === state.actor);
      if (actor?.owner === playerId) apply(runAuto(state, battleRules));
    } catch (error) {
      console.error("[TurnBattle] the AI could not take over", playerId, error);
    }
  };

  const session: Session = {
    handle,
    seats,
    plays: (player) => {
      const seat = seats.get(player.id);
      return !!seat && seat.role === "fighter" && !seat.left;
    },
    leave: (player) => leave(player.id),
    closed: async (player) => {
      await seats.get(player.id)?.done;
    },
    async watch(spectator) {
      const known = seats.get(spectator.id);
      if (state.result || (known && !known.left) || !fighters().length) return false;
      // Spectators watch from the same map (same room / Durable Object).
      if (!sameBattleMap(spectator, leader)) return false;
      // Seated before the async hook: a double request must not open two GUIs.
      if (!battles.seat(spectator, session)) return false;
      let refused: boolean;
      try {
        refused = (await callHooks(spectator, "onSpectate", spectator, handle)).includes(false);
      } catch (error) {
        // The hook failed: the spectator is freed, and the caller gets the error.
        battles.release(spectator, session);
        throw error;
      }
      if (refused || state.result || !fighters().length) {
        battles.release(spectator, session);
        return false;
      }
      const seat: Seat = { player: spectator, side: "ally", role: "spectator", gui: spectator.gui(TURN_BATTLE_GUI), left: false };
      seats.set(spectator.id, seat);
      // Spectators may leave at any time (Escape / the leave button).
      seat.gui.on("close", () => leave(spectator.id));
      // They join mid-battle: the client builds the scene from the state alone.
      seat.done = seat.gui.open(packet(seat, []), { waitingAction: true, blockPlayerInput: true });
      refreshAudience();
      await seat.done;
      seat.left = true;
      battles.release(spectator, session);
      return true;
    },
  };

  for (const seat of seats.values()) await callHooks(seat.player, "onStart", seat.player, handle);
  const opening = beginBattle(state, battleRules);
  state = opening.state;
  battles.open(session, everyone);

  // Packets travel through the GUI data (gui.open / gui.update): the client
  // component receives them as its `data` signal, in both runtimes.
  for (const seat of seats.values()) {
    // Disconnected during the `onStart` hooks: `battles.open` took them out already.
    if (seat.left) {
      seat.done = Promise.resolve();
      continue;
    }
    seat.gui.on<CommandEnvelope>("command", (env) => onCommand(seat, env));
    // PvP: give up at any time (not only on one's turn). A side forfeits once
    // every one of its players still here has surrendered.
    seat.gui.on("surrender", () =>
      (queue = queue.then(() => {
        if (!pvp || seat.left || state.result) return;
        seat.surrendered = true;
        const mates = fighters().filter((f) => f.side === seat.side);
        if (mates.every((f) => f.surrendered)) apply(forfeit(state, seat.side));
        else for (const f of mates) f.gui.update(packet(f, [], "turnBattle.surrenderVote"));
      })
      // A failure must not reject the queue: every later command would be skipped.
      .catch((error) => console.error("[TurnBattle] surrender failed", error))),
    );
    seat.gui.on("close", () => {
      if (!state.result || seat.closed) return;
      seat.closed = true;
      seat.gui.close(resultFor(seat.side));
      // Free this player on the map without waiting for the others.
      battles.release(seat.player, session);
    });
    seat.done = seat.gui.open(packet(seat, opening.beats), { waitingAction: true, blockPlayerInput: true });
  }
  arm(opening.beats); // a battle lost before any hero turn is committed here
  for (const spectator of spectators)
    session.watch(spectator).catch((error) => console.error("[TurnBattle] a spectator could not join", spectator.id, error));
  try {
    await Promise.all(everyone.map((p) => seats.get(p.id)!.done));
    // The leader's point of view (with `winners` in PvP).
    return state.result ? resultFor("ally") : noResult(state.turns);
  } finally {
    clearTimeout(timer);
    for (const p of everyone) battles.release(p, session);
    battles.close(session);
  }
}

function mergeCatalogs(list: Catalog[]): Catalog {
  return {
    skills: Object.assign({}, ...list.map((c) => c.skills)),
    items: Object.assign({}, ...list.map((c) => c.items)),
    commands: Object.assign({}, ...list.map((c) => c.commands)),
    summons: Object.assign({}, ...list.map((c) => c.summons)),
  };
}

/**
 * Does the player fight or watch a turn-based battle (or is one being
 * prepared for them)? Server only.
 *
 * @title isInTurnBattle
 * @method isInTurnBattle(player)
 * @param {RpgPlayer} player - The player
 * @returns {boolean} True while the player is in a battle
 * @example
 * ```ts
 * if (isInTurnBattle(player)) return; // no encounter while fighting
 * ```
 */
export function isInTurnBattle(player: RpgPlayer): boolean {
  return battles.isIn(player);
}

/**
 * The battle a player fights in (not one they watch), or a battle by id.
 * Server only.
 *
 * @title getTurnBattle
 * @method getTurnBattle(target)
 * @param {RpgPlayer | string} target - A fighting player or a battle id
 * @returns {TurnBattleHandle | undefined} The running battle
 * @example
 * ```ts
 * const battle = getTurnBattle(player);
 * battle?.state().turns;
 * ```
 */
export function getTurnBattle(target: RpgPlayer | string): TurnBattleHandle | undefined {
  return battles.get(target);
}

/**
 * Watches a running battle: the spectator sees every action live (joining
 * mid-fight) but cannot command anything, and leaves with the back control.
 * Resolves when the spectator leaves; `false` when there is nothing to watch,
 * the spectator is busy or on another map, or `turnBattle.onSpectate` refused.
 * Server only.
 *
 * @title watchTurnBattle
 * @method watchTurnBattle(spectator, target)
 * @param {RpgPlayer} spectator - The player who watches
 * @param {RpgPlayer | string} target - A fighting player or a battle id
 * @returns {Promise<boolean>} Whether the spectator watched
 * @example
 * ```ts
 * const fighter = map.getPlayers().find((p) => getTurnBattle(p));
 * if (fighter) await watchTurnBattle(player, fighter);
 * ```
 */
export function watchTurnBattle(spectator: RpgPlayer, target: RpgPlayer | string): Promise<boolean> {
  return battles.watch(spectator, target);
}

/**
 * Takes a player out of their battle (as a disconnection does: their units
 * fight on with the AI, nothing is written on the player) and waits until
 * their battle screen is closed. Server only.
 *
 * @title stopTurnBattle
 * @method stopTurnBattle(player)
 * @param {RpgPlayer} player - A fighter or a spectator
 * @returns {Promise<void>} Resolves once the battle screen of the player is closed
 * @example
 * ```ts
 * await stopTurnBattle(player);
 * player.changeMap("town");
 * ```
 */
export function stopTurnBattle(player: RpgPlayer): Promise<void> {
  return battles.stop(player);
}

/**
 * Server side of the turn-based battle: the battle rules, the sessions (solo,
 * coop, PvP, spectators), the battle data read from the RPGJS database (the
 * `turnBattle` field of skills, items, enemies, troops…) and the hooks. Pair
 * it with `provideTurnBattleClient`. Standalone RPG and MMORPG.
 *
 * @title provideTurnBattleServer
 * @method provideTurnBattleServer(options?)
 * @param {TurnBattleServerOptions} [options] - Data, party, formulas, AI, commands, hooks
 * @returns {RpgProvider[]} The providers of the server module
 * @example
 * ```ts
 * import { provideTurnBattleServer } from "@rpgjs/turn-battle/server";
 *
 * export default createServer({
 *   providers: [provideTurnBattleServer({ turnTimer: 20 }), provideServerModules([])],
 * });
 * ```
 */
export function provideTurnBattleServer(opts: TurnBattleServerOptions = {}) {
  options = opts;
  unrun = new Set();
  hooks = new BattleServerHooks<TurnBattleServerHooks>("turnBattle", opts.hooks);
  rules = createRules({ ...opts, formulas: typeof opts.formulas === "object" ? opts.formulas : undefined, hooks: opts.hooks });
  return createModule("TurnBattle", [
    {
      server: defineModule<RpgServer>({
        i18n: TURN_BATTLE_I18N,
        player: {
          // Limit gauges survive between battles, map changes and saves.
          // Stored as JSON text: object props do not survive the sync packets.
          props: { turnBattle: { $default: "", $permanent: true, $syncWithClient: false } },
          onDisconnected(player: RpgPlayer) {
            // Nothing is committed for the player who left; in coop the others fight on.
            battles.disconnect(player);
          },
        },
      } as RpgServer),
    },
  ]);
}
