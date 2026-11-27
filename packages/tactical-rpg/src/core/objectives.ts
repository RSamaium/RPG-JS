import type { BattleState, Cell, Objective, Team } from "./types";

/**
 * What a type of objective decides: `judge` returns the side that has won (`"ally"` when the heroes reached their goal, `"enemy"` when
 * they lost it) once the battle satisfies it, nothing while it goes on. It reads the battle only: it runs on the server after each order.
 *
 * @example
 * ```ts
 * const escort: ObjectiveType = {
 *   judge: (state, objective) => (state.units.some((u) => u.id === objective.unitId && u.hp <= 0) ? "enemy" : undefined),
 * };
 * ```
 */
export interface ObjectiveType {
  judge(state: BattleState, objective: Objective): Team | null | void;
}

const alive = (state: BattleState, team: Team) => state.units.filter((u) => u.team === team && u.hp > 0);

const builtin: Record<string, ObjectiveType> = {
  /** Every enemy is down (the rule of every battle: it also wins the other objectives). */
  eliminate: { judge: () => undefined },
  /** A given enemy is down. */
  boss: { judge: (state, o) => (state.units.some((u) => u.id === o.unitId && u.hp <= 0) ? "ally" : undefined) },
  /** The last of `turns` rounds is over. */
  survive: { judge: (state, o) => (typeof o.turns === "number" && state.round > o.turns ? "ally" : undefined) },
  /** A hero stands on `cell`. */
  reach: {
    judge: (state, o) => {
      const goal = o.cell as Cell | undefined;
      return goal && alive(state, "ally").some((u) => u.x === goal.x && u.y === goal.y) ? "ally" : undefined;
    },
  },
};

const added = new Map<string, ObjectiveType>();

/**
 * Adds a type of objective: an encounter whose `goal.type` is `id` is decided by its `judge` (the other fields of `goal` are the ones
 * the type reads). Registered once, when the game starts. Server only: the server judges the battle after each order; the HUD shows
 * the `tactical.objective.<id>` text of the i18n service (or the `objective` text of the encounter).
 *
 * @title registerObjectiveType
 * @method registerObjectiveType(id, type)
 * @param {string} id - The `goal.type` of the encounters
 * @param {ObjectiveType} type - What decides the battle
 * @returns {void}
 * @throws When `id` is a built-in type (`eliminate`, `boss`, `survive`, `reach`)
 * @example
 * ```ts
 * import { registerObjectiveType } from "@rpgjs/tactical-rpg/server";
 *
 * // goal: { type: "hold", cell: { x: 4, y: 3 }, turns: 5 }
 * registerObjectiveType("hold", {
 *   judge: (state, goal) => {
 *     const cell = goal.cell!;
 *     if (state.units.some((u) => u.team === "enemy" && u.hp > 0 && u.x === cell.x && u.y === cell.y)) return "enemy";
 *     return state.round > Number(goal.turns) ? "ally" : undefined;
 *   },
 * });
 * ```
 */
export function registerObjectiveType(id: string, type: ObjectiveType): void {
  if (id in builtin) throw new Error(`[Tactical] "${id}" is a built-in objective`);
  added.set(id, type);
}

/**
 * Removes a type of objective added with `registerObjectiveType` (the built-in ones stay). Server only.
 *
 * @title unregisterObjectiveType
 * @method unregisterObjectiveType(id)
 * @param {string} id - The type to remove
 * @returns {void}
 * @example
 * ```ts
 * import { unregisterObjectiveType } from "@rpgjs/tactical-rpg/server";
 *
 * unregisterObjectiveType("hold");
 * ```
 */
export function unregisterObjectiveType(id: string): void {
  added.delete(id);
}

/** Every type of objective known: the built-in ones and the ones plugins added. */
export const objectiveTypes = (): Record<string, ObjectiveType> => ({ ...builtin, ...Object.fromEntries(added) });

/**
 * Who has won the battle, if anyone: the heroes lose when none stands or when the battle goes beyond its `limit` of rounds, and win when
 * their objective is reached or no enemy stands.
 */
export function outcome(state: BattleState, judges: ((state: BattleState) => Team | null | void)[] = []): Team | null {
  if (!alive(state, "ally").length) return "enemy";
  const objective = state.objective;
  const type = objective ? objectiveTypes()[objective.type] : undefined;
  const decided = (objective && type?.judge(state, objective)) || judges.map((judge) => judge(state)).find(Boolean);
  if (decided) return decided;
  if (!alive(state, "enemy").length) return "ally";
  if (objective?.limit && state.round > objective.limit) return "enemy";
  return null;
}
