import type { RpgPlayer } from "@rpgjs/server";
import { actionCommand, type AttackStyle, type BattleActionRecord, type CombatantDef, type CustomCommand, type ItemDef, type Rewards, type SkillDef, type Stats, type SummonDef, type TroopDef } from "../core";
import { visualEffectsOf } from "@rpgjs/battle-kit/pure";
import { databaseRecord, plainValue } from "@rpgjs/battle-kit/server";

/**
 * Battle data lives in the RPGJS database like any other game data:
 *
 * ```ts
 * defineModule<RpgServer>({
 *   database: {
 *     fire: { name: "Fire", spCost: 18, power: 105, turnBattle: { kind: "magical", scope: "allEnemies", element: "fire" } },
 *     potion: { name: "Potion", hpValue: 150, consumable: true, _type: "item", turnBattle: { scope: "ally" } },
 *     goblin: { _type: "enemy", name: "Goblin", turnBattle: { battler: "goblin", stats: {...}, rewards: {...} } },
 *     goblins: { _type: "troop", turnBattle: { enemies: ["goblin", "goblin"] } },
 *   },
 * })
 * ```
 *
 * Native fields (`name`, `description`, `spCost`, `power`, `hpValue`, `spValue`)
 * are reused; the `turnBattle` field carries what RPGJS has no notion of.
 */

type Raw = Record<string, any>;

/**
 * A record of the RPGJS database as the battle reads it (see `databaseRecord` of
 * `@rpgjs/battle-kit/server`). The `onUse` hook of a skill written as a method
 * of its class is not enumerable: it is kept by name.
 */
export function dbRecord(player: RpgPlayer, id: string): Raw | undefined {
  const record = databaseRecord<Raw>(player, id);
  if (!record) return undefined;
  let source: unknown;
  try {
    source = player.databaseById(id);
  } catch {
    source = undefined;
  }
  const onUse = typeof source === "function" ? (source as { prototype?: Raw }).prototype?.onUse : undefined;
  return typeof onUse === "function" ? { ...record, onUse } : record;
}

const val = plainValue;

/** The `tags` of a record of the database, when it has some. */
const tagsOf = (raw: Raw): { tags?: string[] } => {
  const tags = Array.isArray(raw.tags) ? raw.tags.filter((tag: unknown): tag is string => typeof tag === "string") : [];
  return tags.length ? { tags } : {};
};

export function skillFromDb(id: string, raw: Raw | undefined): SkillDef | undefined {
  if (!raw) return undefined;
  const b = (raw.turnBattle ?? {}) as Partial<SkillDef>;
  const element = b.element ?? (typeof raw.element === "string" && raw.element !== "none" ? raw.element : undefined);
  return {
    kind: "physical",
    scope: "enemy",
    ...b,
    id,
    name: String(val(raw.name) ?? b.name ?? id),
    description: (val(raw.description) as string) ?? b.description,
    ...tagsOf(raw),
    spCost: Number(raw.spCost ?? b.spCost ?? 0),
    power: Number(b.power ?? raw.power ?? 100),
    ...(element ? { element } : {}),
    ...(raw.coefficient && typeof raw.coefficient === "object" ? { coefficient: raw.coefficient } : {}),
    // A skill with a native `onUse` hook has something to run for each target it reaches
    ...(!b.triggers?.length && typeof raw.onUse === "function" ? { triggers: ["impact" as const] } : {}),
  };
}

export function itemFromDb(id: string, raw: Raw | undefined): ItemDef | undefined {
  if (!raw || raw._type === "weapon" || raw._type === "armor") return undefined;
  if (!raw.turnBattle && raw.hpValue === undefined && raw.spValue === undefined) return undefined;
  const b = (raw.turnBattle ?? {}) as Partial<ItemDef>;
  return {
    scope: "ally",
    ...b,
    id,
    name: String(val(raw.name) ?? b.name ?? id),
    description: (val(raw.description) as string) ?? b.description,
    hp: b.hp ?? (raw.hpValue !== undefined ? Number(raw.hpValue) : undefined),
    sp: b.sp ?? (raw.spValue !== undefined ? Number(raw.spValue) : undefined),
  };
}

/**
 * Weapon types → basic attack style. `fx` names are CanvasEngine
 * `@canvasengine/presets` attack effects (`ATTACK_FX_PRESETS` / `MAGIC_FX_PRESETS`).
 */
export const WEAPON_STYLES: Record<string, AttackStyle> = {
  sword: { fx: "swordSlash", melee: true },
  greatsword: { fx: "heavySlash", melee: true, stagger: 1.4 },
  axe: { fx: "heavySlash", melee: true, stagger: 1.5 },
  katana: { fx: "crossSlash", melee: true, hits: 2 },
  dualblades: { fx: "crossSlash", melee: true, hits: 2 },
  dagger: { fx: "comboHits", melee: true, hits: 3, stagger: 0.7 },
  spear: { fx: "pierce", melee: true, stagger: 1.2 },
  claw: { fx: "clawStrike", melee: true, hits: 2 },
  fist: { fx: "comboHits", melee: true, hits: 3 },
  hammer: { fx: "groundSlam", melee: true, stagger: 1.8 },
  mace: { fx: "groundSlam", melee: true, stagger: 1.6 },
  whip: { fx: "spinSlash", melee: true },
  staff: { fx: "arcaneBurst", melee: false },
  rod: { fx: "arcaneBurst", melee: false },
  bow: { fx: "pierce", melee: false },
};

/** First of the native RPGJS `elements` of a weapon. */
const nativeElement = (raw: Raw): string | undefined => {
  const first = Array.isArray(raw.elements) ? raw.elements[0] : undefined;
  return typeof first?.element === "string" ? first.element : undefined;
};

export interface WeaponInfo {
  name: string;
  atk: number;
  attack: AttackStyle;
}

/**
 * A weapon record of the RPGJS database (`_type: "weapon"`, native `atk`):
 *
 * ```ts
 * "ember-blade": { _type: "weapon", name: "Ember blade", atk: 14,
 *   turnBattle: { type: "greatsword", element: "fire" } }
 * ```
 * `turnBattle.fx`, `hits`, `power`, `stagger`, `color`, `melee` override the type defaults.
 */
export function weaponFromDb(raw: Raw | undefined): WeaponInfo | undefined {
  if (!raw || (raw._type !== "weapon" && !raw.turnBattle?.type)) return undefined;
  const b = raw.turnBattle ?? {};
  const base = WEAPON_STYLES[b.type ?? raw.weaponType ?? "sword"] ?? WEAPON_STYLES.sword;
  const name = String(val(raw.name) ?? "");
  const pick = <K extends keyof AttackStyle>(k: K) => (b[k] !== undefined ? b[k] : base[k]) as AttackStyle[K];
  return {
    name,
    atk: Number(val(raw.atk) ?? 0) || 0,
    attack: {
      melee: pick("melee") ?? true,
      fx: pick("fx"),
      element: b.element ?? nativeElement(raw),
      color: b.color,
      hits: pick("hits"),
      power: pick("power"),
      stagger: pick("stagger"),
      weapon: name || undefined,
    },
  };
}

/** An enemy as read from the database. Without a `battler`, the server option `battlers.enemy` applies. */
export type EnemyDef = Omit<CombatantDef, "id" | "side" | "battler"> & { battler?: string };

const num = (value: unknown, fallback = 0) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

/** A parameter curve `{ start, end }` read at a level, linearly between the first and the last level. */
const atLevel = (curve: Raw | undefined, level: number, finalLevel: number) => {
  const start = num(curve?.start);
  const end = num(curve?.end, start);
  if (finalLevel <= 1) return start;
  const ratio = Math.min(1, Math.max(0, (level - 1) / (finalLevel - 1)));
  return Math.round(start + (end - start) * ratio);
};

/**
 * The parameter curves RPGJS gives an actor when it declares none (the first and the last level): an enemy made before
 * it had parameters fights with them.
 */
const DEFAULT_CURVES: Record<string, Raw> = {
  maxHp: { start: 741, end: 7467 },
  maxSp: { start: 534, end: 5500 },
  str: { start: 67, end: 635 },
  pdef: { start: 50, end: 500 },
  agi: { start: 58, end: 582 },
  int: { start: 36, end: 7318 },
  dex: { start: 54, end: 564 },
};

/**
 * Parameters of an RPGJS actor at a level. As for a player, the attack is the strength plus the `atk` parameter,
 * the magic defense is `sdef` (the physical defense when the actor has none), luck is dexterity. A parameter the
 * record does not declare has the default curve of RPGJS. `str`, `int` and `dex` are kept for the formulas of RPGJS.
 */
function statsAt(raw: Raw, wanted?: number): Stats {
  const parameters = (raw.parameters ?? {}) as Raw;
  const finalLevel = num(raw.finalLevel, 99);
  const level = wanted === undefined ? num(raw.initialLevel, 1) : Math.min(finalLevel, Math.max(1, Math.round(wanted)));
  const read = (name: string) => atLevel(parameters[name] ?? DEFAULT_CURVES[name], level, finalLevel);
  const str = read("str");
  const int = read("int");
  const dex = read("dex");
  return {
    maxHp: read("maxHp"),
    maxSp: read("maxSp"),
    atk: str + (parameters.atk ? read("atk") : 0),
    def: read("pdef"),
    mag: int,
    mdef: parameters.sdef ? read("sdef") : read("pdef"),
    agi: read("agi"),
    luk: dex,
    str,
    int,
    dex,
  };
}

/** `reward` of an enemy: the chance of an item is a percentage (100 when not given). */
function rewardsOf(reward: Raw | undefined): Rewards | undefined {
  if (!reward) return undefined;
  const items = Array.isArray(reward.items)
    ? reward.items
        .filter((item: Raw) => typeof item?.itemId === "string" && item.itemId)
        .map((item: Raw) => ({ id: item.itemId as string, quantity: num(item.amount, 1), chance: num(item.chance, 100) / 100 }))
    : [];
  return { exp: num(reward.exp), gold: num(reward.gold), ...(items.length ? { items } : {}) };
}

/** `level`: the level the enemy fights at, instead of its `initialLevel` (parameters of an RPGJS actor only). */
export function enemyFromDb(raw: Raw | undefined, level?: number): EnemyDef | undefined {
  if (!raw) return undefined;
  const b = raw.turnBattle;
  if (b) {
    if (!b.battler || !b.stats) return undefined;
    return {
      ...b,
      name: String(val(raw.name) ?? b.name ?? "?"),
      ...tagsOf(raw),
      // RPGJS v4 enemies describe rewards as `gain`.
      rewards: b.rewards ?? raw.gain,
    };
  }
  const def: EnemyDef = { name: String(val(raw.name) ?? "?"), stats: statsAt(raw, level) };
  Object.assign(def, tagsOf(raw));
  const rewards = rewardsOf(raw.reward);
  if (rewards) def.rewards = rewards;
  for (const key of ["battler", "skills", "weapon", "stagger", "commands", "ai", "attack", "elementsEfficiency"] as const)
    if (raw[key] !== undefined) (def as Raw)[key] = raw[key];
  return def;
}

/** An ally of the database fighting by itself: what `startBattle` takes in `heroes` (the battle gives it its id). */
export type HeroDef = Omit<CombatantDef, "id" | "side" | "owner">;

/**
 * An actor of the database as a fighter, at its first level (or at `level`, between its first and its last): its parameters, the skills it knows (`skills`: ids, or
 * `{ skillId }`) and the weapon it starts with. `battler` is how it looks in the battle.
 */
export function heroFromDb(raw: Raw | undefined, battler: string, level?: number, classRecord?: (id: string) => Raw | undefined): HeroDef | undefined {
  if (!raw) return undefined;
  const idsOf = (list: unknown, upTo = Infinity) =>
    (Array.isArray(list) ? list : []).flatMap((skill: unknown) => {
      const id = typeof skill === "string" ? skill : (skill as Raw | null)?.skillId ?? (skill as Raw | null)?.id;
      const from = typeof skill === "object" && typeof (skill as Raw | null)?.level === "number" ? (skill as Raw).level : 1;
      return typeof id === "string" && id !== "" && from <= upTo ? [id as string] : [];
    });
  // Its own skills, then the ones its class teaches up to the level it fights at
  const reached = level === undefined ? num(raw.initialLevel, 1) : Math.max(1, Math.round(level));
  const taught = typeof raw.classId === "string" ? idsOf(classRecord?.(raw.classId)?.skills, reached) : [];
  const skills = [...new Set([...idsOf(raw.skills), ...taught])];
  const weapon = raw.weapon ?? raw.startingEquipment?.weaponId;
  return {
    name: String(val(raw.name) ?? "?"),
    battler,
    stats: statsAt(raw, level),
    skills,
    ...(typeof weapon === "string" && weapon ? { weapon } : {}),
    ...(raw.elementsEfficiency !== undefined ? { elementsEfficiency: raw.elementsEfficiency } : {}),
  };
}

/** An action of the database (`_type: "command"`, see `turnBattleAction`) as a custom command: its effects are data. */
export function commandFromDb(raw: Raw | undefined): CustomCommand | undefined {
  if (!raw || !Array.isArray(raw.effects)) return undefined;
  return actionCommand({ ...raw, name: String(val(raw.name) ?? "?"), effects: raw.effects } as BattleActionRecord);
}

/**
 * A skill of the database that does more than the fields of a skill: several `effects`, a recharge (`cooldown`, `once`), or
 * a place in the menu itself (`pinned`). It is a command: its effects are the ones of an action, or the damage its own
 * power, kind, element and hits describe. A plain skill is none (the battle plays it as a skill).
 */
export function skillCommandFromDb(id: string, raw: Raw | undefined): CustomCommand | undefined {
  if (!raw) return undefined;
  const b = (raw.turnBattle ?? {}) as Record<string, any>;
  const own = Array.isArray(b.effects) && b.effects.length > 0;
  if (!own && !b.pinned && !b.cooldown && !b.once) return undefined;
  const skill = skillFromDb(id, raw)!;
  // Without effects, it hits as the skill says (a healing skill needs effects to be a command)
  if (!own && skill.kind === "heal") return undefined;
  const effects = own
    ? b.effects
    : [{ type: "damage", power: skill.power, kind: skill.kind, ...(skill.element ? { element: skill.element } : {}), ...(skill.hits ? { hits: skill.hits } : {}), ...(skill.stagger !== undefined ? { stagger: skill.stagger } : {}) }];
  return actionCommand({
    name: skill.name,
    ...(skill.description ? { description: skill.description } : {}),
    ...(typeof b.icon === "string" && b.icon ? { icon: b.icon } : {}),
    scope: skill.scope,
    ...(skill.melee !== undefined ? { melee: skill.melee } : {}),
    spCost: skill.spCost ?? 0,
    ...(skill.weight !== undefined ? { weight: skill.weight } : {}),
    ...(skill.anim ? { anim: skill.anim } : {}),
    ...(skill.fx ? { fx: skill.fx } : {}),
    ...(skill.element ? { element: skill.element } : {}),
    ...(b.cooldown ? { cooldown: Number(b.cooldown) } : {}),
    ...(b.once ? { once: true } : {}),
    ...(b.pinned ? {} : { inSkills: true }),
    ...(b.ai ? { ai: b.ai } : {}),
    ...(skill.triggers ? { triggers: skill.triggers } : {}),
    ...(skill.castFx ? { castFx: skill.castFx } : {}),
    ...(skill.castSound ? { castSound: skill.castSound } : {}),
    ...(skill.impactSound ? { impactSound: skill.impactSound } : {}),
    ...(skill.impactAnimation ? { impactAnimation: skill.impactAnimation } : {}),
    ...visualEffectsOf(skill),
    effects,
  });
}

/** An enemy of the database as a creature to summon: its battle shape, without what it gives when it falls. */
export function summonFromEnemy(enemy: EnemyDef, source: { turns?: number; controlled?: boolean } = {}): SummonDef | undefined {
  if (!enemy.battler) return undefined;
  const { rewards: _rewards, ...creature } = enemy;
  return {
    ...creature,
    battler: enemy.battler,
    ...(source.turns !== undefined ? { turns: source.turns } : {}),
    ...(source.controlled !== undefined ? { controlled: source.controlled } : {}),
  };
}

/** A summonable creature of the database (`_type: "summon"`, see `turnBattleSummon`). */
export function summonFromDb(raw: Raw | undefined): SummonDef | undefined {
  const b = raw?.turnBattle;
  if (!b?.battler || !b?.stats) return undefined;
  return { ...b, name: String(val(raw!.name) ?? b.name ?? "?") };
}

export function troopFromDb(id: string, raw: Raw | undefined): TroopDef | undefined {
  const b = raw?.turnBattle ?? raw;
  if (!Array.isArray(b?.enemies) || b.enemies.length === 0) return undefined;
  return { ...b, ...tagsOf(raw ?? {}), id };
}
