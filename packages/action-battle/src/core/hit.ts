import type { ActionBattleCombatSystem, ActionBattleHitContext, ActionBattleHitResult } from "./contracts";
import {
  isActionBattleEntityInvincible,
  setActionBattleInvincibility,
} from "./hit-reaction";

export const applyActionBattleHit = (
  system: ActionBattleCombatSystem,
  context: ActionBattleHitContext
): ActionBattleHitResult => {
  let hitContext = { ...context };
  const before = system.hooks?.beforeHit?.(hitContext);
  if (before === false) {
    return {
      damage: 0,
      knockbackForce: 0,
      knockbackDuration: 0,
      defeated: false,
      attacker: hitContext.attacker,
      target: hitContext.target,
      cancelled: true,
      metadata: hitContext.metadata,
    };
  }
  if (before) hitContext = before;

  if (isActionBattleEntityInvincible(hitContext.target)) {
    return {
      damage: 0,
      knockbackForce: 0,
      knockbackDuration: 0,
      defeated: false,
      attacker: hitContext.attacker,
      target: hitContext.target,
      cancelled: true,
      metadata: hitContext.metadata,
      reaction: hitContext.reaction,
    };
  }

  const damage =
    hitContext.damage ??
    system.resolveDamage({
      attacker: hitContext.attacker,
      target: hitContext.target,
      skill: hitContext.skill,
      pattern: hitContext.pattern,
      multiplier: hitContext.metadata?.damageMultiplier,
    });
  hitContext.damage = damage;

  const afterDamage = system.hooks?.afterDamage?.(hitContext);
  if (afterDamage) hitContext = afterDamage;

  const knockback =
    hitContext.knockback ??
    system.resolveKnockback({
      attacker: hitContext.attacker,
      target: hitContext.target,
      damage,
      multiplier: hitContext.metadata?.knockbackMultiplier,
    });
  hitContext.knockback = knockback;

  if (!damage.defeated && knockback.force > 0 && knockback.direction) {
    (hitContext.target as any).knockback?.(
      knockback.direction,
      knockback.force,
      knockback.duration
    );
  }

  if (!damage.defeated && hitContext.reaction?.invincibilityMs) {
    setActionBattleInvincibility(
      hitContext.target,
      hitContext.reaction.invincibilityMs
    );
  }

  const result: ActionBattleHitResult = {
    damage: damage.damage,
    knockbackForce: knockback.force,
    knockbackDuration: knockback.duration,
    defeated: damage.defeated,
    attacker: hitContext.attacker,
    target: hitContext.target,
    rawDamage: damage.raw,
    reaction: hitContext.reaction,
    metadata: hitContext.metadata,
  };

  system.hooks?.afterHit?.(result);
  return result;
};
