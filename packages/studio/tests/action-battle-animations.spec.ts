import { describe, expect, test } from "vitest";
import {
  bindStudioCombatAnimationsToEntity,
  createStudioActionBattleAnimations,
} from "../src/action-battle-animations";

describe("Studio action battle animations", () => {
  test("updates the synchronized property without replacing its signal", () => {
    let current: unknown = "";
    const property = Object.assign(() => current, { set: (value: unknown) => { current = value; } });
    const entity = { studioCombatAnimations: property };
    bindStudioCombatAnimationsToEntity(entity, { attack: "actor-attack" });
    expect(entity.studioCombatAnimations).toBe(property);
    expect(property()).toEqual(JSON.stringify({ attack: "actor-attack" }));
  });

  test("reads authoritative actor overrides on each playback, including actor changes", () => {
    let actor = { attack: "actor-attack", castSpell: "actor-cast", hurt: "sprite-hurt" };
    const sprite = { studioCombatAnimations: () => JSON.stringify(actor), combatAnimations: { attack: "project-attack" } };
    const animations = createStudioActionBattleAnimations() as Record<string, (entity: any) => any>;
    expect(animations.attack(sprite)?.graphic).toBe("actor-attack");
    expect(animations.castSkill(sprite)?.graphic).toBe("actor-cast");
    expect(animations.hurt(sprite)?.graphic).toBe("sprite-hurt");
    actor = { ...actor, attack: "second-actor-attack" };
    expect(animations.attack(sprite)?.graphic).toBe("second-actor-attack");
  });

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
