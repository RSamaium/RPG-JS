import { describe, expect, test } from "vitest";
import {
  canActionBattleDodge,
  resolveActionBattleCharge,
  resolveActionBattleComboStep,
} from "./player-combat";

describe("Adventure player combat helpers", () => {
  test("advances and resets the combo deterministically", () => {
    expect(
      resolveActionBattleComboStep({
        comboIndex: 2,
        lastAttackAt: 1000,
        now: 1500,
        stepCount: 3,
        resetMs: 700,
      })
    ).toBe(2);
    expect(
      resolveActionBattleComboStep({
        comboIndex: 2,
        lastAttackAt: 1000,
        now: 1800,
        stepCount: 3,
        resetMs: 700,
      })
    ).toBe(0);
  });

  test("clamps authoritative charge multipliers", () => {
    expect(resolveActionBattleCharge(0).ratio).toBe(0);
    expect(resolveActionBattleCharge(600)).toMatchObject({
      ratio: 0.5,
      damageMultiplier: 1.95,
      knockbackMultiplier: 1.95,
    });
    expect(resolveActionBattleCharge(5000)).toMatchObject({
      ratio: 1,
      damageMultiplier: 2.4,
      knockbackMultiplier: 2.3,
    });
  });

  test("allows dodge during recovery but not active frames or cooldown", () => {
    expect(
      canActionBattleDodge({
        now: 1000,
        dodgeLockedUntil: 900,
        attackActiveUntil: 900,
      })
    ).toBe(true);
    expect(
      canActionBattleDodge({
        now: 1000,
        dodgeLockedUntil: 1200,
        attackActiveUntil: 900,
      })
    ).toBe(false);
    expect(
      canActionBattleDodge({
        now: 1000,
        dodgeLockedUntil: 900,
        attackActiveUntil: 1100,
      })
    ).toBe(false);
  });
});
