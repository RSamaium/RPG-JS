import type { RulesHooks } from "./rules";

type Formula = (...args: any[]) => number;

/** The stats of a Studio actor or enemy (as the turn-based battle reads them). */
export interface StudioStats {
  maxHp: number;
  maxSp: number;
  atk: number;
  def: number;
  mag: number;
  mdef: number;
  agi: number;
  luk: number;
  str?: number;
  int?: number;
  dex?: number;
}

/**
 * The parameters of a fighter with the names RPGJS gives them, which the damage formulas of the map expect.
 * `atk` of the stats includes the strength, as on a player: RPGJS wants the two apart.
 */
export function paramsOf(stats: StudioStats): Record<string, number> {
  const str = stats.str ?? stats.atk;
  return {
    atk: stats.str === undefined ? stats.atk : Math.max(0, stats.atk - stats.str),
    str,
    int: stats.int ?? stats.mag,
    dex: stats.dex ?? stats.luk,
    agi: stats.agi,
    pdef: stats.def,
    sdef: stats.mdef,
    maxHp: stats.maxHp,
    maxSp: stats.maxSp,
  };
}

/**
 * The damage formulas of RPGJS (`damagePhysic`, `damageSkill`) as a rule hook: the damage of an attack or a skill is the one of the
 * map, from the parameters of the two units. Nothing changes when the map has no formula or a unit carries no parameters.
 */
export function nativeDamageHook(get: (name: string) => Formula | undefined): RulesHooks {
  return {
    onDamage({ attacker, target, skill }) {
      const [a, b] = [attacker.params, target.params];
      if (!a || !b) return;
      const formula = skill ? get("damageSkill") : get("damagePhysic");
      if (!formula) return;
      const amount = skill ? formula(a, b, { ...skill, coefficient: skill.coefficient ?? {} }) : formula(a, b);
      return Number.isFinite(amount) ? Math.max(1, amount) : undefined;
    },
  };
}
