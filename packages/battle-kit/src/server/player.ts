import type { RpgPlayer } from "@rpgjs/server";
import { plainValue } from "./database";

/**
 * What a battle reads of a player: the native RPGJS data, equipment and
 * states included (`param` already sums them). Every value that cannot be read
 * (a bare player of a test, a custom room) is left out or zero, so a battle
 * system applies its own fallbacks.
 */
export interface BattlePlayerSnapshot {
  name?: string;
  hp: number;
  sp: number;
  /** `param` of the player (`maxHp`, `maxSp`, `str`, `int`, `dex`, `agi`…), plus `atk`, `pdef`, `sdef` (equipment). */
  params: Record<string, number>;
  level?: number;
  /** Ids of the skills the player knows. */
  skills: string[];
  /** Items of the inventory: id → quantity. */
  items: Record<string, number>;
  /** Ids of the equipped items. */
  equipments: string[];
  /** Efficiency of the elements (class, states…). */
  elementsEfficiency: { element: string; rate: number }[];
  /** Graphic of the player on the map (spritesheet id). */
  graphic?: string;
}

const read = <T>(fn: () => T): T | undefined => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};

const ids = (list: unknown): string[] =>
  (Array.isArray(list) ? list : [])
    .map((entry) => String(plainValue((entry as { id?: unknown } | null)?.id) ?? ""))
    .filter(Boolean);

type PlayerFields = Record<string, unknown> & {
  skills?: () => unknown;
  items?: () => unknown;
  equipments?: () => unknown;
  param?: Record<string, unknown>;
};

/**
 * Reads what a battle needs of a player. Server only.
 *
 * @example
 * ```ts
 * const me = readBattlePlayer(player);
 * const unit = { hp: me.hp, maxHp: me.params.maxHp || 100, skills: me.skills };
 * ```
 */
export function readBattlePlayer(player: RpgPlayer): BattlePlayerSnapshot {
  const p = player as unknown as PlayerFields;
  const rawParams = (read(() => p.param) ?? {}) as Record<string, unknown>;
  const params: Record<string, number> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    const n = Number(value);
    if (Number.isFinite(n)) params[key] = n;
  }
  for (const key of ["atk", "pdef", "sdef"]) {
    const n = Number(read(() => plainValue(p[key])));
    if (Number.isFinite(n) && n) params[key] = n;
  }
  const items: Record<string, number> = {};
  for (const item of (read(() => p.items?.()) ?? []) as unknown[]) {
    const id = String(plainValue((item as { id?: unknown } | null)?.id) ?? "");
    const quantity = Number(plainValue((item as { quantity?: unknown } | null)?.quantity) ?? 1);
    if (id && quantity > 0) items[id] = (items[id] ?? 0) + quantity;
  }
  const name = read(() => plainValue(p.name));
  const level = Number(read(() => plainValue(p.level)));
  const graphics = read(() => plainValue(p.graphics));
  const efficiency = read(() => plainValue(p.elementsEfficiency));
  return {
    ...(name ? { name: String(name) } : {}),
    hp: Number(read(() => plainValue(p.hp))) || 0,
    sp: Number(read(() => plainValue(p.sp))) || 0,
    params,
    ...(Number.isFinite(level) && level > 0 ? { level } : {}),
    skills: ids(read(() => p.skills?.())),
    items,
    equipments: ids(read(() => p.equipments?.())),
    elementsEfficiency: Array.isArray(efficiency) ? (efficiency as { element: string; rate: number }[]) : [],
    ...(Array.isArray(graphics) && graphics.length ? { graphic: String(graphics[0]) } : {}),
  };
}

/** What a battle writes back on a player once it is over. */
export interface BattlePlayerOutcome {
  /** HP left (a fallen hero comes back with 1 HP: the game decides what a defeat means). */
  hp?: number;
  sp?: number;
  /** Items spent during the battle: id → quantity. */
  usedItems?: Record<string, number>;
  /** Items won (drops, steals): id → quantity. */
  gainedItems?: Record<string, number>;
  exp?: number;
  gold?: number;
}

/**
 * Writes the outcome of a battle on a player: HP, SP, items spent and won,
 * EXP and gold. Each write is attempted on its own and a failure is logged, so
 * one missing field never loses the rest. Server only.
 *
 * @param label - Name used in the log of a failed write (`[TurnBattle] …`)
 *
 * @example
 * ```ts
 * writeBattlePlayer(player, { hp: hero.hp, sp: hero.sp, usedItems: { potion: 1 }, exp: 120 }, "Tactical");
 * ```
 */
export function writeBattlePlayer(player: RpgPlayer, outcome: BattlePlayerOutcome, label = "Battle"): void {
  const p = player as unknown as Record<string, unknown> & {
    removeItem(id: string, n: number): void;
    addItem(id: string, n: number): void;
  };
  const attempt = (what: string, fn: () => void) => {
    try {
      fn();
    } catch (error) {
      console.warn(`[${label}] writing ${what} on the player failed`, error);
    }
  };
  if (outcome.hp !== undefined) attempt("hp", () => (p.hp = Math.max(1, Math.round(outcome.hp!))));
  if (outcome.sp !== undefined) attempt("sp", () => (p.sp = Math.max(0, Math.round(outcome.sp!))));
  for (const [id, n] of Object.entries(outcome.usedItems ?? {})) if (n > 0) attempt(`item ${id}`, () => p.removeItem(id, n));
  if (outcome.exp) attempt("exp", () => (p.exp = (Number(p.exp) || 0) + outcome.exp!));
  if (outcome.gold) attempt("gold", () => (p.gold = (Number(p.gold) || 0) + outcome.gold!));
  for (const [id, n] of Object.entries(outcome.gainedItems ?? {})) if (n > 0) attempt(`item ${id}`, () => p.addItem(id, n));
}
