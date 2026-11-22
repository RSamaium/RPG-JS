import type { BattleState, Cell, SkillDef, Unit } from "./types";
import { inside, key } from "./board";

/** A skill of the battle catalogue that this unit knows. */
export function skillFor(state: Pick<BattleState, "skills">, unit: Unit, id?: string): SkillDef | undefined {
  return id && unit.skillIds.includes(id) ? state.skills[id] : undefined;
}

/** Skills of a unit, in its order. */
export function skillsOf(state: Pick<BattleState, "skills">, unit: Unit): SkillDef[] {
  return unit.skillIds.map((id) => state.skills[id]).filter((s): s is SkillDef => !!s);
}

/** Why a skill cannot be used now (i18n key), or null. */
export function skillUnavailable(unit: Unit, skill: SkillDef): string | null {
  if (unit.usedSkills.filter((id) => id === skill.id).length >= (skill.uses ?? 1)) return "tactical.error.skill";
  if (unit.sp < skill.spCost) return "tactical.error.sp";
  return null;
}

/** The tiles of an area drawn in Studio around a target: the middle of the rows is the target. */
export function maskCells(mask: string[], target: Cell): Cell[] {
  const height = mask.length;
  const width = Math.max(...mask.map((row) => row.length));
  const [cx, cy] = [Math.floor(width / 2), Math.floor(height / 2)];
  return mask.flatMap((row, y) => [...row].flatMap((c, x) => (c !== "." && c !== " " && c !== "0" ? [{ x: target.x + x - cx, y: target.y + y - cy }] : [])));
}

/** Shared by previews, authoritative damage and FX; clipped to the arena. */
export function skillArea(state: Pick<BattleState, "board">, source: Cell, target: Cell, skill: SkillDef): Cell[] {
  let cells: Cell[] = [target];
  if (skill.mask) cells = maskCells(skill.mask, target);
  else {
  if (skill.shape === "square") cells = Array.from({ length: 9 }, (_, i) => ({ x: target.x + (i % 3) - 1, y: target.y + Math.floor(i / 3) - 1 }));
  if (skill.shape === "cross") cells = [target, { x: target.x - 1, y: target.y }, { x: target.x + 1, y: target.y }, { x: target.x, y: target.y - 1 }, { x: target.x, y: target.y + 1 }];
  if (skill.shape === "pierce") cells = [target, { x: target.x + Math.sign(target.x - source.x), y: target.y + Math.sign(target.y - source.y) }];
  }
  return cells.filter((cell, index) => inside(state.board, cell) && cells.findIndex((c) => key(c) === key(cell)) === index);
}
