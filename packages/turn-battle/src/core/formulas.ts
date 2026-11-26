import type { Combatant, SkillDef } from "./types";
import type { Rng } from "./rng";

export interface HitContext {
  attacker: Combatant;
  target: Combatant;
  /** Undefined for a plain attack. */
  skill?: SkillDef;
  rng: Rng;
}

export interface Formulas {
  /** Raw damage before element / stagger / guard modifiers. */
  damage(ctx: HitContext): { amount: number; crit: boolean };
  heal(ctx: HitContext): number;
  /** Stagger gauge damage of one hit. */
  stagger(ctx: HitContext & { weak: boolean }): number;
  /** Limit gauge gained by an attacker per hit, and by a target per damage taken. */
  limitOnHit(ctx: HitContext): number;
  limitOnDamage(target: Combatant, amount: number): number;
  escapeChance(allies: Combatant[], enemies: Combatant[]): number;
  weakMultiplier: number;
  resistMultiplier: number;
  brokenMultiplier: number;
  guardMultiplier: number;
}

const variance = (rng: Rng) => 0.92 + rng.next() * 0.16;
const avg = (list: Combatant[], k: "agi") =>
  list.reduce((s, c) => s + c.stats[k], 0) / Math.max(1, list.length);

/**
 * The damage, heal, stagger, limit and escape formulas of the plugin. With `formulas: "plugin"` (or when the map has no
 * native formulas) the battle uses them; an object given to the `formulas` option overrides some of them, and can call
 * these to adjust the default. Run on the server only.
 *
 * @title defaultFormulas
 * @prop {Formulas} defaultFormulas
 * @example
 * ```ts
 * import { defaultFormulas, provideTurnBattleServer } from "@rpgjs/turn-battle/server";
 *
 * provideTurnBattleServer({
 *   formulas: {
 *     // Bosses take a little less damage.
 *     damage(ctx) {
 *       const hit = defaultFormulas.damage(ctx);
 *       return ctx.target.rewards?.exp && ctx.target.rewards.exp > 500 ? { ...hit, amount: Math.round(hit.amount * 0.8) } : hit;
 *     },
 *   },
 * });
 * ```
 */
export const defaultFormulas: Formulas = {
  damage({ attacker, target, skill, rng }) {
    const power = (skill?.power ?? 100) / 100;
    const magical = skill?.kind === "magical";
    const a = magical ? attacker.stats.mag : attacker.stats.atk;
    const d = magical ? target.stats.mdef : target.stats.def;
    const base = Math.max(1, a * 2.2 - d * 1.1) * power;
    const crit = !magical && rng.chance(0.06 + attacker.stats.luk / 500);
    return {
      amount: Math.max(1, Math.round(base * variance(rng) * (crit ? 1.6 : 1))),
      crit,
    };
  },
  heal({ attacker, skill, rng }) {
    const power = (skill?.power ?? 100) / 100;
    return Math.round((attacker.stats.mag * 2 + 30) * power * variance(rng));
  },
  stagger({ skill, weak }) {
    const base = skill?.kind === "magical" ? 9 : 12;
    return base * (skill?.stagger ?? 1) * (weak ? 2.5 : 1);
  },
  limitOnHit: ({ skill }) => (skill ? 6 : 9),
  limitOnDamage: (target, amount) =>
    Math.min(30, (amount / Math.max(1, target.stats.maxHp)) * 90),
  escapeChance(allies, enemies) {
    return Math.min(0.95, Math.max(0.2, 0.55 + (avg(allies, "agi") - avg(enemies, "agi")) / 60));
  },
  weakMultiplier: 1.5,
  resistMultiplier: 0.5,
  brokenMultiplier: 1.5,
  guardMultiplier: 0.5,
};
