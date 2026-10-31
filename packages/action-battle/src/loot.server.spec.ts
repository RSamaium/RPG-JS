import { afterEach, describe, expect, test, vi } from "vitest";
import { dropActionBattleLoot, isActionBattleLoot } from "./loot.server";
import { ACTION_BATTLE_LOOT_COMPONENT_ID } from "./core/loot";

const createMap = (players: any[] = []) => {
  const events = new Map<string, any>();
  const map: any = {
    data: () => ({ width: 400, height: 400 }),
    database: () => ({ potion: { id: "potion", name: "Potion", icon: "potion-icon" } }),
    getPlayers: () => players,
    getEvent: (id: string) => events.get(id),
    createDynamicEvent: vi.fn(async (placement: any, options?: any) => {
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
      events.set(id, event);
      return id;
    }),
  };
  return { map, events };
};

const createPlayer = (id: string, x: number, y: number) => ({
  id,
  hp: 10,
  gold: 0,
  x: () => x,
  y: () => y,
  hitbox: () => ({ w: 32, h: 32 }),
  addItem: vi.fn((item) => ({ name: () => "Potion", item })),
  showNotification: vi.fn(),
  playSound: vi.fn(),
  t: (key: string, params: unknown) => `${key}:${JSON.stringify(params)}`,
  getCurrentMap: () => undefined,
});

describe("dropActionBattleLoot", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("spawns one through pickup per gold pile and item, inside the map", async () => {
    const { map, events } = createMap();
    const ids = await dropActionBattleLoot(map, {
      x: 2,
      y: 200,
      rewards: { gold: 10, items: ["potion"] },
    });

    expect(ids).toHaveLength(3);
    for (const event of events.values()) {
      expect(isActionBattleLoot(event)).toBe(true);
      expect(event.through).toBe(true);
      expect(event.x()).toBeGreaterThanOrEqual(0);
    }
    const potion = [...events.values()].at(-1);
    const [[definition]] = potion.setComponentsCenter.mock.calls[0];
    expect(definition).toMatchObject({
      id: ACTION_BATTLE_LOOT_COMPONENT_ID,
      props: { kind: "item", amount: 1, icon: "potion-icon" },
    });
  });

  test("collects pickups in range after the pop and lets the client fly them", async () => {
    vi.useFakeTimers();
    const hero = createPlayer("hero", 184, 184);
    const { map, events } = createMap([hero]);
    const onCollect = vi.fn();
    await dropActionBattleLoot(map, {
      x: 200,
      y: 200,
      rewards: { gold: 7, items: ["potion"] },
      spread: [10, 10],
      magnetRadius: 40,
      onCollect,
    });
    const [first] = events.values();

    vi.advanceTimersByTime(300);
    expect(hero.gold).toBe(0);

    vi.advanceTimersByTime(1000);
    expect(hero.gold).toBe(7);
    expect(hero.addItem).toHaveBeenCalledWith("potion", 1);
    expect(onCollect).toHaveBeenCalledTimes(3);
    expect(first.remove).toHaveBeenCalledWith({
      reason: "collected",
      data: { collectorId: "hero" },
      timeoutMs: 260,
    });
  });

  test("attacker loot is scenario-scoped and ignored by other players", async () => {
    vi.useFakeTimers();
    const owner = createPlayer("owner", 500, 500);
    const other = createPlayer("other", 184, 184);
    const { map } = createMap([owner, other]);
    await dropActionBattleLoot(map, {
      x: 200,
      y: 200,
      rewards: { gold: 3 },
      ownership: "attacker",
      owner: owner as any,
    });

    expect(map.createDynamicEvent.mock.calls[0][0]).toMatchObject({
      mode: "scenario",
      scenarioOwnerId: "owner",
    });
    vi.advanceTimersByTime(2000);
    expect(other.gold).toBe(0);
  });

  test("expires uncollected pickups", async () => {
    vi.useFakeTimers();
    const { map, events } = createMap();
    await dropActionBattleLoot(map, { x: 200, y: 200, rewards: { gold: 1 }, despawnMs: 1000 });
    const [event] = events.values();
    vi.advanceTimersByTime(1100);
    expect(event.remove).toHaveBeenCalledWith({ reason: "expired", timeoutMs: 400 });
  });
});
