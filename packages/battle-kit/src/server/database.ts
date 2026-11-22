import type { RpgPlayer } from "@rpgjs/server";

/**
 * A record of the RPGJS database as a plain object: a record declared with a
 * decorated class (`@Skill({...}) class Fire {}`) is read from its prototype.
 * Undefined when the database has no record of that id.
 *
 * Server only.
 *
 * @example
 * ```ts
 * const fire = databaseRecord<{ name: string; spCost?: number }>(player, "fire");
 * ```
 */
export function databaseRecord<T = Record<string, unknown>>(player: RpgPlayer, id: string): T | undefined {
  let raw: unknown;
  try {
    raw = player.databaseById(id);
  } catch {
    return undefined;
  }
  if (!raw) return undefined;
  if (typeof raw === "function") {
    const proto = (raw as { prototype?: Record<string, unknown> }).prototype ?? {};
    const options = (proto.options ?? {}) as Record<string, unknown>;
    return { ...proto, ...options } as T;
  }
  return raw as T;
}

/** A value of a record or of a player, which may be a signal (`player.name()`). */
export function plainValue(value: unknown): unknown {
  return typeof value === "function" ? (value as () => unknown)() : value;
}
