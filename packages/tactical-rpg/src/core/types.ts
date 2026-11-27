/**
 * Tactical battle model shared by the authoritative server and the client
 * presentation. Everything is plain serialisable data.
 */
import type { VisualEffects } from "@rpgjs/battle-kit/pure";
export type Team = "ally" | "enemy";
/**
 * Class of a unit, by id: the built-in `warrior`, `archer`, `mage`, or any role
 * declared with `tacticalRole` (see `RoleDef`).
 */
export type Role = string;
/** How a role's basic attack is played: charge and strike, arrow, or magic bolt. */
export type AttackStyle = "melee" | "ranged" | "magic";

/** A role as the battle sees it (name, badge glyph, accent colour, attack style). */
export interface RoleDef {
  id: string;
  name: string;
  /** Short symbol on the unit badge and in the HUD (one character). */
  glyph: string;
  /** Accent colour (0xrrggbb): selection ring, badge, projectile. */
  color: number;
  attack: AttackStyle;
}
export type SkillShape = "single" | "cross" | "square" | "pierce";
/** Visual family of a skill (client effects). */
export type SkillVisual = "slash" | "shockwave" | "arrow" | "volley" | "fire" | "frost";

export interface Cell {
  x: number;
  y: number;
}

export interface Board {
  columns: number;
  rows: number;
  cellSize: number;
  /** World position of the top-left corner of the grid (map pixels). */
  origin: Cell;
  /** Blocked cells, as `"x,y"`. */
  blocked: string[];
}

/** Parameters of the unit under the names of RPGJS (`atk`, `pdef`…), for the damage formulas of the map. */
export type UnitParams = Record<string, number>;

/**
 * `effect`: a Visual Effect of the Studio played from the caster to the aimed unit, the hits landing at its `hitAt`; `castEffect` on the
 * caster and `impactEffect` on each unit hit (split). They replace the look of `visual`, which stays for the part without an effect.
 */
export interface SkillDef extends VisualEffects {
  id: string;
  name: string;
  description?: string;
  /** SP cost (the native `spCost` of the skill). */
  spCost: number;
  power: number;
  range: number;
  shape: SkillShape;
  /** The area the Studio skill draws around its target (rows of `#` for a hit tile, the target in the middle); wins over `shape`. */
  mask?: string[];
  visual: SkillVisual;
  /** Accent colour (0xrrggbb). */
  color: number;
  /** Uses per battle (default 1). */
  uses?: number;
}

/**
 * An item the battle can use: it restores HP and/or MP of a unit next to the one that uses it. `effect`: a Visual Effect of the Studio
 * played from the user to that unit, the heal landing at its `hitAt`.
 */
export interface ItemDef extends Pick<VisualEffects, "effect"> {
  id: string;
  name: string;
  description?: string;
  /** HP restored. */
  hp: number;
  /** MP restored. */
  sp: number;
}

/** What the heroes may do in a battle (all by default): a `false` forbids it to them. */
export interface BattleRules {
  canAttack: boolean;
  canUseSkills: boolean;
  canUseItems: boolean;
  canGuard: boolean;
  canEscape: boolean;
}

/**
 * What the heroes have to do to win (`eliminate` when absent). `type` is a built-in one (`eliminate`, `boss`, `survive`, `reach`) or one
 * a plugin registered (`registerObjectiveType`); the other fields are its parameters. `limit`: the heroes lose when the battle goes
 * beyond that many rounds.
 */
export interface Objective {
  type: string;
  /** `boss`: the enemy to defeat. */
  unitId?: string;
  /** `survive`: the rounds to hold. */
  turns?: number;
  /** `reach`: the cell a hero has to stand on. */
  cell?: Cell;
  limit?: number;
  [parameter: string]: unknown;
}

export interface Unit extends Cell {
  id: string;
  team: Team;
  role: Role;
  name: string;
  description?: string;
  /** RPGJS spritesheet id (walking sheet: `stand-<dir>` / `walk-<dir>` textures). */
  battler: string;
  /** Portrait image URL (HUD, cut-ins). */
  portrait?: string;
  /** Sprite tint (0xrrggbb). */
  tint?: number;
  /** Parameters for the damage formulas of RPGJS (Studio units). */
  params?: UnitParams;
  /** Id of the player this unit is (a hero read from an `RpgPlayer`). */
  player?: string;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  skillIds: string[];
  usedSkills: string[];
  /** Items carried, by item id. */
  items: Record<string, number>;
  /** On guard until its side plays again: it takes half the damage. */
  guarding: boolean;
  /** It keeps one hit point whatever the blow: it is never defeated. */
  invincible?: boolean;
  power: number;
  range: number;
  move: number;
  moved: boolean;
  acted: boolean;
  /** Player who commands this unit (allies); in coop, each player has their own units. */
  owner?: string;
}

/** Texts of an encounter shown by the HUD. */
export interface EncounterMeta {
  name?: string;
  chapter?: string;
  objective?: string;
  intro?: string;
}

/** A player of the battle (coop: several). */
export interface BattlePlayer {
  id: string;
  name: string;
}

export interface BattleState {
  id: string;
  revision: number;
  round: number;
  phase: Team;
  units: Unit[];
  board: Board;
  /** Skill catalogue of this battle. */
  skills: Record<string, SkillDef>;
  /** Roles of the units of this battle. */
  roles: Record<string, RoleDef>;
  /** Item catalogue of this battle. */
  items: Record<string, ItemDef>;
  /** What the heroes may do (everything when absent). */
  rules?: BattleRules;
  /** What the heroes have to do to win (every enemy down when absent). */
  objective?: Objective;
  /** The heroes fled: the battle is over and they have not won. */
  escaped?: boolean;
  meta: EncounterMeta;
  winner: Team | null;
  started: boolean;
  /** Players commanding the allies. */
  players: BattlePlayer[];
  /** PvP: players commanding the enemies (the AI plays them otherwise). */
  versus: BattlePlayer[];
  /** Players ready to start (the battle starts when all are). */
  ready: string[];
  /** Number of spectators watching. */
  spectators: number;
  /** Animation speed shared by every client (1 normal, 2 fast, 3 fast-forward); the server paces the AI with it. In a duel each player has their own. */
  pace: number;
  /** Several players on a side: the cells their units are about to move to (a move is walked locally before it is sent), so nobody else aims at them. */
  holds?: Hold[];
  /** The time a side has to play its phase, when the battle has one: `seconds` for a phase, `left` (ms) what remained when this state was sent. */
  timer?: { seconds: number; left: number };
}

/** A cell a unit is about to move to, held for it by the player who commands it. */
export interface Hold extends Cell {
  unitId: string;
  owner: string;
}

export type Command =
  | { type: "start" | "endPhase" | "surrender" | "escape" }
  /** `path`: the route chosen cell by cell (validated); the shortest one otherwise. */
  | { type: "move"; unitId: string; cell: Cell; path?: Cell[] }
  | { type: "attack"; unitId: string; targetId: string }
  | { type: "skill"; unitId: string; targetId: string; skillId: string }
  | { type: "item"; unitId: string; targetId: string; itemId: string }
  | { type: "guard"; unitId: string }
  | { type: "wait"; unitId: string };

export interface BattleEvent {
  kind: "move" | "attack" | "skill" | "item" | "guard" | "escape" | "wait" | "phase" | "start" | "surrender";
  /** `surrender`: the side that gave up. */
  team?: Team;
  unitId?: string;
  targetId?: string;
  skillId?: string;
  itemId?: string;
  /** `item`: what each unit got back. */
  heals?: { unitId: string; hp: number; sp: number }[];
  path?: Cell[];
  hits?: { unitId: string; damage: number; killed: boolean }[];
  /** `phase`: the phase ended because its time ran out. */
  timeout?: boolean;
}

export interface TacticalResult {
  /** `abandon`: the player left before the end. */
  outcome: "victory" | "defeat" | "abandon" | "escape";
  rounds: number;
  /** Surviving units of the player's side. */
  survivors: number;
  /** Ids of the players on the winning side (PvP, coop). */
  winners: string[];
}

export interface BattlePacket {
  state: BattleState;
  event?: BattleEvent;
  error?: string;
  /** Name of a player who left: in co-op their units go to a partner, in a duel their side may forfeit. */
  left?: string;
  /** The side of the player who left. */
  leftTeam?: Team;
}

export interface CommandEnvelope {
  revision: number;
  command: Command;
  /**
   * Played right after `command` (same order): a move and the action that
   * follows it are sent together, the move having been previewed locally.
   */
  then?: Command;
}
