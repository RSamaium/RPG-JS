import { describe, expect, test } from "vitest";
import {
  bindStudioCombatAnimationsToEntity,
  createStudioActionBattleAnimations,
} from "../src/action-battle-animations";

describe("Studio action battle animations", () => {
  test("resolves the hero attack animation bound to the client sprite", () => {
    const sprite: Record<string, any> = {};
    bindStudioCombatAnimationsToEntity(sprite, {
      attack: {
        id: "studio-hero-attack",
      },
    });

    const animations = createStudioActionBattleAnimations() as Record<
      string,
      (entity: Record<string, any>) => unknown
    >;

    expect(animations.attack(sprite)).toEqual({
      animationName: "attack",
      graphic: "studio-hero-attack",
      repeat: 1,
    });
    expect(sprite.combatAnimations).toBe(sprite.studioCombatAnimations);
  });
});
