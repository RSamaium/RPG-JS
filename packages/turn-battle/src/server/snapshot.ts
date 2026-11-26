import type { RpgPlayer } from "@rpgjs/server";
import type { BattleResult, BattleState, Catalog, CombatantDef, Stats } from "../core";
import { translateBattleText } from "../core/i18n";
import { readBattlePlayer, writeBattlePlayer } from "@rpgjs/battle-kit/server";
import { weaponFromDb, type WeaponInfo } from "./database";

/** Combatant id of a player's own hero. */
export const heroIdOf = (player: RpgPlayer) => `player:${player.id}`;

/**
 * The battle stats of a hero when neither the RPGJS player (`nativeStats: false`, or a player without parameters) nor the
 * `hero` option give them. Spread it to tune a few stats. Server only.
 *
 * @title DEFAULT_HERO_STATS
 * @prop {Stats} DEFAULT_HERO_STATS
 * @example
 * ```ts
 * import { DEFAULT_HERO_STATS, provideTurnBattleServer } from "@rpgjs/turn-battle/server";
 *
 * provideTurnBattleServer({
 *   nativeStats: false,
 *   hero: () => ({ battler: "hero", stats: { ...DEFAULT_HERO_STATS, atk: 60 } }),
 * });
 * ```
 */
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

/**
 * A battle text in the language of a player (its RPGJS i18n service), or the English default of `TURN_BATTLE_I18N` when the
 * player has none (a bare object in a test).
 */
export function playerText(player: RpgPlayer, key: string, params?: Record<string, unknown>): string {
  const p = player as unknown as { t?: (key: string, params?: Record<string, unknown>) => string };
  const i18n = typeof p.t === "function" ? { t: (k: string, v?: Record<string, unknown>) => p.t!(k, v) } : undefined;
  return read(() => translateBattleText(key, params, i18n)) ?? translateBattleText(key, params);
}
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
  // A knocked-out player (0 HP) joins knocked out: a battle is no free revival.
  const nativeHpValue = Number(read(() => p.hp));
  const hp = nativeHp && Number.isFinite(nativeHpValue) ? Math.max(0, nativeHpValue) : stats.maxHp;
  const sp = Number(param.maxSp) > 0 ? Number(read(() => p.sp)) || 0 : stats.maxSp;
  return {
    name: String(val(p.name) || playerText(player, "turnBattle.hero")),
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
  const { items } = readBattlePlayer(player);
  return Object.fromEntries(Object.entries(items).filter(([id]) => catalog.items[id]));
}

/** Write the outcome back to the player: HP/SP, consumed items, EXP, gold, drops. */
export function commitPlayer(
  player: RpgPlayer,
  state: BattleState,
  result: BattleResult,
  { nativeStats = true, vitals = true }: { nativeStats?: boolean; vitals?: boolean } = {},
) {
  const me = state.combatants.find((c) => c.id === heroIdOf(player));
  const gained: Record<string, number> = { ...state.gains?.[player.id] };
  for (const drop of result.items) gained[drop.id] = (gained[drop.id] ?? 0) + drop.quantity;
  writeBattlePlayer(
    player,
    {
      ...(me && nativeStats && vitals ? { hp: me.hp, sp: me.sp } : {}),
      usedItems: state.used[player.id],
      gainedItems: gained,
      exp: result.exp,
      gold: result.gold,
    },
    "TurnBattle",
  );
}
