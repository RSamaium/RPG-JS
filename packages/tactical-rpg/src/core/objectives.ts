import type { BattleState, Cell, Objective, Team } from "./types";

/**
 * What a type of objective decides: `judge` returns the side that has won (`"ally"` when the heroes reached their goal, `"enemy"` when
 * they lost it) once the battle satisfies it, nothing while it goes on. It reads the battle only: it runs on the server after each order.
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
 * A type of objective of a plugin, by the `type` a troop gives (the fields it reads are the ones the plugin adds to the troop, see
 * `databaseExtensions`). Registered once, when the game starts; a built-in type cannot be replaced.
 */
export function registerObjectiveType(id: string, type: ObjectiveType) {
  if (id in builtin) throw new Error(`[Tactical] "${id}" is a built-in objective`);
  added.set(id, type);
}

export function unregisterObjectiveType(id: string) {
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
