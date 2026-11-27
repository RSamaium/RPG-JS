import { describe, expect, it } from "vitest";
import {
  actionCommand,
  turnBattleAction,
  beginBattle,
  commandInfo,
  createRules,
  runCommand,
  type BattleActionRecord,
  type BattleState,
  type Command,
  type CustomCommand,
  type Formulas,
  defaultAi,
  createRng,
} from "../core";
import { skillCommandFromDb } from "../server/database";
import { battle, catalog, goblin, hero, stats } from "./fixtures";

/** A battle where the hero uses the actions of the database, drawn as data. */
function rig(actions: Record<string, BattleActionRecord | CustomCommand>, over: Parameters<typeof battle>[0] = {}, formulas: Partial<Formulas> = {}) {
  const commands = Object.fromEntries(
    Object.entries(actions).map(([id, record]) => [id, "resolve" in record ? record : actionCommand(record as BattleActionRecord)]),
  );
  const rules = createRules({ commands, formulas });
  const cat = {
    ...catalog,
    commands: Object.fromEntries(Object.entries(commands).map(([id, command]) => [id, commandInfo(id, command)])),
    summons: { ifrit: { name: "Ifrit", battler: "ifrit", stats: stats({ maxHp: 200, agi: 60 }), turns: 2 } },
    ...(over.catalog ?? {}),
  };
  const state = beginBattle(
    battle({
      allies: [hero({ commands: Object.keys(actions), owner: "p1", stats: stats({ agi: 90, maxSp: 60 }) })],
      enemies: [goblin("g1", { stats: stats({ maxHp: 5000, atk: 1, agi: 1 }) })],
      inventories: { p1: {} },
      ...over,
      catalog: cat,
    }),
    rules,
  ).state;
  const run = (s: BattleState, command: Command) => runCommand(s, { revision: s.revision, actor: s.actor!, command }, rules, "p1");
  const waves = (out: ReturnType<typeof run>) => (out.beats.find((b) => b.t === "action") as { waves: Array<Array<Record<string, any>>> }).waves;
  return { state, run, waves, rules };
}

describe("an action of the database, as data", () => {
  it("stops hitting a target that fell: no blows on the fallen, no extra stagger finish", () => {
    const { state, run, waves } = rig(
      { flurry: { name: "Rafale", effects: [{ type: "damage", power: 100, hits: 3 }] } },
      { enemies: [goblin("g1", { stats: stats({ maxHp: 1, atk: 1, agi: 1 }) }), goblin("g2", { stats: stats({ maxHp: 5000, atk: 1, agi: 1 }) })] },
    );
    const out = run(state, { type: "custom", command: "flurry", target: "g1" });
    expect(waves(out).flat().filter((hit) => hit.target === "g1" && hit.kind === "damage")).toHaveLength(1);
    expect(out.state.tally.staggerFinishes).toBeLessThanOrEqual(1);
  });

  it("scales its damage with the parameters of its user, as a skill does (`coefficient`)", () => {
    const seen: unknown[] = [];
    const damage: Formulas["damage"] = ({ skill }) => (seen.push(skill?.coefficient), { amount: 10, crit: false });
    const { state, run } = rig({ bolt: { name: "Foudre", effects: [{ type: "damage", power: 50, kind: "magical", coefficient: { int: 1 } }] } }, {}, { damage });
    run(state, { type: "custom", command: "bolt", target: "g1" });
    expect(seen).toEqual([{ int: 1 }]);
  });

  it("a skill of the database played as a command keeps its coefficient, and stays a skill for the troop's `forbid`", () => {
    const fire = skillCommandFromDb("fire", { name: "Fire", power: 50, kind: "magical", coefficient: { int: 1 }, spCost: 0, turnBattle: { cooldown: 2, pinned: true } })!;
    expect(commandInfo("fire", fire).skill).toBe(true);
    const seen: unknown[] = [];
    const damage: Formulas["damage"] = ({ skill }) => (seen.push(skill?.coefficient), { amount: 10, crit: false });
    const { state, run } = rig({ fire }, {}, { damage });
    run(state, { type: "custom", command: "fire", target: "g1" });
    expect(seen).toEqual([{ int: 1 }]);
    // No magic in this battle: the skill is refused, as the others; an action would not be.
    const noMagic = { ...state, forbid: ["skill" as const] };
    expect(run(noMagic, { type: "custom", command: "fire", target: "g1" }).error).toBe("turnBattle.error.forbidden");
    expect(run({ ...state, forbid: ["action" as const] }, { type: "custom", command: "fire", target: "g1" }).error).toBeUndefined();
  });

  it("a skill charges the limit gauge fully, whatever weapon its user holds (only the attack is split over the blows of the weapon)", () => {
    const { state, run } = rig(
      { bolt: { name: "Foudre", effects: [{ type: "damage", power: 50 }] } },
      { allies: [hero({ commands: ["bolt"], owner: "p1", attack: { hits: 3 }, stats: stats({ agi: 90, maxSp: 60 }) })] },
    );
    const before = state.combatants.find((c) => c.id === "hero")!.limit!.value;
    const out = run(state, { type: "custom", command: "bolt", target: "g1" });
    expect(out.state.combatants.find((c) => c.id === "hero")!.limit!.value - before).toBe(6);
  });

  it("an enemy uses a command with a sub-menu: it picks one of its options", () => {
    const { state, rules } = rig({ call: { name: "Appel", effects: [{ type: "summon", creatures: [{ id: "ifrit" }, { id: "imp" }] }] } });
    const s = structuredClone(state);
    const enemy = s.combatants.find((c) => c.id === "g1")!;
    enemy.commands = ["call"];
    enemy.commandRules = { call: { weight: 100 } };
    const picked = defaultAi({ state: s, self: enemy, rng: createRng(1), rules } as never);
    expect(picked).toMatchObject({ type: "custom", command: "call" });
    expect(["ifrit", "imp"]).toContain((picked as { option?: string }).option);
  });

  it("is a record of the battle: its type is `command`", () => {
    expect(turnBattleAction({ name: "Voler", effects: [] })).toEqual({ _type: "command", name: "Voler", effects: [] });
  });

  it("shows in the menu with what the record says: label, icon, scope, melee, cost", () => {
    const { state } = rig({ strike: { name: "Coup puissant", icon: "⚔", scope: "enemy", melee: true, spCost: 8, effects: [{ type: "damage", power: 180 }] } });

    expect(state.catalog.commands!["strike"]).toMatchObject({ label: "Coup puissant", icon: "⚔", scope: "enemy", melee: true, spCost: 8 });
  });

  it("hits with the formulas of the battle, as many times as it says, and costs its SP", () => {
    const { state, run, waves } = rig({ strike: { name: "Frappe", spCost: 8, effects: [{ type: "damage", power: 100, hits: 2 }] } });

    const out = run(state, { type: "custom", command: "strike", target: "g1" });

    expect(out.error).toBeUndefined();
    expect(waves(out)).toHaveLength(2);
    expect(waves(out).map((wave) => wave[0]!.kind)).toEqual(["damage", "damage"]);
    expect(out.state.combatants.find((c) => c.id === "hero")!.sp).toBe(state.combatants.find((c) => c.id === "hero")!.sp - 8);
  });

  it("heals itself with a share of the damage it did: the vampiric blow", () => {
    const { state, run, waves } = rig({
      vampire: { name: "Vampirique", scope: "enemy", effects: [{ type: "damage", power: 140, element: "dark" }, { type: "heal", target: "self", rate: 50, of: "damage" }] },
    });
    const hurt = structuredClone(state);
    hurt.combatants.find((c) => c.id === "hero")!.hp = 100;

    const out = run(hurt, { type: "custom", command: "vampire", target: "g1" });

    const [blow, heal] = [waves(out)[0]![0]!, waves(out)[1]![0]!];
    expect(blow).toMatchObject({ target: "g1", kind: "damage" });
    expect(heal).toMatchObject({ target: "hero", kind: "heal", amount: Math.round(blow["amount"] * 0.5) });
  });

  it("heals a share of the maximum life of its target, or a fixed amount", () => {
    const { state, run, waves } = rig({
      rate: { name: "Soin", scope: "ally", effects: [{ type: "heal", rate: 25 }] },
      flat: { name: "Soin fixe", scope: "self", effects: [{ type: "heal", amount: 40 }] },
    });
    const hurt = structuredClone(state);
    hurt.combatants.find((c) => c.id === "hero")!.hp = 50;

    expect(waves(run(hurt, { type: "custom", command: "rate", target: "hero" }))[0]![0]).toMatchObject({ kind: "heal", amount: 75 });
    expect(waves(run(hurt, { type: "custom", command: "flat", target: "hero" }))[0]![0]).toMatchObject({ kind: "heal", amount: 40 });
  });

  it("gives or takes SP", () => {
    const { state, run } = rig({ drink: { name: "Souffle", scope: "self", effects: [{ type: "sp", target: "self", amount: 10 }] } });
    const tired = structuredClone(state);
    tired.combatants.find((c) => c.id === "hero")!.sp = 5;

    const out = run(tired, { type: "custom", command: "drink", target: "hero" });

    expect(out.state.combatants.find((c) => c.id === "hero")!.sp).toBe(15);
  });

  it("scans an enemy and says a line", () => {
    const { state, run, waves } = rig({ look: { name: "Analyser", effects: [{ type: "reveal" }, { type: "text", text: "Il a l'air faible" }] } });

    const out = run(state, { type: "custom", command: "look", target: "g1" });

    expect(waves(out)[0]!.map((hit) => hit["kind"])).toEqual(["reveal", "text"]);
    expect(waves(out)[0]![1]).toMatchObject({ text: "Il a l'air faible" });
    expect(out.state.combatants.find((c) => c.id === "g1")!.revealed).toBe(true);
  });

  it("steals, or fails with its own line", () => {
    const { state, run, waves } = rig({
      sure: { name: "Voler", effects: [{ type: "steal", chance: 100, successText: "{item} volé !" }] },
      never: { name: "Rater", effects: [{ type: "steal", chance: 0, failText: "Raté !" }] },
    });

    expect(waves(run(state, { type: "custom", command: "sure", target: "g1" }))[0]![0]).toMatchObject({ kind: "text", text: "{item} volé !", textParams: { item: "Potion" } });
    expect(waves(run(state, { type: "custom", command: "never", target: "g1" }))[0]![0]).toMatchObject({ kind: "text", text: "Raté !" });
  });

  it("queues the triggers of a skill in order: cast once, then impact and defeat for each target, only the phases it has", () => {
    const { state, run } = rig(
      { zap: { name: "Zap", triggers: ["cast", "impact", "defeat"], effects: [{ type: "damage", power: 100 }] }, calm: { name: "Calme", triggers: ["defeat"], effects: [{ type: "text", text: "..." }] } },
      { allies: [hero({ commands: ["zap", "calm"], owner: "p1", stats: stats({ agi: 90, atk: 9999 }) })], enemies: [goblin("g1", { stats: stats({ maxHp: 5, atk: 1, agi: 1 }) })] },
    );

    const out = run(state, { type: "custom", command: "zap", target: "g1" });

    expect(out.error).toBeUndefined();
    expect(out.state.calls).toEqual([
      { skill: "zap", phase: "cast", actor: "hero" },
      { skill: "zap", phase: "impact", actor: "hero", target: "g1" },
      { skill: "zap", phase: "defeat", actor: "hero", target: "g1" },
    ]);
  });

  it("queues nothing for a skill without triggers, and no defeat for a target that stands", () => {
    const { state, run } = rig({ plain: { name: "Simple", effects: [{ type: "damage", power: 100 }] }, zap: { name: "Zap", triggers: ["impact", "defeat"], effects: [{ type: "damage", power: 1 }] } });

    expect(run(state, { type: "custom", command: "plain", target: "g1" }).state.calls ?? []).toEqual([]);
    expect(run(state, { type: "custom", command: "zap", target: "g1" }).state.calls).toEqual([{ skill: "zap", phase: "impact", actor: "hero", target: "g1" }]);
  });

  it("gives the event of the map a target stands for", () => {
    const { state, run } = rig(
      { zap: { name: "Zap", triggers: ["impact"], effects: [{ type: "damage", power: 1 }] } },
      { enemies: [goblin("g1", { mapId: "ev-goblin", stats: stats({ maxHp: 5000, atk: 1, agi: 1 }) })] },
    );

    expect(run(state, { type: "custom", command: "zap", target: "g1" }).state.calls).toEqual([{ skill: "zap", phase: "impact", actor: "hero", target: "g1", targetMap: "ev-goblin" }]);
  });

  it("says that there is nothing to steal when the enemy has nothing", () => {
    const { state, run, waves } = rig(
      { steal: { name: "Voler", effects: [{ type: "steal" }] } },
      { enemies: [goblin("g1", { rewards: { exp: 1, gold: 1 }, stats: stats({ maxHp: 5000, atk: 1, agi: 1 }) })] },
    );

    expect(waves(run(state, { type: "custom", command: "steal", target: "g1" }))[0]![0]).toMatchObject({ kind: "text", text: "turnBattle.steal.empty" });
  });

  it("does one thing or another by chance", () => {
    const { state, run, waves } = rig({
      lucky: { name: "Pari", effects: [{ type: "chance", chance: 100, then: [{ type: "text", text: "gagné" }], otherwise: [{ type: "text", text: "perdu" }] }] },
      unlucky: { name: "Pari raté", effects: [{ type: "chance", chance: 0, then: [{ type: "text", text: "gagné" }], otherwise: [{ type: "text", text: "perdu" }] }] },
    });

    expect(waves(run(state, { type: "custom", command: "lucky", target: "g1" }))[0]![0]).toMatchObject({ text: "gagné" });
    expect(waves(run(state, { type: "custom", command: "unlucky", target: "g1" }))[0]![0]).toMatchObject({ text: "perdu" });
  });
});

describe("a summoning action", () => {
  const summon: BattleActionRecord = {
    name: "Invoquer",
    scope: "self",
    effects: [{ type: "summon", creatures: [{ id: "ifrit", label: "Ifrit", turns: 2 }] }],
  };

  it("with one creature calls it at once, without a sub-menu", () => {
    const { state, run, waves } = rig({ call: summon });

    expect(state.catalog.commands!["call"]!.options).toBeUndefined();
    const out = run(state, { type: "custom", command: "call", target: "hero" });

    expect(out.error).toBeUndefined();
    expect(waves(out)[0]![0]).toMatchObject({ kind: "summon", unit: { name: "Ifrit", side: "ally", summon: { by: "hero", turns: 2 } } });
  });

  it("with several creatures asks which one in a sub-menu, and calls the picked one", () => {
    const { state, run, waves } = rig(
      { call: { name: "Invoquer", scope: "self", effects: [{ type: "summon", creatures: [{ id: "ifrit", label: "Ifrit" }, { id: "shiva", label: "Shiva", controlled: true }] }] } },
      {
        catalog: {
          ...catalog,
          summons: {
            ifrit: { name: "Ifrit", battler: "ifrit", stats: stats({ agi: 60 }) },
            shiva: { name: "Shiva", battler: "shiva", stats: stats({ agi: 60 }) },
          },
        } as never,
      },
    );

    expect(state.catalog.commands!["call"]!.options!.map((option) => option.label)).toEqual(["Ifrit", "Shiva"]);
    const out = run(state, { type: "custom", command: "call", option: "shiva", target: "hero" });

    expect(waves(out)[0]![0]).toMatchObject({ kind: "summon", unit: { name: "Shiva" } });
    // Shiva is commanded by the player: no AI plays its turns
    expect(waves(out)[0]![0]!["unit"].auto).toBeFalsy();
  });

  it("is greyed out while the creature it called is still there: one at a time", () => {
    const { state, run } = rig({ call: summon });

    const out = run(state, { type: "custom", command: "call", target: "hero" });
    const again = run(out.state, { type: "custom", command: "call", target: "hero" });

    expect(again.error).toBe("turnBattle.error.unavailable");
  });
});

describe("the troop forbidding the actions", () => {
  it("refuses them to the heroes with the error of the other forbidden commands", () => {
    const { state, run } = rig({ strike: { name: "Frappe", effects: [{ type: "damage" }] } }, { forbid: ["action"] });

    expect(run(state, { type: "custom", command: "strike", target: "g1" }).error).toBe("turnBattle.error.forbidden");
    expect(run(state, { type: "attack", target: "g1" }).error).toBeUndefined();
  });
});

describe("an action that has to recharge", () => {
  /** The hero guards (one turn, no action) until it has played `turns` turns. */
  const waitTurns = (run: ReturnType<typeof rig>["run"], state: BattleState, turns: number) => {
    let current = state;
    for (let i = 0; i < turns; i++) current = run(current, { type: "guard" }).state;
    return current;
  };
  const useAction = (run: ReturnType<typeof rig>["run"], state: BattleState) => run(state, { type: "custom", command: "burst", target: "g1" });

  it("is greyed out for as many of the turns of its user as its recharge, then usable again", () => {
    const { state, run } = rig({ burst: { name: "Rafale", cooldown: 2, effects: [{ type: "damage" }] } });

    const used = useAction(run, state);
    expect(used.error).toBeUndefined();
    // The next turns of the hero: the action is blocked for two of them
    expect(used.state.actor).toBe("hero");
    expect(used.state.blocked).toContain("burst");
    expect(useAction(run, used.state).error).toBe("turnBattle.error.unavailable");

    const second = run(used.state, { type: "guard" }).state;
    expect(second.blocked).toContain("burst");

    const third = run(second, { type: "guard" }).state;
    expect(third.blocked ?? []).not.toContain("burst");
    expect(useAction(run, third).error).toBeUndefined();
  });

  it("has no wait when it says none", () => {
    const { state, run } = rig({ burst: { name: "Rafale", effects: [{ type: "damage" }] } });

    const used = useAction(run, state);

    expect(used.state.blocked ?? []).not.toContain("burst");
    expect(useAction(run, used.state).error).toBeUndefined();
  });

  it("can be used once in the battle", () => {
    const { state, run } = rig({ burst: { name: "Ultime", once: true, effects: [{ type: "damage" }] } });

    const used = useAction(run, state);
    const later = waitTurns(run, used.state, 12);

    expect(later.blocked).toContain("burst");
    expect(useAction(run, later).error).toBe("turnBattle.error.unavailable");
  });

  it("recharges for each fighter by itself: its own turns count", () => {
    const { state, run } = rig(
      { burst: { name: "Rafale", cooldown: 1, effects: [{ type: "damage" }] } },
      { allies: [hero({ commands: ["burst"], owner: "p1", stats: stats({ agi: 60 }) }), hero({ id: "mage", name: "Fina", commands: ["burst"], owner: "p1", stats: stats({ agi: 95 }) })] },
    );

    // The quicker hero uses it first
    expect(state.actor).toBe("mage");
    const used = useAction(run, state);
    // The other hero plays next: its action is not blocked by the first one's recharge
    expect(used.state.actor).toBe("hero");
    expect(used.state.blocked ?? []).not.toContain("burst");
  });
});

describe("the menu data of an action", () => {
  it("says where it goes: in the menu, or among the skills, and how an enemy AI uses it by default", () => {
    const { state } = rig({
      pinned: { name: "Voler", effects: [{ type: "steal" }] },
      skill: { name: "Frappe", inSkills: true, ai: { weight: 2, hpBelow: 50 }, effects: [{ type: "damage" }] },
    });

    expect(state.catalog.commands!["pinned"]!.inSkills).toBeUndefined();
    expect(state.catalog.commands!["skill"]).toMatchObject({ inSkills: true, ai: { weight: 2, hpBelow: 50 } });
  });
});
