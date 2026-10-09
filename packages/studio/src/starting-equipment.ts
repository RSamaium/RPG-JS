export type StudioStartingEquipmentType = "weapon" | "armor";

const readValue = (value: unknown, context?: unknown): unknown =>
  typeof value === "function"
    ? (value as (this: unknown) => unknown).call(context)
    : value;

/**
 * Resolve the database type required by a Studio starting-equipment field.
 *
 * Both current `weaponId`/`armorId` keys and legacy `weapon`/`armor` keys are
 * accepted so existing projects keep loading.
 */
export const resolveStartingEquipmentType = (
  field: string,
): StudioStartingEquipmentType | undefined => {
  const normalized = field.replaceAll("_", "").toLowerCase();
  if (normalized === "weapon" || normalized === "weaponid") return "weapon";
  if (normalized === "armor" || normalized === "armorid") return "armor";
  return undefined;
};

/**
 * Read the normalized RPGJS item type from a Studio database record.
 */
export const resolveStudioItemType = (
  item: unknown,
): string | undefined => {
  if (!item || typeof item !== "object") return undefined;
  const record = item as Record<string, unknown>;
  const value = readValue(record._type ?? record.itemType, item);
  return typeof value === "string" ? value : undefined;
};

/**
 * Return whether a database record is compatible with a starting-equipment
 * field.
 */
export const isStartingEquipmentCompatible = (
  field: string,
  item: unknown,
): boolean => {
  const expectedType = resolveStartingEquipmentType(field);
  return Boolean(expectedType && resolveStudioItemType(item) === expectedType);
};
