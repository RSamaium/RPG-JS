import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createModule, defineModule } from "@rpgjs/common";
import type { RpgPlayer, RpgServer } from "@rpgjs/server";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { compileProgram, apiInfo, globalNames, GAME_API_DESCRIPTION, type Program } from "../src/core";
import { parseScript } from "../src/parse";
import { createRpgjsWorld, SHARED_PREFIX } from "../src/server";
import { hostFromApi, GAME_API_IMPL } from "../src/core";

const Potion = { id: "Potion", name: "Potion", description: "Restores HP", price: 10, hpValue: 50, consumable: true, _type: "item" as const };

let fixture: TestingFixture;
let player: RpgPlayer;

const serverModule = defineModule<RpgServer>({
  maps: [{ id: "test-map", file: "" }],
  database: { Potion },
  player: {
    async onConnected(p) {
      await p.changeMap("test-map", { x: 100, y: 100 });
    },
  },
});

beforeEach(async () => {
  fixture = await testing(createModule("ScriptWorldTest", [{ server: serverModule, client: defineModule({}) }]));
  const client = await fixture.createClient();
  player = await client.waitForMapChange("test-map");
});

afterEach(async () => {
  await fixture.clear();
});

const compile = (source: string): Program => compileProgram(parseScript(source), globalNames(GAME_API_DESCRIPTION), apiInfo(GAME_API_DESCRIPTION));

/** Runs the exported function `f` of a script in a world built over the real player and the real map. */
async function run(source: string, extra: Partial<Parameters<typeof createRpgjsWorld>[0]> = {}) {
  const program = compile(source);
  const world = createRpgjsWorld({ player, map: player.getCurrentMap()!, shared: program.shared, ...extra });
  const result = await program.call("f", [], hostFromApi(GAME_API_DESCRIPTION, GAME_API_IMPL, world), { steps: 20000, iterations: 100 });
  return { value: result.value, world };
}

describe("a script that runs on a real RPGJS player", () => {
  it("reads the gold, the level and the name, and changes the gold", async () => {
    player.gold = 100;

    const { value } = await run(`export function f() { $player.gold += 25; $player.gold -= 5; return $player.gold + ":" + $player.level + ":" + $player.name; }`);

    expect(player.gold).toBe(120);
    expect(String(value).startsWith("120:")).toBe(true);
  });

  it("never takes the gold below zero", async () => {
    player.gold = 10;

    await run(`export function f() { $player.gold -= 50; }`);

    expect(player.gold).toBe(0);
  });

  it("gives and takes items by the database of the game, and reads them as RPGJS does", async () => {
    const { value } = await run(`export function f() {
      $player.addItem("Potion", 3);
      $player.removeItem("Potion", 1);
      return [$player.getItem("Potion"), $player.getItem("Potion")?.quantity, $player.hasItem("Potion"), $player.getItem("Elixir")];
    }`);

    expect(value).toEqual([{ id: "Potion", name: "Potion", quantity: 2 }, 2, true, undefined]);
    expect(player.getItem("Potion").quantity()).toBe(2);
  });

  it("takes nothing, and does not fail, from a player who has none of the item", async () => {
    await run(`export function f() { $player.removeItem("Potion", 4); }`);

    expect(player.hasItem("Potion")).toBe(false);
  });

  it("takes all that the player has when it asks for more", async () => {
    await run(`export function f() { $player.addItem("Potion", 2); $player.removeItem("Potion", 9); }`);

    expect(player.hasItem("Potion")).toBe(false);
  });

  it("sets, reads, tests and removes the variables of the player, which hold any plain value", async () => {
    const { value } = await run(`export function f() {
      $player.setVariable("door_open", true);
      $player.setVariable("visits", ($player.getVariable("visits") ?? 0) + 2);
      $player.setVariable("quest", { step: 2, tags: ["wolves"] });
      const removed = $player.removeVariable("door_open");
      return [$player.getVariable("visits"), $player.hasVariable("quest"), $player.getVariable("quest").tags[0], removed, $player.hasVariable("door_open")];
    }`);

    expect(value).toEqual([2, true, "wolves", true, false]);
    expect(player.getVariable("visits")).toBe(2);
    expect(player.getVariable("quest")).toEqual({ step: 2, tags: ["wolves"] });
    expect(player.hasVariable("door_open")).toBe(false);
  });

  it("names the event the script runs for", async () => {
    const { value } = await run(`export function f() { return [$event.id, $event.name]; }`, { event: { id: "chest_1", name: () => "chest" } as any });

    expect(value).toEqual(["chest_1", "chest"]);
  });

  it("shows a text and a notification to the player, with the options RPGJS knows", async () => {
    const showText = vi.spyOn(player, "showText").mockResolvedValue(null);
    const showNotification = vi.spyOn(player, "showNotification");

    await run(`export function f() { $player.showText("Hello", { position: "top", speaker: "Mira" }); $player.showNotification("Found it", { type: "info", time: 2000 }); }`);

    expect(showText).toHaveBeenCalledWith("Hello", { position: "top", speaker: "Mira" });
    expect(showNotification).toHaveBeenCalledWith("Found it", { type: "info", time: 2000 });
  });

  it("opens, updates and closes a GUI of the client through player.gui(id), player.getGui(id) and player.removeGui(id)", async () => {
    const open = vi.fn().mockResolvedValue(null);
    const update = vi.fn();
    vi.spyOn(player, "gui").mockReturnValue({ open } as any);
    vi.spyOn(player, "getGui").mockReturnValue({ update } as any);
    const removeGui = vi.spyOn(player, "removeGui").mockImplementation(() => undefined);

    await run(`export function f() { $player.openGui("quests_panel", { count: 2 }, { blockPlayerInput: true }); $player.updateGui("quests_panel", { count: 3 }); $player.closeGui("quests_panel", { done: true }); }`);

    expect(open).toHaveBeenCalledWith({ count: 2 }, { blockPlayerInput: true });
    expect(update).toHaveBeenCalledWith({ count: 3 });
    expect(removeGui).toHaveBeenCalledWith("quests_panel", { done: true });
  });

  it("asks the player to choose and gives the choice, or null when nothing is picked", async () => {
    const showChoices = vi.spyOn(player, "showChoices");
    showChoices.mockResolvedValueOnce({ text: "No", value: "no" } as any).mockResolvedValueOnce(null as any);
    const source = `export function f() { return $player.showChoices("Buy?", [{ text: "Yes", value: "yes" }, { text: "No", value: "no" }]); }`;

    const { value: picked } = await run(source);
    const { value: closed } = await run(source);

    expect(showChoices).toHaveBeenCalledWith("Buy?", [{ text: "Yes", value: "yes" }, { text: "No", value: "no" }]);
    expect([picked, closed]).toEqual([{ text: "No", value: "no" }, null]);
  });

  it("sends the player to another map", async () => {
    const changeMap = vi.spyOn(player, "changeMap").mockResolvedValue(true);

    await run(`export function f() { $player.changeMap("town", { x: 12, y: 8 }); $player.changeMap("cave"); }`);

    expect(changeMap).toHaveBeenNthCalledWith(1, "town", { x: 12, y: 8 });
    expect(changeMap).toHaveBeenNthCalledWith(2, "cave", undefined);
  });

  it("keeps the properties shared by the players on the real map, between runs and between players", async () => {
    const source = `
      shared({ stock: { initial: 2, client: true } });
      export function f() { return $shared.take("stock", 1); }
    `;

    const results = [(await run(source)).value, (await run(source)).value, (await run(source)).value];

    const map = player.getCurrentMap() as any;
    expect(results).toEqual([true, true, false]);
    expect(map[SHARED_PREFIX + "stock"]()).toBe(0);
  });

  it("gives the script the payload of its signal as $hook", async () => {
    const { value } = await run(`export function f() { return $hook.skill + ":" + $hook.power; }`, { hook: { skill: "fireball", power: 7 } });

    expect(value).toBe("fireball:7");
  });
});
