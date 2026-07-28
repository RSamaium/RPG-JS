import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createModule, defineModule } from "@rpgjs/common";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { registerHotbarEntryType, RpgPlayer } from "../src";

const onHotbarChange = vi.fn();

const serverModule = defineModule({
  maps: [{ id: "hotbar-map", file: "" }],
  database: {
    fire: {
      id: "fire",
      _type: "skill",
      name: "Fire",
      key: "3",
      spCost: 4,
      hitRate: 1,
    },
    ice: {
      id: "ice",
      _type: "skill",
      name: "Ice",
      spCost: 2,
      hitRate: 1,
    },
    potion: {
      id: "potion",
      _type: "item",
      name: "Potion",
      consumable: true,
      hitRate: 1,
    },
  },
  player: {
    async onConnected(player) {
      await player.changeMap("hotbar-map", { x: 0, y: 0 });
    },
    onHotbarChange,
  },
});

let fixture: TestingFixture;
let player: RpgPlayer;

beforeEach(async () => {
  onHotbarChange.mockClear();
  fixture = await testing(createModule("HotbarTest", [{
    server: serverModule,
    client: defineModule({}),
  }]));
  const client = await fixture.createClient();
  player = await client.waitForMapChange("hotbar-map");
  player.sp = 20;
  player.learnSkill("fire");
  player.learnSkill("ice");
  player.addItem("potion");
});

afterEach(async () => {
  await fixture.clear();
});

describe("player hotbar", () => {
  test("seeds Studio numeric shortcuts before remaining skills and items", () => {
    const hotbar = player.initializeHotbar();

    expect(hotbar.initialized).toBe(true);
    expect(hotbar.slots).toHaveLength(10);
    expect(hotbar.slots[0]).toEqual({ type: "skill", id: "ice" });
    expect(hotbar.slots[1]).toEqual({ type: "item", id: "potion" });
    expect(hotbar.slots[2]).toEqual({ type: "skill", id: "fire" });
  });

  test("moves duplicate entries and preserves intentional empty slots", () => {
    player.initializeHotbar();
    player.assignHotbarSlot(6, { type: "skill", id: "fire" });
    player.clearHotbarSlot(1);

    const hotbar = player.getHotbar();
    expect(hotbar.slots[2]).toBeNull();
    expect(hotbar.slots[6]).toEqual({ type: "skill", id: "fire" });
    expect(hotbar.slots[1]).toBeNull();
    expect(player.initializeHotbar().slots[1]).toBeNull();
  });

  test("uses entries authoritatively and rejects unavailable assignments", () => {
    player.initializeHotbar([{ type: "skill", id: "fire" }]);

    player.useHotbarSlot(0);
    expect(player.sp).toBe(16);
    expect(() =>
      player.assignHotbarSlot(1, { type: "skill", id: "unknown" })
    ).toThrow('Skill "unknown" is not learned');
    expect(() => player.assignHotbarSlot(10, { type: "skill", id: "fire" }))
      .toThrow(RangeError);
  });

  test("includes hotbar choices in player snapshots", () => {
    player.initializeHotbar();
    player.assignHotbarSlot(8, { type: "item", id: "potion" });

    expect(player.snapshot()).toMatchObject({
      hotbar: {
        version: 2,
        initialized: true,
        capacity: 10,
        activeSlot: null,
        slots: expect.arrayContaining([{ type: "item", id: "potion" }]),
      },
    });
  });

  test("waits for the player loadout before automatic initialization", () => {
    player.forgetSkill("fire");
    player.forgetSkill("ice");
    player.removeItem("potion");

    expect(player.initializeHotbar().initialized).toBe(false);

    player.learnSkill("fire");
    expect(player.initializeHotbar()).toMatchObject({
      initialized: true,
      slots: expect.arrayContaining([{ type: "skill", id: "fire" }]),
    });
  });

  test("seeds an open hotbar when the loadout arrives later", async () => {
    player.forgetSkill("fire");
    player.forgetSkill("ice");
    player.removeItem("potion");

    await player.showHotbar();
    expect(player.getHotbar().initialized).toBe(false);

    player.learnSkill("fire");
    expect(player.getHotbar()).toMatchObject({
      initialized: true,
      slots: expect.arrayContaining([{ type: "skill", id: "fire" }]),
    });
  });

  test("keeps locked assignments while capacity changes dynamically", () => {
    player.configureHotbar({
      capacity: current => current.level,
      lockedSlotHint: (_current, slot) => `Reach level ${slot + 1}`,
    });
    player.level = 3;
    player.initializeHotbar();
    player.selectHotbarSlot(2);

    expect(player.getHotbar()).toMatchObject({
      capacity: 3,
      activeSlot: 2,
    });
    expect(player.getHotbarLockedSlotHint(3)).toBe("Reach level 4");
    expect(() =>
      player.assignHotbarSlot(3, { type: "skill", id: "fire" }),
    ).toThrow(RangeError);

    player.configureHotbar({ capacity: 10 });
    player.assignHotbarSlot(8, { type: "skill", id: "fire" });
    player.configureHotbar({ capacity: 3 });
    expect(player.getHotbar().slots[8]).toEqual({ type: "skill", id: "fire" });
    player.configureHotbar({ capacity: 10 });
    expect(player.getHotbar().slots[8]).toEqual({ type: "skill", id: "fire" });
  });

  test("supports custom authoritative entry types", () => {
    const use = vi.fn();
    const unregister = registerHotbarEntryType({
      type: "emote",
      validate(_player, id) {
        if (id !== "wave") throw new Error("Unknown emote");
      },
      resolve(_player, id) {
        return {
          id,
          type: "emote",
          name: "Wave",
          usable: true,
          activation: { mode: "select" },
        };
      },
      use(_player, id, context) {
        use(id, context.slot);
      },
    });

    try {
      player.assignHotbarSlot(4, { type: "emote", id: "wave" });
      player.useHotbarSlot(4);
      expect(use).toHaveBeenCalledWith("wave", 4);
    } finally {
      unregister();
    }
  });
});
