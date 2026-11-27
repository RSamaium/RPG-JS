import type { Combatant } from "../core";

/** What the HUD tells of the one target being chosen. */
export interface TargetInfo {
  name: string;
  battler: string;
  foe: boolean;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  /** Its numbers and weaknesses are shown: an ally, or a foe that was scanned. */
  known: boolean;
  stagger: { value: number; max: number; broken: boolean } | null;
  weaknesses: string[];
  resists: string[];
}

/** The card of the target: an ally, or a scanned foe, shows its numbers and weaknesses. */
export function targetInfoOf(c: Combatant, from: Combatant | null | undefined): TargetInfo {
  const foe = !!from && c.side !== from.side;
  return {
    name: c.name,
    battler: c.battler,
    foe,
    hp: c.hp,
    maxHp: c.stats.maxHp,
    sp: c.sp,
    maxSp: c.stats.maxSp,
    known: !foe || !!c.revealed,
    stagger: c.stagger,
    weaknesses: c.weaknesses,
    resists: c.resists,
  };
}
