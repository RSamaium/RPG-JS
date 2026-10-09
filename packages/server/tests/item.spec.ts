import { beforeEach, test, expect, afterEach, describe, vi } from "vitest";
import { testing, waitForSyncComplete, TestingFixture } from "@rpgjs/testing";
import { defineModule, createModule } from "@rpgjs/common";
import { RpgEvent, RpgPlayer, RpgServer } from "../src";
import { RpgClient } from "../../client/src";
import { ItemLog } from "../src/logs";
import type { ItemObject } from "../src/Player/ItemManager";
import { syncClass } from "@signe/sync";

// Define test items as objects for database
const TestPotion = {
  id: "TestPotion",
  name: "Test Potion",
  description: "Restores 100 HP",
  price: 200,
  hpValue: 100,
  consumable: true,
  _type: "item" as const,
};

const TestSword = {
  name: "Test Sword",
  description: "A basic sword",
  price: 500,
  atk: 50,
  _type: "weapon" as const,
};

const TestArmor = {
  name: "Test Armor",
  description: "Basic armor",
  price: 300,
  pdef: 30,
  sdef: 20,
  _type: "armor" as const,
};

const TestNonConsumable = {
  name: "Test Non-Consumable",
  description: "Cannot be used",
  price: 100,
  consumable: false,
  _type: "item" as const,
};

const TestExpensiveItem = {
  name: "Expensive Item",
  description: "Very expensive",
  price: 10000,
  _type: "item" as const,
};

const TestNoPriceItem = {
  name: "No Price Item",
  description: "Item without price",
  _type: "item" as const,
};

let player: RpgPlayer;
let clientTesting: any;
let fixture: TestingFixture;

  // Define server module with items in database
  const serverModule = defineModule<RpgServer>({
    maps: [
      {
        id: "test-map",
        file: "",
      },
    ],
    database: {
      TestPotion: TestPotion,
      TestSword: TestSword,
      TestArmor: TestArmor,
      TestNonConsumable: TestNonConsumable,
      TestExpensiveItem: TestExpensiveItem,
      TestNoPriceItem: TestNoPriceItem,
    },
    player: {
      async onConnected(player) {
        await player.changeMap("test-map", { x: 100, y: 100 });
      },
    },
  });

  // Define client module
  const clientModule = defineModule<RpgClient>({
    // Client-side logic
  });


beforeEach(async () => {

  const myModule = createModule("TestModule", [
    {
      server: serverModule,
      client: clientModule,
    },
  ]);

  fixture = await testing(myModule);
  clientTesting = await fixture.createClient();
  player = await clientTesting.waitForMapChange("test-map");
});

afterEach(async () => {
  await fixture.clear();
});


describe("Item Management - Basic Operations", () => {
  
  test("should add item ", async () => {
    const item = player.addItem(TestPotion, 5);
    expect(item).toBeDefined();
    expect(item.id()).toBe("TestPotion");
    expect(item.quantity()).toBe(5);
    expect(item.name()).toBe("Test Potion");
  });
  
  test("should add item using string ID", () => {
    const item = player.addItem("TestPotion", 5);
    expect(item).toBeDefined();
    expect(item.id()).toBe("TestPotion");
    expect(item.quantity()).toBe(5);
    expect(item.name()).toBe("Test Potion");
  });

  test("should sync cloneable event items and equipments initialized before sync", () => {
    const event = new RpgEvent();
    event.id = "enemy-event";
    event.setMap(player.getCurrentMap()!);
    event.execMethod = vi.fn() as any;
    event.addItem("TestSword", 1);
    event.equip("TestSword", true);

    const packets: any[] = [];
    const memory: Record<string, any> = {};
    const setPath = (target: Record<string, any>, path: string, value: any) => {
      const parts = path.split(".");
      let current = target;
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]] ??= {};
      }
      current[parts[parts.length - 1]] = value;
    };

    syncClass(event, {
      onSync(values) {
        const packet: Record<string, any> = {};
        for (const [path, value] of values) {
          setPath(packet, path, value);
          setPath(memory, path, value);
        }
        structuredClone({ type: "sync", value: packet });
        packets.push(packet);
        values.clear();
      },
    });

    expect(packets).toContainEqual({
      items: {
        "0": expect.objectContaining({
          id: "TestSword",
          name: "Test Sword",
          quantity: 1,
        }),
      },
    });
    expect(packets).toContainEqual({
      equipments: {
        "0": expect.objectContaining({
          id: "TestSword",
          name: "Test Sword",
          quantity: 1,
        }),
      },
    });
    expect(memory).toEqual(
      expect.objectContaining({
        items: {
          "0": expect.objectContaining({
            id: "TestSword",
            name: "Test Sword",
            quantity: 1,
          }),
        },
        equipments: {
          "0": expect.objectContaining({
            id: "TestSword",
            name: "Test Sword",
            quantity: 1,
          }),
        },
      })
    );
  });
  

  test("should add item using object", () => {
    const customItem: ItemObject = {
      id: "custom-item",
      name: "Custom Item",
      description: "A custom item",
      price: 150,
      onAdd(player) {
        // Hook test
      },
    };
    const item = player.addItem(customItem, 3);
    expect(item).toBeDefined();
    expect(item.id()).toBe("custom-item");
    expect(item.quantity()).toBe(3);
    expect(item.name()).toBe("Custom Item");
  });

  test("should add item without ID (auto-generated)", () => {
    const customItem: ItemObject = {
      name: "Auto ID Item",
      price: 100,
    };
    const item = player.addItem(customItem, 1);
    expect(item).toBeDefined();
    expect(item.id()).toMatch(/^item-\d+$/);
    expect(item.name()).toBe("Auto ID Item");
  });

  test("should increment quantity when adding existing item", () => {
    player.addItem("TestPotion", 3);
    const item = player.addItem("TestPotion", 2);
    expect(item.quantity()).toBe(5);
  });

  test("should add item when player is in Lobby (no map)", async () => {
    const newFixture = await testing();
    const newClient = await newFixture.createClient();
    const newPlayer = newClient.player;

    newPlayer.getCurrentMap()?.addInDatabase("TestPotion", TestPotion);
    const item = newPlayer.addItem("TestPotion", 1);
    expect(item).toBeDefined();
    expect(item.id()).toBe("TestPotion");
    expect(item.quantity()).toBe(1);
    await newFixture.clear();
  });

  test("should throw error when adding item with invalid string ID", () => {
    expect(() => {
      player.addItem("NonExistentItem", 1);
    }).toThrow("The ID=NonExistentItem data is not found in the database");
  });

  test("should get item from inventory", () => {
    player.addItem("TestPotion", 5);
    const item = player.getItem("TestPotion");
    expect(item).toBeDefined();
    expect(item.id()).toBe("TestPotion");
    expect(item.quantity()).toBe(5);
  });

  test("should return undefined when getting non-existent item", () => {
    const item = player.getItem("TestPotion");
    expect(item).toBeUndefined();
  });

  test("should check if player has item", () => {
    expect(player.hasItem("TestPotion")).toBe(false);
    player.addItem("TestPotion", 1);
    expect(player.hasItem("TestPotion")).toBe(true);
  });

  test("should remove item from inventory", () => {
    player.addItem("TestPotion", 5);
    const item = player.removeItem("TestPotion", 2);
    expect(item).toBeDefined();
    expect(item?.quantity()).toBe(3);
  });

  test("should remove item completely when quantity reaches zero", () => {
    player.addItem("TestPotion", 2);
    player.removeItem("TestPotion", 2);
    expect(player.hasItem("TestPotion")).toBe(false);
    const item = player.getItem("TestPotion");
    expect(item).toBeUndefined();
  });

  test("should throw error when removing non-existent item", () => {
    expect(() => {
      player.removeItem("TestPotion", 1);
    }).toThrow();
  });
});

describe("Item Management - Buy and Sell", () => {
  test("should buy item and reduce gold", () => {
    player.gold = 1000;
    const item = player.buyItem("TestPotion", 2);
    expect(item).toBeDefined();
    expect(item.quantity()).toBe(2);
    expect(player.gold).toBe(600); // 1000 - (200 * 2)
  });

  test("should throw error when buying item without price", () => {
    player.gold = 1000;
    expect(() => {
      player.buyItem("TestNoPriceItem", 1);
    }).toThrow();
  });

  test("should throw error when not enough gold", () => {
    player.gold = 100;
    expect(() => {
      player.buyItem("TestExpensiveItem", 1);
    }).toThrow();
  });

  test("should sell item and increase gold", () => {
    player.gold = 1000;
    player.addItem("TestPotion", 3);
    const item = player.sellItem("TestPotion", 2);
    expect(item).toBeDefined();
    expect(player.gold).toBe(1200); // 1000 + (200 / 2 * 2)
    expect(player.getItem("TestPotion")?.quantity()).toBe(1);
  });

  test("should throw error when selling non-existent item", () => {
    expect(() => {
      player.sellItem("TestPotion", 1);
    }).toThrow();
  });

  test("should throw error when selling more items than available", () => {
    player.addItem("TestPotion", 2);
    expect(() => {
      player.sellItem("TestPotion", 5);
    }).toThrow();
  });

  test("should throw error when selling item without price", () => {
    player.addItem("TestNoPriceItem", 1);
    expect(() => {
      player.sellItem("TestNoPriceItem", 1);
    }).toThrow();
  });
});

describe("Item Management - Use Item", () => {
  test("should use consumable item", () => {
    const initialHp = player.hp;
    player.addItem("TestPotion", 1);
    const item = player.useItem("TestPotion");
    expect(item).toBeDefined();
    expect(player.hasItem("TestPotion")).toBe(false);
    // Note: applyEffect might not be implemented in test environment
  });

  test("should throw error when using non-existent item", () => {
    expect(() => {
      player.useItem("TestPotion");
    }).toThrow();
  });

  test("should throw error when using non-consumable item", () => {
    player.addItem("TestNonConsumable", 1);
    expect(() => {
      player.useItem("TestNonConsumable");
    }).toThrow();
  });

  test("should handle hitRate chance (success)", () => {
    // Mock Math.random to return a value that passes hitRate
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.5); // 0.5 < 1.0 (default hitRate)

    player.addItem("TestPotion", 1);
    const item = player.useItem("TestPotion");
    expect(item).toBeDefined();
    expect(player.hasItem("TestPotion")).toBe(false);

    Math.random = originalRandom;
  });

  test("should handle hitRate chance (failure)", () => {
    // Create a potion with low hitRate (10% chance)
    const lowHitRatePotion: ItemObject = {
      id: "LowHitRatePotion",
      name: "Low Hit Rate Potion",
      price: 200,
      consumable: true,
      hitRate: 0.1, // 10% chance
    };
    player.getCurrentMap()?.addInDatabase("LowHitRatePotion", lowHitRatePotion);
    
    // Mock Math.random to return a value that fails hitRate
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.9); // 0.9 > 0.1 (hitRate)

    player.addItem("LowHitRatePotion", 1);
    expect(() => {
      player.useItem("LowHitRatePotion");
    }).toThrow();

    // Item should still be removed even on failure
    expect(player.hasItem("LowHitRatePotion")).toBe(false);

    Math.random = originalRandom;
  });

  test("should use item with custom hitRate", () => {
    const customItem: ItemObject = {
      id: "chance-item",
      name: "Chance Item",
      price: 100,
      consumable: true,
      hitRate: 0.5, // 50% chance
    };
    player.addItem(customItem, 1);

    // Mock Math.random to pass
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.3); // 0.3 < 0.5

    const item = player.useItem("chance-item");
    expect(item).toBeDefined();

    Math.random = originalRandom;
  });
});

describe("Item Management - Equipment", () => {
  test("should equip weapon", () => {
    player.addItem("TestSword", 1);
    player.equip("TestSword", true);
    const item = player.getItem("TestSword");
    expect((item as any).equipped).toBe(true);
    expect(player.equipments().some((eq) => eq.id() === "TestSword")).toBe(
      true
    );
  });

  test("should unequip weapon", () => {
    player.addItem("TestSword", 1);
    player.equip("TestSword", true);
    player.equip("TestSword", false);
    const item = player.getItem("TestSword");
    expect((item as any).equipped).toBe(false);
    expect(player.equipments().some((eq) => eq.id() === "TestSword")).toBe(
      false
    );
  });

  test("should equip armor", () => {
    player.addItem("TestArmor", 1);
    player.equip("TestArmor", true);
    const item = player.getItem("TestArmor");
    expect((item as any).equipped).toBe(true);
  });

  test("should auto add and equip item", () => {
    player.equip("TestSword", "auto");
    const item = player.getItem("TestSword");
    expect(item).toBeDefined();
    expect(item?.quantity()).toBe(1);
    expect((item as any).equipped).toBe(true);
    expect(player.equipments().some((eq) => eq.id() === "TestSword")).toBe(
      true
    );
  });

  test("should not add duplicate when auto equipping existing item", () => {
    player.addItem("TestSword", 2);
    player.equip("TestSword", "auto");
    const item = player.getItem("TestSword");
    expect(item?.quantity()).toBe(2);
  });

  test("should throw error when equipping non-existent item", () => {
    expect(() => {
      player.equip("TestSword", true);
    }).toThrow();
  });

  test("should throw error when equipping regular item (not weapon/armor)", () => {
    player.addItem("TestPotion", 1);
    expect(() => {
      player.equip("TestPotion", true);
    }).toThrow();
  });

  test("should throw error when equipping already equipped item", () => {
    player.addItem("TestSword", 1);
    player.equip("TestSword", true);
    expect(() => {
      player.equip("TestSword", true);
    }).toThrow();
  });
});

describe("Item Management - Parameters (ATK, PDEF, SDEF)", () => {
  test("should calculate attack from equipped weapon", () => {
    player.addItem("TestSword", 1);
    player.equip("TestSword", true);
    expect(player.atk).toBe(50);
  });

  test("should calculate physical defense from equipped armor", () => {
    player.addItem("TestArmor", 1);
    player.equip("TestArmor", true);
    expect(player.pdef).toBe(30);
  });

  test("should calculate skill defense from equipped armor", () => {
    player.addItem("TestArmor", 1);
    player.equip("TestArmor", true);
    expect(player.sdef).toBe(20);
  });

  test("should return 0 for parameters when no equipment", () => {
    expect(player.atk).toBe(0);
    expect(player.pdef).toBe(0);
    expect(player.sdef).toBe(0);
  });

  test("should sum parameters from multiple equipped items", () => {
    const sword2: ItemObject & { atk: number } = {
      id: "sword2",
      name: "Sword 2",
      price: 600,
      atk: 75,
      _type: "weapon" as const,
    };
    player.getCurrentMap()?.addInDatabase("sword2", sword2);

    player.addItem("TestSword", 1);
    player.addItem("sword2", 1);
    player.equip("TestSword", true);
    player.equip("sword2", true);

    // Only one weapon should be equipped at a time typically, but test the sum
    expect(player.atk).toBeGreaterThanOrEqual(50);
  });
});

describe("Item Management - Hooks", () => {
  test("should call onAdd hook when adding item", () => {
    const onAddSpy = vi.fn();
    const customItem: ItemObject = {
      id: "hook-item",
      name: "Hook Item",
      price: 100,
      onAdd: onAddSpy,
    };

    player.addItem(customItem, 1);
    expect(onAddSpy).toHaveBeenCalledWith(player);
  });

  test("should call onRemove hook when removing item", () => {
    const onRemoveSpy = vi.fn();
    const customItem: ItemObject = {
      id: "remove-hook-item",
      name: "Remove Hook Item",
      price: 100,
      onRemove: onRemoveSpy,
    };

    player.addItem(customItem, 1);
    player.removeItem("remove-hook-item", 1);
    expect(onRemoveSpy).toHaveBeenCalledWith(player);
  });

  test("should call onUse hook when using item", () => {
    const onUseSpy = vi.fn();
    const customItem: ItemObject = {
      id: "use-hook-item",
      name: "Use Hook Item",
      price: 100,
      consumable: true,
      onUse: onUseSpy,
    };

    // Mock Math.random to ensure success
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.5);

    player.addItem(customItem, 1);
    player.useItem("use-hook-item");
    expect(onUseSpy).toHaveBeenCalledWith(player);

    Math.random = originalRandom;
  });

  test("uses the current database hook instead of a stale inventory hook", () => {
    const staleOnUse = vi.fn();
    const currentOnUse = vi.fn();
    const itemId = "refreshed-hook-item";

    player.addItem({
      id: itemId,
      name: "Refreshed Hook Item",
      consumable: true,
      onUse: staleOnUse,
    }, 1);

    player.getCurrentMap().addInDatabase(itemId, {
      id: itemId,
      name: "Refreshed Hook Item",
      consumable: true,
      onUse: currentOnUse,
    }, { force: true });

    player.useItem(itemId);

    expect(staleOnUse).not.toHaveBeenCalled();
    expect(currentOnUse).toHaveBeenCalledWith(player);
  });

  test("does not execute an inventory hook removed from the database", () => {
    const staleOnUse = vi.fn();
    const itemId = "cleared-hook-item";

    player.addItem({
      id: itemId,
      name: "Cleared Hook Item",
      consumable: true,
      onUse: staleOnUse,
    }, 1);

    player.getCurrentMap().addInDatabase(itemId, {
      id: itemId,
      name: "Cleared Hook Item",
      consumable: true,
    }, { force: true });

    player.useItem(itemId);

    expect(staleOnUse).not.toHaveBeenCalled();
  });

  test("should call onUseFailed hook when item usage fails", () => {
    const onUseFailedSpy = vi.fn();
    const customItem: ItemObject = {
      id: "fail-hook-item",
      name: "Fail Hook Item",
      price: 100,
      consumable: true,
      hitRate: 0.1, // 10% chance
      onUseFailed: onUseFailedSpy,
    };

    // Mock Math.random to fail
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.9); // 0.9 > 0.1

    player.addItem(customItem, 1);
    try {
      player.useItem("fail-hook-item");
    } catch (e) {
      // Expected to throw
    }
    expect(onUseFailedSpy).toHaveBeenCalledWith(player);

    Math.random = originalRandom;
  });

  test("should call onEquip hook when equipping item", () => {
    const onEquipSpy = vi.fn();
    const customWeapon: ItemObject & { atk: number } = {
      id: "equip-hook-weapon",
      name: "Equip Hook Weapon",
      price: 500,
      atk: 40,
      _type: "weapon" as const,
      onEquip: onEquipSpy,
    };

    player.addItem(customWeapon, 1);
    player.equip("equip-hook-weapon", true);
    expect(onEquipSpy).toHaveBeenCalledWith(player, true);

    player.equip("equip-hook-weapon", false);
    expect(onEquipSpy).toHaveBeenCalledWith(player, false);
  });
});

describe("Item Management - Edge Cases", () => {
  test("should handle adding item with class (if supported)", () => {
    // This test would require an actual Item class
    // For now, we test that object items work
    const itemObj: ItemObject = {
      id: "class-like-item",
      name: "Class Like Item",
      price: 100,
    };
    const item = player.addItem(itemObj, 1);
    expect(item).toBeDefined();
  });

  test("should handle merging existing item data with new object", () => {
    // Add item first
    player.addItem("TestPotion", 1);

    // Add same item with different properties
    const updatedItem: ItemObject = {
      id: "TestPotion",
      name: "Updated Potion",
      price: 250,
    };
    const item = player.addItem(updatedItem, 1);
    expect(item.name()).toBe("Updated Potion");
    expect(item.quantity()).toBe(2);
  });

  test("should handle multiple items in inventory", () => {
    player.addItem("TestPotion", 3);
    player.addItem("TestSword", 1);
    player.addItem("TestArmor", 2);

    expect(player.hasItem("TestPotion")).toBe(true);
    expect(player.hasItem("TestSword")).toBe(true);
    expect(player.hasItem("TestArmor")).toBe(true);

    expect(player.getItem("TestPotion")?.quantity()).toBe(3);
    expect(player.getItem("TestSword")?.quantity()).toBe(1);
    expect(player.getItem("TestArmor")?.quantity()).toBe(2);
  });
});
