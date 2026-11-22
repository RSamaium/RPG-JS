import type { AttackStyle, Rewards, SkillKind, Stats, TargetScope } from "./types";

/**
 * Typed helpers for battle data in the RPGJS database. They return the record
 * unchanged (plus `_type`), so RPGJS keeps reading its native fields while the
 * editor autocompletes and checks the `turnBattle` part:
 *
 * ```ts
 * database: {
 *   fire: turnBattleSkill({ name: "Brasier", spCost: 18, power: 105,
 *     turnBattle: { kind: "magical", scope: "allEnemies", element: "fire", fx: "fireball" } }),
 *   potion: turnBattleItem({ name: "Potion", hpValue: 150, consumable: true }),
 *   "iron-sword": turnBattleWeapon({ name: "Épée de fer", atk: 6, turnBattle: { type: "sword" } }),
 *   goblin: turnBattleEnemy({ name: "Gobelin", gain: { exp: 24 }, turnBattle: { battler: "enemy-goblin", stats } }),
 *   goblins: turnBattleTroop({ turnBattle: { enemies: ["goblin", "goblin"], background: "meadow" } }),
 * }
 * ```
 */

type Presets = typeof import("@canvasengine/presets");

/** CanvasEngine effect presets (`@canvasengine/presets`), usable as `fx`. */
export type FxPresetName =
  | keyof Presets["ATTACK_FX_PRESETS"]
  | keyof Presets["MAGIC_FX_PRESETS"]
  | keyof Presets["EPIC_FX_PRESETS"]
  | keyof Presets["COMBAT_FX_PRESETS"]
  | keyof Presets["STATUS_FX_PRESETS"]
  | keyof Presets["AURA_FX_PRESETS"];

/** Recipes of the plugin (client `builtinFx`), usable as `fx`. */
export type BuiltinFxName = "slash" | "stab" | "hit" | "fire" | "ice" | "thunder" | "light" | "dark" | "heal" | "burst";

/** An effect id: a CanvasEngine preset, a plugin recipe, or your own (client option `fx`). */
export type FxName = FxPresetName | BuiltinFxName | (string & {});

/** Elements with a colour and a meaning out of the box; any other string works too. */
export type ElementName =
  | "physical"
  | "fire"
  | "ice"
  | "thunder"
  | "light"
  | "dark"
  | "wind"
  | "earth"
  | "water"
  | (string & {});

/** Weapon types known by `WEAPON_STYLES` (add your own there). */
export type WeaponType =
  | "sword"
  | "greatsword"
  | "axe"
  | "katana"
  | "dualblades"
  | "dagger"
  | "spear"
  | "claw"
  | "fist"
  | "hammer"
  | "mace"
  | "whip"
  | "staff"
  | "rod"
  | "bow"
  | (string & {});

/** Native RPGJS fields are kept as they are (price, icon, custom data…). */
interface NativeFields {
  [field: string]: unknown;
}

export interface SkillBattleData {
  /** `physical` (atk / def), `magical` (mag / mdef) or `heal`. Default: physical. */
  kind?: SkillKind;
  /** Who can be targeted. Default: enemy. */
  scope?: TargetScope;
  /** Overrides the native `power` (100 = a regular attack). */
  power?: number;
  element?: ElementName;
  /** Hits per target. */
  hits?: number;
  /** Stagger damage multiplier. */
  stagger?: number;
  /** Turn-order cost (attack = 1): heavier skills come back later. */
  weight?: number;
  /** Battler animation (default `skill`). */
  anim?: string;
  /** The actor runs to the target. */
  melee?: boolean;
  fx?: FxName;
  /** Limit skills: line of the cut-in. */
  line?: string;
  /** Limit skills: cinematic video URL played before the burst. */
  video?: string;
}

export interface TurnBattleSkillRecord extends NativeFields {
  name: string;
  description?: string;
  spCost?: number;
  power?: number;
  /** Native RPGJS element of the skill. */
  element?: ElementName;
  /** Native RPGJS multipliers of the damage formula (`damageSkill`). */
  coefficient?: Record<string, number>;
  turnBattle?: SkillBattleData;
}

export interface ItemBattleData {
  /** Default: ally. */
  scope?: TargetScope;
  /** Overrides the native `hpValue` / `spValue`. */
  hp?: number;
  sp?: number;
  /** Heal a ratio (0..1) of max HP. */
  hpRate?: number;
  /** Raises a fallen ally (use with `scope: "deadAlly"`). */
  revive?: boolean;
  fx?: FxName;
}

export interface TurnBattleItemRecord extends NativeFields {
  name: string;
  description?: string;
  hpValue?: number;
  spValue?: number;
  consumable?: boolean;
  price?: number;
  turnBattle?: ItemBattleData;
}

export interface WeaponBattleData {
  /** Picks the attack effect and number of hits (`WEAPON_STYLES`). Default: sword. */
  type?: WeaponType;
  element?: ElementName;
  /** Effect tint (CSS colour); defaults to the element colour. */
  color?: string;
  fx?: FxName;
  hits?: number;
  /** Total power of the attack (100 = regular). */
  power?: number;
  stagger?: number;
  melee?: boolean;
}

export interface TurnBattleWeaponRecord extends NativeFields {
  name: string;
  description?: string;
  /** Added to the attack (native RPGJS parameter). */
  atk?: number;
  /** Native RPGJS elements of the weapon: the first one colours its attack. */
  elements?: { rate: number; element: ElementName }[];
  price?: number;
  turnBattle?: WeaponBattleData;
}

/** Value of a parameter at the first and at the last level, like the parameters of an RPGJS actor. */
export interface ParameterCurve {
  start: number;
  end: number;
}

/** The parameters of an RPGJS actor. `atk` and `sdef` are optional, like on a player. */
export interface BattleParameters {
  maxHp: ParameterCurve;
  maxSp?: ParameterCurve;
  str: ParameterCurve;
  pdef: ParameterCurve;
  sdef?: ParameterCurve;
  agi: ParameterCurve;
  int: ParameterCurve;
  dex?: ParameterCurve;
  atk?: ParameterCurve;
}

/** Rewards of an enemy: the chance of an item is a percentage. */
export interface EnemyReward {
  exp?: number;
  gold?: number;
  items?: { itemId: string; amount?: number; chance?: number }[];
}

/** An enemy, shaped like an RPGJS actor: its parameters are read at `initialLevel`. */
export interface TurnBattleEnemyRecord extends NativeFields {
  name: string;
  parameters: BattleParameters;
  initialLevel?: number;
  finalLevel?: number;
  reward?: EnemyReward;
  /** Battler id registered on the client. Default: the `battlers.enemy` option of the server. */
  battler?: string;
  /** Like `elementsEfficiency` of an RPGJS player: a rate above 1 is a vulnerability, below 1 a resistance. */
  elementsEfficiency?: { element: ElementName; rate: number }[];
  skills?: string[];
  /** Stagger gauge size; 0 disables stagger. Default 100. */
  stagger?: number;
  /** Weapon id of the database: attack style and `atk`. */
  weapon?: string;
  /** Attack style without a weapon. */
  attack?: AttackStyle;
  /** AI id (server option `ai`). */
  ai?: string;
  /** Custom commands the AI may use (server option `commands`). */
  commands?: string[];
}

export interface EnemyBattleData {
  /** Battler id registered on the client (`provideTurnBattleClient({ battlers })`). */
  battler: string;
  stats: Stats;
  skills?: string[];
  weaknesses?: ElementName[];
  resists?: ElementName[];
  /** Stagger gauge size; 0 disables stagger. Default 100. */
  stagger?: number;
  /** Weapon id of the database: attack style and `atk`. */
  weapon?: string;
  /** Attack style without a weapon. */
  attack?: AttackStyle;
  /** AI id (server option `ai`). */
  ai?: string;
  /** Custom commands the AI may use (server option `commands`). */
  commands?: string[];
  /** Overrides the native `gain`. */
  rewards?: Rewards;
}

/** Previous shape of an enemy, with flat `stats` in `turnBattle`. */
export interface TurnBattleEnemyBattleRecord extends NativeFields {
  name: string;
  /** Native RPGJS rewards: EXP, gold, drops. */
  gain?: Rewards;
  turnBattle: EnemyBattleData;
}

export interface SummonBattleData {
  /** Battler id registered on the client (`provideTurnBattleClient({ battlers })`). */
  battler: string;
  stats: Stats;
  skills?: string[];
  weaknesses?: ElementName[];
  resists?: ElementName[];
  weapon?: string;
  attack?: AttackStyle;
  /** AI id (server option `ai`) when not controlled. */
  ai?: string;
  commands?: string[];
  /** Own turns before it leaves. Default 3. */
  turns?: number;
  /** Commanded by the summoner's player instead of the AI. */
  controlled?: boolean;
}

export interface TurnBattleSummonRecord extends NativeFields {
  name: string;
  description?: string;
  turnBattle: SummonBattleData;
}

export interface TroopBattleData {
  /** Enemy ids of the database, in slot order. */
  enemies: string[];
  /** Backdrop id (client option `backdrops`). */
  background?: string;
  /** Music id played during the battle. */
  bgm?: string;
  /** Music id played when the heroes win, instead of the small victory jingle. */
  victoryBgm?: string;
  /** Default: true. */
  canEscape?: boolean;
}

/** A troop: the enemies that fight together. */
export interface TurnBattleTroopRecord extends NativeFields, TroopBattleData {
  name?: string;
}

/** Previous shape of a troop, with its data in `turnBattle`. */
export interface TurnBattleTroopBattleRecord extends NativeFields {
  name?: string;
  turnBattle: TroopBattleData;
}

export const turnBattleSkill = <T extends TurnBattleSkillRecord>(record: T): T => record;
export const turnBattleItem = <T extends TurnBattleItemRecord>(record: T) => ({ _type: "item" as const, ...record });
export const turnBattleWeapon = <T extends TurnBattleWeaponRecord>(record: T) => ({ _type: "weapon" as const, ...record });
export const turnBattleEnemy = <T extends TurnBattleEnemyRecord | TurnBattleEnemyBattleRecord>(record: T) => ({ _type: "enemy" as const, ...record });
export const turnBattleTroop = <T extends TurnBattleTroopRecord | TurnBattleTroopBattleRecord>(record: T) => ({ _type: "troop" as const, ...record });
export const turnBattleSummon = <T extends TurnBattleSummonRecord>(record: T) => ({ _type: "summon" as const, ...record });
