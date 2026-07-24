import { describe, expect, test } from "vitest";
import {
  directionToActionBattleTarget,
  resolveActionBattleSoftTarget,
} from "./targeting";

const entity = (id: string, x: number, y: number) => ({
  id,
  x: () => x,
  y: () => y,
  hitbox: () => ({ w: 32, h: 32 }),
});

describe("action battle soft targeting", () => {
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
});
