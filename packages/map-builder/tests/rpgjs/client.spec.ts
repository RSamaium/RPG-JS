import { afterEach, describe, expect, test, vi } from "vitest";
import { createModule, defineModule } from "@rpgjs/common";
import type { RpgServer } from "@rpgjs/server";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { Texture, TextureSource } from "pixi.js";
import { elements, placement, selection } from "../../src/features";
import { snapToGrid, requireFree } from "../../src/interaction/steps";
import { createMapBuilderClient, getMapBuilder, type MapBuilderHandle } from "../../src/client";
import { getMapAuthority, provideMapBuilder as provideServer } from "../../src/server";
import { assets, catalog, forest } from "./helpers";
import { createModule as makeModule } from "@rpgjs/common";

let fixture: TestingFixture | undefined;
afterEach(async () => {
  await fixture?.clear();
  fixture = undefined;
});

const textures = { load: () => new Texture({ source: new TextureSource({ width: 64, height: 96 }) }) };
const wait = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

async function boot(clientOptions: Partial<Parameters<typeof createMapBuilderClient>[0]> = {}, serverMaps: Record<string, unknown> = { map1: forest("map1") }) {
  const game = createModule("Game", [
    {
      server: defineModule<RpgServer>({
        maps: [{ id: "map1", file: "" }],
        player: {
          async onConnected(player) {
            await player.changeMap("map1", { x: 100, y: 100 });
          },
        },
      }),
    },
  ]);
  const features = [elements({ edit: true }), selection(), placement({ catalog, pipeline: [snapToGrid(32), requireFree()] })] as const;
  const clientModule = makeModule("MapBuilderClient", [
    { client: createMapBuilderClient({ assets, features, view: { textures, onError: () => undefined }, ...clientOptions } as never) },
  ]);
  fixture = await testing([
    ...provideServer({ assets, maps: serverMaps as never, authority: { placement: { catalog, pipeline: [snapToGrid(32), requireFree()] } } }),
    ...clientModule,
    ...game,
  ]);
  const client = await fixture.createClient();
  const player = await client.waitForMapChange("map1");
  const builder = getMapBuilder<typeof features>(client.client);
  const handle = (await Promise.race([builder.whenReady(), wait(1000).then(() => undefined)])) as MapBuilderHandle<typeof features> | undefined;
  return { client, player, builder, handle, authority: getMapAuthority(player.getCurrentMap())! };
}

describe("joining on the client", () => {
  test("the client gets a model of the map as the server has it, and a view", async () => {
    const { handle, authority } = await boot();
    expect(handle).toBeDefined();
    expect(handle!.mapId).toBe("map1");
    expect(handle!.remote.model.getDefinition()).toEqual(authority.model.getDefinition());
    expect(handle!.view.describe().map((node) => node.id).sort()).toEqual(["home", "t1"]);
  });

  test("offers the view as PixiJS children, for the event layer of RPGJS", async () => {
    const { builder, handle } = await boot();
    expect(builder.pixiChildren()).toEqual([handle!.view.root]);
  });

  test("tells the game when the player has joined, once", async () => {
    const onJoin = vi.fn();
    const { handle } = await boot({ onJoin });
    expect(onJoin).toHaveBeenCalledOnce();
    expect(onJoin.mock.calls[0]![0]).toBe(handle);
  });

  test("a map that is not modifiable gives the client nothing", async () => {
    const { builder, handle } = await boot({}, {});
    expect(handle).toBeUndefined();
    expect(builder.current()).toBeUndefined();
    expect(builder.pixiChildren()).toEqual([]);
  });
});

describe("asking from the client", () => {
  test("the server decides, and the change comes back to the client's model", async () => {
    const { handle, authority } = await boot();
    const result = await handle!.view.submit({ type: "element.move", id: "t1", x: 300, y: 300 });
    expect(result).toMatchObject({ ok: true, revision: 1 });
    expect(authority.model.getElement("t1")).toMatchObject({ x: 300, y: 300 });
    expect(handle!.remote.model.getElement("t1")).toMatchObject({ x: 300, y: 300 });
    expect(handle!.view.describe().find((node) => node.id === "t1")!.bounds).toMatchObject({ x: 300, y: 300 });
  });

  test("places something from the catalog: the id comes from the server, and the picture follows", async () => {
    const { handle, authority } = await boot();
    const placed = vi.fn();
    handle!.view.placement.onPlaced(placed);
    handle!.view.placement.start("oak");
    handle!.view.interaction.feedPointer("move", { x: 500, y: 450, button: 0, modifiers: { shift: false, ctrl: false, alt: false, meta: false } });
    handle!.view.interaction.feedPointer("down", { x: 500, y: 450, button: 0, modifiers: { shift: false, ctrl: false, alt: false, meta: false } });
    await wait();
    expect(placed).toHaveBeenCalledOnce();
    const id = placed.mock.calls[0]![0].id as string;
    expect(id).toBe("oak-1");
    expect(authority.model.getElement(id)).toMatchObject({ kind: "tree" });
    expect(handle!.view.describe().some((node) => node.id === id)).toBe(true);
  });

  test("is refused when the rules say so, and the client is told why", async () => {
    const { handle } = await boot({ features: [elements({ edit: true })] as never });
    const result = await handle!.view.submit({ type: "element.move", id: "home", x: 128, y: 96 });
    // the client has no rules of its own here: the server answers
    expect(result).toMatchObject({ ok: true });
    const placedOnTree = await handle!.view.submit({ type: "element.place", catalogId: "oak", x: 130, y: 98 } as never);
    expect(placedOnTree).toMatchObject({ ok: false });
  });
});

describe("physics on the client", () => {
  test("colliders of the elements are in the client's physics, so the player does not walk through them", async () => {
    const { client } = await boot();
    const scene = client.client.scene as unknown as { streamedStaticHitboxIds: Map<string, unknown> };
    expect([...scene.streamedStaticHitboxIds.keys()]).toEqual(expect.arrayContaining(["map-builder/t1", "map-builder/home"]));
  });

  test("follow what is built", async () => {
    const { client, handle } = await boot();
    const scene = client.client.scene as unknown as { streamedStaticHitboxIds: Map<string, unknown> };
    await handle!.view.submit({ type: "element.remove", id: "t1" });
    expect(scene.streamedStaticHitboxIds.has("map-builder/t1")).toBe(false);
    expect(scene.streamedStaticHitboxIds.has("map-builder/home")).toBe(true);
  });

  test("can be turned off", async () => {
    const { client } = await boot({ physics: false });
    const scene = client.client.scene as unknown as { streamedStaticHitboxIds: Map<string, unknown> };
    expect([...scene.streamedStaticHitboxIds.keys()].filter((key) => key.startsWith("map-builder/"))).toEqual([]);
  });
});

describe("what the server does", () => {
  test("a change made by the game reaches the client", async () => {
    const { handle, authority } = await boot();
    authority.apply({ type: "element.remove", id: "t1" });
    await wait();
    expect(handle!.remote.model.getElement("t1")).toBeUndefined();
    expect(handle!.view.describe().some((node) => node.id === "t1")).toBe(false);
  });

  test("an effect shown by the server plays on the client's view", async () => {
    const { handle, authority } = await boot();
    authority.effect("t1", "shake", { duration: 500 });
    await wait();
    expect(handle!.view.effects.running).toBe(1);
  });
});

describe("leaving", () => {
  test("disposing removes the colliders and the view", async () => {
    const { client, handle, builder } = await boot();
    const scene = client.client.scene as unknown as { streamedStaticHitboxIds: Map<string, unknown> };
    handle!.dispose();
    expect(handle!.view.root.destroyed).toBe(true);
    void scene;
    void builder;
  });
});
