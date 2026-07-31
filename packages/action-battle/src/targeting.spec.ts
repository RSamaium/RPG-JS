import { describe, expect, test } from "vitest";
import {
  directionToActionBattleTarget,
  parseAoeMask,
  resolveActionBattleAoeCells,
  resolveActionBattleAoeTarget,
  resolveActionBattleSoftTarget,
} from "./targeting";

const entity = (id: string, x: number, y: number) => ({
  id,
  x: () => x,
  y: () => y,
  hitbox: () => ({ w: 32, h: 32 }),
});

describe("action battle soft targeting", () => {
  test("parses legacy binary area masks without treating zeroes as active cells", () => {
    expect(parseAoeMask(["010", "111", "010"]).cells).toEqual([
      { dx: 0, dy: -1 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
    ]);
  });

  test("selects the closest target inside the facing cone", () => {
    const source = entity("hero", 0, 0);
    const close = entity("close", 48, 0);
    const far = entity("far", 90, 0);

    expect(
      resolveActionBattleSoftTarget(source, [far, close], "right")?.target
    ).toBe(close);
  });

  test("does not select targets behind the player", () => {
    const source = entity("hero", 0, 0);
    const behind = entity("behind", -40, 0);

    expect(
      resolveActionBattleSoftTarget(source, [behind], "right")
    ).toBeNull();
  });

  test("resolves a cardinal attack direction toward the selected target", () => {
    expect(
      directionToActionBattleTarget(
        entity("hero", 0, 0),
        entity("enemy", 12, -60)
      )
    ).toBe("up");
  });

  test("finds a legal offset center when an area mask has a hole", () => {
    const mask = ["010", "101", "010"];
    const target = resolveActionBattleAoeTarget(
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      1,
      mask
    );

    expect(target).toEqual({ x: 1, y: 0 });
    expect(resolveActionBattleAoeCells(target!, mask)).toContainEqual({
      x: 2,
      y: 0,
    });
  });

  test("rejects an area target when no mask cell can cover it in range", () => {
    expect(
      resolveActionBattleAoeTarget(
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        1,
        ["#"]
      )
    ).toBeNull();
  });
});
