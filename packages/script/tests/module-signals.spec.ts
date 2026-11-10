import { describe, expect, it, vi } from "vitest";
import { ScriptService, actionBattleHooks, scriptHooks, signalBinding } from "../src/server";
import { checkScript, describeGameApi, runTests, simulate } from "../src/testing";

const SIGNALS = { "tactical.defeat": { doc: "A unit falls.", payload: { unit: { type: "string" as const } } } };
const SOURCE = `on("tactical.defeat", { where: { unit: "knight" } }, (e) => { $player.gold += 5; });`;

describe("the signals of the modules in the tools", () => {
  it("refuses a signal of a module that is not given", () => {
    const check = checkScript(SOURCE);

    expect(check.ok).toBe(false);
    expect(check.diagnostics[0].message).toMatch(/unknown signal "tactical.defeat"/);
  });

  it("accepts a signal of a module given in `signals`", () => {
    const check = checkScript(SOURCE, undefined, { signals: SIGNALS });

    expect(check.ok).toBe(true);
    expect(check.listeners).toEqual([{ signal: "tactical.defeat", filter: { where: { unit: "knight" } } }]);
  });

  it("simulates the emission of a signal of a module", async () => {
    const result = await simulate({ source: SOURCE, signals: SIGNALS, emit: { signal: "tactical.defeat", payload: { unit: "knight" } }, world: { player: { gold: 10 } } });

    expect(result.ok).toBe(true);
    expect(result.state?.player.gold).toBe(15);
  });

  it("runs tests with the signals of the modules", async () => {
    const report = await runTests(SOURCE, [
      { name: "knight", emit: { signal: "tactical.defeat", payload: { unit: "knight" } }, world: { player: { gold: 0 } }, expect: { "player.gold": 5 } },
      { name: "pawn", emit: { signal: "tactical.defeat", payload: { unit: "pawn" } }, world: { player: { gold: 0 } }, expect: { "player.gold": 0 } },
    ], undefined, SIGNALS);

    expect(report.ok).toBe(true);
    expect(report.results.map((r) => r.pass)).toEqual([true, true]);
  });

  it("describes the signals of the modules next to the ones of the game", () => {
    expect(describeGameApi()).not.toContain("tactical.defeat");
    expect(describeGameApi(SIGNALS)).toContain("tactical.defeat");
  });

  it("keeps the signals of the game", () => {
    expect(describeGameApi(SIGNALS)).toContain("player.itemAdd");
  });
});

describe("the hooks of a module", () => {
  it("binds a hook of a scope of its own", async () => {
    const service = new ScriptService({
      bindings: [signalBinding<[{ id: string }]>({
        signal: "tactical.defeat", scope: "tactical", hook: "onDefeat",
        describe: SIGNALS["tactical.defeat"],
        emit: (unit) => ({ payload: { unit: unit.id }, context: { player: { id: "p1" } as any } }),
      })],
    });
    service.install({ id: "s", source: SOURCE });
    const emit = vi.spyOn(service, "emit").mockResolvedValue({ listeners: [] } as any);

    await (scriptHooks(service) as any).tactical.onDefeat({ id: "knight" });

    expect(emit).toHaveBeenCalledWith("tactical.defeat", { unit: "knight" }, { player: { id: "p1" } });
    expect(checkScript(SOURCE, undefined, { signals: service.description.signals }).ok).toBe(true);
  });
});

describe("the signals of the battles and of the player", () => {
  const player = { id: "p1" } as any;

  async function emitted(service: ScriptService, scope: string, hook: string, ...args: unknown[]) {
    const emit = vi.spyOn(service, "emit").mockResolvedValue({ listeners: [] } as any);
    await (scriptHooks(service) as any)[scope][hook](...args);
    return emit.mock.calls;
  }

  function listening(signal: string) {
    const service = new ScriptService();
    service.install({ id: "s", source: `on("${signal}", () => {});` });
    return service;
  }

  it("emits battle.start with the tags of the troop and of the enemies", async () => {
    const calls = await emitted(listening("battle.start"), "battle", "onStart", { player, troop: ["pack"], enemies: ["wolf", "fire"] });

    expect(calls).toEqual([["battle.start", { troop: ["pack"], enemies: ["wolf", "fire"] }, { player, map: undefined }]]);
  });

  it("emits battle.command with the tags of the skill, the hero and the target", async () => {
    const calls = await emitted(listening("battle.command"), "battle", "onCommand", { player, skill: ["fire"], hero: ["mage"], target: ["wolf"] });

    expect(calls[0][1]).toEqual({ skill: ["fire"], hero: ["mage"], target: ["wolf"] });
  });

  it("emits battle.end with the result", async () => {
    const calls = await emitted(listening("battle.end"), "battle", "onEnd", { player, result: "victory", troop: ["pack"], enemies: [] });

    expect(calls[0][1]).toEqual({ result: "victory", troop: ["pack"], enemies: [] });
  });

  it("emits player.skillChange, player.connect and player.disconnect", async () => {
    expect((await emitted(listening("player.skillChange"), "player", "onSkillChange", player, { action: "learn", skillId: "fire", skill: "fire" }))[0][1]).toEqual({ action: "learn", skill: "fire" });
    expect((await emitted(listening("player.connect"), "player", "onConnected", player))[0][0]).toBe("player.connect");
    expect((await emitted(listening("player.disconnect"), "player", "onDisconnected", player))[0][0]).toBe("player.disconnect");
  });

  it("lists the new signals in the catalog", () => {
    const service = new ScriptService();
    for (const signal of ["battle.start", "battle.command", "battle.end", "combat.hit", "player.skillChange", "player.connect", "player.disconnect"]) {
      expect(service.description.signals[signal], signal).toBeDefined();
    }
  });
});

describe("actionBattleHooks", () => {
  const human = (id: string, name: string) => ({ id, name, isEvent: () => false, getCurrentMap: () => ({ id: "town" }) }) as any;
  const monster = (id: string, name: string) => ({ id, name, isEvent: () => true }) as any;

  function setup() {
    const service = new ScriptService();
    service.install({ id: "s", source: `on("combat.hit", () => {});` });
    const emit = vi.spyOn(service, "emit").mockResolvedValue({ listeners: [] } as any);
    return { hooks: actionBattleHooks(service), emit };
  }

  it("emits combat.hit for the attacker when it is a player", () => {
    const { hooks, emit } = setup();
    const hero = human("p1", "Hero"), wolf = monster("e1", "Wolf");

    hooks.afterHit({ damage: 12, defeated: true, attacker: hero, target: wolf });

    expect(emit).toHaveBeenCalledWith(
      "combat.hit",
      { damage: 12, defeated: true, attacker: { id: "p1", name: "Hero", kind: "player" }, target: { id: "e1", name: "Wolf", kind: "event" } },
      { player: hero, map: { id: "town" } },
    );
  });

  it("emits it for the target when the attacker is an event", () => {
    const { hooks, emit } = setup();
    const hero = human("p1", "Hero");

    hooks.afterHit({ damage: 3, defeated: false, attacker: monster("e1", "Wolf"), target: hero });

    expect(emit.mock.calls[0][2]).toMatchObject({ player: hero });
  });

  it("emits nothing for a hit between two events", () => {
    const { hooks, emit } = setup();

    hooks.afterHit({ damage: 3, defeated: false, attacker: monster("e1", "Wolf"), target: monster("e2", "Bat") });

    expect(emit).not.toHaveBeenCalled();
  });

  it("emits nothing while no script listens", () => {
    const service = new ScriptService();
    const emit = vi.spyOn(service, "emit");

    actionBattleHooks(service).afterHit({ damage: 1, defeated: false, attacker: human("p1", "Hero"), target: monster("e1", "Wolf") });

    expect(emit).not.toHaveBeenCalled();
  });
});
