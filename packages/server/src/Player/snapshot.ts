import type { RpgPlayerSnapshot } from "./types";

/**
 * Signal fields saved under their public name in player snapshots, as
 * `[signalField, publicField]`.
 */
const SNAPSHOT_FIELD_ALIASES: Array<[string, string]> = [
  ["_name", "name"],
  ["_speed", "speed"],
  ["_canMove", "canMove"],
];

/** Copy signal fields to their public name when the public field is missing. */
export function addPublicSnapshotAliases(snapshot: unknown): void {
  if (!snapshot || typeof snapshot !== "object") return;
  const record = snapshot as Record<string, unknown>;
  for (const [signalField, publicField] of SNAPSHOT_FIELD_ALIASES) {
    if (record[signalField] !== undefined && record[publicField] === undefined) {
      record[publicField] = record[signalField];
    }
  }
}

/** Copy public fields back to their signal field when the signal field is missing. */
export function addSignalSnapshotAliases(snapshot: unknown): void {
  if (!snapshot || typeof snapshot !== "object") return;
  const record = snapshot as Record<string, unknown>;
  for (const [signalField, publicField] of SNAPSHOT_FIELD_ALIASES) {
    if (record[publicField] !== undefined && record[signalField] === undefined) {
      record[signalField] = record[publicField];
    }
  }
}

function normalizeSnapshotHitboxDimension(value: unknown): number | null {
  const numberValue = typeof value === "string" ? Number(value) : value;
  return typeof numberValue === "number" && Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : null;
}

/** Read a saved hitbox (`{ w, h }` or `{ width, height }`), or `null` when invalid. */
export function normalizeSnapshotHitbox(hitbox: unknown): { w: number; h: number } | null {
  if (!hitbox || typeof hitbox !== "object") {
    return null;
  }

  const value = hitbox as Record<string, unknown>;
  const width = normalizeSnapshotHitboxDimension(value.w ?? value.width);
  const height = normalizeSnapshotHitboxDimension(value.h ?? value.height);
  return width && height ? { w: width, h: height } : null;
}

/** Whether a `load()` argument is a snapshot (object or JSON string) rather than a slot. */
export function isSnapshotInput(input: unknown): input is string | RpgPlayerSnapshot {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return true;
  }
  if (typeof input !== "string") {
    return false;
  }
  const trimmed = input.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}
