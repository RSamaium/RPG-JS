import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createModule, defineModule } from "@rpgjs/common";
import type { RpgPlayer, RpgServer } from "@rpgjs/server";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { apiInfo, compileProgram, GAME_API_DESCRIPTION, GAME_API_IMPL, globalNames, hostFromApi, type Program } from "../src/core";
import { parseScript } from "../src/parse";
import { createRpgjsWorld } from "../src/server";
import { checkScript, simulate } from "../src/testing/tools";

const wolves = { id: "wolves", name: "Wolves", reward: 50, story: "They attack the village" };
const bandits = { id: "bandits", name: "Bandits", reward: 80 };

const run = async (body: string, world: object = { data: { quests_quest: [wolves, bandits] } }) => {
  const r = await simulate({ source: `export function f() { ${body} }`, call: { fn: "f" }, world });
  if (!r.ok) throw new Error(r.error ?? JSON.stringify(r.diagnostics));
  return r;
};

describe("$data: the records of the database of the game, read only", () => {
  it("reads a record of a collection by its id", async () => {
    const r = await run(`const q = $data.get("quests_quest", "wolves"); return [q.name, q.reward, q.id, q.type];`);

    expect(r.value).toEqual(["Wolves", 50, "wolves", "quests_quest"]);
  });

  it("gives undefined for a record or a collection that is not there", async () => {
    const r = await run(`return [$data.get("quests_quest", "dragons"), $data.get("nothing", "wolves"), $data.list("nothing")];`);

    expect(r.value).toEqual([undefined, undefined, []]);
  });

  it("lists the records of a collection, and only that collection", async () => {
    const r = await run(`return $data.list("quests_quest").map((q) => q.name);`, { data: { quests_quest: [wolves, bandits], items: [{ id: "potion", name: "Potion" }] } });

    expect(r.value).toEqual(["Wolves", "Bandits"]);
  });

  it("gives copies: a change in the script changes nothing, and the next read is as it was", async () => {
    const r = await run(`const a = $data.get("quests_quest", "wolves"); const b = { ...a, reward: 1 }; return [b.reward, $data.get("quests_quest", "wolves").reward];`);

    expect(r.value).toEqual([1, 50]);
  });

  it("refuses to change a record it read", async () => {
    await expect(run(`const q = $data.get("quests_quest", "wolves"); q.reward = 1;`)).rejects.toThrow();
  });

  it("gives at most 1000 records of a collection", async () => {
    const many = Array.from({ length: 1200 }, (_, i) => ({ id: `q${i}`, name: `Quest ${i}` }));

    const r = await run(`return $data.list("quests_quest").length;`, { data: { quests_quest: many } });

    expect(r.value).toBe(1000);
  });

  it("asks for a collection and an id that are texts", async () => {
    await expect(run(`return $data.get(1, "wolves");`)).rejects.toThrow(/collection/);
    await expect(run(`return $data.get("quests_quest", 2);`)).rejects.toThrow(/record id/);
    await expect(run(`return $data.list("");`)).rejects.toThrow(/collection/);
  });

  it("is declared in the API an agent reads, with what it gives", () => {
    const check = checkScript(`export function f() { return $data.get("quests_quest", "wolves"); }`);

    expect(check.ok).toBe(true);
    expect(GAME_API_DESCRIPTION.handles.$data.methods).toHaveProperty("get");
    expect(GAME_API_DESCRIPTION.handles.$data.methods).toHaveProperty("list");
  });

  it("is refused for a name that does not exist", () => {
    const check = checkScript(`export function f() { return $data.remove("quests_quest", "wolves"); }`);

    expect(check.ok).toBe(false);
  });
});

describe("$data on a real RPGJS game", () => {
  let fixture: TestingFixture;
  let player: RpgPlayer;

  const serverModule = defineModule<RpgServer>({
    maps: [{ id: "test-map", file: "" }],
    // The records a Studio game puts in the database: plain data, `_type` is the type of the record.
    database: {
      wolves: { name: "Wolves", reward: 50, _type: "quests_quest" },
      bandits: { name: "Bandits", reward: 80, _type: "quests_quest" },
      Potion: { id: "Potion", name: "Potion", price: 10, _type: "item" },
    },
    player: { async onConnected(p) { await p.changeMap("test-map", { x: 100, y: 100 }); } },
  });

  beforeEach(async () => {
    fixture = await testing(createModule("ScriptDataTest", [{ server: serverModule, client: defineModule({}) }]));
    const client = await fixture.createClient();
    player = await client.waitForMapChange("test-map");
  });

  afterEach(async () => {
    await fixture.clear();
  });

  const call = async (body: string) => {
    const program: Program = compileProgram(parseScript(`export function f() { ${body} }`), globalNames(GAME_API_DESCRIPTION), apiInfo(GAME_API_DESCRIPTION));
    const world = createRpgjsWorld({ player, map: player.getCurrentMap()! });
    return (await program.call("f", [], hostFromApi(GAME_API_DESCRIPTION, GAME_API_IMPL, world), { steps: 20000, iterations: 100 })).value;
  };

  it("reads a record of the database of the room by its id and its type", async () => {
    expect(await call(`const q = $data.get("quests_quest", "wolves"); return [q.id, q.name, q.reward, q.type];`)).toEqual(["wolves", "Wolves", 50, "quests_quest"]);
  });

  it("lists the records of a type and none of the other types", async () => {
    expect(await call(`return $data.list("quests_quest").map((q) => q.id).sort();`)).toEqual(["bandits", "wolves"]);
    expect(await call(`return $data.list("item").map((q) => q.id);`)).toEqual(["Potion"]);
  });

  it("does not give a record under the wrong type", async () => {
    expect(await call(`return $data.get("quests_quest", "Potion");`)).toBeUndefined();
  });
});
