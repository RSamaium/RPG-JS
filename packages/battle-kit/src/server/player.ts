import type { RpgPlayer } from "@rpgjs/server";
import { plainValue } from "./database";

/**
 * What a battle reads of a player with `readBattlePlayer`: the native RPGJS
 * data, equipment and states included (`param` already sums them). Every
 * value that cannot be read (a bare player of a test, a custom room) is left
 * out or zero, so a battle system applies its own fallbacks. Server only.
 *
 * @title BattlePlayerSnapshot
 * @example
 * ```ts
 * const me: BattlePlayerSnapshot = readBattlePlayer(player);
 * const maxHp = me.params.maxHp || 100;
 * ```
 */
export interface BattlePlayerSnapshot {
  /**
   * Name of the player; left out when they have none.
   *
   * @prop {string} [name]
   * @memberof BattlePlayerSnapshot
   */
  name?: string;
  /**
   * Current HP (0 when it cannot be read).
   *
   * @prop {number} hp
   * @memberof BattlePlayerSnapshot
   */
  hp: number;
  /**
   * Current SP (0 when it cannot be read).
   *
   * @prop {number} sp
   * @memberof BattlePlayerSnapshot
   */
  sp: number;
  /**
   * `param` of the player (`maxHp`, `maxSp`, `str`, `int`, `dex`, `agi`…), plus
   * `atk`, `pdef`, `sdef` (equipment) when they are not 0. Non-numeric values
   * are left out.
   *
   * @prop {Record<string, number>} params
   * @memberof BattlePlayerSnapshot
   */
  params: Record<string, number>;
  /**
   * Level of the player; left out when it is not a positive number.
   *
   * @prop {number} [level]
   * @memberof BattlePlayerSnapshot
   */
  level?: number;
  /**
   * Ids of the skills the player knows.
   *
   * @prop {string[]} skills
   * @memberof BattlePlayerSnapshot
   */
  skills: string[];
  /**
   * Items of the inventory: id → quantity (a missing quantity counts as 1).
   *
   * @prop {Record<string, number>} items
   * @memberof BattlePlayerSnapshot
   */
  items: Record<string, number>;
  /**
   * Ids of the equipped items.
   *
   * @prop {string[]} equipments
   * @memberof BattlePlayerSnapshot
   */
  equipments: string[];
  /**
   * Efficiency of the elements (class, states…).
   *
   * @prop {{ element: string; rate: number }[]} elementsEfficiency
   * @memberof BattlePlayerSnapshot
   */
  elementsEfficiency: { element: string; rate: number }[];
  /**
   * Graphic of the player on the map (first spritesheet id).
   *
   * @prop {string} [graphic]
   * @memberof BattlePlayerSnapshot
   */
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
 * Reads what a battle needs of a player. Never throws: a value that cannot
 * be read is left out or zero (see `BattlePlayerSnapshot`). Server only.
 *
 * @title readBattlePlayer
 * @method readBattlePlayer(player)
 * @param {RpgPlayer} player - The player
 * @returns {BattlePlayerSnapshot} A plain copy of their battle data
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

/**
 * What a battle writes back on a player once it is over, with
 * `writeBattlePlayer`. Every field is optional: a missing one is not written.
 * Server only.
 *
 * @title BattlePlayerOutcome
 * @example
 * ```ts
 * const outcome: BattlePlayerOutcome = { hp: 42, sp: 10, gainedItems: { potion: 2 }, exp: 120, gold: 35 };
 * ```
 */
export interface BattlePlayerOutcome {
  /**
   * HP left, rounded and at least 1 (a fallen hero comes back with 1 HP: the
   * game decides what a defeat means).
   *
   * @prop {number} [hp]
   * @memberof BattlePlayerOutcome
   */
  hp?: number;
  /**
   * SP left, rounded and at least 0.
   *
   * @prop {number} [sp]
   * @memberof BattlePlayerOutcome
   */
  sp?: number;
  /**
   * Items spent during the battle: id → quantity (removed from the inventory).
   *
   * @prop {Record<string, number>} [usedItems]
   * @memberof BattlePlayerOutcome
   */
  usedItems?: Record<string, number>;
  /**
   * Items won (drops, steals): id → quantity (added to the inventory).
   *
   * @prop {Record<string, number>} [gainedItems]
   * @memberof BattlePlayerOutcome
   */
  gainedItems?: Record<string, number>;
  /**
   * Experience won, added to the player's EXP.
   *
   * @prop {number} [exp]
   * @memberof BattlePlayerOutcome
   */
  exp?: number;
  /**
   * Gold won, added to the player's gold.
   *
   * @prop {number} [gold]
   * @memberof BattlePlayerOutcome
   */
  gold?: number;
}

/**
 * Writes the outcome of a battle on a player: HP, SP, items spent and won,
 * EXP and gold. Each write is attempted on its own and a failure is logged, so
 * one missing field never loses the rest. Server only.
 *
 * @title writeBattlePlayer
 * @method writeBattlePlayer(player, outcome, label?)
 * @param player - The player
 * @param outcome - What to write
 * @param label - Name used in the log of a failed write (`[TurnBattle] …`). Default: `"Battle"`
 * @returns Nothing
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
