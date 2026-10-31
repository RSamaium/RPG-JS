import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { createModule, defineModule } from "@rpgjs/common";
import { RpgPlayer, RpgServer } from "../src";
import { RpgClient } from "../../client/src";

const Potion = { id: "Potion", name: "Potion", price: 100, consumable: true, _type: "item" as const };
const Sword = { id: "Sword", name: "Sword", price: 100, _type: "weapon" as const };

const hooks = {
  onItemAdd: vi.fn(),
  onItemRemove: vi.fn(),
  onItemUse: vi.fn(),
  onItemEquip: vi.fn(),
  onGoldChange: vi.fn(),
  onTick: vi.fn(),
};

const serverModule = defineModule<RpgServer>({
  maps: [{ id: "hooks-map", file: "" }],
  database: { Potion, Sword },
  player: {
    async onConnected(player) {
      await player.changeMap("hooks-map", { x: 100, y: 100 });
    },
    onItemAdd: hooks.onItemAdd,
    onItemRemove: hooks.onItemRemove,
    onItemUse: hooks.onItemUse,
    onItemEquip: hooks.onItemEquip,
    onGoldChange: hooks.onGoldChange,
  },
  map: {
    onTick: hooks.onTick,
  },
});

let player: RpgPlayer;
let fixture: TestingFixture;

beforeEach(async () => {
  Object.values(hooks).forEach((hook) => hook.mockClear());
  fixture = await testing(createModule("HooksModule", [{ server: serverModule, client: defineModule<RpgClient>({}) }]));
  const client = await fixture.createClient();
  player = await client.waitForMapChange("hooks-map");
  Object.values(hooks).forEach((hook) => hook.mockClear());
});

afterEach(async () => {
  await fixture.clear();
});

describe("module hooks of items and gold", () => {
  test("onItemAdd and onItemRemove", async () => {
    player.addItem("Potion", 3);
    await vi.waitFor(() => expect(hooks.onItemAdd).toHaveBeenCalledWith(player, { itemId: "Potion", quantity: 3 }));
    player.removeItem("Potion", 2);
    await vi.waitFor(() => expect(hooks.onItemRemove).toHaveBeenCalledWith(player, { itemId: "Potion", quantity: 2 }));
  });

  test("onItemUse, and the item is still consumed", async () => {
    player.addItem("Potion", 1);
    player.useItem("Potion");
    await vi.waitFor(() => expect(hooks.onItemUse).toHaveBeenCalledWith(player, { itemId: "Potion", quantity: 1 }));
    expect(player.hasItem("Potion")).toBe(false);
  });

  test("onItemEquip", async () => {
    player.addItem("Sword", 1);
    player.equip("Sword");
    await vi.waitFor(() =>
      expect(hooks.onItemEquip).toHaveBeenCalledWith(player, { itemId: "Sword", quantity: 1, equipped: true }),
    );
  });

  test("onGoldChange carries the new gold and the delta, and is not called without change", async () => {
    player.gold = 50;
    await vi.waitFor(() => expect(hooks.onGoldChange).toHaveBeenCalledWith(player, { gold: 50, delta: 50 }));
    player.gold -= 20;
    await vi.waitFor(() => expect(hooks.onGoldChange).toHaveBeenCalledWith(player, { gold: 30, delta: -20 }));
    hooks.onGoldChange.mockClear();
    player.gold = 30;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(hooks.onGoldChange).not.toHaveBeenCalled();
  });

  test("buying an item changes the gold through the hook", async () => {
    player.gold = 500;
    hooks.onGoldChange.mockClear();
    player.buyItem("Potion", 2);
    await vi.waitFor(() => expect(hooks.onGoldChange).toHaveBeenCalledWith(player, { gold: 300, delta: -200 }));
  });
});

describe("module hook map.onTick", () => {
  test("is called for a map that has a player", async () => {
    const map = player.getCurrentMap() as any;
    map.setAutoTick(true);
    await vi.waitFor(() => expect(hooks.onTick).toHaveBeenCalled(), { timeout: 2000 });
    map.setAutoTick(false);
    const [mapArg, payload] = hooks.onTick.mock.calls[0];
    expect(mapArg).toBe(map);
    expect(typeof payload.deltaMs).toBe("number");
    expect(typeof payload.tick).toBe("number");
  });
});
