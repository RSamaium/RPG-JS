import { describe, expect, it } from "vitest";
import {
  turnBattleCommand,
  beginBattle,
  commandInfo,
  createRules,
  runCommand,
  type BattleState,
  type Command,
  type CustomCommand,
} from "../core";
import { battle, catalog, goblin, hero, stats } from "./fixtures";

const commands: Record<string, CustomCommand> = {
  steal: turnBattleCommand({
    label: "Voler",
    icon: "✋",
    scope: "enemy",
    melee: true,
    resolve({ target, act }) {
      const loot = act.lootOf(target!);
      if (!loot) return void act.text(target!, "Rien à voler");
      act.give(loot);
      act.text(target!, `${loot.name} volé !`);
    },
  }),
  scan: turnBattleCommand({ label: "Analyse", scope: "enemy", weight: 0.5, resolve: ({ target, act }) => void act.reveal(target!) }),
  drain: turnBattleCommand({
    label: "Drain",
    scope: "enemy",
    spCost: 5,
    available: ({ actor }) => actor.hp < actor.stats.maxHp,
    resolve({ actor, target, act }) {
      const hit = act.damage(target!, { power: 80, kind: "magical", element: "dark" });
      act.nextWave();
      act.heal(actor, hit.amount);
    },
  }),
};
const rules = createRules({ commands });
const withCommands = { ...catalog, commands: Object.fromEntries(Object.entries(commands).map(([id, c]) => [id, commandInfo(id, c)])) };

function start(over: Parameters<typeof battle>[0] = {}) {
  return beginBattle(
    battle({
      catalog: withCommands,
      allies: [hero({ commands: ["steal", "scan", "drain", "unknown"], owner: "p1" })],
      enemies: [goblin("g1", { stats: stats({ maxHp: 400, agi: 1 }) })],
      inventories: { p1: { potion: 2 } },
      ...over,
    }),
    rules,
  ).state;
}
const act = (s: BattleState, command: Command) => runCommand(s, { revision: s.revision, actor: s.actor!, command }, rules, "p1");

describe("custom commands", () => {
  it("keeps only the commands the catalog knows, and greys out unavailable ones", () => {
    const s = start();
    const me = s.combatants.find((c) => c.id === "hero")!;
    expect(me.commands).toEqual(["steal", "scan", "drain"]);
    expect(s.actor).toBe("hero");
    expect(s.blocked).toEqual(["drain"]); // full HP
    expect(act(s, { type: "custom", command: "drain", target: "g1" }).error).toBe("turnBattle.error.unavailable");
    expect(act(s, { type: "custom", command: "unknown", target: "g1" }).error).toBe("turnBattle.error.unknownCommand");
    expect(act(s, { type: "custom", command: "steal", target: "hero" }).error).toBe("turnBattle.error.noTarget");
  });

  it("steals once per enemy, and the item is gained whatever the outcome", () => {
    const s = start();
    const out = act(s, { type: "custom", command: "steal", target: "g1" });
    expect(out.error).toBeUndefined();
    const beat = out.beats.find((b) => b.t === "action")!;
    expect(beat).toMatchObject({ kind: "custom", ref: "steal", label: "Voler", melee: true, targets: ["g1"] });
    expect((beat as any).waves[0]).toEqual([{ target: "g1", amount: 0, kind: "text", text: "Potion volé !" }]);
    expect(out.state.gains).toEqual({ p1: { potion: 1 } });
    expect(out.state.combatants.find((c) => c.id === "g1")!.stolen).toBe(true);

    const again = act(out.state, { type: "custom", command: "steal", target: "g1" });
    expect((again.beats.find((b) => b.t === "action") as any).waves[0][0].text).toBe("Rien à voler");
    expect(again.state.gains).toEqual({ p1: { potion: 1 } });
  });

  it("scans an enemy and uses the normal formulas for damage", () => {
    const s = start();
    const scanned = act(s, { type: "custom", command: "scan", target: "g1" });
    expect((scanned.beats.find((b) => b.t === "action") as any).waves[0][0]).toMatchObject({ kind: "reveal", target: "g1" });
    expect(scanned.state.combatants.find((c) => c.id === "g1")!.revealed).toBe(true);

    // Hurt the hero so that Drain becomes available.
    const hurt = structuredClone(s);
    hurt.combatants.find((c) => c.id === "hero")!.hp = 100;
    hurt.blocked = undefined;
    const drained = act(hurt, { type: "custom", command: "drain", target: "g1" });
    const waves = (drained.beats.find((b) => b.t === "action") as any).waves;
    expect(waves[0][0]).toMatchObject({ target: "g1", kind: "damage" });
    expect(waves[1][0]).toMatchObject({ target: "hero", kind: "heal", amount: waves[0][0].amount });
    expect(drained.state.combatants.find((c) => c.id === "hero")!.sp).toBe(hurt.combatants[0].sp - 5);
  });

  it("lets monsters steal from the heroes' bag (lost for the player)", () => {
    const thief = goblin("g1", { commands: ["steal"], stats: stats({ agi: 99 }) });
    const r = createRules({ commands, ai: { default: ({ state, self }) => ({ type: "custom", command: "steal", target: state.combatants.find((c) => c.side !== self.side)!.id }) } });
    const s = beginBattle(
      battle({ catalog: withCommands, allies: [hero({ owner: "p1", stats: stats({ agi: 1 }) })], enemies: [thief], inventories: { p1: { potion: 2 } } }),
      r,
    ).state;
    // The fast goblin may act more than once before the hero: each theft takes one potion.
    expect(s.used.p1.potion).toBeGreaterThanOrEqual(1);
    expect(s.inventory.p1.potion + s.used.p1.potion).toBe(2);
    expect(s.gains).toEqual({});
  });

  it("never lets players steal from players (PvP)", () => {
    const s = start({
      enemies: [hero({ id: "rival", name: "Rival", owner: "p2", side: "enemy", stats: stats({ agi: 1 }) })],
      inventories: { p1: { potion: 2 }, p2: { potion: 3 } },
    });
    const out = act(s, { type: "custom", command: "steal", target: "rival" });
    expect(out.state.inventory.p2.potion).toBe(3);
    expect(out.state.gains).toEqual({});
  });
});

describe("summons and sub-menus", () => {
  const summonCmd = turnBattleCommand({
    label: "Invoquer",
    icon: "✨",
    scope: "self",
    options: [
      { id: "phoenix", label: "Phénix", spCost: 20 },
      { id: "golem", label: "Golem", spCost: 999 },
    ],
    available: ({ state, actor }) => !state.combatants.some((c) => c.summon?.by === actor.id && c.hp > 0),
    resolve: ({ option, act }) => void act.summon(option!),
  });
  const r = createRules({ commands: { summon: summonCmd } });
  const cat = {
    ...catalog,
    commands: { summon: commandInfo("summon", summonCmd) },
    summons: {
      phoenix: { name: "Phénix", battler: "phoenix", stats: stats({ maxHp: 200, agi: 60 }), turns: 2 },
      golem: { name: "Golem", battler: "golem", stats: stats() },
    },
  };
  const begin = () =>
    beginBattle(
      battle({
        catalog: cat,
        allies: [hero({ commands: ["summon"], owner: "p1", stats: stats({ agi: 80, maxSp: 60 }) })],
        enemies: [goblin("g1", { stats: stats({ maxHp: 5000, atk: 1, agi: 1 }) })],
      }),
      r,
    ).state;
  const run = (s: BattleState, command: Command) => runCommand(s, { revision: s.revision, actor: s.actor!, command }, r, "p1");

  it("greys out options the actor cannot use and requires a valid option", () => {
    const s = begin();
    expect(s.blocked).toEqual(["summon:golem"]); // not enough SP
    expect(run(s, { type: "custom", command: "summon" }).error).toBe("turnBattle.error.unknownCommand");
    expect(run(s, { type: "custom", command: "summon", option: "golem" }).error).toBe("turnBattle.error.noSp");
  });

  it("summons a creature on the actor's side, fights with the AI, then leaves", () => {
    const s = begin();
    const out = run(s, { type: "custom", command: "summon", option: "phoenix" });
    expect(out.error).toBeUndefined();
    const action = out.beats.find((b) => b.t === "action") as Extract<typeof out.beats[number], { t: "action" }>;
    expect(action).toMatchObject({ label: "Invoquer", option: "Phénix" });
    const hit = action.waves[0][0];
    expect(hit.kind).toBe("summon");
    expect(hit.unit).toMatchObject({ name: "Phénix", battler: "phoenix", side: "ally", owner: "p1", auto: true, summon: { by: "hero", turns: 2 } });
    expect(out.state.combatants.find((c) => c.id === s.actor)!.sp).toBe(s.combatants.find((c) => c.id === s.actor)!.sp - 20);

    // Play until the phoenix has used its two turns: it acts on its own, then leaves.
    let state = out.state;
    const beats = [...out.beats];
    for (let i = 0; i < 12 && state.combatants.some((c) => c.summon); i++) {
      const next = run(state, { type: "guard" });
      beats.push(...next.beats);
      state = next.state;
    }
    const phoenixId = hit.unit!.id;
    expect(beats.filter((b) => b.t === "action" && b.actor === phoenixId)).toHaveLength(2);
    expect(beats.some((b) => b.t === "leave" && b.actor === phoenixId)).toBe(true);
    expect(state.combatants.some((c) => c.id === phoenixId)).toBe(false);
  });

  it("allows one summon at a time per summoner, and summons do not decide the outcome", () => {
    const s = begin();
    const out = run(s, { type: "custom", command: "summon", option: "phoenix" });
    const unitId = (out.beats.find((b) => b.t === "action") as any).waves[0][0].unit.id;
    // While the phoenix is here, the command is greyed out on the hero's turns.
    if (out.state.actor === "hero" && out.state.combatants.some((c) => c.id === unitId)) expect(out.state.blocked).toContain("summon");

    // A sturdy summon that stays, a goblin that only hits the hero: the hero falls → defeat.
    const tough = { ...cat, summons: { ...cat.summons, phoenix: { ...cat.summons.phoenix, turns: 99, stats: stats({ maxHp: 99999, agi: 1 }) } } };
    const hunter = createRules({
      commands: { summon: summonCmd },
      ai: { default: () => ({ type: "attack", target: "hero" }) },
    });
    let state = beginBattle(
      battle({
        catalog: tough,
        allies: [hero({ commands: ["summon"], owner: "p1", hp: 50, stats: stats({ agi: 80, maxSp: 60 }) })],
        enemies: [goblin("g1", { stats: stats({ maxHp: 5000, atk: 400, agi: 70 }) })],
      }),
      hunter,
    ).state;
    for (let i = 0; i < 20 && !state.result; i++) {
      const command: Command = state.combatants.some((c) => c.summon)
        ? { type: "guard" }
        : { type: "custom", command: "summon", option: "phoenix" };
      state = runCommand(state, { revision: state.revision, actor: state.actor!, command }, hunter, "p1").state;
    }
    expect(state.result?.outcome).toBe("defeat");
    expect(state.combatants.find((c) => c.summon)!.hp).toBeGreaterThan(0);
  });
});
