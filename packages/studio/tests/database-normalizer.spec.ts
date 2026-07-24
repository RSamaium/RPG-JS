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
