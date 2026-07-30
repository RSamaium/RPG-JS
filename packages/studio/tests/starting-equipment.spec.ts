import { describe, expect, test } from "vitest";
import {
  isStartingEquipmentCompatible,
  resolveStartingEquipmentType,
  resolveStudioItemType,
} from "../src/starting-equipment";

describe("Studio starting equipment", () => {
  test.each([
    ["weapon", "weapon"],
    ["weaponId", "weapon"],
    ["weapon_id", "weapon"],
    ["armor", "armor"],
    ["armorId", "armor"],
    ["armor_id", "armor"],
  ] as const)("maps %s to %s", (field, type) => {
    expect(resolveStartingEquipmentType(field)).toBe(type);
  });

  test("matches each slot with its exact database type", () => {
    expect(isStartingEquipmentCompatible("weaponId", { _type: "weapon" })).toBe(true);
    expect(isStartingEquipmentCompatible("weaponId", { _type: "armor" })).toBe(false);
    expect(isStartingEquipmentCompatible("armorId", { itemType: "armor" })).toBe(true);
    expect(isStartingEquipmentCompatible("armorId", { _type: "item" })).toBe(false);
  });

  test("reads reactive database types", () => {
    expect(resolveStudioItemType({ _type: () => "weapon" })).toBe("weapon");
  });
});
