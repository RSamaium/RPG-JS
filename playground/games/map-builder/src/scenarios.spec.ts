import { afterEach, describe, expect, test, vi } from "vitest";
import { createModule } from "@rpgjs/common";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { Texture, TextureSource } from "pixi.js";
import { createMapBuilderClient, getMapBuilder, type MapBuilderHandle } from "@rpgjs/map-builder/client";
import { getMapAuthority } from "@rpgjs/map-builder/server";
import type { ServerMessage } from "@rpgjs/map-builder/protocol";
import { features } from "./client-features";
import { mapBuilderServer } from "./game";
import { chop, woodOf } from "./modules/main/server";
import { provideMain } from "./modules/main";
import { assets } from "./shared/assets";

/**
 * The three scenarios of the playground, played on the real game modules, in memory:
 *   1. gameplay  — a lever changes the map;
 *   2. builder   — planting under rules the server decides, then editing what you planted;
 *   3. cutting   — trees that shake, then fall and leave wood.
 * Each one runs on both maps: the forest is written in code, the meadow is a JSON file.
 */
const textures = { load: () => new Texture({ source: new TextureSource({ width: 64, height: 96 }) }) };
const wait = (ms = 25) => new Promise((resolve) => setTimeout(resolve, ms));

let fixture: TestingFixture | undefined;
afterEach(async () => {
  vi.restoreAllMocks();
  await fixture?.clear();
  fixture = undefined;
});

type Handle = MapBuilderHandle<typeof features>;

async function boot(mapId: "forest" | "meadow") {
  const clientModule = createModule("WoodcutterClient", [
    { client: createMapBuilderClient({ assets, features, view: { textures, onError: () => undefined, modes: ["play"] } as never }) },
  ]);
  fixture = await testing([...mapBuilderServer(), ...provideMain(), ...clientModule]);
  const client = await fixture.createClient();
  let player = await client.waitForMapChange("forest");
  const builder = getMapBuilder<typeof features>(client.client);
  if (mapId === "meadow") {
    await player.changeMap("meadow", { x: 120, y: 280 });
    player = await client.waitForMapChange("meadow");
  }
  const handle = await new Promise<Handle>((resolve, reject) => {
    const started = Date.now();
    const poll = (): void => {
      const current = builder.current();
      if (current?.mapId === mapId) return resolve(current);
      if (Date.now() - started > 3000) return reject(new Error(`never joined ${mapId}`));
      setTimeout(poll, 20);
    };
    poll();
  });
  const authority = getMapAuthority(player.getCurrentMap())!;
  await wait();

  /** Another player on the same map: a session plugged into the authority. */
  const other = { id: "other-player" };
  const heard: ServerMessage[] = [];
  const connection = authority.connect({ id: "other", actor: other, send: (message) => void heard.push(JSON.parse(JSON.stringify(message))) });
  heard.length = 0;

  return { client, player, handle, authority, map: player.getCurrentMap() as unknown as { getEvent(id: string): { execMethod(name: string, args: unknown[]): unknown } | undefined }, heard, connection, ask: (id: string, ...intents: unknown[]) => connection.receive({ type: "intent", id, intents }) };
}

const MAPS = [
  { mapId: "forest" as const, source: "code", lever: "gate", treeSpot: { x: 238, y: 361 }, freeSpot: { x: 560, y: 480 } },
  { mapId: "meadow" as const, source: "JSON", lever: "bush-3", treeSpot: { x: 268, y: 421 }, freeSpot: { x: 330, y: 420 } },
];

describe.each(MAPS)("on the $mapId (map written in $source)", ({ mapId, lever, treeSpot, freeSpot }) => {
  test("the client plays on the map the server holds, and everything it draws comes from the model", async () => {
    const { handle, authority } = await boot(mapId);
    expect(handle.remote.model.getDefinition()).toEqual(authority.model.getDefinition());
    expect(handle.view.describe().map((node) => node.id).sort()).toEqual(authority.model.state.elements.map((e) => e.id).sort());
  });

  describe("1. gameplay: a lever", () => {
    test("opens what it controls for everybody, and puts it back on the second pull", async () => {
      const { player, map, authority, handle, heard } = await boot(mapId);
      const original = authority.model.getElement(lever)!;
      expect(original).toBeDefined();

      map.getEvent("builder:lever")!.execMethod("onAction", [player, { action: "action" }]);
      await wait();
      expect(authority.model.getElement(lever)).toBeUndefined();
      expect(handle.remote.model.getElement(lever)).toBeUndefined();
      expect(handle.view.describe().some((node) => node.id === lever)).toBe(false);
      expect(heard.filter((m) => m.type === "patches")).toHaveLength(1);
      expect(heard.find((m) => m.type === "effect")).toMatchObject({ target: lever, name: "blink" });

      map.getEvent("builder:lever")!.execMethod("onAction", [player, { action: "action" }]);
      await wait();
      expect(authority.model.getElement(lever)).toEqual(original);
      expect(handle.view.describe().some((node) => node.id === lever)).toBe(true);
    });

    test("colliders follow: the player can no longer be stopped by what the lever removed", async () => {
      const { player, map, client } = await boot(mapId);
      const scene = client.client.scene as unknown as { streamedStaticHitboxIds: Map<string, unknown> };
      const hasCollider = lever === "gate" || lever === "bush-3";
      expect(scene.streamedStaticHitboxIds.has(`map-builder/${lever}`)).toBe(hasCollider);
      map.getEvent("builder:lever")!.execMethod("onAction", [player, { action: "action" }]);
      await wait();
      expect(scene.streamedStaticHitboxIds.has(`map-builder/${lever}`)).toBe(false);
    });
  });

  describe("2. builder: planting under rules, then editing", () => {
    const plant = (handle: Handle, x: number, y: number) => handle.view.submit({ type: "element.place", catalogId: "oak", x, y } as never);

    test("plants a tree the server places on the grid, owns, and charges", async () => {
      const { handle, player, authority } = await boot(mapId);
      const wood = woodOf(player);
      const result = await plant(handle, freeSpot.x, freeSpot.y);
      expect(result).toMatchObject({ ok: true });
      const tree = authority.model.getElement("oak-1")!;
      expect(tree).toMatchObject({ kind: "tree", data: { hits: 3 } });
      expect(tree.x % 32).toBe(0);
      expect(tree.y % 32).toBe(0);
      expect(String(tree.data?.owner)).toBe(String(player.id));
      expect(woodOf(player)).toBe(wood - 1);
      expect(handle.view.describe().some((node) => node.id === "oak-1")).toBe(true);
    });

    test("refuses what the rules refuse, with the reason, and charges nothing", async () => {
      const { handle, player, authority } = await boot(mapId);
      const wood = woodOf(player);
      const existing = authority.model.state.elements.find((e) => e.kind === "tree")!;
      // the client has the same rules: its own pipeline refuses before anything is sent
      expect(await plant(handle, existing.x, existing.y)).toMatchObject({ ok: false, rejection: { code: "occupied" } });
      expect(await plant(handle, 100, 440)).toMatchObject({ ok: false, rejection: { code: "protected-zone" } });
      expect(await plant(handle, 5000, 5000)).toMatchObject({ ok: false, rejection: { code: "out-of-bounds" } });
      expect(woodOf(player)).toBe(wood);
      expect(authority.model.revision).toBe(0);
    });

    test("the ghost on the client turns red for exactly those reasons", async () => {
      const { handle } = await boot(mapId);
      const input = (x: number, y: number) => ({ x, y, button: 0, modifiers: { shift: false, ctrl: false, alt: false, meta: false } });
      handle.view.placement.start("oak");
      handle.view.interaction.feedPointer("move", input(freeSpot.x, freeSpot.y));
      expect(handle.view.interaction.state.get().ghost).toMatchObject({ valid: true });
      handle.view.interaction.feedPointer("move", input(140, 470));
      expect(handle.view.interaction.state.get().ghost).toMatchObject({ valid: false, reason: "protected-zone" });
    });

    test("without wood, the server says so, and nothing is planted", async () => {
      const { handle, player, authority } = await boot(mapId);
      player.setVariable("wood", 0);
      expect(await plant(handle, freeSpot.x, freeSpot.y)).toMatchObject({ ok: false, rejection: { code: "not-enough-wood" } });
      expect(authority.model.getElement("oak-1")).toBeUndefined();
      expect(woodOf(player)).toBe(0);
    });

    test("is limited: too many attempts in a row are refused", async () => {
      const { handle } = await boot(mapId);
      // bushes cost nothing and are not counted by the limit on trees: only the rate limit can stop them
      const bush = (i: number) =>
        handle.view.submit({ type: "element.place", catalogId: "bush", x: 320 + (i % 5) * 64, y: i < 5 ? 320 : 352 } as never);
      const codes: string[] = [];
      for (let i = 0; i < 10; i++) {
        const result = await bush(i);
        codes.push(result.ok ? "ok" : result.rejection.code);
      }
      expect(codes.slice(0, 8)).toEqual(Array(8).fill("ok"));
      expect(codes.slice(8)).toEqual(["rate-limit", "rate-limit"]);
    });

    test("what you planted is yours: others cannot move or remove it, you can", async () => {
      const { handle, authority, ask, heard } = await boot(mapId);
      await plant(handle, freeSpot.x, freeSpot.y);
      heard.length = 0;

      ask("o1", { type: "element.move", id: "oak-1", x: freeSpot.x + 64, y: freeSpot.y });
      ask("o2", { type: "element.remove", id: "oak-1" });
      expect(heard.filter((m) => m.type === "rejected").map((m) => (m as { reason: string }).reason)).toEqual(["not-owner", "not-owner"]);
      expect(authority.model.getElement("oak-1")).toMatchObject({ x: expect.any(Number) });

      expect(await handle.view.submit({ type: "element.move", id: "oak-1", x: freeSpot.x + 64, y: freeSpot.y })).toMatchObject({ ok: true });
      expect(await handle.view.submit({ type: "element.remove", id: "oak-1" })).toMatchObject({ ok: true });
    });

    test("editing keeps the rules: you cannot drag what you planted into a protected zone", async () => {
      const { handle } = await boot(mapId);
      await plant(handle, freeSpot.x, freeSpot.y);
      expect(await handle.view.submit({ type: "element.move", id: "oak-1", x: 100, y: 440 })).toMatchObject({ ok: false, rejection: { code: "protected-zone" } });
    });

    test("another player sees what you plant, and the colliders follow", async () => {
      const { handle, authority, heard, client } = await boot(mapId);
      await plant(handle, freeSpot.x, freeSpot.y);
      await wait();
      expect(heard.filter((m) => m.type === "patches")).toHaveLength(1);
      const scene = client.client.scene as unknown as { streamedStaticHitboxIds: Map<string, unknown> };
      expect(scene.streamedStaticHitboxIds.has("map-builder/oak-1")).toBe(true);
      expect(authority.model.getElement("oak-1")).toBeDefined();
    });
  });

  describe("3. cutting trees", () => {
    // One clock for the whole test: each blow comes a second after the last, as a player's would.
    let now = 1_000_000;
    const blows = async (player: Awaited<ReturnType<typeof boot>>["player"], count: number) => {
      vi.spyOn(Date, "now").mockImplementation(() => (now += 1000));
      for (let i = 0; i < count; i++) {
        chop(player);
        await wait();
      }
    };

    test("each blow shakes the tree for everybody, without touching the map; the last one is a single change", async () => {
      const { player, authority, handle, heard } = await boot(mapId);
      await player.teleport(treeSpot);
      const tree = authority.model.state.elements.find((e) => e.kind === "tree" && e.id === "tree-2")!;
      expect(tree.data?.hits).toBe(3);

      await blows(player, 1);
      expect(heard.filter((m) => m.type === "effect")).toHaveLength(1);
      expect(heard.find((m) => m.type === "effect")).toMatchObject({ target: "tree-2", name: "shake" });
      expect(handle.view.effects.running).toBe(1); // the client shows it too
      expect(authority.model.getElement("tree-2")?.data?.hits).toBe(2);

      await blows(player, 1);
      expect(authority.model.getElement("tree-2")?.data?.hits).toBe(1);

      const revisionBefore = authority.revision;
      heard.length = 0;
      await blows(player, 1);
      // gone, and wood where it stood: one revision, one message, so nobody sees one without the other
      expect(authority.revision).toBe(revisionBefore + 1);
      expect(authority.model.getElement("tree-2")).toBeUndefined();
      const patches = heard.filter((m) => m.type === "patches") as Array<Extract<ServerMessage, { type: "patches" }>>;
      expect(patches).toHaveLength(1);
      expect(patches[0]!.patches.map((p) => p.type)).toEqual(["element.remove", "event.add", "event.add", "event.add"]);
      expect(handle.remote.model.getElement("tree-2")).toBeUndefined();
      expect(handle.view.describe().some((node) => node.id === "tree-2")).toBe(false);
    });

    test("the wood lies on the ground as events the player picks up, once", async () => {
      const { player, authority, map } = await boot(mapId);
      await player.teleport(treeSpot);
      await blows(player, 3);
      await wait(60);
      const loot = authority.model.state.events.filter((e) => e.kind === "loot");
      expect(loot).toHaveLength(3);
      expect(map.getEvent(`builder:${loot[0]!.id}`)).toBeDefined();

      const wood = woodOf(player);
      map.getEvent(`builder:${loot[0]!.id}`)!.execMethod("onPlayerTouch", [player]);
      map.getEvent(`builder:${loot[0]!.id}`)!.execMethod("onPlayerTouch", [player]); // a second touch finds nothing left
      await wait(40);
      expect(woodOf(player)).toBe(wood + 1);
      expect(authority.model.state.events.filter((e) => e.kind === "loot")).toHaveLength(2);
    });

    test("nothing happens when no tree is within reach", async () => {
      const { player, authority } = await boot(mapId);
      await player.teleport({ x: 20, y: 20 });
      await blows(player, 2);
      expect(authority.revision).toBe(0);
    });

    test("blows come no faster than the cooldown allows", async () => {
      const { player, authority } = await boot(mapId);
      await player.teleport(treeSpot);
      vi.spyOn(Date, "now").mockReturnValue(5_000_000);
      chop(player);
      chop(player);
      chop(player);
      await wait();
      expect(authority.model.getElement("tree-2")?.data?.hits).toBe(2);
    });
  });
});

describe("the two maps, side by side", () => {
  test("a player goes from one to the other, and each has its own authority", async () => {
    const { player, handle, client } = await boot("forest");
    const forestAuthority = getMapAuthority(player.getCurrentMap())!;
    expect(handle.mapId).toBe("forest");

    await player.changeMap("meadow", { x: 120, y: 280 });
    const arrived = await client.waitForMapChange("meadow");
    await wait(80);
    const meadowAuthority = getMapAuthority(arrived.getCurrentMap())!;
    expect(meadowAuthority).not.toBe(forestAuthority);
    expect(meadowAuthority.model.state.id).toBe("meadow");
    // the player left the forest (only the other player of the test stays there) and is alone on the meadow
    expect(forestAuthority.connections).toBe(1);
    expect(meadowAuthority.connections).toBe(1);
  });
});
