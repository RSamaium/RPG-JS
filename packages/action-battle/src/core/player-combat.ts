import type { ActionBattleChargedAttackOptions } from "../types";

export function resolveActionBattleComboStep(input: {
  comboIndex: number;
  lastAttackAt: number;
  now: number;
  stepCount: number;
  resetMs: number;
}) {
  if (input.stepCount <= 0) return 0;
  const index =
    input.now - input.lastAttackAt > input.resetMs ? 0 : input.comboIndex;
  return Math.max(0, index) % input.stepCount;
}

export function resolveActionBattleCharge(
  elapsedMs: number,
  options: ActionBattleChargedAttackOptions = {}
) {
  const minChargeMs = Math.max(0, options.minChargeMs ?? 300);
  const maxChargeMs = Math.max(minChargeMs, options.maxChargeMs ?? 900);
  const ratio = Math.max(
    0,
    Math.min(
      1,
      (Math.max(0, elapsedMs) - minChargeMs) /
        Math.max(1, maxChargeMs - minChargeMs)
    )
  );
  const interpolate = (min: number, max: number) =>
    min + (max - min) * ratio;
  return {
    ratio,
    damageMultiplier: interpolate(
      options.minDamageMultiplier ?? 1.5,
      options.maxDamageMultiplier ?? 2.4
    ),
    knockbackMultiplier: interpolate(
      options.minKnockbackMultiplier ?? 1.6,
      options.maxKnockbackMultiplier ?? 2.3
    ),
  };
}

export function canActionBattleDodge(input: {
  now: number;
  dodgeLockedUntil: number;
  attackActiveUntil: number;
}) {
  return (
    input.now >= input.dodgeLockedUntil &&
    input.now >= input.attackActiveUntil
  );
}
