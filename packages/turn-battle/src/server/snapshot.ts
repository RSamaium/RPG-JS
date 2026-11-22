import type { RpgPlayer } from "@rpgjs/server";
import type { BattleResult, BattleState, Catalog, CombatantDef, Stats } from "../core";
import { weaponFromDb, type WeaponInfo } from "./database";

/** Combatant id of a player's own hero. */
export const heroIdOf = (player: RpgPlayer) => `player:${player.id}`;

export const DEFAULT_HERO_STATS: Stats = {
  maxHp: 420,
  maxSp: 80,
  atk: 48,
  def: 26,
  mag: 34,
  mdef: 24,
  agi: 34,
  luk: 12,
};

const read = <T>(fn: () => T): T | undefined => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};
const val = (v: unknown) => (typeof v === "function" ? (v as () => unknown)() : v);
const positive = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * Build the leader combatant from the native RPGJS player data (HP/SP,
 * parameters, equipment, learned skills). Anything missing falls back on
 * `base`, so a bare hero is still playable.
 */
export function readPlayer(
  player: RpgPlayer,
  base: Partial<CombatantDef> & { battler: string },
  catalog: Catalog,
  { nativeStats = true, record }: { nativeStats?: boolean; record?: (id: string) => Record<string, any> | undefined } = {},
): CombatantDef {
  const p = player as any;
  const param = (nativeStats ? read(() => p.param) ?? {} : {}) as Record<string, number>;
  const fb = { ...DEFAULT_HERO_STATS, ...base.stats };
  const nativeHp = Number(param.maxHp) > 0;
  const stats: Stats = {
    maxHp: positive(param.maxHp, fb.maxHp),
    maxSp: positive(param.maxSp, fb.maxSp),
    atk: positive((Number(param.str) || 0) + (nativeStats ? Number(read(() => p.atk)) || 0 : 0), fb.atk),
    def: positive(nativeStats ? read(() => p.pdef) : 0, fb.def),
    mag: positive(param.int, fb.mag),
    mdef: positive(nativeStats ? read(() => p.sdef) : 0, fb.mdef),
    agi: positive(param.agi, fb.agi),
    luk: positive(param.dex, fb.luk),
    ...(nativeStats && Number(param.str) > 0 ? { str: Number(param.str) } : {}),
    ...(nativeStats && Number(param.int) > 0 ? { int: Number(param.int) } : {}),
    ...(nativeStats && Number(param.dex) > 0 ? { dex: Number(param.dex) } : {}),
  };
  // Like the native battle: the efficiency of the elements of the player (class, states…).
  const efficiency = nativeStats ? (read(() => p.elementsEfficiency) as { element: string; rate: number }[] | undefined) : undefined;
  const learned = (read(() => p.skills?.()) ?? []) as unknown[];
  const nativeSkills = learned
    .map((s) => String(val((s as any)?.id) ?? ""))
    .filter((id) => id && (catalog.skills[id] || catalog.commands?.[id]));
  // Equipped weapon (native RPGJS equipment) shapes the basic attack; `base.weapon` forces one.
  const weapon = base.weapon && record ? weaponFromDb(record(base.weapon)) : equippedWeapon(player, record);
  if (weapon && !nativeStats) stats.atk += weapon.atk; // native atk already sums equipment
  const hp = nativeHp ? positive(read(() => p.hp), stats.maxHp) : stats.maxHp;
  const sp = Number(param.maxSp) > 0 ? Number(read(() => p.sp)) || 0 : stats.maxSp;
  return {
    name: String(val(p.name) || "Héros"),
    ...base,
    id: heroIdOf(player),
    side: "ally",
    owner: player.id,
    stats,
    hp: Math.min(hp, stats.maxHp),
    sp: Math.min(sp, stats.maxSp),
    skills: [...new Set([...(base.skills ?? []), ...nativeSkills])],
    attack: weapon ? { ...base.attack, ...weapon.attack } : base.attack,
    ...(Array.isArray(efficiency) && efficiency.length
      ? { elementsEfficiency: [...(base.elementsEfficiency ?? []), ...efficiency] }
      : {}),
  };
}

function equippedWeapon(player: RpgPlayer, record?: (id: string) => Record<string, any> | undefined): WeaponInfo | undefined {
  if (!record) return undefined;
  const equipped = (read(() => (player as any).equipments?.()) ?? []) as unknown[];
  for (const item of equipped) {
    const w = weaponFromDb(record(String(val((item as any)?.id))));
    if (w) return w;
  }
  return undefined;
}

/** Battle inventory: the player's items that the battle catalog knows how to use. */
export function readInventory(player: RpgPlayer, catalog: Catalog): Record<string, number> {
  const inventory: Record<string, number> = {};
  const items = (read(() => (player as any).items?.()) ?? []) as unknown[];
  for (const item of items) {
    const id = String(val((item as any)?.id) ?? "");
    const qty = Number(val((item as any)?.quantity) ?? 1);
    if (id && catalog.items[id] && qty > 0) inventory[id] = (inventory[id] ?? 0) + qty;
  }
  return inventory;
}

/** Write the outcome back to the player: HP/SP, consumed items, EXP, gold, drops. */
export function commitPlayer(
  player: RpgPlayer,
  state: BattleState,
  result: BattleResult,
  { nativeStats = true, vitals = true }: { nativeStats?: boolean; vitals?: boolean } = {},
) {
  const p = player as any;
  const me = state.combatants.find((c) => c.id === heroIdOf(player));
  const attempt = (label: string, fn: () => void) => {
    try {
      fn();
    } catch (error) {
      console.warn(`[TurnBattle] commit ${label} failed`, error);
    }
  };
  if (me && nativeStats && vitals) {
    // A fallen leader comes back with 1 HP; the game decides what defeat means.
    attempt("hp", () => (p.hp = Math.max(1, me.hp)));
    attempt("sp", () => (p.sp = me.sp));
  }
  for (const [id, n] of Object.entries(state.used[player.id] ?? {}))
    if (n > 0) attempt(`item ${id}`, () => p.removeItem(id, n));
  if (result.exp) attempt("exp", () => (p.exp = (Number(p.exp) || 0) + result.exp));
  if (result.gold) attempt("gold", () => (p.gold = (Number(p.gold) || 0) + result.gold));
  for (const drop of result.items) attempt(`drop ${drop.id}`, () => p.addItem(drop.id, drop.quantity));
  // Won during the battle (stolen…): kept whatever the outcome.
  for (const [id, n] of Object.entries(state.gains?.[player.id] ?? {}))
    if (n > 0) attempt(`gain ${id}`, () => p.addItem(id, n));
}
