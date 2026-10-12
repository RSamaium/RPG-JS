import { describe, expect, test } from "vitest";
import { createDefaultPlayerHitboxResolver, resolveAttackOrigin } from "./defaults";

const attacker = (x: number, y: number, w: number, h: number) => ({
  x: () => x,
  y: () => y,
  hitbox: () => ({ w, h }),
});

describe("resolveAttackOrigin", () => {
  test("keeps the legacy origin for a 32x32 body", () => {
    expect(resolveAttackOrigin(attacker(100, 100, 32, 32), "right")).toEqual({ x: 100, y: 100 });
  });

  test("centers the origin on a bigger body and pushes it out along the facing direction", () => {
    const body = attacker(100, 100, 54, 35);
    expect(resolveAttackOrigin(body, "right")).toEqual({ x: 122, y: 101.5 });
    expect(resolveAttackOrigin(body, "left")).toEqual({ x: 100, y: 101.5 });
    expect(resolveAttackOrigin(body, "down")).toEqual({ x: 111, y: 103 });
    expect(resolveAttackOrigin(body, "up")).toEqual({ x: 111, y: 100 });
  });

  test("the default resolver reaches past the edge of a bigger body", () => {
    const [zone] = createDefaultPlayerHitboxResolver()({
      attacker: attacker(100, 100, 54, 35),
      direction: "right",
    } as any);
    expect(zone.x).toBeGreaterThanOrEqual(100 + 54 - 16);
  });
});
