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

  it("gives and takes items by the database of the game, and counts them", async () => {
    const { value } = await run(`export function f() {
      $player.addItem("Potion", 3);
      $player.removeItem("Potion", 1);
      return [$player.itemCount("Potion"), $player.hasItem("Potion"), $player.itemCount("Elixir")];
    }`);

    expect(value).toEqual([2, true, 0]);
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

  it("sets switches and variables of the player, and reads them back", async () => {
    const { value } = await run(`export function f() {
      $switch.door_open = true;
      $var.visits += 2;
      $var.visits *= 3;
      return [$switch.door_open, $switch.never_set, $var.visits];
    }`);

    expect(value).toEqual([true, false, 6]);
    expect(player.getVariable("door_open")).toBe(true);
    expect(player.getVariable("visits")).toBe(6);
  });

  it("names the self switches of an event after it, and refuses them without an event", async () => {
    await run(`export function f() { $self.A = true; return $self.A; }`, { event: { id: "chest_1" } as any });
    expect(player.getVariable("chest_1_A")).toBe(true);

    await expect(run(`export function f() { $self.A = true; }`)).rejects.toThrow(/no self switch/);
  });

  it("shows a notification to the player", async () => {
    const showNotification = vi.spyOn(player, "showNotification");

    await run(`export function f() { notify("Found it", { type: "info", time: 2000 }); }`);

    expect(showNotification).toHaveBeenCalledWith("Found it", { type: "info", time: 2000 });
  });

  it("asks the player to choose and gives the index, or -1 when nothing is picked", async () => {
    const showChoices = vi.spyOn(player, "showChoices");
    showChoices.mockResolvedValueOnce({ text: "No", value: 1 } as any).mockResolvedValueOnce(null as any);

    const { value: picked } = await run(`export function f() { return choice(["Yes", "No"]); }`);
    const { value: closed } = await run(`export function f() { return choice(["Yes", "No"]); }`);

    expect(showChoices).toHaveBeenCalledWith("", [{ text: "Yes", value: 0 }, { text: "No", value: 1 }]);
    expect([picked, closed]).toEqual([1, -1]);
  });

  it("sends the player to another map", async () => {
    const changeMap = vi.spyOn(player, "changeMap").mockResolvedValue(true);

    await run(`export function f() { transfer("town", 12, 8); }`);

    expect(changeMap).toHaveBeenCalledWith("town", { x: 12, y: 8 });
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
