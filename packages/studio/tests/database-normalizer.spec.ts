import { describe, expect, test, vi } from "vitest";
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

  test("attaches Studio workflows through the native skill onUse hook", () => {
    const normalized = normalizeStudioDatabaseRecord({
      _id: "fire",
      type: "skill",
      workflowTriggers: [
        { phase: "cast", blockCollectionId: "cast-workflow", blocks: [] },
      ],
    });

    expect(normalized?.data.onUse).toBeTypeOf("function");
  });

  test("keeps skills without workflows on the default RPGJS use path", () => {
    const normalized = normalizeStudioDatabaseRecord({
      _id: "fire",
      type: "skill",
    });

    expect(normalized?.data.onUse).toBeUndefined();
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

  test("maps Studio item settings and lifecycle workflows to RPGJS item data", () => {
    const normalized = normalizeStudioDatabaseRecord({
      _id: "elixir",
      type: "item",
      itemType: "item",
      name: "Elixir",
      hpValue: 250,
      mpValue: 40,
      hitRate: 85,
      consumable: true,
      workflowTriggers: [{
        phase: "onUse",
        blockCollectionId: "elixir-use",
        blocks: [],
      }],
    });

    expect(normalized?.data).toMatchObject({
      id: "elixir",
      _type: "item",
      hpValue: 250,
      mpValue: 40,
      hitRate: 0.85,
      consumable: true,
      onUse: expect.any(Function),
    });
  });

  test("plays configured item animations and particle effects on successful use", async () => {
    const normalized = normalizeStudioDatabaseRecord({
      _id: "elixir",
      type: "item",
      itemType: "item",
      useAnimation: { _id: "elixir-animation" },
      useSound: { _id: "elixir-sound" },
      useParticleEffect: "healPulse",
    });
    const showAnimation = vi.fn();
    const showComponentAnimation = vi.fn();
    const playSound = vi.fn();
    const player = {
      x: () => 40,
      y: () => 72,
      getCurrentMap: () => ({ showAnimation }),
      showComponentAnimation,
      playSound,
    };

    await normalized?.data.onUse(player);

    expect(normalized?.data).toMatchObject({
      useAnimation: "elixir-animation",
      useSound: "elixir-sound",
      useParticleEffect: "healPulse",
    });
    expect(showAnimation).toHaveBeenCalledWith(
      { x: 40, y: 72 },
      "elixir-animation",
    );
    expect(showComponentAnimation).toHaveBeenCalledWith(
      "studio-item-use-fx",
      expect.objectContaining({ name: "healPulse" }),
    );
    expect(playSound).toHaveBeenCalledWith("elixir-sound");
  });

  test("omits consumable use fields from equipment and attaches onEquip", () => {
    const normalized = normalizeStudioDatabaseRecord({
      _id: "iron-sword",
      type: "item",
      itemType: "weapon",
      name: "Iron Sword",
      workflowTriggers: [{
        phase: "onEquip",
        blockCollectionId: "iron-sword-equip",
        blocks: [],
      }, {
        phase: "onUse",
        blockCollectionId: "invalid-weapon-use",
        blocks: [],
      }],
    });

    expect(normalized?.data).toMatchObject({
      id: "iron-sword",
      _type: "weapon",
      onEquip: expect.any(Function),
    });
    expect(normalized?.data).not.toHaveProperty("consumable");
    expect(normalized?.data).not.toHaveProperty("hitRate");
    expect(normalized?.data).not.toHaveProperty("useAnimation");
    expect(normalized?.data).not.toHaveProperty("useSound");
    expect(normalized?.data).not.toHaveProperty("useParticleEffect");
    expect(normalized?.data.onUse).toBeUndefined();
  });
});
