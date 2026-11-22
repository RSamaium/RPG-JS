import type { BattleState, Combatant, Command, SkillDef } from "./types";
import type { Rng } from "./rng";

export interface AiContext {
  state: BattleState;
  self: Combatant;
  rng: Rng;
}

export type AiFn = (ctx: AiContext) => Command;

const hpRatio = (c: Combatant) => c.hp / Math.max(1, c.stats.maxHp);

/** Default enemy brain: pressure the weakest hero, sometimes use a skill. */
export const defaultAi: AiFn = ({ state, self, rng }) => {
  const foes = state.combatants.filter((c) => c.side !== self.side && c.hp > 0);
  const friends = state.combatants.filter((c) => c.side === self.side && c.hp > 0);
  const skills = self.skills
    .map((id) => state.catalog.skills[id])
    .filter((s): s is SkillDef => !!s && (s.spCost ?? 0) <= self.sp);

  const heal = skills.find((s) => s.kind === "heal");
  const hurt = friends.filter((c) => hpRatio(c) < 0.45).sort((a, b) => hpRatio(a) - hpRatio(b))[0];
  if (heal && hurt && rng.chance(0.7))
    return { type: "skill", skill: heal.id, target: heal.scope === "self" ? self.id : hurt.id };

  const target =
    rng.chance(0.55)
      ? [...foes].sort((a, b) => hpRatio(a) - hpRatio(b))[0]
      : rng.pick(foes);
  // Custom commands (e.g. goblins stealing): used now and then.
  // Each can have a weight (how often) and a share of life under which it is used.
  // (the rule of the unit, else the one the command carries)
  const ruleOf = (id: string) => self.commandRules?.[id] ?? state.catalog.commands?.[id]?.ai;
  const custom = self.commands.filter(
    (id) =>
      (state.catalog.commands?.[id]?.spCost ?? 0) <= self.sp &&
      (ruleOf(id)?.weight ?? 1) > 0 &&
      (ruleOf(id)?.hpBelow === undefined || hpRatio(self) * 100 < ruleOf(id)!.hpBelow!),
  );
  const weights = custom.map((id) => ruleOf(id)?.weight ?? 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  // 30 % of the turns with weights of 1, more as the average weight goes up
  if (custom.length && rng.chance(Math.min(0.9, (0.3 * total) / custom.length))) {
    let left = rng.next() * total;
    const id = custom.find((_, index) => (left -= weights[index]!) < 0) ?? custom[custom.length - 1]!;
    const scope = state.catalog.commands![id].scope;
    const ally = scope === "ally" || scope === "allAllies" || scope === "self";
    return { type: "custom", command: id, target: ally ? self.id : target.id };
  }
  const offensive = skills.filter((s) => s.kind !== "heal");
  if (offensive.length && rng.chance(0.35))
    return { type: "skill", skill: rng.pick(offensive).id, target: target.id };
  return { type: "attack", target: target.id };
};
