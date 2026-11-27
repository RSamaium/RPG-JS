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

/**
 * The `tactical` field of a skill (see `tacticalSkill`). `effect` / `castEffect` / `impactEffect`: the Visual Effects of the Studio,
 * which replace the look of `visual` (see `SkillDef`).
 */
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
/** A skill of the database usable in a tactical battle (see `tacticalSkill`). */
export interface TacticalSkillRecord extends NativeFields {
  name: string;
  description?: string;
  /** Native SP cost of the skill. */
  spCost?: number;
  /** Native power of the skill. */
  power?: number;
  tactical: TacticalSkillData;
}

/** The `tactical` field of a role (see `tacticalRole`). */
export interface TacticalRoleData {
  /** Basic attack: `melee` (charge), `ranged` (arrow), `magic` (bolt). */
  attack: AttackStyle;
  /** Badge symbol (one character). Default ◆. */
  glyph?: string;
  /** Accent colour (0xrrggbb). */
  color?: number;
}
/** An item of the database usable in a tactical battle (see `tacticalItem`). */
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

/** A role of the database (see `tacticalRole`). */
export interface TacticalRoleRecord extends NativeFields {
  name: string;
  tactical: TacticalRoleData;
}

/** The `tactical` field of a unit (see `tacticalUnit`); the `hero` server option returns a part of it. */
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
/** A unit of the database (see `tacticalUnit`). */
export interface TacticalUnitRecord extends NativeFields {
  name: string;
  description?: string;
  tactical: TacticalUnitData;
}

/** Where a unit of an encounter stands at the start (`x`, `y`: a cell of the grid), and who commands it. */
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

/** The `tactical` field of an encounter (see `tacticalEncounter`). */
export interface TacticalEncounterData {
  /** Small title shown at the start (`tactical.chapter` otherwise). */
  chapter?: string;
  /**
   * What the HUD says the heroes have to do: display text only (the text of the `goal` type otherwise). The objective that decides
   * the battle is `goal`.
   */
  objective?: string;
  /** Text shown at the start (`tactical.intro` otherwise). */
  intro?: string;
  /** Grid size and position; `origin` (map pixels) defaults to around the player. */
  board?: Partial<Board>;
  allies: Placement[];
  enemies: Placement[];
  /** What the heroes may do (everything by default). */
  rules?: Partial<BattleRules>;
  /** Seconds a side has to play its phase when several players are in the battle (0: no limit; the one of the server otherwise, 60 by default). */
  turnSeconds?: number;
  /**
   * The objective type that decides the battle (every enemy down by default): `eliminate`, `boss` (`enemy`: the chief, as its index
   * among `enemies`), `survive` (`turns`), `reach` (`cell`), or a type registered with `registerObjectiveType`; `limit` caps the
   * rounds. Ignored in PvP, where a side wins when the other one is down or surrenders.
   */
  goal?: Omit<Objective, "unitId"> & { enemy?: number };
}
/** An encounter of the database (see `tacticalEncounter`). */
export interface TacticalEncounterRecord extends NativeFields {
  name?: string;
  tactical: TacticalEncounterData;
}

/**
 * A role of the units of a tactical battle, besides the built-in `warrior`,
 * `archer` and `mage`: how its units attack, their badge and colour. Returns
 * the record with `_type: "tactical-role"`, to put in the RPGJS database. Data
 * only: the server reads it when a battle starts; standalone RPG and MMORPG.
 *
 * @title tacticalRole
 * @method tacticalRole(record)
 * @param {TacticalRoleRecord} record - `name` and the `tactical` field (`attack`, `glyph`, `color`)
 * @returns {TacticalRoleRecord & { _type: "tactical-role" }} The database record
 * @example
 * ```ts
 * import { tacticalRole } from "@rpgjs/tactical-rpg/server";
 *
 * const database = {
 *   paladin: tacticalRole({ name: "Paladin", tactical: { attack: "melee", glyph: "✠", color: 0xffe29a } }),
 * };
 * ```
 */
export const tacticalRole = <T extends TacticalRoleRecord>(record: T): T & { _type: "tactical-role" } => ({ _type: "tactical-role" as const, ...record });

/**
 * An item usable in a tactical battle: an ordinary RPGJS item (`_type: "item"`),
 * so players carry it. A unit uses it on itself or on an ally next to it and
 * restores the native `hpValue` / `spValue`; `tactical.effect` is the Visual
 * Effect played. Data only, read by the server; standalone RPG and MMORPG.
 *
 * @title tacticalItem
 * @method tacticalItem(record)
 * @param {TacticalItemRecord} record - `name`, `hpValue`, `spValue` and the optional `tactical` field
 * @returns {TacticalItemRecord & { _type: "item" }} The database record
 * @example
 * ```ts
 * import { tacticalItem } from "@rpgjs/tactical-rpg/server";
 *
 * const database = { potion: tacticalItem({ name: "Potion", hpValue: 40 }) };
 * ```
 */
export const tacticalItem = <T extends TacticalItemRecord>(record: T): T & { _type: "item" } => ({ _type: "item" as const, ...record });

/**
 * A skill usable in a tactical battle: an ordinary RPGJS skill
 * (`_type: "skill"`), so players learn it. The native `spCost` and `power` are
 * shared with every battle system; the `tactical` field gives its range, area
 * and look. Data only, read by the server; standalone RPG and MMORPG.
 *
 * @title tacticalSkill
 * @method tacticalSkill(record)
 * @param {TacticalSkillRecord} record - `name`, `spCost`, `power` and the `tactical` field (`range`, `shape`, `visual`, `color`…)
 * @returns {TacticalSkillRecord & { _type: "skill" }} The database record
 * @example
 * ```ts
 * import { tacticalSkill } from "@rpgjs/tactical-rpg/server";
 *
 * const database = {
 *   nova: tacticalSkill({ name: "Nova", spCost: 14, power: 30, tactical: { range: 3, shape: "square", visual: "fire", color: 0xff995d } }),
 * };
 * ```
 */
export const tacticalSkill = <T extends TacticalSkillRecord>(record: T): T & { _type: "skill" } => ({ _type: "skill" as const, ...record });

/**
 * A unit an encounter places on the grid (an ally or an enemy that is not the
 * hero of a player): its role, battler, stats, skills and items. Returns the
 * record with `_type: "tactical-unit"`. Data only, read by the server;
 * standalone RPG and MMORPG.
 *
 * @title tacticalUnit
 * @method tacticalUnit(record)
 * @param {TacticalUnitRecord} record - `name` and the `tactical` field (`role`, `battler`, `stats`, `skills`…)
 * @returns {TacticalUnitRecord & { _type: "tactical-unit" }} The database record
 * @example
 * ```ts
 * import { tacticalUnit } from "@rpgjs/tactical-rpg/server";
 *
 * const database = {
 *   sentinel: tacticalUnit({ name: "Sentinel", tactical: { role: "archer", battler: "guard", stats: { hp: 60, sp: 0, power: 12, range: 3, move: 2 } } }),
 * };
 * ```
 */
export const tacticalUnit = <T extends TacticalUnitRecord>(record: T): T & { _type: "tactical-unit" } => ({ _type: "tactical-unit" as const, ...record });

/**
 * A tactical battle: where the allies and the enemies stand, the grid, the
 * rules, the objective type (`goal`) and the texts shown at the start. Its id
 * is what `startTacticalBattle` takes. Returns the record with
 * `_type: "tactical-encounter"`. Data only, read by the server; standalone RPG
 * and MMORPG.
 *
 * @title tacticalEncounter
 * @method tacticalEncounter(record)
 * @param {TacticalEncounterRecord} record - `name` and the `tactical` field (`allies`, `enemies`, `board`, `rules`, `goal`…)
 * @returns {TacticalEncounterRecord & { _type: "tactical-encounter" }} The database record
 * @example
 * ```ts
 * import { tacticalEncounter } from "@rpgjs/tactical-rpg/server";
 *
 * const database = {
 *   sanctuary: tacticalEncounter({
 *     name: "Sanctuary",
 *     tactical: {
 *       objective: "Defeat the warden.",
 *       goal: { type: "boss", enemy: 0, limit: 8 },
 *       allies: [{ hero: true, x: 3, y: 5 }],
 *       enemies: [{ unit: "sentinel", x: 4, y: 1 }],
 *     },
 *   }),
 * };
 * ```
 */
export const tacticalEncounter = <T extends TacticalEncounterRecord>(record: T): T & { _type: "tactical-encounter" } => ({ _type: "tactical-encounter" as const, ...record });

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
  o: { id: string; origin?: Cell; cellSize?: number; players?: BattlePlayer[]; versus?: BattlePlayer[] },
): BattleState {
  const { data } = setup;
  // The size of a cell: the encounter's, else the one given (the tile of the map), else the default.
  const size = { ...DEFAULT_BOARD, ...(o.cellSize ? { cellSize: o.cellSize } : {}), ...data.board };
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
      if (s)
        skills[id] = {
          id,
          name: s.name,
          description: s.description,
          spCost: Number(s.spCost) || 0,
          power: Number(s.power) || 0,
          // The parameters that scale its damage with the map's `damageSkill` formula (the native field of the skill).
          ...(s.coefficient && typeof s.coefficient === "object" ? { coefficient: s.coefficient as Record<string, number> } : {}),
          ...s.tactical,
        };
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
 * an RPGJS spritesheet with the `stand-<dir>` and `walk-<dir>` textures a
 * battler needs. Client side: give it to the `spritesheets` of a client module.
 *
 * @title walkingSheet
 * @method walkingSheet(id, image, rows?)
 * @param {string} id - The spritesheet id, the `battler` of the units
 * @param {string} image - The image of the sheet
 * @param {Record<"up" | "left" | "down" | "right", number>} [rows] - The row of each direction (default up 0, left 1, down 2, right 3)
 * @returns {object} The spritesheet
 * @example
 * ```ts
 * import { walkingSheet } from "@rpgjs/tactical-rpg/client";
 *
 * defineModule<RpgClient>({ spritesheets: [walkingSheet("guard", "/sprites/guard.png")] });
 * ```
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
