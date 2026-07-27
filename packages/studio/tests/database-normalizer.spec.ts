import { describe, expect, test } from "vitest";
import {
  normalizeStudioDatabase,
  normalizeStudioDatabaseRecord,
} from "../src/database-normalizer";

describe("Studio database normalizer", () => {
  test("maps Studio skill fields to RPGJS skill fields", () => {
    const normalized = normalizeStudioDatabaseRecord({
      _id: "fire",
      type: "skill",
      name: "Fire",
      spCost: 12,
      hitRate: 0.8,
      power: 40,
    });

    expect(normalized).toEqual({
      id: "fire",
      data: {
        id: "fire",
        _type: "skill",
        name: "Fire",
        spCost: 12,
        hitRate: 0.8,
        power: 40,
        coefficient: {},
        targeting: {
          range: 0,
        },
        action: {
          mode: "melee",
          target: "enemy",
          cooldownMs: 0,
        },
      },
    });
  });

  test("keeps compatibility with Studio skill payloads that still use mpCost", () => {
    const normalized = normalizeStudioDatabaseRecord({
      _id: "ice",
      type: "skill",
      name: "Ice",
      mpCost: 7,
    });

    expect(normalized?.data.spCost).toBe(7);
  });

  test("maps Studio successRate percentages to RPGJS hit rates", () => {
    const normalized = normalizeStudioDatabaseRecord({
      _id: "beast-strike",
      type: "skill",
      name: "Frappe bestiale",
      successRate: 95,
      spCost: 5,
    });

    expect(normalized?.data.hitRate).toBe(0.95);
  });

  test("normalizes Studio action-battle media and legacy targeting", () => {
    const normalized = normalizeStudioDatabaseRecord({
      _id: "fireball",
      type: "skill",
      name: "Fireball",
      range: 5,
      target: "ally",
      casterAnimation: { _id: "cast-animation" },
      animation: { _id: "impact-animation" },
      sound: { _id: "cast-sound" },
      impactSound: { _id: "impact-sound" },
      action: {
        mode: "projectile",
        cooldownMs: 900,
        visual: {
          castFx: "magicBurst",
          trailFx: "torchFire",
          impactFx: "explosionSmall",
        },
        projectile: {
          graphic: { _id: "fireball-graphic" },
          speed: 240,
        },
      },
    });

    expect(normalized?.data).toMatchObject({
      casterAnimation: "cast-animation",
      animation: "impact-animation",
      sound: "cast-sound",
      impactSound: "impact-sound",
      targeting: { range: 5 },
      action: {
        mode: "projectile",
        target: "ally",
        cooldownMs: 900,
        visual: {
          castFx: "magicBurst",
          trailFx: "torchFire",
          impactFx: "explosionSmall",
        },
        projectile: {
          graphic: "fireball-graphic",
          speed: 240,
        },
      },
    });
  });

  test("normalizes item and resource types without mutating the source", () => {
    const source = {
      _id: "potion",
      resourceType: "item",
      itemType: "item",
      name: "Potion",
    };

    const database = normalizeStudioDatabase([source]);

    expect(database.potion).toMatchObject({
      id: "potion",
      _type: "item",
      name: "Potion",
    });
    expect(database.potion).not.toHaveProperty("_id");
    expect(database.potion).not.toHaveProperty("itemType");
    expect(database.potion).not.toHaveProperty("resourceType");
    expect(source).toHaveProperty("_id", "potion");
  });
});
