import { describe, expect, test } from "vitest";
import {
  normalizeActionBattleLootOptions,
  rollActionBattleLoot,
  sampleActionBattleLootArc,
  scatterActionBattleLoot,
  splitActionBattleGold,
} from "./loot";

const sequence = (...values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};

describe("action battle loot rules", () => {
  test("splits gold into piles that keep the exact total", () => {
    expect(splitActionBattleGold(23)).toEqual([5, 5, 5, 4, 4]);
    expect(splitActionBattleGold(3)).toEqual([3]);
    expect(splitActionBattleGold(500).length).toBe(6);
    expect(splitActionBattleGold(10, 4)).toEqual([3, 3, 2, 2]);
    expect(splitActionBattleGold(2, 10)).toEqual([1, 1]);
    expect(splitActionBattleGold(0)).toEqual([]);
  });

  test("rolls item chances and keeps the gold piles", () => {
    const drops = rollActionBattleLoot(
      {
        gold: 6,
        items: ["potion", { itemId: "ether", chance: 30, amount: 2 }, { item: { id: "sword" } }],
      },
      {},
      sequence(0.5)
    );
    expect(drops).toEqual([
      { kind: "gold", amount: 3 },
      { kind: "gold", amount: 3 },
      { kind: "item", item: "potion", itemId: "potion", amount: 1 },
      { kind: "item", item: { id: "sword" }, itemId: "sword", amount: 1 },
    ]);
  });

  test("scatters landing points inside the spread ring", () => {
    const points = scatterActionBattleLoot({ x: 100, y: 100 }, 5, [20, 40], sequence(0.1, 0.9, 0.3));
    expect(points).toHaveLength(5);
    for (const point of points) {
      const distance = Math.hypot(point.x - 100, point.y - 100);
      expect(distance).toBeGreaterThanOrEqual(20);
      expect(distance).toBeLessThanOrEqual(40);
    }
  });

  test("samples an arc that starts at the enemy and lands on the ground", () => {
    const visual = { fromX: -40, fromY: 10, height: 40, flightMs: 500 };
    expect(sampleActionBattleLootArc(visual, 0)).toEqual({ x: -40, y: 10, z: 0, done: false });
    const middle = sampleActionBattleLootArc(visual, 195);
    expect(middle.z).toBeCloseTo(40);
    expect(Math.abs(middle.x)).toBeLessThan(40);
    expect(sampleActionBattleLootArc(visual, 500)).toEqual({ x: 0, y: 0, z: 0, done: true });
  });

  test("normalizes options with defaults and an ordered spread", () => {
    expect(normalizeActionBattleLootOptions(true).ownership).toBe("shared");
    expect(normalizeActionBattleLootOptions({ spread: [50, 10] }).spread).toEqual([10, 50]);
  });
});
