import { describe, expect, test } from "vitest";
import {
  acquireActionBattleAttackSlot,
  releaseActionBattleAttackSlot,
} from "./combat-director";

describe("action battle combat director", () => {
  test("limits simultaneous attackers around one target", () => {
    const map = {};
    const target = { id: "hero" };
    const first = { id: "first", getCurrentMap: () => map };
    const second = { id: "second", getCurrentMap: () => map };

    expect(acquireActionBattleAttackSlot(first, target, {}, 1000)).toBe(true);
    expect(acquireActionBattleAttackSlot(second, target, {}, 1000)).toBe(false);

    releaseActionBattleAttackSlot(first, target);
    expect(acquireActionBattleAttackSlot(second, target, {}, 1001)).toBe(true);
  });

  test("prunes expired slots", () => {
    const map = {};
    const target = { id: "hero" };
    const first = { id: "first", getCurrentMap: () => map };
    const second = { id: "second", getCurrentMap: () => map };
    const options = { slotDurationMs: 100 };

    acquireActionBattleAttackSlot(first, target, options, 1000);

    expect(
      acquireActionBattleAttackSlot(second, target, options, 1101)
    ).toBe(true);
  });
});
