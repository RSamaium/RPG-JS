import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createModule, defineModule } from "@rpgjs/common";
import type { RpgClient } from "@rpgjs/client";
import type { RpgActionInput, RpgPlayer, RpgServer } from "@rpgjs/server";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { ScriptService, provideScripts, signalBinding, type ScriptSource } from "../src/server";

const Potion = { id: "Potion", name: "Potion", description: "Restores HP", price: 10, hpValue: 50, consumable: true, _type: "item" as const };

let fixture: TestingFixture | undefined;

// RPGJS keeps the hooks of the modules of an earlier `testing()` alive in the next one, so the scripts of an earlier test still
// run for the player of this one: every test writes to variables of its own.
let n = 0;
beforeEach(() => { n++; });

const serverModule = defineModule<RpgServer>({
  maps: [{ id: "test-map", file: "" }],
  database: { Potion },
  player: {
    async onConnected(p) {
      await p.changeMap("test-map", { x: 100, y: 100 });
    },
  },
});

/** A game with a real server, a real map and a connected player, running the given scripts. */
async function start(scripts: ScriptSource[] | ScriptService, clientModule: RpgClient = {}) {
  const provider = scripts instanceof ScriptService ? provideScripts(scripts) : provideScripts({ scripts });
  fixture = await testing(createModule("ScriptHooksTest", [{ server: serverModule, client: defineModule<RpgClient>(clientModule) }]), {}, { providers: [provider] });
  const client = await fixture.createClient();
  const player: RpgPlayer = await client.waitForMapChange("test-map");
  return { player, map: player.getCurrentMap()! };
}

const settled = (check: () => void) => vi.waitFor(check, { timeout: 2000, interval: 10 });

afterEach(async () => {
  await fixture?.clear();
  fixture = undefined;
  vi.restoreAllMocks();
});

describe("scripts listening to the hooks of a real RPGJS game", () => {
  it("runs when a player enters a map, with the map in the payload", async () => {
    const { player } = await start([{ id: "welcome", source: `on("player.joinMap", { where: { map: "test-map" } }, (e) => { $player.setVariable("entered_${n}", ($player.getVariable("entered_${n}") ?? 0) + 1); $player.showNotification("welcome to " + e.map); });` }]);

    await settled(() => expect(player.getVariable(`entered_${n}`)).toBe(1));
  });

  it("runs when a player gains levels, and only for the filter it declared", async () => {
    const { player } = await start([{ id: "levels", source: `on("player.levelUp", { where: { gained: { gte: 2 } } }, (e) => { $player.gold += 10 * e.gained; });` }]);
    player.gold = 0;

    player.level = player.level + 1;
    player.level = player.level + 3;

    await settled(() => expect(player.gold).toBe(30));
  });

  it("tells the levels gained and the level after the gain, which $player.level is too (RPGJS sends the hook before it sets the level)", async () => {
    const { player } = await start([{ id: "seen", source: `on("player.levelUp", (e) => { $player.setVariable("now_${n}", [$player.level, e.level, e.gained]); });` }]);
    const before = player.level;

    player.level = before + 3;

    await settled(() => expect(player.getVariable(`now_${n}`)).toEqual([before + 3, before + 3, 3]));
  });

  it("runs when a player has no health left", async () => {
    const { player } = await start([{ id: "deaths", source: `on("player.dead", () => { $player.setVariable("deaths_${n}", ($player.getVariable("deaths_${n}") ?? 0) + 1); });` }]);

    player.hp = 0;

    await settled(() => expect(player.getVariable(`deaths_${n}`)).toBe(1));
  });

  it("runs when a player acts on an event, for that event, and only the one whose name matches", async () => {
    const { player, map } = await start([{
      id: "chest",
      source: `on("event.action", { where: { "event.name": "chest" } }, () => { $player.setVariable($event.id + "_A", true); $player.addItem("Potion", 1); });`,
    }]);
    const chestId = (await map.createDynamicEvent({ id: "chest-1", x: 150, y: 100, event: { name: "chest" } as any }))!;
    const doorId = (await map.createDynamicEvent({ id: "door-1", x: 200, y: 100, event: { name: "door" } as any }))!;

    await map.getEvent(doorId)!.execMethod("onAction", [player, { action: "action" }]);
    expect(player.hasItem("Potion")).toBe(false);
    await map.getEvent(chestId)!.execMethod("onAction", [player, { action: "action" }]);

    expect(player.getVariable(`${chestId}_A`)).toBe(true);
    expect(player.getItem("Potion").quantity()).toBe(1);
  });

  it("runs when a player touches an event", async () => {
    const { player, map } = await start([{ id: "touch", source: `on("event.touch", () => { $player.setVariable("touched_${n}", ($player.getVariable("touched_${n}") ?? 0) + 1); });` }]);
    const id = (await map.createDynamicEvent({ id: "trap-1", x: 150, y: 100, event: {} }))!;

    await map.getEvent(id)!.execMethod("onPlayerTouch", [player]);

    expect(player.getVariable(`touched_${n}`)).toBe(1);
  });

  it("keeps the conditions on the player: the listener waits for its switch", async () => {
    const { player } = await start([{ id: "tournament", source: `on("player.levelUp", { when: [{ variable: "tournament", eq: true }] }, () => { $player.setVariable("bonus_${n}", ($player.getVariable("bonus_${n}") ?? 0) + 1); });` }]);

    player.level = player.level + 1;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(player.getVariable(`bonus_${n}`)).toBeUndefined();

    player.setVariable("tournament", true);
    player.level = player.level + 1;

    await settled(() => expect(player.getVariable(`bonus_${n}`)).toBe(1));
  });

  it("shares a property between the players of the map, which stays on the map", async () => {
    const { player, map } = await start([{
      id: "stock",
      source: `shared({ visits: { initial: 0, client: true } }); on("player.levelUp", () => { $shared.visits += 1; });`,
    }]);

    player.level = player.level + 1;
    player.level = player.level + 1;

    await settled(() => expect((map as any).script_visits()).toBe(2));
  });
});

describe("a script that does harm, or that is wrong", () => {
  const hostile: [string, string][] = [
    ["a loop that never ends", `on("player.levelUp", () => { while (true) { $player.gold += 1; } });`],
    ["a function that calls itself for ever", `function again(n) { return again(n + 1); } on("player.levelUp", () => { again(0); });`],
    ["a list that grows without end", `on("player.levelUp", () => { const l = []; while (true) { l.push(1); } });`],
    ["a script that fails by itself", `on("player.levelUp", () => { $shared_missing.x = 1; });`],
  ];

  it.each(hostile)("is stopped, reported, and the game and the other scripts go on: %s", async (_name, source) => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { player } = await start([
      { id: "hostile", source },
      { id: "honest", source: `on("player.levelUp", () => { $player.setVariable("honest_${n}", ($player.getVariable("honest_${n}") ?? 0) + 1); });` },
    ]);

    player.level = player.level + 1;

    await settled(() => expect(player.getVariable(`honest_${n}`)).toBe(1));
    expect(player.level).toBeGreaterThan(1);
    expect(error).toHaveBeenCalled();
  });

  it("is refused when the script is installed, with the reason, and does not stop the others", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { player } = await start([
      { id: "eval", source: `on("player.levelUp", () => { eval("1"); });` },
      { id: "unknown-signal", source: `on("enemy.killed", () => {});` },
      { id: "not-a-script", source: `import fs from "fs";` },
      { id: "honest", source: `on("player.levelUp", () => { $player.setVariable("honest_${n}", ($player.getVariable("honest_${n}") ?? 0) + 1); });` },
    ]);

    player.level = player.level + 1;

    await settled(() => expect(player.getVariable(`honest_${n}`)).toBe(1));
    const reported = error.mock.calls.map((call) => String(call[0]) + String(call[1] ?? ""));
    expect(reported.some((text) => text.includes("eval"))).toBe(true);
    expect(reported.some((text) => text.includes("unknown-signal") && text.includes("enemy.killed"))).toBe(true);
    expect(reported.some((text) => text.includes("not-a-script"))).toBe(true);
  });
});

describe("the service that holds the scripts", () => {
  it("installs a script while the game runs, and uninstalls it", async () => {
    const service = new ScriptService({});
    const { player } = await start(service);

    service.install({ id: "late", source: `on("player.levelUp", () => { $player.setVariable("late_${n}", ($player.getVariable("late_${n}") ?? 0) + 1); });` });
    player.level = player.level + 1;
    await settled(() => expect(player.getVariable(`late_${n}`)).toBe(1));

    service.uninstall("late");
    player.level = player.level + 1;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(player.getVariable(`late_${n}`)).toBe(1);
  });

  it("reports what is wrong with a script it refuses, and who listens to what", () => {
    const service = new ScriptService({ scripts: [{ id: "a", source: `on("player.dead", { where: { nope: 1 } }, () => {});` }, { id: "b", source: `on("player.dead", () => {});` }] });

    expect(service.errors).toEqual([{ script: "a", message: expect.stringContaining('"nope" is not in the payload of "player.dead"') }]);
    expect(service.listeners("player.dead")).toEqual([{ script: "b", filter: undefined }]);
  });

  it("takes the signals a plugin adds, which scripts can then listen to and the service can emit", async () => {
    const service = new ScriptService({
      signals: { "quests.start": { payload: { questId: { type: "string" } } } },
      scripts: [{ id: "quests", source: `on("quests.start", { where: { questId: "wolves" } }, (e) => { $player.setVariable("started_${n}", ($player.getVariable("started_${n}") ?? 0) + 1); });` }],
    });
    const { player, map } = await start(service);

    await service.emit("quests.start", { questId: "other" }, { player, map });
    await service.emit("quests.start", { questId: "wolves" }, { player, map });

    expect(player.getVariable(`started_${n}`)).toBe(1);
  });
});

describe("the mapping from hooks to signals can be extended", () => {
  const inputBinding = signalBinding<[RpgPlayer, RpgActionInput<unknown>]>({
    signal: "player.input",
    scope: "player",
    hook: "onInput",
    describe: { doc: "A player presses an input.", payload: { action: { type: "string" } } },
    emit: (player, data) => {
      const map = player.getCurrentMap();
      return map ? { payload: { action: String((data as { action?: unknown })?.action ?? "") }, context: { player, map } } : undefined;
    },
  });

  it("turns another hook of RPGJS into a signal, which scripts listen to with its payload checked", async () => {
    const service = new ScriptService({
      bindings: [inputBinding],
      scripts: [
        { id: "uses", source: `on("player.input", { where: { action: "use" } }, (e) => { $player.setVariable("used_${n}", e.action); });` },
        { id: "typo", source: `on("player.input", { where: { acton: "use" } }, () => {});` },
      ],
    });
    const { player } = await start(service);

    await player.execMethod("onInput", [{ action: "jump" }]);
    expect(player.getVariable(`used_${n}`)).toBeUndefined();
    await player.execMethod("onInput", [{ action: "use" }]);

    expect(player.getVariable(`used_${n}`)).toBe("use");
    expect(service.errors).toEqual([{ script: "typo", message: expect.stringContaining('"acton" is not in the payload of "player.input"') }]);
  });

  it("lets several bindings listen to the same hook, the ones of the game and the added ones", async () => {
    const arrived = signalBinding<[RpgPlayer, import("@rpgjs/server").RpgMap]>({
      signal: "player.arrived",
      scope: "player",
      hook: "onJoinMap",
      describe: { payload: { map: { type: "string" } } },
      emit: (player, map) => ({ payload: { map: String(map.id) }, context: { player, map } }),
    });
    const service = new ScriptService({
      bindings: [arrived],
      scripts: [
        { id: "game", source: `on("player.joinMap", () => { $player.setVariable("joined_${n}", true); });` },
        { id: "added", source: `on("player.arrived", (e) => { $player.setVariable("arrived_${n}", e.map); });` },
      ],
    });
    const { player } = await start(service);

    await settled(() => expect([player.getVariable(`joined_${n}`), player.getVariable(`arrived_${n}`)]).toEqual([true, "test-map"]));
  });

  it("emits nothing when a binding gives nothing (a player on no map, say)", async () => {
    const quiet = signalBinding<[RpgPlayer]>({ signal: "player.quiet", scope: "player", hook: "onInput", describe: { payload: {} }, emit: () => undefined });
    const service = new ScriptService({ bindings: [quiet], scripts: [{ id: "q", source: `on("player.quiet", () => { $player.setVariable("quiet_${n}", true); });` }] });
    const { player } = await start(service);

    await player.execMethod("onInput", [{ action: "use" }]);

    expect(player.getVariable(`quiet_${n}`)).toBeUndefined();
  });

  it("opens a GUI for the player, and runs when the player acts in it (gui.action) with the GUI, the event and the data", async () => {
    const { player, map } = await start([{
      id: "quests_gui",
      source: `
        on("player.joinMap", () => { $player.openGui("quests_panel", { count: 2 }); });
        on("gui.action", { where: { gui: "quests_panel", event: "accept" } }, (e) => { $player.setVariable("accepted_${n}", e.data.quest); $player.closeGui("quests_panel"); });
      `,
    }], { gui: [{ name: "quests_panel", component: () => null }] } as RpgClient);

    await settled(() => expect(player.getGui(`quests_panel`)).toBeDefined());
    await (map as any).guiInteraction(player, { guiId: `quests_panel`, name: "refuse", data: { quest: "no" } });
    await (map as any).guiInteraction(player, { guiId: `quests_panel`, name: "accept", data: { quest: "wolves" } });

    await settled(() => expect(player.getVariable(`accepted_${n}`)).toBe("wolves"));
    await settled(() => expect(player.getGui(`quests_panel`)).toBeUndefined());
  });
});
