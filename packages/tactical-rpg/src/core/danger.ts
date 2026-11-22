import { distance, key, lineClear, reachable } from "./board";
import { skillsOf, skillUnavailable } from "./skills";
import type { BattleState, Cell, Team, Unit } from "./types";

/** What a unit threatens next turn: the cells it can reach, and those it can then hit. */
export interface Threat {
  move: Set<string>;
  attack: Set<string>;
}

/** Longest reach of a unit: basic attack or a skill it can still use. */
export function reachOf(state: BattleState, unit: Unit): number {
  const skills = skillsOf(state, unit).filter((s) => !skillUnavailable(unit, s));
  return Math.max(unit.range, ...skills.map((s) => s.range));
}

/** Cells a unit can reach, and cells it can attack from any of them (line of sight included). */
export function threatOf(state: BattleState, unit: Unit): Threat {
  const b = state.board;
  const move = new Set(reachable(state, unit).keys());
  const attack = new Set<string>();
  const range = reachOf(state, unit);
  const from: Cell[] = [...move].map((k) => {
    const [x, y] = k.split(",").map(Number);
    return { x, y };
  });
  for (let y = 0; y < b.rows; y++)
    for (let x = 0; x < b.columns; x++) {
      const cell = { x, y };
      if (b.blocked.includes(key(cell))) continue;
      if (from.some((f) => distance(f, cell) <= range && distance(f, cell) > 0 && lineClear(b, f, cell))) attack.add(key(cell));
    }
  return { move, attack };
}

/** Danger zone: every cell the living units of `team` can attack next turn. */
export function dangerZone(state: BattleState, team: Team): Set<string> {
  const zone = new Set<string>();
  for (const unit of state.units.filter((u) => u.team === team && u.hp > 0))
    for (const k of threatOf(state, unit).attack) zone.add(k);
  return zone;
}
