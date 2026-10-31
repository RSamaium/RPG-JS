import { describe, expect, test, vi } from "vitest";
import { LOOT_COMPONENT_ID } from "@rpgjs/common";
import { RpgMapLoot, isLootEvent } from "../src/loot";

const createMap = (players: any[] = [], database: Record<string, any> = {}) => {
  const events = new Map<string, any>();
  const map: any = {
    data: () => ({ width: 400, height: 400 }),
    database: () => ({ potion: { id: "potion", name: "Potion", icon: "potion-icon" }, ...database }),
    getPlayers: () => players,
    getEvent: (id: string) => events.get(id),
    createDynamicEvent: vi.fn(async (placement: any) => {
      const id = placement.scenarioOwnerId ? `${placement.id}::${placement.scenarioOwnerId}` : placement.id;
      const event: any = {
        id,
        x: () => placement.x,
        y: () => placement.y,
        hitbox: () => ({ w: placement.hitbox.width, h: placement.hitbox.height }),
        setComponentsCenter: vi.fn(),
        remove: vi.fn(() => events.delete(id)),
      };
      placement.event.onInit.call(event);
      event.onAction = placement.event.onAction;
      events.set(id, event);
      return id;
    }),
  };
  const loot = new RpgMapLoot(map);
  return { map, events, loot };
};

const createPlayer = (id: string, x: number, y: number) => ({
  id,
  hp: 10,
  gold: 0,
  x: () => x,
  y: () => y,
  hitbox: () => ({ w: 32, h: 32 }),
  addItem: vi.fn((item) => ({ name: () => "Potion", item })),
  useItem: vi.fn(),
  showNotification: vi.fn(),
  t: (key: string, params: unknown) => `${key}:${JSON.stringify(params)}`,
});

const later = (ms: number) => Date.now() + ms;

describe("RpgMapLoot", () => {
  test("spawns one through pickup per gold pile and item, inside the map", async () => {
    const { events, loot } = createMap([], { potion: { id: "potion", name: "Potion", icon: "potion-icon", loot: { color: "#f00", sound: "glass" } } });
    const ids = await loot.drop({ x: 2, y: 200, rewards: { gold: 10, items: ["potion"] } });

    expect(ids).toHaveLength(3);
    for (const event of events.values()) {
      expect(isLootEvent(event)).toBe(true);
      expect(event.through).toBe(true);
      expect(event.x()).toBeGreaterThanOrEqual(0);
    }
    const potion = [...events.values()].at(-1);
    const [[definition]] = potion.setComponentsCenter.mock.calls[0];
    expect(definition).toMatchObject({
      id: LOOT_COMPONENT_ID,
      props: { kind: "item", amount: 1, icon: "potion-icon", name: "Potion", color: "#f00", sound: "glass" },
    });
  });

  test("magnet: collects pickups in range once landed, and lets the client fly them", async () => {
    const hero = createPlayer("hero", 184, 184);
    const { events, loot } = createMap([hero]);
    const onCollect = vi.fn();
    await loot.drop({ x: 200, y: 200, rewards: { gold: 7, items: ["potion"] }, spread: [10, 10], magnet: { radius: 40 }, onCollect });
    const [first] = events.values();

    loot.step(later(200));
    expect(hero.gold).toBe(0);

    loot.step(later(1500));
    expect(hero.gold).toBe(7);
    expect(hero.addItem).toHaveBeenCalledWith("potion", 1);
    expect(onCollect).toHaveBeenCalledTimes(3);
    expect(first.remove).toHaveBeenCalledWith({ reason: "collected", data: { collectorId: "hero" }, timeoutMs: 260 });
  });

  test("magnet radius can depend on the player", async () => {
    const hero = createPlayer("hero", 300, 184);
    const { loot } = createMap([hero]);
    await loot.drop({ x: 200, y: 200, rewards: { gold: 3 }, spread: [0, 0], magnet: { radius: (player: any) => (player.id === "hero" ? 200 : 0) } });
    loot.step(later(1500));
    expect(hero.gold).toBe(3);
  });

  test("touch: only collects when the player stands on the pickup", async () => {
    const near = createPlayer("near", 150, 184);
    const { loot } = createMap([near]);
    await loot.drop({ x: 200, y: 200, rewards: { gold: 3 }, spread: [0, 0], pickup: "touch" });
    loot.step(later(1500));
    expect(near.gold).toBe(0);
  });

  test("action: collects only from the action key", async () => {
    const hero = createPlayer("hero", 184, 184);
    const { events, loot } = createMap([hero]);
    await loot.drop({ x: 200, y: 200, rewards: { gold: 3 }, spread: [0, 0], pickup: "action", flightMs: 0, magnet: { delayMs: 0 } });
    loot.step(later(1500));
    expect(hero.gold).toBe(0);

    const [event] = events.values();
    event.onAction.call(event, hero);
    expect(hero.gold).toBe(3);
  });

  test("canCollect keeps the pickup on the ground", async () => {
    const hero = createPlayer("hero", 184, 184);
    const { events, loot } = createMap([hero]);
    await loot.drop({ x: 200, y: 200, rewards: { items: ["potion"] }, spread: [0, 0], canCollect: () => false });
    loot.step(later(1500));
    expect(hero.addItem).not.toHaveBeenCalled();
    expect(events.size).toBe(1);
  });

  test("uses items flagged loot.use instead of keeping them", async () => {
    const hero = createPlayer("hero", 184, 184);
    const { loot } = createMap([hero], { apple: { id: "apple", name: "Apple", loot: { use: true } } });
    await loot.drop({ x: 200, y: 200, rewards: { items: [{ itemId: "apple", amount: 2 }] }, spread: [0, 0] });
    loot.step(later(1500));
    expect(hero.useItem).toHaveBeenCalledTimes(2);
  });

  test("player loot is scenario-scoped and ignored by other players", async () => {
    const owner = createPlayer("owner", 500, 500);
    const other = createPlayer("other", 184, 184);
    const { map, loot } = createMap([owner, other]);
    await loot.drop({ x: 200, y: 200, rewards: { gold: 3 }, ownership: "player", owner: owner as any });

    expect(map.createDynamicEvent.mock.calls[0][0]).toMatchObject({ mode: "scenario", scenarioOwnerId: "owner" });
    loot.step(later(2000));
    expect(other.gold).toBe(0);
  });

  test("expires uncollected pickups, rare ones twice as late", async () => {
    const { events, loot } = createMap([], { ruby: { id: "ruby", loot: { rarity: "rare" } } });
    await loot.drop({ x: 200, y: 200, rewards: { gold: 1, items: ["ruby"] }, despawnMs: 1000 });
    const [coin, ruby] = events.values();
    loot.step(later(1100));
    expect(coin.remove).toHaveBeenCalledWith({ reason: "expired", timeoutMs: 400 });
    expect(ruby.remove).not.toHaveBeenCalled();
    loot.step(later(2100));
    expect(ruby.remove).toHaveBeenCalled();
  });
});
