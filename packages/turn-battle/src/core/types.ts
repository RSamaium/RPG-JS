/**
 * Battle model shared by server (authoritative rules) and client (presentation).
 * Everything here is plain serialisable data.
 */
import type { ElementName, FxName } from "./data";
import type { PlayableVisualEffect } from "@rpgjs/battle-kit/pure";

export type Side = "ally" | "enemy";

export type TargetScope =
  | "enemy"
  | "allEnemies"
  | "ally"
  | "allAllies"
  | "self"
  | "deadAlly";

export type SkillKind = "physical" | "magical" | "heal";

export interface SkillDef extends SkillVisualEffects {
  id: string;
  name: string;
  /** Free words of the record (`tags` of the skill in the database): the scripts of the plugins listen to them. */
  tags?: string[];
  description?: string;
  kind: SkillKind;
  scope: TargetScope;
  /** Percentage of the relevant stat, 100 = a regular attack. */
  power: number;
  spCost?: number;
  element?: ElementName;
  /** Native RPGJS multipliers of the skill damage formula (`damageSkill`). */
  coefficient?: Record<string, number>;
  /** The phases whose triggers the skill has (your game runs them). */
  triggers?: SkillPhase[];
  /** Effect played on the caster while it casts (a CanvasEngine preset, a recipe of the game), `fx` being the one on each target. */
  castFx?: FxName;
  /** Sound played when the skill is cast / on each hit, instead of the ones of the battle (an RPGJS sound id). */
  castSound?: string;
  impactSound?: string;
  /** Sprite sheet of the engine (an animation of the project) played on each target the skill hits. */
  impactAnimation?: string;
  /** Number of hits per target (multi-hit skills are the juiciest). */
  hits?: number;
  /** Multiplier applied to the stagger damage of each hit. */
  stagger?: number;
  /** Timeline weight: how long the actor waits before acting again (attack = 1). */
  weight?: number;
  /** Battler animation to play (defaults to "skill"). */
  anim?: string;
  /** The actor runs to the target before striking. */
  melee?: boolean;
  /** Client VFX id: a CanvasEngine preset, a plugin recipe or your own (client option `fx`). */
  fx?: FxName;
  /** Cut-in line spoken for limit bursts. */
  line?: string;
  /** Cinematic video URL played before a limit burst (RPGJS cinematic player). */
  video?: string;
}

/**
 * Visual Effects, resolved from the database by the server: `effect` plays from the caster
 * to each target and the damage lands at its `hitAt`; `castEffect` plays on the caster while it casts and `impactEffect` on each
 * target when it is hit (the damage at its `hitAt`). They replace `castFx` / `fx` and, when they have sounds, `castSound` / `impactSound`.
 */
export interface SkillVisualEffects {
  effect?: PlayableVisualEffect;
  castEffect?: PlayableVisualEffect;
  impactEffect?: PlayableVisualEffect;
}

/** `effect`: a Visual Effect played from the user to each target, the heal landing at its `hitAt` (see `SkillVisualEffects`). */
export interface ItemDef extends Pick<SkillVisualEffects, "effect"> {
  id: string;
  name: string;
  description?: string;
  scope: TargetScope;
  hp?: number;
  sp?: number;
  /** Heal a ratio (0..1) of max HP. */
  hpRate?: number;
  revive?: boolean;
  fx?: FxName;
}

export interface Stats {
  maxHp: number;
  maxSp: number;
  /** Strength plus the `atk` parameter and the attack of the equipment, as for an RPGJS player. */
  atk: number;
  def: number;
  mag: number;
  mdef: number;
  agi: number;
  luk: number;
  /** RPGJS `str`, `int` and `dex` parameters, given to the RPGJS damage formulas. Default: `atk`, `mag`, `luk`. */
  str?: number;
  int?: number;
  dex?: number;
}

export interface Rewards {
  exp?: number;
  gold?: number;
  items?: { id: string; chance?: number; quantity?: number }[];
}

/** Input used to build a combatant (from an RpgPlayer, a companion or an enemy). */
export interface CombatantDef {
  id: string;
  /** Free words of its record in the database (`tags`), carried by the combatant. */
  tags?: string[];
  /** Event of the map this unit stands for (the visible enemy that started the battle): its triggers can be bound to it. */
  mapId?: string;
  name: string;
  side: Side;
  /** Visual id registered on the client (spritesheet + manifest). */
  battler: string;
  stats: Stats;
  hp?: number;
  sp?: number;
  skills?: string[];
  weaknesses?: ElementName[];
  resists?: ElementName[];
  /**
   * Same meaning as `elementsEfficiency` of an RPGJS player: the damage of an element is multiplied by
   * its `rate`, above 1 being a vulnerability and below 1 a resistance.
   */
  elementsEfficiency?: { element: ElementName; rate: number }[];
  /** Stagger gauge size for enemies. 0 disables stagger. */
  stagger?: number;
  /** Basic attack presentation (defaults to a melee strike). */
  attack?: AttackStyle;
  /** Weapon id in the RPGJS database (companions / enemies): sets `attack` and adds its `atk`. */
  weapon?: string;
  /** Limit burst skill for allies (`value` restores a persisted gauge). */
  limit?: { skill: string; max?: number; value?: number };
  /** AI id for enemies (server option). */
  ai?: string;
  rewards?: Rewards;
  /** Owner player id (allies) — the only client allowed to command it. */
  owner?: string;
  /** Custom commands (server option `commands`) shown in the menu / used by the AI. */
  commands?: string[];
  /** How often the AI uses each of its commands, and when: `weight` (1 by default, 0 never) and `hpBelow` (a share of its life, in percent). */
  commandRules?: Record<string, CommandRule>;
  /** Never defeated: it keeps one hit point. The battle is not won while it stands. */
  invincible?: boolean;
  /** Where it stands on the stage, as a ratio of its width and height (0..1). By default the formation places it. */
  position?: StagePosition;
}

/** How the AI of a unit uses one of its custom commands. */
export interface CommandRule {
  /** Relative weight among its commands: 1 by default, 2 makes it come twice as often, 0 never. */
  weight?: number;
  /** Used only while its life is under this share of its maximum, in percent. */
  hpBelow?: number;
}

/** A place on the stage of a battle: ratios of its width (`x`) and height (`y`), from the top left. */
export interface StagePosition {
  x: number;
  y: number;
}

/** What the heroes cannot do in a battle (a troop with rules). `skill` forbids the limit burst too, `action` the custom commands. */
export type ForbiddenCommand = "attack" | "skill" | "item" | "guard" | "escape" | "action";

export interface Combatant {
  id: string;
  name: string;
  /** Free words of its record in the database, `[]` when it has none. */
  tags: string[];
  side: Side;
  battler: string;
  slot: number;
  stats: Stats;
  hp: number;
  sp: number;
  skills: string[];
  weaknesses: string[];
  resists: string[];
  /** Damage multiplier per element, from `elementsEfficiency`. */
  efficiency: Record<string, number>;
  nextAt: number;
  guarding: boolean;
  stagger: { value: number; max: number; broken: boolean } | null;
  limit: { value: number; max: number; skill: string } | null;
  ai?: string;
  rewards?: Rewards;
  owner?: string;
  /** Played by the AI (owner disconnected). */
  auto?: boolean;
  attack: AttackStyle;
  /** Custom commands this combatant can use. */
  commands: string[];
  commandRules?: Record<string, CommandRule>;
  /** Own turns left before each command can be used again (a recharge, or `once`). */
  cooldowns?: Record<string, number>;
  /** Event of the map it stands for. */
  mapId?: string;
  /** Already stolen from (one theft per enemy). */
  stolen?: boolean;
  /** Scanned: the HUD shows its HP and weaknesses. */
  revealed?: boolean;
  /** Summoned unit: who called it and how many of its own turns remain. */
  summon?: { by: string; turns: number };
  invincible?: boolean;
  position?: StagePosition;
}

/** A creature that can be summoned (`act.summon(id)`), from the server option `summons` or the database. */
export interface SummonDef extends Omit<CombatantDef, "id" | "side" | "owner"> {
  /** Own turns before it leaves. Default 3. */
  turns?: number;
  /** Commanded by the summoner's player (menu) instead of the AI. Default false. */
  controlled?: boolean;
}

/** How a basic attack looks and hits (usually derived from the equipped weapon). */
export interface AttackStyle {
  melee?: boolean;
  /** VFX id: a CanvasEngine preset (`swordSlash`, `heavySlash`…) or a plugin recipe. */
  fx?: FxName;
  element?: ElementName;
  /** Tint of the VFX (CSS color); defaults to the element colour. */
  color?: string;
  /** Number of hits of one attack (twin blades, claws…). */
  hits?: number;
  /** Total power of the attack, 100 = regular. */
  power?: number;
  /** Stagger multiplier of each hit. */
  stagger?: number;
  /** Weapon name (shown on the attack banner). */
  weapon?: string;
}

export interface BattleResult {
  outcome: "victory" | "defeat" | "escape";
  exp: number;
  gold: number;
  items: { id: string; name: string; quantity: number }[];
  bonuses: { id: "noDamage" | "staggerFinish" | "swift"; exp: number; gold: number }[];
  turns: number;
  /** PvP: ids of the players of the winning side. */
  winners?: string[];
}

export interface Catalog {
  skills: Record<string, SkillDef>;
  items: Record<string, ItemDef>;
  /** Custom commands (menu data; their rules live on the server). */
  commands?: Record<string, CommandInfo>;
  /** Summonable creatures (`act.summon(id)`). */
  summons?: Record<string, SummonDef>;
}

/** One choice of a command sub-menu (e.g. which creature to summon). */
export interface CommandOptionInfo {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  /** Overrides the command cost. */
  spCost?: number;
  /** Overrides the command scope. */
  scope?: TargetScope;
}

/** What a client needs to show a custom command (see `battleCommand`). */
export interface CommandInfo {
  id: string;
  /** The phases whose triggers the command has (your game runs them). */
  triggers?: SkillPhase[];
  /** What the skill plays when it is cast / on each hit, see `SkillDef`. */
  castFx?: FxName;
  castSound?: string;
  impactSound?: string;
  impactAnimation?: string;
  label: string;
  icon?: string;
  description?: string;
  /** Who can be targeted. Default: enemy. */
  scope: TargetScope;
  spCost?: number;
  /** Turn-order cost (attack = 1). */
  weight?: number;
  /** Battler animation (default `skill`). */
  anim?: string;
  melee?: boolean;
  fx?: FxName;
  element?: ElementName;
  color?: string;
  /** Sub-menu: the player picks one option (sent as `command.option`). */
  options?: CommandOptionInfo[];
  /** Own turns of its user during which it can not be used again after it was used. */
  cooldown?: number;
  /** Usable once in the battle. */
  once?: boolean;
  /** Listed in the Skills sub-menu instead of the menu itself. */
  inSkills?: boolean;
  /** How the AI of an enemy uses it when the unit has no rule of its own for it. */
  ai?: CommandRule;
}

/** When the triggers of a skill run: it is used (`cast`), it reaches a target (`impact`), it makes a target fall (`defeat`). */
export type SkillPhase = "cast" | "impact" | "defeat";

/** A trigger of a skill that has to run (the server runs it, see the option `runTrigger`). */
export interface TriggerCall {
  skill: string;
  phase: SkillPhase;
  /** Combatant that used the skill. */
  actor: string;
  /** Combatant it reached (`impact`, `defeat`). */
  target?: string;
  /** Event of the map the target stands for, when it is one (a visible enemy that started the battle). */
  targetMap?: string;
}

export interface BattleState {
  id: string;
  revision: number;
  rng: number;
  time: number;
  turns: number;
  actor: string | null;
  combatants: Combatant[];
  catalog: Catalog;
  /**
   * Inventories usable in battle, by owner player id (`""` = shared bag):
   * owner → item id → quantity. Each player uses their own items.
   */
  inventory: Record<string, Record<string, number>>;
  /** Consumed items by owner, committed back to each player at the end. */
  used: Record<string, Record<string, number>>;
  /** Items won during the battle (stolen…) by owner, given at the end whatever the outcome. */
  gains: Record<string, Record<string, number>>;
  /** Triggers of skills that were used, in order (the server runs them and keeps how many it ran). */
  calls?: TriggerCall[];
  /** Custom commands the current actor cannot use right now (greyed out). */
  blocked?: string[];
  canEscape: boolean;
  /** Commands the heroes cannot use in this battle. */
  forbid?: ForbiddenCommand[];
  /** Where the party stands on the stage (the anchor of its column). By default the formation places it on the right. */
  heroesPosition?: StagePosition;
  background?: string;
  bgm?: string;
  /** Music played when the heroes win, instead of the small victory jingle. */
  victoryBgm?: string;
  tally: { damageTaken: number; staggerFinishes: number };
  result: BattleResult | null;
  /** Timeline weights in use (lets clients preview the turn order). */
  weights?: Record<CommandType, number>;
}

export type Command =
  | { type: "attack"; target: string }
  | { type: "skill"; skill: string; target?: string }
  | { type: "item"; item: string; target?: string }
  | { type: "limit"; target?: string }
  | { type: "guard" }
  | { type: "escape" }
  | { type: "custom"; command: string; option?: string; target?: string };

export type CommandType = Command["type"];

export interface CommandEnvelope {
  revision: number;
  actor: string;
  command: Command;
}

/** Per-combatant numbers after a beat, so the client display always converges. */
export interface Snap {
  id: string;
  hp: number;
  sp: number;
  guarding: boolean;
  stagger: number | null;
  broken: boolean;
  limit: number | null;
}

export interface Hit {
  target: string;
  amount: number;
  /** `text`: a line over the target; `reveal`: the target was scanned; `summon`: `unit` enters. */
  kind: "damage" | "heal" | "sp" | "miss" | "text" | "reveal" | "summon";
  text?: string;
  /** The summoned combatant (kind `summon`). */
  unit?: Combatant;
  crit?: boolean;
  weak?: boolean;
  resist?: boolean;
  /** Target's stagger gauge broke on this hit. */
  broke?: boolean;
  /** Target fell on this hit. */
  ko?: boolean;
  revive?: boolean;
}

/**
 * Choreography: what happened, in order. The client plays beats; it never
 * computes rules. Each beat carries the resulting numbers (`snap`).
 */
export type Beat =
  | { t: "intro"; snap: Snap[] }
  | { t: "turn"; actor: string; order: string[]; snap: Snap[] }
  | {
      t: "action";
      actor: string;
      kind: "attack" | "skill" | "item" | "limit" | "custom";
      /** Skill / item / custom command id (absent for a plain attack). */
      ref?: string;
      label: string;
      anim: string;
      melee: boolean;
      fx?: string;
      element?: string;
      /** VFX tint (CSS color). */
      color?: string;
      /** Effect on the caster while it casts, and the sounds of the cast and of each hit (skills). */
      castFx?: string;
      castSound?: string;
      impactSound?: string;
      impactAnimation?: string;
      /** Visual Effects of the skill, see `SkillVisualEffects`. */
      effect?: PlayableVisualEffect;
      castEffect?: PlayableVisualEffect;
      impactEffect?: PlayableVisualEffect;
      targets: string[];
      /** One wave per hit index; each wave hits every target at once. */
      waves: Hit[][];
      cutin?: { line: string; video?: string };
      snap: Snap[];
    }
  | { t: "guard"; actor: string; snap: Snap[] }
  | { t: "recover"; actor: string; snap: Snap[] }
  /** The game changed the life or the SP of a unit (a trigger of a skill): the bars follow. */
  | { t: "sync"; snap: Snap[] }
  /** A summoned unit leaves the battle (its turns are over). */
  | { t: "leave"; actor: string; snap: Snap[] }
  | { t: "escape"; success: boolean; snap: Snap[] }
  | { t: "end"; result: BattleResult; snap: Snap[] };

export interface BattlePacket {
  battleId: string;
  revision: number;
  state: BattleView;
  beats: Beat[];
  error?: string;
  /** Player id of the client receiving the packet (its units open the menu). */
  viewer?: string;
  /** Names of the players in the battle, by player id (coop). */
  players?: Record<string, string>;
  /** Seconds a player has to choose a command (coop), after the choreography. */
  turnTimer?: number;
  /** The receiving client only watches (no menu). */
  spectator?: boolean;
  /** Number of players watching. */
  spectators?: number;
  /** Player versus player battle (the client offers "Abandonner"). */
  pvp?: boolean;
}

/** What a client may see (no RNG). */
export type BattleView = Omit<BattleState, "rng">;

/** An enemy of a troop, with what is specific to this place in the troop. */
export interface TroopMember {
  /** Id of the enemy in the database. */
  enemy: string;
  /** Level it fights at: a number, or `"party"` for the average level of the players. Default: its own level. */
  level?: number | "party";
  /** Levels it may differ from `level`, up or down, chosen at random for each battle. Default 0. */
  levelSpread?: number;
  invincible?: boolean;
  position?: StagePosition;
  /**
   * When this member fights, in the terms of the game: the server option `enemyCondition(player, condition)` tells. Without
   * that option, or without a condition, the member always fights.
   */
  condition?: unknown;
}

export interface TroopDef {
  id: string;
  name?: string;
  /** Free words of the record of the troop in the database (`tags`). */
  tags?: string[];
  enemies: (CombatantDef | TroopMember | string)[];
  canEscape?: boolean;
  /** Commands the heroes cannot use in this battle (`escape` is the same as `canEscape: false`). */
  forbid?: ForbiddenCommand[];
  /** Where the party stands on the stage, as a ratio of its width and height (0..1). By default the formation places it on the right. */
  heroesPosition?: StagePosition;
  background?: string;
  bgm?: string;
  victoryBgm?: string;
}
