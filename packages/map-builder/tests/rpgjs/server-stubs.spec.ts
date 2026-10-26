import { describe, expect, test, vi } from "vitest";
import { memoryMapStore } from "../../src/authority/store";
import { defineCatalog } from "../../src/interaction/catalog";
import { requireFree } from "../../src/interaction/steps";
import { MAP_BUILDER_CHANNEL, wrap } from "../../src/rpgjs/shared";
import { createMapBuilderServer, getMapAuthority, whenMapAuthority, type MapBuilderServerOptions } from "../../src/server";
import { assets, forest } from "./helpers";

const catalog = defineCatalog([{ id: "oak", sprite: "tree" }]);

/** What the module needs of an RpgMap: colliders, events, an id. */
function fakeMap(id: string) {
  const hitboxes = new Map<string, unknown[]>();
  const events = new Map<string, { definition: Record<string, unknown>; x: number; y: number; graphic?: string; teleports: Array<{ x: number; y: number }> }>();
  const map = {
    id,
    hitboxes,
    events,
    replaceStreamedStaticHitboxes: vi.fn((namespace: string, boxes: unknown[]) => void hitboxes.set(namespace, boxes)),
    clearStreamedStaticHitboxes: vi.fn((namespace: string) => void hitboxes.delete(namespace)),
    createDynamicEvent: vi.fn(async (definition: { id: string; x: number; y: number; event: Record<string, unknown> }) => {
      const record = { definition: definition.event, x: definition.x, y: definition.y, teleports: [] as Array<{ x: number; y: number }> } as { definition: Record<string, unknown>; x: number; y: number; graphic?: string; teleports: Array<{ x: number; y: number }> };
      // what RPGJS does when it creates the event
      (definition.event.onInit as (() => void) | undefined)?.call({ setGraphic: (graphic: string) => (record.graphic = graphic) });
      events.set(definition.id, record);
      return definition.id;
    }),
    removeEvent: vi.fn((eventId: string) => void events.delete(eventId)),
    getEvent: (eventId: string) => {
      const record = events.get(eventId);
      return record && { teleport: async (position: { x: number; y: number }) => void record.teleports.push(position) };
    },
  };
  return map;
}

function fakePlayer(id: string) {
  const handlers = new Map<string, (payload: unknown) => void>();
  let current: object | null = null;
  return {
    id,
    emitted: [] as Array<{ type: string; value: { map: string; message: { type: string; [key: string]: unknown } } }>,
    emit(type: string, value: never) {
      this.emitted.push({ type, value });
    },
    on(type: string, callback: (payload: unknown) => void) {
      handlers.set(type, callback);
    },
    getCurrentMap: () => current,
    goTo(map: object | null) {
      current = map;
    },
    sends(payload: unknown) {
      handlers.get(MAP_BUILDER_CHANNEL)?.(payload);
    },
    of(type: string) {
      return this.emitted.filter((entry) => entry.value.message.type === type).map((entry) => entry.value.message);
    },
    handlers,
  };
}

type Player = ReturnType<typeof fakePlayer>;
type Map = ReturnType<typeof fakeMap>;

async function setup(options: Partial<MapBuilderServerOptions> = {}) {
  const module = createMapBuilderServer({ assets, maps: { map1: forest("map1"), map2: forest("map2") }, ...options }) as {
    player: { onConnected(p: unknown): void; onJoinMap(p: unknown): void };
    map: {
      onLoad(m: unknown): Promise<void>;
      onJoin(p: unknown, m: unknown): Promise<void>;
      onLeave(p: unknown, m: unknown): void;
      onPhysicsInit(m: unknown): void;
    };
  };
  const enter = async (player: Player, map: Map) => {
    player.goTo(map);
    module.player.onConnected(player);
    await module.map.onLoad(map);
    await module.map.onJoin(player, map);
  };
  return { module, enter };
}

const ask = (id: string, ...intents: unknown[]) => ({ type: "intent", id, intents });
const move = (id: string, x: number, y: number) => ({ type: "element.move", id, x, y });
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("several players", () => {
  test("every player on the map hears a change, and only the asker gets their request id", async () => {
    const { enter } = await setup();
    const map = fakeMap("map1");
    const ann = fakePlayer("ann");
    const bob = fakePlayer("bob");
    await enter(ann, map);
    await enter(bob, map);
    expect(getMapAuthority(map)!.connections).toBe(2);

    ann.sends(wrap("map1", ask("r1", move("t1", 160, 96))));

    expect(ann.of("patches")).toMatchObject([{ revision: 1, requestId: "r1" }]);
    expect(bob.of("patches")).toMatchObject([{ revision: 1 }]);
    expect(bob.of("patches")[0]).not.toHaveProperty("requestId");
    expect(ann.emitted.every((entry) => entry.type === MAP_BUILDER_CHANNEL && entry.value.map === "map1")).toBe(true);
  });

  test("a refusal goes to the asker alone", async () => {
    const { enter } = await setup({ authority: { pipeline: { move: [requireFree()] } } });
    const map = fakeMap("map1");
    const ann = fakePlayer("ann");
    const bob = fakePlayer("bob");
    await enter(ann, map);
    await enter(bob, map);
    ann.sends(wrap("map1", ask("r1", move("home", 128, 96))));
    expect(ann.of("rejected")).toMatchObject([{ id: "r1", reason: "occupied" }]);
    expect(bob.of("rejected")).toEqual([]);
  });

  test("two maps are two worlds: a change on one is not heard on the other", async () => {
    const { enter } = await setup();
    const forestMap = fakeMap("map1");
    const caveMap = fakeMap("map2");
    const ann = fakePlayer("ann");
    const bob = fakePlayer("bob");
    await enter(ann, forestMap);
    await enter(bob, caveMap);
    ann.sends(wrap("map1", ask("r1", move("t1", 160, 96))));
    expect(bob.of("patches")).toEqual([]);
    expect(getMapAuthority(caveMap)!.revision).toBe(0);
  });

  test("a message about another map than the one the player is on is ignored", async () => {
    const { enter } = await setup();
    const map = fakeMap("map1");
    const ann = fakePlayer("ann");
    await enter(ann, map);
    ann.sends(wrap("map2", ask("r1", move("t1", 160, 96))));
    expect(getMapAuthority(map)!.revision).toBe(0);
  });
});

describe("changing map and leaving", () => {
  test("a player who goes to another map is disconnected from the one they left", async () => {
    const { enter } = await setup();
    const forestMap = fakeMap("map1");
    const caveMap = fakeMap("map2");
    const ann = fakePlayer("ann");
    await enter(ann, forestMap);
    const first = getMapAuthority(forestMap)!;
    expect(first.connections).toBe(1);

    await enter(ann, caveMap); // no onLeave: the server does not always call it
    expect(first.connections).toBe(0);
    expect(getMapAuthority(caveMap)!.connections).toBe(1);

    ann.emitted.length = 0;
    first.apply({ type: "element.move", id: "t1", x: 5, y: 5 });
    expect(ann.emitted).toEqual([]);
  });

  test("a player who went away without a hook is dropped the first time something is sent to them", async () => {
    const { enter } = await setup();
    const map = fakeMap("map1");
    const ann = fakePlayer("ann");
    await enter(ann, map);
    const authority = getMapAuthority(map)!;
    ann.goTo(null); // gone, and nothing told us
    ann.emitted.length = 0;
    authority.apply({ type: "element.move", id: "t1", x: 5, y: 5 });
    expect(ann.emitted).toEqual([]);
    expect(authority.connections).toBe(0);
  });

  test("leaving ends the connection", async () => {
    const { module, enter } = await setup();
    const map = fakeMap("map1");
    const ann = fakePlayer("ann");
    await enter(ann, map);
    module.map.onLeave(ann, map);
    expect(getMapAuthority(map)!.connections).toBe(0);
  });

  test("leaving a map the player is no longer connected to does not touch the one they are on", async () => {
    const { module, enter } = await setup();
    const forestMap = fakeMap("map1");
    const caveMap = fakeMap("map2");
    const ann = fakePlayer("ann");
    await enter(ann, forestMap);
    await enter(ann, caveMap);
    module.map.onLeave(ann, forestMap); // late: the player is already on the cave
    expect(getMapAuthority(caveMap)!.connections).toBe(1);
  });

  test("joining twice leaves one connection", async () => {
    const { module, enter } = await setup();
    const map = fakeMap("map1");
    const ann = fakePlayer("ann");
    await enter(ann, map);
    await module.map.onJoin(ann, map);
    expect(getMapAuthority(map)!.connections).toBe(1);
  });
});

describe("hooks that run more than once", () => {
  test("one authority per map, however often the map is loaded", async () => {
    const onReady = vi.fn();
    const { module } = await setup({ onReady });
    const map = fakeMap("map1");
    await module.map.onLoad(map);
    await module.map.onLoad(map);
    await module.map.onLoad(map);
    expect(onReady).toHaveBeenCalledOnce();
    expect(await whenMapAuthority(map)).toBe(getMapAuthority(map));
  });

  test("player messages are bound once per player, however often they join", async () => {
    const { module } = await setup();
    const ann = fakePlayer("ann");
    const on = vi.spyOn(ann, "on");
    module.player.onConnected(ann);
    module.player.onJoinMap(ann);
    module.player.onConnected(ann);
    expect(on).toHaveBeenCalledOnce();
  });
});

describe("physics", () => {
  test("gives each element with a hitbox a collider, one namespace each, in world pixels", async () => {
    const { enter } = await setup();
    const map = fakeMap("map1");
    await enter(fakePlayer("ann"), map);
    // t1 at (128, 96) is a 64x96 tree with a trunk at (16, 70) of 32x20; the house has one too
    expect(map.hitboxes.get("map-builder/t1")).toEqual([{ id: "t1", x: 144, y: 166, width: 32, height: 20 }]);
    expect(map.hitboxes.get("map-builder/home")).toEqual([{ id: "home", x: 640, y: 384, width: 128, height: 64 }]);
  });

  test("a change only touches the collider of the element that changed", async () => {
    const { enter } = await setup();
    const map = fakeMap("map1");
    await enter(fakePlayer("ann"), map);
    const authority = getMapAuthority(map)!;
    map.replaceStreamedStaticHitboxes.mockClear();

    authority.apply({ type: "element.move", id: "t1", x: 300, y: 300 });
    expect(map.replaceStreamedStaticHitboxes).toHaveBeenCalledOnce();
    expect(map.replaceStreamedStaticHitboxes).toHaveBeenCalledWith("map-builder/t1", [{ id: "t1", x: 316, y: 370, width: 32, height: 20 }]);
  });

  test("a removed element loses its collider, an added one gets one", async () => {
    const { enter } = await setup();
    const map = fakeMap("map1");
    await enter(fakePlayer("ann"), map);
    const authority = getMapAuthority(map)!;
    authority.apply({ type: "element.remove", id: "t1" });
    expect(map.hitboxes.has("map-builder/t1")).toBe(false);
    authority.apply({ type: "element.add", element: { id: "n", kind: "tree", x: 10, y: 10 } });
    expect(map.hitboxes.get("map-builder/n")).toBeDefined();
  });

  test("an element without a hitbox gets no collider", async () => {
    const { enter } = await setup();
    const map = fakeMap("map1");
    await enter(fakePlayer("ann"), map);
    getMapAuthority(map)!.apply({ type: "element.add", element: { id: "ghost", kind: "wood", x: 1, y: 1 } });
    expect(map.hitboxes.has("map-builder/ghost")).toBe(false);
  });

  test("changes made by players move colliders too, and the physics world rebuilt puts them all back", async () => {
    const { module, enter } = await setup();
    const map = fakeMap("map1");
    const ann = fakePlayer("ann");
    await enter(ann, map);
    ann.sends(wrap("map1", ask("r1", move("t1", 300, 300))));
    expect(map.hitboxes.get("map-builder/t1")).toEqual([{ id: "t1", x: 316, y: 370, width: 32, height: 20 }]);

    map.hitboxes.clear(); // RPGJS wipes its physics world when it reloads the map
    module.map.onPhysicsInit(map);
    expect(map.hitboxes.get("map-builder/t1")).toEqual([{ id: "t1", x: 316, y: 370, width: 32, height: 20 }]);
    expect(map.hitboxes.get("map-builder/home")).toBeDefined();
  });

  test("can be turned off", async () => {
    const { enter } = await setup({ physics: false });
    const map = fakeMap("map1");
    await enter(fakePlayer("ann"), map);
    expect(map.replaceStreamedStaticHitboxes).not.toHaveBeenCalled();
  });
});

describe("events", () => {
  test("become RPGJS events, with their own prefix and their graphic", async () => {
    const { enter } = await setup();
    const map = fakeMap("map1");
    await enter(fakePlayer("ann"), map);
    await settle();
    const event = map.events.get("builder:chest-1")!;
    expect(event).toMatchObject({ x: 300, y: 300, graphic: "chest" });
    expect(event.definition.name).toBe("pickup");
  });

  test("follow the map: one added, one moved, one removed", async () => {
    const { enter } = await setup();
    const map = fakeMap("map1");
    await enter(fakePlayer("ann"), map);
    const authority = getMapAuthority(map)!;

    authority.apply([{ type: "element.remove", id: "t1" }, { type: "event.add", event: { id: "wood-1", kind: "loot", x: 128, y: 96, graphic: "wood" } }]);
    await settle();
    expect(map.events.get("builder:wood-1")).toMatchObject({ x: 128, y: 96, graphic: "wood" });

    authority.apply({ type: "event.move", id: "wood-1", x: 200, y: 210 });
    await settle();
    expect(map.events.get("builder:wood-1")!.teleports).toEqual([{ x: 200, y: 210 }]);

    authority.apply({ type: "event.remove", id: "wood-1" });
    await settle();
    expect(map.events.has("builder:wood-1")).toBe(false);
  });

  test("let the game say what they do: its hooks are kept, and the graphic is still set", async () => {
    const onAction = vi.fn();
    const { enter } = await setup({ events: { define: (event) => (event.kind === "pickup" ? { hooks: { onAction }, hitbox: { width: 16, height: 16 } } : undefined) } });
    const map = fakeMap("map1");
    await enter(fakePlayer("ann"), map);
    await settle();
    const event = map.events.get("builder:chest-1")!;
    expect(event.definition.onAction).toBe(onAction);
    expect(event.graphic).toBe("chest");
    expect(map.createDynamicEvent).toHaveBeenCalledWith(expect.objectContaining({ hitbox: { width: 16, height: 16 } }));
  });

  test("are put back when the map is loaded again, since RPGJS wipes the events it did not define", async () => {
    const { module, enter } = await setup();
    const map = fakeMap("map1");
    await enter(fakePlayer("ann"), map);
    await settle();
    map.events.clear(); // reloadMapEvents
    await module.map.onLoad(map);
    await settle();
    expect(map.events.has("builder:chest-1")).toBe(true);
    expect(map.createDynamicEvent).toHaveBeenCalledTimes(2);
  });

  test("never create the same event twice", async () => {
    const { module, enter } = await setup();
    const map = fakeMap("map1");
    await enter(fakePlayer("ann"), map);
    await module.map.onLoad(map);
    await module.map.onLoad(map);
    await settle();
    expect(map.createDynamicEvent).toHaveBeenCalledOnce();
  });

  test("can use another prefix, or be left alone", async () => {
    const custom = await setup({ events: { idPrefix: "mb-" } });
    const map = fakeMap("map1");
    await custom.enter(fakePlayer("ann"), map);
    await settle();
    expect(map.events.has("mb-chest-1")).toBe(true);

    const off = await setup({ events: false });
    const other = fakeMap("map1");
    await off.enter(fakePlayer("bob"), other);
    await settle();
    expect(other.createDynamicEvent).not.toHaveBeenCalled();
  });

  test("a failure creating an event is reported and does not stop the others", async () => {
    const onError = vi.fn();
    const { enter } = await setup({ onError });
    const map = fakeMap("map1");
    map.createDynamicEvent.mockRejectedValueOnce(new Error("rpg refused"));
    await enter(fakePlayer("ann"), map);
    await settle();
    expect(onError).toHaveBeenCalled();
    getMapAuthority(map)!.apply({ type: "event.add", event: { id: "e2", kind: "k", x: 1, y: 1 } });
    await settle();
    expect(map.events.has("builder:e2")).toBe(true);
  });
});

describe("persistence and options", () => {
  test("a map is kept in the store it is given, under its own id", async () => {
    const store = memoryMapStore();
    const { enter } = await setup({ persist: () => store });
    const map = fakeMap("map1");
    await enter(fakePlayer("ann"), map);
    getMapAuthority(map)!.apply({ type: "element.move", id: "t1", x: 1, y: 1 });
    await getMapAuthority(map)!.flush();
    expect((await store.load("map1"))!.snapshot.revision).toBe(1);
  });

  test("a store can be asked to write often", async () => {
    const store = memoryMapStore();
    const { enter } = await setup({ persist: () => ({ store, snapshotEvery: 1 }) });
    const map = fakeMap("map1");
    await enter(fakePlayer("ann"), map);
    getMapAuthority(map)!.apply({ type: "element.move", id: "t1", x: 1, y: 1 });
    await getMapAuthority(map)!.flush();
    expect((await store.load("map1"))!.snapshot.revision).toBe(1);
  });

  test("the actor of the rules can be chosen", async () => {
    const seen: unknown[] = [];
    const { enter } = await setup({
      actor: (player) => ({ name: `player-${player.id}` }),
      authority: { pipeline: { move: [(_i, c, next) => (seen.push(c.actor), next())] } },
    });
    const map = fakeMap("map1");
    const ann = fakePlayer("ann");
    await enter(ann, map);
    ann.sends(wrap("map1", ask("r1", move("t1", 1, 1))));
    expect(seen).toEqual([{ name: "player-ann" }]);
  });

  test("a map with no definition is left alone: no authority, no message, no collider", async () => {
    const { enter } = await setup({ maps: {} });
    const map = fakeMap("map1");
    const ann = fakePlayer("ann");
    await enter(ann, map);
    expect(getMapAuthority(map)).toBeUndefined();
    expect(ann.emitted).toEqual([]);
    expect(map.replaceStreamedStaticHitboxes).not.toHaveBeenCalled();
  });

  test("a catalog on the server is what the clients can place from", async () => {
    const { enter } = await setup({ authority: { placement: { catalog } } });
    const map = fakeMap("map1");
    const ann = fakePlayer("ann");
    await enter(ann, map);
    ann.sends(wrap("map1", ask("r1", { type: "element.place", catalogId: "oak", x: 400, y: 400 })));
    expect(getMapAuthority(map)!.model.getElement("oak-1")).toBeDefined();
    expect(map.hitboxes.has("map-builder/oak-1")).toBe(true);
  });
});
