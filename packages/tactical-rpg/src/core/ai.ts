import { distance, reachable } from "./board";
import { targetable } from "./rules";
import type { BattleState, Command, Unit } from "./types";
/** An AI: the next command of the side whose turn it is (null when nothing to do). */
export type TacticalAi = (state: BattleState) => Command | null;

/** Next unit of the side whose turn it is that has not acted yet. */
export function nextUnit(state: BattleState): Unit | undefined {
  return state.units.find((u) => u.team === state.phase && u.hp > 0 && !u.acted);
}

/** Default AI: the next unit attacks the weakest target in range, otherwise closes in. */
export function chooseAction(state: BattleState): Command | null {
  const unit = nextUnit(state);
  return unit ? chooseFor(state, unit) : null;
}

/** Default decision for one unit (reusable from an `onChooseAction` hook). */
export function chooseFor(state: BattleState, unit: Unit): Command {
  const enemies = state.units
    .filter((u) => u.team !== unit.team && u.hp > 0)
    .sort((a, b) => a.hp - b.hp || a.id.localeCompare(b.id));
  const target = enemies.find((v) => targetable(state, unit, v));
  if (target && !unit.acted) return { type: "attack", unitId: unit.id, targetId: target.id };
  if (!unit.moved) {
    const options = [...reachable(state, unit).values()]
      .filter((p) => p.length)
      .sort((a, b) => {
        const score = (p: typeof a) => Math.min(...enemies.map((e) => distance(p.at(-1)!, e)));
        return score(a) - score(b) || a.length - b.length;
      });
    if (options.length) return { type: "move", unitId: unit.id, cell: options[0].at(-1)! };
  }
  return { type: "wait", unitId: unit.id };
}
