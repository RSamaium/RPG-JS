import { afterEach, describe, expect, test } from "vitest";
import { defineModule } from "@rpgjs/common";
import type { RpgServer } from "@rpgjs/server";
import { memoryMapStore } from "../../src/authority/store";
import { requireFree, snapToGrid } from "../../src/interaction/steps";
import { getMapAuthority, whenMapAuthority } from "../../src/server";
import { catalog, forest, observer, start } from "./helpers";

let fixture: Awaited<ReturnType<typeof start>>["fixture"] | undefined;
afterEach(async () => {
  await fixture?.clear();
  fixture = undefined;
});

const ask = (id: string, ...intents: unknown[]) => ({ type: "intent" as const, id, intents: intents as never });
const place = (x: number, y: number) => ({ type: "element.place", catalogId: "oak", x, y });
const move = (id: string, x: number, y: number) => ({ type: "element.move", id, x, y });

describe("joining a modifiable map", () => {
  test("gives the player the map, tagged with the map it is about", async () => {
    const s = await start();
    fixture = s.fixture;
    const ann = await s.join();
    expect(ann.inbox).toHaveLength(1);
    expect(ann.inbox[0]!.map).toBe("map1");
    expect(ann.inbox[0]!.message).toMatchObject({ type: "snapshot", revision: 0 });
    const definition = (ann.inbox[0]!.message as unknown as { definition: { elements: Array<{ id: string }> } }).definition;
    expect(definition.elements.map((e) => e.id)).toEqual(["t1", "home"]);
  });

  test("sends it again when the client asks, and says it is up to date when it is", async () => {
    const s = await start();
    fixture = s.fixture;
    const ann = await s.join();
    ann.inbox.length = 0;
    await ann.send({ type: "sync", since: 0 });
    expect(ann.of("synced")).toEqual([{ type: "synced", revision: 0 }]);
    await ann.send({ type: "sync" });
    expect(ann.of("snapshot")).toHaveLength(1);
  });

  test("leaves a map that is not modifiable alone", async () => {
    const s = await start({ maps: {} });
    fixture = s.fixture;
    const ann = await s.join();
    expect(ann.inbox).toEqual([]);
    expect(getMapAuthority(ann.player.getCurrentMap())).toBeUndefined();
    expect(await whenMapAuthority(ann.player.getCurrentMap())).toBeUndefined();
  });

  test("finds the map with a function, or a source", async () => {
    const byFunction = await start({ maps: (id) => (id === "map1" ? forest(id) : undefined) });
    fixture = byFunction.fixture;
    expect((await byFunction.join()).of("snapshot")).toHaveLength(1);
    await fixture.clear();

    const bySource = await start({ maps: { load: async (id) => { if (id !== "map1") throw Object.assign(new Error("no"), { code: "not-found" }); return forest(id); } } });
    fixture = bySource.fixture;
    expect((await bySource.join()).of("snapshot")).toHaveLength(1);
  });

  test("the authority of the map is there for the game to use", async () => {
    const s = await start();
    fixture = s.fixture;
    const ann = await s.join();
    const authority = getMapAuthority(ann.player.getCurrentMap())!;
    expect(authority.model.getElement("t1")).toBeDefined();
    expect(authority.connections).toBe(1);
  });
});

describe("asking", () => {
  test("is decided by the server and told to everybody on the map, the asker's request id included", async () => {
    const s = await start();
    fixture = s.fixture;
    const ann = await s.join();
    const authority = getMapAuthority(ann.player.getCurrentMap())!;
    const bob = observer(authority); // another player on the same map
    await ann.send(ask("r1", move("t1", 160, 96)));

    expect(authority.model.getElement("t1")).toMatchObject({ x: 160 });
    expect(ann.of("patches")[0]).toMatchObject({ revision: 1, requestId: "r1", patches: [{ type: "element.move", id: "t1", x: 160, y: 96 }] });
    expect(bob.of("patches")[0]).toMatchObject({ revision: 1 });
    expect(bob.of("patches")[0]).not.toHaveProperty("requestId");
  });

  test("is refused with the reason, to the asker only", async () => {
    const s = await start({ authority: { pipeline: { move: [requireFree()] } } });
    fixture = s.fixture;
    const ann = await s.join();
    const bob = observer(getMapAuthority(ann.player.getCurrentMap())!);
    await ann.send(ask("r1", move("home", 128, 96))); // onto the tree
    expect(ann.of("rejected")).toMatchObject([{ id: "r1", reason: "occupied" }]);
    expect(bob.of("rejected")).toEqual([]);
    expect(bob.of("patches")).toEqual([]);
  });

  test("places what the catalog offers, with an id the server gives", async () => {
    const s = await start({ authority: { placement: { catalog, pipeline: [snapToGrid(32), requireFree()] } } });
    fixture = s.fixture;
    const ann = await s.join();
    const authority = getMapAuthority(ann.player.getCurrentMap())!;
    const bob = observer(authority);
    await ann.send(ask("r1", place(402, 402)));
    bob.connection.receive(ask("r2", place(404, 404))); // the same cell: taken
    expect(authority.model.getElement("oak-1")).toMatchObject({ kind: "tree", x: 416, y: 416 });
    expect(bob.of("rejected")).toMatchObject([{ id: "r2", reason: "occupied" }]);
    expect(ann.of("rejected")).toEqual([]);
  });

  test("knows who is asking: the rules see the player", async () => {
    const seen: string[] = [];
    const s = await start({
      actor: (player) => ({ id: player.id }),
      authority: { pipeline: { move: [(_i, c, next) => (seen.push((c.actor as { id: string }).id), next())] } },
    });
    fixture = s.fixture;
    const ann = await s.join();
    await ann.send(ask("r1", move("t1", 1, 1)));
    expect(seen).toEqual([String(ann.player.id)]);
  });

  test("ignores what is not a message, and what is about another map", async () => {
    const s = await start();
    fixture = s.fixture;
    const ann = await s.join();
    ann.inbox.length = 0;
    for (const payload of [null, 3, "x", {}, { map: "map1" }, { map: "map1", message: 3 }, { map: "other", message: ask("r1", move("t1", 1, 1)) }]) {
      await ann.raw(payload);
    }
    expect(ann.inbox).toEqual([]);
    expect(getMapAuthority(ann.player.getCurrentMap())!.revision).toBe(0);
  });

  test("a player who sent patches is refused, because the server decides", async () => {
    const s = await start();
    fixture = s.fixture;
    const ann = await s.join();
    await ann.send({ type: "patches", id: "u1", patches: [{ type: "element.remove", id: "t1" }] });
    expect(ann.of("rejected")).toMatchObject([{ id: "u1", reason: "patches-not-allowed" }]);
  });
});

describe("what the game does itself", () => {
  test("a lever: the server changes the map, every player hears it", async () => {
    const s = await start();
    fixture = s.fixture;
    const ann = await s.join();
    const authority = getMapAuthority(ann.player.getCurrentMap())!;
    const bob = observer(authority);
    authority.apply([{ type: "element.remove", id: "t1" }, { type: "event.add", event: { id: "wood-1", kind: "loot", x: 128, y: 96, graphic: "wood" } }]);
    await fixture.wait(10);
    expect(ann.of("patches")).toMatchObject([{ revision: 1 }]);
    expect(bob.of("patches")).toMatchObject([{ revision: 1 }]);
  });

  test("an effect is shown to everybody on the map", async () => {
    const s = await start();
    fixture = s.fixture;
    const ann = await s.join();
    getMapAuthority(ann.player.getCurrentMap())!.effect("t1", "shake", { intensity: 4 });
    await fixture.wait(10);
    expect(ann.of("effect")).toEqual([{ type: "effect", target: "t1", name: "shake", params: { intensity: 4 } }]);
  });

  test("onReady hands the authority to the game as soon as it exists", async () => {
    const ids: string[] = [];
    const s = await start({ onReady: (_authority, map) => void ids.push(map.id) });
    fixture = s.fixture;
    await s.join();
    expect(ids).toEqual(["map1"]);
  });
});

// Changing map, several players and the physics are tested with stand-ins in server-stubs.spec.ts:
// the test harness creates a single client, and does not move a player between rooms the way a server does.

describe("persistence", () => {
  test("keeps what players build, and a map brought back has it", async () => {
    const store = memoryMapStore();
    const options = { authority: { placement: { catalog } }, persist: () => store };
    const first = await start(options);
    fixture = first.fixture;
    const ann = await first.join();
    await ann.send(ask("r1", place(400, 400)));
    await getMapAuthority(ann.player.getCurrentMap())!.flush();
    expect((await store.load("map1"))!.snapshot.revision).toBe(1);
    await fixture.clear();

    const second = await start(options);
    fixture = second.fixture;
    const bob = await second.join();
    const snapshot = bob.of("snapshot")[0]!;
    expect(snapshot.revision).toBe(1);
    expect(snapshot.definition.elements.map((e) => e.id)).toContain("oak-1");
  });

  test("a store that cannot be used does not stop the game: the map is simply not modifiable", async () => {
    const errors: unknown[] = [];
    const s = await start({ persist: () => ({ load: async () => { throw new Error("db down"); }, save: async () => undefined }), onError: (e) => void errors.push(e) });
    fixture = s.fixture;
    const ann = await s.join();
    expect(ann.inbox).toEqual([]);
    expect(String(errors[0])).toMatch(/db down/);
  });
});
