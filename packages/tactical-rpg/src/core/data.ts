import { DEFAULT_BOARD } from "./board";
import { DEFAULT_ROLES } from "./roles";
import type { VisualEffects } from "@rpgjs/battle-kit/pure";
import type { Objective, AttackStyle, BattlePlayer, BattleRules, BattleState, Board, Cell, Role, RoleDef, SkillDef, SkillShape, SkillVisual, Unit } from "./types";

/**
 * Tactical data in the RPGJS database, typed. The helpers return the record
 * (plus `_type`), so the database stays the single source of game data. The
 * native RPGJS fields are shared with the other battle systems (`name`,
 * `description`, `spCost` and `power` of a skill, `hpValue` and `spValue` of an
 * item); the `tactical` field carries what only a tactical battle needs:
 *
 * ```ts
 * database: {
 *   "ember-nova": tacticalSkill({ name: "Ember nova", spCost: 14, power: 30, tactical: { range: 3, shape: "square", visual: "fire", color: 0xff995d } }),
 *   potion: tacticalItem({ name: "Potion", hpValue: 40 }),
 *   kael: tacticalUnit({ name: "Kael", tactical: { role: "warrior", battler: "hero", stats: { hp: 120, sp: 20, power: 24, range: 1, move: 3 }, skills: ["ember-nova"] } }),
 *   sanctuary: tacticalEncounter({ name: "Sanctuary", tactical: { allies: [{ hero: true, x: 4, y: 5 }, { unit: "kael", x: 5, y: 5 }], enemies: [{ unit: "sentinel", x: 4, y: 1 }] } }),
 * }
 * ```
 */

interface NativeFields {
  [field: string]: unknown;
}

/** `effect` / `castEffect` / `impactEffect`: the Visual Effects of the Studio, which replace the look of `visual` (see `SkillDef`). */
export interface TacticalSkillData extends VisualEffects {
  range: number;
  shape: SkillShape;
  /** Area drawn in Studio (`targeting.aoeMask`): rows, a character other than `.`, ` ` or `0` is a hit tile, the target is the middle. */
  mask?: string[];
  visual: SkillVisual;
  /** Accent colour (0xrrggbb). */
  color: number;
  /** Uses per battle (default 1). */
  uses?: number;
}
export interface TacticalSkillRecord extends NativeFields {
  name: string;
  description?: string;
  /** Native SP cost of the skill. */
  spCost?: number;
  /** Native power of the skill. */
  power?: number;
  tactical: TacticalSkillData;
}

export interface TacticalRoleData {
  /** Basic attack: `melee` (charge), `ranged` (arrow), `magic` (bolt). */
  attack: AttackStyle;
  /** Badge symbol (one character). Default ◆. */
  glyph?: string;
  /** Accent colour (0xrrggbb). */
  color?: number;
}
export interface TacticalItemRecord extends NativeFields {
  name: string;
  description?: string;
  /** Native HP restored. */
  hpValue?: number;
  /** Native SP restored. */
  spValue?: number;
  /** `effect`: a Visual Effect played from the user to the unit it heals (see `ItemDef`). */
  tactical?: Pick<VisualEffects, "effect">;
}

export interface TacticalRoleRecord extends NativeFields {
  name: string;
  tactical: TacticalRoleData;
}

export interface TacticalUnitData {
  /** Role id: `warrior`, `archer`, `mage` or a `tacticalRole` of the database. */
  role: Role;
  /** RPGJS spritesheet id with `stand-<dir>` / `walk-<dir>` textures (see `walkingSheet`). */
  battler: string;
  portrait?: string;
  tint?: number;
  stats: { hp: number; sp: number; power: number; range: number; move: number };
  skills?: string[];
  /** Items carried: id → how many. */
  items?: Record<string, number>;
  /** Parameters under the names of RPGJS: the damage is the one of the formulas of the map when the units have them. */
  params?: Record<string, number>;
  /** HP and SP the unit starts with, when lower than its `stats` (a hero read from a player). */
  current?: { hp: number; sp: number };
  /** Id of the player this unit is (a hero read from an `RpgPlayer`): it is theirs, and its outcome is written back on them. */
  player?: string;
}
export interface TacticalUnitRecord extends NativeFields {
  name: string;
  description?: string;
  tactical: TacticalUnitData;
}

export interface Placement extends Cell {
  /**
   * Unit id of the database (or of the `units` option). The server fills it for a `hero` placement.
   */
  unit?: string;
  /**
   * The hero of a player: a unit read from the `RpgPlayer` (HP, SP, parameters with the equipment, the skills it knows, the items
   * of its inventory), whose outcome is written back on the player. `seat` says which player of the side (the first by default).
   */
  hero?: boolean;
  /** Index of the player commanding this unit in its side (coop, PvP; default: dealt in turn). */
  seat?: number;
  /** It keeps one hit point whatever the blow (an enemy the troop makes invincible). */
  invincible?: boolean;
}

export interface TacticalEncounterData {
  chapter?: string;
  objective?: string;
  intro?: string;
  /** Grid size and position; `origin` (map pixels) defaults to around the player. */
  board?: Partial<Board>;
  allies: Placement[];
  enemies: Placement[];
  /** What the heroes may do (everything by default). */
  rules?: Partial<BattleRules>;
  /** Seconds a side has to play its phase when several players are in the battle (0: no limit; the one of the server otherwise, 60 by default). */
  turnSeconds?: number;
  /** What the heroes have to do to win (every enemy down by default). `enemy`: the chief, as its index among `enemies`. */
  goal?: Omit<Objective, "unitId"> & { enemy?: number };
}
export interface TacticalEncounterRecord extends NativeFields {
  name?: string;
  tactical: TacticalEncounterData;
}

export const tacticalRole = <T extends TacticalRoleRecord>(record: T) => ({ _type: "tactical-role" as const, ...record });
/** An item usable in a tactical battle: an ordinary RPGJS item (`_type: "item"`), so players carry it. */
export const tacticalItem = <T extends TacticalItemRecord>(record: T) => ({ _type: "item" as const, ...record });
/** A skill usable in a tactical battle: an ordinary RPGJS skill (`_type: "skill"`), so players learn it. */
export const tacticalSkill = <T extends TacticalSkillRecord>(record: T) => ({ _type: "skill" as const, ...record });
export const tacticalUnit = <T extends TacticalUnitRecord>(record: T) => ({ _type: "tactical-unit" as const, ...record });
export const tacticalEncounter = <T extends TacticalEncounterRecord>(record: T) => ({ _type: "tactical-encounter" as const, ...record });

/** A resolved encounter: its data plus every unit and skill it needs. */
export interface EncounterSetup {
  name?: string;
  data: TacticalEncounterData;
  units: Record<string, TacticalUnitRecord>;
  skills: Record<string, TacticalSkillRecord>;
  /** Items the units carry. */
  items?: Record<string, TacticalItemRecord>;
  /** Roles declared for this battle (the built-in ones are always known). */
  roles?: Record<string, TacticalRoleRecord>;
}

const ownerOf = (side: BattlePlayer[], seat: number) => (side.length ? side[seat % side.length].id : undefined);

/** The objective of the battle: the chief, given as an index of the enemies, is named by the id its unit has. */
function goalOf(goal: NonNullable<TacticalEncounterData["goal"]>, enemies: Placement[], idOf: (index: number) => string): Objective {
  const { enemy, ...objective } = goal as Objective & { enemy?: number };
  return typeof enemy === "number" && enemies[enemy] ? { ...objective, unitId: idOf(enemy) } : objective;
}

/** Build the initial battle state of an encounter. */
export function createTacticalBattle(
  setup: EncounterSetup,
  o: { id: string; origin?: Cell; players?: BattlePlayer[]; versus?: BattlePlayer[] },
): BattleState {
  const { data } = setup;
  const size = { ...DEFAULT_BOARD, ...data.board };
  const origin = data.board?.origin ??
    o.origin ?? { x: 0, y: 0 };
  const board: Board = { columns: size.columns, rows: size.rows, cellSize: size.cellSize, blocked: [...(size.blocked ?? [])], origin };
  const skills: Record<string, SkillDef> = {};
  const roles: Record<string, RoleDef> = {};
  const players = o.players ?? [];
  const versus = o.versus ?? [];
  const unit = (team: "ally" | "enemy", p: Placement, i: number): Unit => {
    const record = p.unit ? setup.units[p.unit] : undefined;
    if (!record) throw new Error(`[Tactical] Unknown unit "${p.unit ?? "(hero without a player)"}"`);
    const b = record.tactical;
    if (!roles[b.role]) {
      const declared = setup.roles?.[b.role];
      const role = declared
        ? { id: b.role, name: declared.name, glyph: declared.tactical.glyph ?? "◆", color: declared.tactical.color ?? 0xdbbb7d, attack: declared.tactical.attack }
        : DEFAULT_ROLES[b.role];
      if (!role) throw new Error(`[Tactical] Unknown role "${b.role}" (unit "${p.unit}")`);
      roles[b.role] = role;
    }
    for (const id of b.skills ?? []) {
      const s = setup.skills[id];
      if (s) skills[id] = { id, name: s.name, description: s.description, spCost: Number(s.spCost) || 0, power: Number(s.power) || 0, ...s.tactical };
    }
    return {
      id: b.player ? `hero-${b.player}` : `${team}-${p.unit}-${i}`,
      team,
      role: b.role,
      name: record.name,
      description: record.description,
      battler: b.battler,
      portrait: b.portrait,
      tint: b.tint,
      ...(b.params ? { params: b.params } : {}),
      x: p.x,
      y: p.y,
      hp: Math.min(b.current?.hp ?? b.stats.hp, b.stats.hp),
      maxHp: b.stats.hp,
      sp: Math.min(b.current?.sp ?? b.stats.sp, b.stats.sp),
      maxSp: b.stats.sp,
      ...(b.player ? { player: b.player } : {}),
      power: b.stats.power,
      range: b.stats.range,
      move: b.stats.move,
      skillIds: (b.skills ?? []).filter((id) => setup.skills[id]),
      usedSkills: [],
      items: Object.fromEntries(Object.entries(b.items ?? {}).filter(([id, n]) => setup.items?.[id] && n > 0)),
      ...(p.invincible ? { invincible: true } : {}),
      guarding: false,
      moved: false,
      acted: false,
      owner: b.player ?? ownerOf(team === "ally" ? players : versus, p.seat ?? i),
    };
  };
  return {
    id: o.id,
    revision: 0,
    round: 1,
    phase: "ally",
    board,
    skills,
    roles,
    items: Object.fromEntries(Object.entries(setup.items ?? {}).map(([id, item]) => [id, { id, name: String(item.name), ...(item.description ? { description: item.description } : {}), hp: Number(item.hpValue) || 0, sp: Number(item.spValue) || 0, ...(item.tactical?.effect ? { effect: item.tactical.effect } : {}) }])),
    ...(data.rules ? { rules: { canAttack: true, canUseSkills: true, canUseItems: true, canGuard: true, canEscape: true, ...data.rules } } : {}),
    ...(data.goal && !versus.length ? { objective: goalOf(data.goal, data.enemies, (i) => `enemy-${data.enemies[i].unit}-${i}`) } : {}),
    meta: { name: setup.name, chapter: data.chapter, objective: data.objective, intro: data.intro },
    winner: null,
    started: false,
    players,
    versus,
    ready: [],
    spectators: 0,
    pace: 1,
    units: [...data.allies.map((p, i) => unit("ally", p, i)), ...data.enemies.map((p, i) => unit("enemy", p, i))],
  };
}

/**
 * A Studio / RPG Maker style walking sheet (4 × 4: one row per direction) as
 * an RPGJS spritesheet with `stand-<dir>` and `walk-<dir>` textures.
 */
export function walkingSheet(
  id: string,
  image: string,
  rows: Record<"up" | "left" | "down" | "right", number> = { up: 0, left: 1, down: 2, right: 3 },
) {
  const textures: Record<string, { animations: () => { time: number; frameX?: number; frameY?: number }[][] }> = {};
  for (const [facing, row] of Object.entries(rows)) {
    textures[`stand-${facing}`] = { animations: () => [[{ time: 0, frameX: 0, frameY: row }, { time: 60 }]] };
    // 110 ms per step (6.6 ticks at 60 fps).
    const steps: { time: number; frameX?: number; frameY?: number }[] = [0, 1, 2, 3].map((i) => ({ time: Math.round(i * 6.6), frameX: i, frameY: row }));
    steps.push({ time: 26 });
    textures[`walk-${facing}`] = { animations: () => [steps] };
  }
  return { id, image, framesWidth: 4, framesHeight: 4, textures };
}
