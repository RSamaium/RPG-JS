import { afterEach, describe, expect, it } from "vitest";
import { createEncounter } from "./fixture";
import { emberDatabase } from "./demo-database";
import { createTacticalBattle } from "../core";
import { transition } from "../core/rules";
import { objectiveTypes, registerObjectiveType, unregisterObjectiveType } from "../core/objectives";
import type { BattleState, Objective } from "../core";

const started = (objective?: Objective, patch: (state: BattleState) => void = () => undefined) => {
  const state = transition(createEncounter(), { type: "start" }, "ally").state;
  if (objective) state.objective = objective;
  patch(state);
  return state;
};
const unit = (state: BattleState, id: string) => state.units.find((u) => u.id === id)!;
/** Both sides end their phase: a round goes by. */
const round = (state: BattleState) => {
  const next = transition(state, { type: "endPhase" }, "ally").state;
  return next.winner ? next : transition(next, { type: "endPhase" }, "enemy").state;
};
const kill = (state: BattleState, ...ids: string[]) => ids.forEach((id) => (unit(state, id).hp = 0));
/** A command that leaves the battle as it is, to have the rules judge it. */
const wait = (state: BattleState) => transition(state, { type: "wait", unitId: "ally-warrior" }, "ally").state;

describe("the objective of a battle", () => {
  it("is to eliminate every enemy when it says nothing", () => {
    const state = started(undefined, (s) => kill(s, "enemy-warrior", "enemy-archer"));
    expect(wait(state).winner).toBeNull();
    kill(state, "enemy-mage");
    expect(wait(state).winner).toBe("ally");
  });

  it("is lost when every hero falls, whatever the objective is", () => {
    const state = started({ type: "reach", cell: { x: 0, y: 0 } }, (s) => kill(s, "ally-archer", "ally-mage"));
    kill(state, "ally-warrior");
    expect(round(state).winner).toBe("enemy");
  });

  it("can be to defeat a chief: the battle is won when it falls, the other enemies standing", () => {
    const state = started({ type: "boss", unitId: "enemy-mage" });
    expect(wait(state).winner).toBeNull();
    kill(state, "enemy-mage");
    expect(wait(state).winner).toBe("ally");
  });

  it("can be to survive a number of rounds: won when the last one is over", () => {
    let state = started({ type: "survive", turns: 2 });
    state = round(state);
    expect(state.round).toBe(2);
    expect(state.winner).toBeNull();
    state = round(state);
    expect(state.winner).toBe("ally");
  });

  it("can be to reach a cell: won as a hero stands on it, not an enemy", () => {
    const state = started({ type: "reach", cell: { x: 4, y: 4 } });
    unit(state, "ally-warrior").x = 4;
    unit(state, "ally-warrior").y = 3;
    const next = transition(state, { type: "move", unitId: "ally-warrior", cell: { x: 4, y: 4 } }, "ally").state;
    expect(next.winner).toBe("ally");
    const decoy = started({ type: "reach", cell: { x: 4, y: 4 } }, (s) => { unit(s, "enemy-warrior").x = 4; unit(s, "enemy-warrior").y = 4; });
    expect(wait(decoy).winner).toBeNull();
  });

  it("is lost when the battle goes beyond its limit of rounds, unless the objective is reached first", () => {
    const state = started({ type: "eliminate", limit: 1 });
    expect(round(state).winner).toBe("enemy");
    const won = started({ type: "boss", unitId: "enemy-mage", limit: 1 });
    kill(won, "enemy-mage");
    expect(round(won).winner).toBe("ally");
  });
});

describe("the objective an encounter gives", () => {
  const units = Object.fromEntries(Object.entries(emberDatabase as Record<string, any>).filter(([, r]) => r._type === "tactical-unit"));
  const skills = Object.fromEntries(Object.entries(emberDatabase as Record<string, any>).filter(([, r]) => r._type === "skill"));
  const battle = (goal: any, versus: { id: string; name: string }[] = []) =>
    createTacticalBattle({ data: { ...(emberDatabase as any).sanctuary.tactical, goal }, units, skills }, { id: "t", versus });

  it("names the chief by the id of the unit at its place among the enemies", () => {
    const state = battle({ type: "boss", enemy: 1, limit: 6 });
    const chief = state.units.filter((u) => u.team === "enemy")[1];

    expect(state.objective).toEqual({ type: "boss", unitId: chief.id, limit: 6 });
  });

  it("is none in a duel between players, which is won by defeating the other side", () => {
    expect(battle({ type: "survive", turns: 3 }, [{ id: "p2", name: "Two" }]).objective).toBeUndefined();
    expect(battle(undefined).objective).toBeUndefined();
  });
});

describe("the objective types a plugin adds", () => {
  afterEach(() => unregisterObjectiveType("holdout"));

  it("are judged by their own function, which sees the battle and the objective", () => {
    registerObjectiveType("holdout", { judge: (state, objective) => (unit(state, "ally-warrior").hp >= (objective.hp as number) ? undefined : "enemy") });
    expect(Object.keys(objectiveTypes())).toEqual(expect.arrayContaining(["eliminate", "boss", "survive", "reach", "holdout"]));
    const state = started({ type: "holdout", hp: 50 }, (s) => (unit(s, "ally-warrior").hp = 10));
    expect(wait(state).winner).toBe("enemy");
  });

  it("are ignored (the battle is to eliminate) while no plugin gives them", () => {
    const state = started({ type: "unknown" }, (s) => kill(s, "enemy-warrior", "enemy-archer", "enemy-mage"));
    expect(wait(state).winner).toBe("ally");
  });

  it("can also be judged by a hook of the rules, to end a battle any way a plugin likes", () => {
    const state = started();
    const next = transition(state, { type: "wait", unitId: "ally-warrior" }, "ally", [{ onJudge: () => "enemy" }]).state;
    expect(next.winner).toBe("enemy");
  });
});
