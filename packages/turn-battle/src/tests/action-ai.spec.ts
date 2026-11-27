import { describe, expect, it } from "vitest";
import { actionCommand, beginBattle, commandInfo, createRules, defaultAi, createRng, type Rng } from "../core";
import { battle, catalog, goblin, hero, stats } from "./fixtures";

/** A rng that answers the rolls in order: the chances (true/false) and the picks (a number from 0 up to 1). */
const scripted = (chances: boolean[], numbers: number[] = []): Rng => ({
  next: () => numbers.shift() ?? 0,
  int: (min) => min,
  chance: () => chances.shift() ?? false,
  pick: (list) => list[0]!,
  seed: () => 0,
});

function enemyTurn(self: Parameters<typeof goblin>[1], actions: string[]) {
  const commands = Object.fromEntries(actions.map((id) => [id, actionCommand({ name: id, effects: [{ type: "damage" }] })]));
  const rules = createRules({ commands });
  const state = beginBattle(
    battle({
      allies: [hero({ owner: "p1" })],
      enemies: [goblin("g1", { stats: stats({ agi: 1 }), commands: actions, ...self })],
      catalog: { ...catalog, commands: Object.fromEntries(Object.entries(commands).map(([id, c]) => [id, commandInfo(id, c)])) },
    }),
    rules,
  ).state;
  const me = state.combatants.find((c) => c.id === "g1")!;
  return { state, me };
}

describe("the actions an enemy uses", () => {
  it("are used now and then as before, with the same chance whatever their number", () => {
    const { state, me } = enemyTurn({}, ["one", "two"]);

    // The target is picked (a no), then the chance of an action: yes
    const command = defaultAi({ state, self: me, rng: scripted([false, true]) });

    expect(command).toMatchObject({ type: "custom", command: "one" });
  });

  it("are used more often with a bigger weight, and chosen by weight", () => {
    const { state, me } = enemyTurn({ commandRules: { heavy: { weight: 3 }, light: { weight: 1 } } }, ["heavy", "light"]);

    // average weight 2 → 60 %: the roll is 'chance(0.6)', the pick at 0.9 of the total weight (4) is the last one
    const rolls: number[] = [];
    const rng: Rng = { ...scripted([false], [0.9]), chance: (p) => (rolls.push(p), rolls.length === 2) };
    const command = defaultAi({ state, self: me, rng });

    expect(rolls.at(-1)).toBeCloseTo(0.6);
    expect(command).toMatchObject({ type: "custom", command: "light" });
    const first = defaultAi({ state, self: me, rng: { ...scripted([false, true], [0.1]) } });
    expect(first).toMatchObject({ type: "custom", command: "heavy" });
  });

  it("are used only while its life is under the share an action asks", () => {
    const { state, me } = enemyTurn({ commandRules: { rage: { hpBelow: 50 } } }, ["rage"]);

    const healthy = defaultAi({ state, self: me, rng: scripted([false, true]) });
    expect(healthy.type).not.toBe("custom");

    const hurt = { ...me, hp: Math.floor(me.stats.maxHp * 0.3) };
    const angry = defaultAi({ state, self: hurt, rng: scripted([false, true]) });
    expect(angry).toMatchObject({ type: "custom", command: "rage" });
  });

  it("follow the rule the action itself carries when the enemy has none of its own", () => {
    const commands = { rage: actionCommand({ name: "rage", ai: { hpBelow: 50 }, effects: [{ type: "damage" }] }) };
    const rules = createRules({ commands });
    const state = beginBattle(
      battle({
        allies: [hero({ owner: "p1" })],
        enemies: [goblin("g1", { stats: stats({ agi: 1 }), commands: ["rage"] })],
        catalog: { ...catalog, commands: { rage: commandInfo("rage", commands.rage) } },
      }),
      rules,
    ).state;
    const me = state.combatants.find((c) => c.id === "g1")!;

    expect(defaultAi({ state, self: me, rng: scripted([false, true]) }).type).not.toBe("custom");
    expect(defaultAi({ state, self: { ...me, hp: Math.floor(me.stats.maxHp * 0.3) }, rng: scripted([false, true]) })).toMatchObject({ type: "custom", command: "rage" });
  });

  it("never use an action with a weight of 0", () => {
    const { state, me } = enemyTurn({ commandRules: { off: { weight: 0 } } }, ["off"]);

    expect(defaultAi({ state, self: me, rng: scripted([false, true]) }).type).not.toBe("custom");
  });

  it("know the rng of the battle: the default ai runs with a seed", () => {
    const { state, me } = enemyTurn({}, ["one"]);

    expect(() => defaultAi({ state, self: me, rng: createRng(7) })).not.toThrow();
  });
});
