import { afterEach, describe, expect, test, vi } from "vitest";
import { applyActionBattleHit } from "./hit";
import { defaultRpgjsDamageResolver } from "./defaults";
import type { ActionBattleCombatSystem } from "./contracts";
import { setActionBattleInvincibility } from "./hit-reaction";

const entity = (hp = 100) => ({
  hp,
  x: () => 0,
  y: () => 0,
  knockback: vi.fn(),
});

describe("applyActionBattleHit", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("runs beforeHit before resolving damage", () => {
    const calls: string[] = [];
    const attacker = entity();
    const target = entity();
    const system: ActionBattleCombatSystem = {
      resolveHitboxes: () => [],
      resolveDamage: () => {
        calls.push("damage");
        return { damage: 12, defeated: false };
      },
      resolveKnockback: () => ({ force: 0, duration: 0 }),
      hooks: {
        beforeHit() {
          calls.push("before");
        },
        afterHit() {
          calls.push("after");
        },
      },
    };

    const result = applyActionBattleHit(system, { attacker: attacker as any, target: target as any });

    expect(result.damage).toBe(12);
    expect(calls).toEqual(["before", "damage", "after"]);
  });

  test("can cancel a hit before damage is resolved", () => {
    const resolveDamage = vi.fn();
    const attacker = entity();
    const target = entity();
    const system: ActionBattleCombatSystem = {
      resolveHitboxes: () => [],
      resolveDamage,
      resolveKnockback: () => ({ force: 0, duration: 0 }),
      hooks: {
        beforeHit: () => false,
      },
    };

    const result = applyActionBattleHit(system, { attacker: attacker as any, target: target as any });

    expect(result.cancelled).toBe(true);
    expect(resolveDamage).not.toHaveBeenCalled();
  });

  test("cancels a hit when the target is invincible", () => {
    const resolveDamage = vi.fn();
    const attacker = entity();
    const target = entity();
    setActionBattleInvincibility(target, 500, 1000);
    vi.spyOn(Date, "now").mockReturnValue(1100);
    const system: ActionBattleCombatSystem = {
      resolveHitboxes: () => [],
      resolveDamage,
      resolveKnockback: () => ({ force: 0, duration: 0 }),
    };

    const result = applyActionBattleHit(system, {
      attacker: attacker as any,
      target: target as any,
    });

    expect(result.cancelled).toBe(true);
    expect(resolveDamage).not.toHaveBeenCalled();
  });

  test("applies invincibility from hit reaction after damage", () => {
    vi.spyOn(Date, "now").mockReturnValue(2000);
    const attacker = entity();
    const target = entity();
    const system: ActionBattleCombatSystem = {
      resolveHitboxes: () => [],
      resolveDamage: () => ({ damage: 12, defeated: false }),
      resolveKnockback: () => ({ force: 0, duration: 0 }),
    };

    const result = applyActionBattleHit(system, {
      attacker: attacker as any,
      target: target as any,
      reaction: {
        invincibilityMs: 300,
        hitstunMs: 120,
        staggerPower: 1,
      },
    });

    expect(result.cancelled).toBeUndefined();
    expect(applyActionBattleHit(system, {
      attacker: attacker as any,
      target: target as any,
    }).cancelled).toBe(true);
  });

  test("normalizes invalid RPGJS damage without poisoning target hp", () => {
    const attacker = entity();
    const target = {
      ...entity(100),
      applyDamage() {
        this.hp = Number.NaN;
        return { damage: Number.NaN };
      },
    };

    const result = defaultRpgjsDamageResolver({
      attacker: attacker as any,
      target: target as any,
    });

    expect(result.damage).toBe(0);
    expect(result.defeated).toBe(false);
    expect(target.hp).toBe(100);
  });

  test("unwraps reactive skill stats before RPGJS calculates damage", () => {
    const attacker = entity();
    const target = {
      ...entity(100),
      applyDamage(_attacker: unknown, skill: any) {
        const damage = skill.power + (skill.coefficient.atk ?? 0);
        this.hp -= damage;
        return { damage };
      },
    };

    const result = defaultRpgjsDamageResolver({
      attacker: attacker as any,
      target: target as any,
      skill: {
        id: () => "arcane-trait",
        power: () => 24,
        coefficient: () => ({}),
        skillType: "magical",
      } as any,
    });

    expect(result.damage).toBe(24);
    expect(target.hp).toBe(76);
  });

  test("scales RPGJS damage from an authoritative attack profile multiplier", () => {
    const attacker = entity();
    const target = {
      ...entity(100),
      applyDamage() {
        this.hp -= 10;
        return { damage: 10 };
      },
    };

    const result = defaultRpgjsDamageResolver({
      attacker: attacker as any,
      target: target as any,
      multiplier: 2.4,
    });

    expect(result.damage).toBe(24);
    expect(target.hp).toBe(76);
  });
});
