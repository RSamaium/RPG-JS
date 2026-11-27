import type { BattleState, RoleDef, Unit } from "./types";

/** Built-in roles, used when the database declares no role with that id. */
export const DEFAULT_ROLES: Record<string, RoleDef> = {
  warrior: { id: "warrior", name: "Guerrier", glyph: "⚔", color: 0xf4c67b, attack: "melee" },
  archer: { id: "archer", name: "Archer", glyph: "➶", color: 0x80ded1, attack: "ranged" },
  mage: { id: "mage", name: "Mage", glyph: "✧", color: 0xc4a3ff, attack: "magic" },
};

const FALLBACK: RoleDef = { id: "?", name: "", glyph: "◆", color: 0xdbbb7d, attack: "melee" };

/** Role of a unit in a battle (never undefined). */
export function roleOf(state: BattleState | null | undefined, unit: Pick<Unit, "role">): RoleDef {
  return state?.roles?.[unit.role] ?? DEFAULT_ROLES[unit.role] ?? { ...FALLBACK, id: unit.role, name: unit.role };
}
