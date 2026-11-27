import type { Combatant, Formulas, SkillDef } from "../core";

type Formula = (...args: any[]) => number;
type FormulaSource = (name: string) => Formula | undefined;

/**
 * Parameters of a fighter with the names RPGJS gives them, which the damage formulas of the map expect.
 * `atk` of a combatant already includes the strength, as on a player: RPGJS wants the two apart.
 */
function parameters(c: Combatant) {
  const { stats } = c;
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
 * The damage formulas of RPGJS (`damagePhysic`, `damageSkill`, `damageCritical`, `damageGuard`), as the map
 * publishes them, shaped as the formulas of the battle. The healing, the stagger and the limit gauge have no
 * RPGJS equivalent and stay those of the plugin. Undefined when the map has no damage formula.
 */
export function nativeFormulas(get: FormulaSource): Partial<Formulas> | undefined {
  const physic = get("damagePhysic");
  const skillFormula = get("damageSkill");
  if (!physic && !skillFormula) return undefined;
  const critical = get("damageCritical");
  const guard = get("damageGuard");
  const formulas: Partial<Formulas> = {
    damage({ attacker, target, skill }) {
      const a = parameters(attacker);
      const b = parameters(target);
      if (skill && skill.id !== "attack" && skillFormula) {
        const data: SkillDef & { coefficient: Record<string, number> } = { ...skill, coefficient: skill.coefficient ?? {} };
        return { amount: skillFormula(a, b, data), crit: false };
      }
      // A basic attack: its power (shared between the hits of the weapon) scales the formula.
      const base = (physic?.(a, b) ?? 0) * ((skill?.power ?? 100) / 100);
      const final = critical ? critical(base, a, b) : base;
      return { amount: final, crit: final !== base };
    },
  };
  if (guard) formulas.guardMultiplier = guard(1000, parameters({ stats: {} } as Combatant), parameters({ stats: {} } as Combatant)) / 1000;
  return formulas;
}
