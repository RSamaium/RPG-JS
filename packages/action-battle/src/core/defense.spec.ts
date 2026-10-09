import { afterEach, describe, expect, test } from "vitest";
import {
  beginActionBattleGuard,
  clearActionBattleDefense,
  consumeActionBattleCounter,
  endActionBattleGuard,
  resolveActionBattleDefense,
} from "./defense";

const entity = (x: number, y: number, direction = "right") => ({
  x: () => x,
  y: () => y,
  direction: () => direction,
  directionFixed: false,
  animationFixed: false,
});

describe("action battle defense", () => {
  const created: object[] = [];
  const make = (...args: Parameters<typeof entity>) => {
    const value = entity(...args);
    created.push(value);
    return value;
  };

  afterEach(() => {
    created.forEach(clearActionBattleDefense);
    created.length = 0;
  });

  test("parries frontal attacks during the opening window", () => {
    const target = make(0, 0, "right");
    const attacker = make(32, 0, "left");
    beginActionBattleGuard(target, { parryWindowMs: 140 }, 1000);

    expect(resolveActionBattleDefense(target, attacker, 1100)).toMatchObject({
      kind: "parry",
      damageMultiplier: 0,
      staggerMs: 650,
    });
    expect(consumeActionBattleCounter(target, 1200)).toEqual({
      damageMultiplier: 1.5,
      staggerMultiplier: 1.5,
    });
  });

  test("guards after the parry window", () => {
    const target = make(0, 0, "right");
    const attacker = make(32, 0, "left");
    beginActionBattleGuard(target, {}, 1000);

    expect(resolveActionBattleDefense(target, attacker, 1200)).toMatchObject({
      kind: "guard",
      damageMultiplier: 0.35,
      knockbackMultiplier: 0.4,
    });
  });

  test("does not guard attacks outside the facing arc", () => {
    const target = make(0, 0, "right");
    const attacker = make(-32, 0, "right");
    beginActionBattleGuard(target, {}, 1000);

    expect(resolveActionBattleDefense(target, attacker, 1200)).toBeNull();
    endActionBattleGuard(target);
  });
});
