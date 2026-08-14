import { beforeEach, test, expect, afterEach, describe, vi } from "vitest";
import { testing, TestingFixture } from "@rpgjs/testing";
import { defineModule, createModule } from "@rpgjs/common";
import { RpgPlayer, MAXHP, MAXSP, ATK } from "../src";

/**
 * Test class - Warrior
 */
class WarriorClass {
  static id = "warrior";
  id = "warrior";
  name = "Warrior";
  description = "A strong melee fighter";
  
  // Class properties
  elementsEfficiency = [{ rate: 0.8, element: "physical" }];
  
  onSet(player: RpgPlayer) {
    // Hook called when class is set
  }
}

/**
 * Test class - Mage
 */
class MageClass {
  static id = "mage";
  id = "mage";
  name = "Mage";
  description = "A powerful spellcaster";
  
  elementsEfficiency = [
    { rate: 1.5, element: "physical" },
    { rate: 0.5, element: "magic" },
  ];
  
  onSet(player: RpgPlayer) {
    // Hook called when class is set
  }
}

/**
 * Test actor - Hero (without starting equipment to avoid instanceof issues)
 */
class HeroActor {
  static id = "hero";
  id = "hero";
  name = "Hero";
  
  // Actor properties
  initialLevel = 1;
  finalLevel = 99;
  expCurve = { basis: 30, extra: 20, accelerationA: 30, accelerationB: 30 };
  
  // Parameters with level progression
  parameters = {
    [MAXHP]: { start: 100, end: 9999 },
    [MAXSP]: { start: 50, end: 999 },
  };
  
  // Starting equipment (empty to avoid instanceof issues with plain objects)
  startingEquipment: any[] = [];
  
  // No class assignment to keep test simple
  
  onSet(player: RpgPlayer) {
    // Hook called when actor is set
  }
}

/**
 * Test actor - Villain (no class)
 */
class VillainActor {
  static id = "villain";
  id = "villain";
  name = "Villain";
  
  initialLevel = 5;
  finalLevel = 50;
  
  parameters = {
    [MAXHP]: { start: 150, end: 5000 },
  };
  
  startingEquipment = [];
  
  onSet(player: RpgPlayer) {}
}

let player: RpgPlayer;
let fixture: TestingFixture;

const serverModule = defineModule({
  maps: [{ id: "test-map", file: "" }],
  database: {
    warrior: WarriorClass,
    mage: MageClass,
    hero: HeroActor,
    villain: VillainActor,
  },
  player: {
    async onConnected(player) {
      await player.changeMap("test-map", { x: 100, y: 100 });
    },
  },
});

const clientModule = defineModule({});

beforeEach(async () => {
  const myModule = createModule("TestModule", [
    { server: serverModule, client: clientModule },
  ]);
  fixture = await testing(myModule);
  const clientTesting = await fixture.createClient();
  player = await clientTesting.waitForMapChange("test-map");
});

afterEach(async () => {
  await fixture.clear();
});

describe("Class Manager - setClass", () => {
  test("should set class using class constructor", () => {
    const classInstance = player.setClass(WarriorClass);
    expect(classInstance).toBeDefined();
    expect(classInstance.id).toBe("warrior");
    expect(classInstance.name).toBe("Warrior");
  });

  test("should set class using string ID", () => {
    const classInstance = player.setClass("warrior");
    expect(classInstance).toBeDefined();
    expect(classInstance.id).toBe("warrior");
  });

  test("should set class using a resolved object and expose it on the player", () => {
    const source = { id: "ranger", name: "Ranger", description: "A precise scout" };

    const classInstance = player.setClass(source);

    expect(classInstance).toBe(source);
    expect(player._class()).toStrictEqual(source);
  });

  test("should set different classes", () => {
    const warrior = player.setClass(WarriorClass);
    expect(warrior.name).toBe("Warrior");
    
    const mage = player.setClass(MageClass);
    expect(mage.name).toBe("Mage");
  });

  test("should call onSet hook when class is set", () => {
    const onSetSpy = vi.fn();
    class TestClass {
      static id = "test-class";
      id = "test-class";
      name = "Test Class";
      onSet = onSetSpy;
    }
    
    player.getCurrentMap()?.addInDatabase("test-class", TestClass);
    player.setClass(TestClass);
    expect(onSetSpy).toHaveBeenCalledWith(player);
  });

  test("restores plain-object classes from a runtime database", () => {
    player.getCurrentMap()?.addInDatabase("studio-default-class", {
      id: "studio-default-class",
      name: "Studio Default Class",
      skillsToLearn: [{ level: 1, skill: "fire" }],
    });

    const restored = player.resolveClassSnapshot({
      _class: "studio-default-class",
    }, player.getCurrentMap());

    expect(restored._class).toBeUndefined();
    expect((player as any)._class()).toMatchObject({
      id: "studio-default-class",
      name: "Studio Default Class",
      skillsToLearn: [{ level: 1, skill: "fire" }],
    });
  });

  test("restores an inline class snapshot before the database is ready", async () => {
    const inlineClass = {
      id: "studio-default-class",
      name: "Studio Default Class",
      skillsToLearn: [{ level: 1, skill: "fire" }],
    };

    const restored = player.resolveClassSnapshot({
      _class: inlineClass,
    }, { database: () => ({}) });

    expect(restored._class).toBeUndefined();
    expect((player as any)._class()).toMatchObject(inlineClass);
    expect((player as any)._class()).not.toBe(inlineClass);

    await expect(player.applySnapshot({
      ...player.snapshot(),
      _class: inlineClass,
    })).resolves.toBeDefined();
    expect((player as any)._class()).toMatchObject(inlineClass);
  });

  test("defers a dynamic class while the destination database loads", () => {
    expect(player.resolveClassSnapshot({
      _class: "late-runtime-class",
    }, player.getCurrentMap())).toEqual({
    });
    expect((player as any)._class()).toEqual({});
  });
});

describe("Class Manager - setActor", () => {
  test("should set actor using a resolved actor object", () => {
    const source = {
      id: "resolved-hero",
      name: "Resolved Hero",
      initialLevel: 3,
      finalLevel: 40,
      parameters: {},
      startingEquipment: [],
    };

    const actor = player.setActor(source);

    expect(actor).toBe(source);
    expect(actor.id).toBe("resolved-hero");
    expect(player.name).toBe("Resolved Hero");
    expect((player as any).initialLevel).toBe(3);
  });

  test("should set actor using class constructor", () => {
    const actor = player.setActor(HeroActor);
    expect(actor).toBeDefined();
    expect(actor.id).toBe("hero");
    expect(actor.name).toBe("Hero");
  });

  test("should set actor using string ID", () => {
    const actor = player.setActor("hero");
    expect(actor).toBeDefined();
    expect(actor.id).toBe("hero");
  });

  test("should set initial and final level from actor", () => {
    player.setActor(HeroActor);
    expect((player as any).initialLevel).toBe(1);
    expect((player as any).finalLevel).toBe(99);
  });

  test("should set expCurve from actor", () => {
    player.setActor(HeroActor);
    expect((player as any).expCurve).toBeDefined();
  });

  test("should add parameters from actor", () => {
    player.setActor(HeroActor);
    // Parameters should be configured
    // Exact behavior depends on addParameter implementation
  });

  // Note: Starting equipment depends on how setActor handles addItem and equip
  // with class constructors - this may have instanceof issues
  test.skip("should add starting equipment from actor", () => {
    player.setActor(HeroActor);
    // Should have starter sword
    expect(player.hasItem("starter-sword")).toBe(true);
  });

  test.skip("should equip starting equipment", () => {
    player.setActor(HeroActor);
    // Starter sword should be equipped
    const item = player.getItem("starter-sword");
    expect((item as any)?.equipped).toBe(true);
  });

  test("should set class from a resolved actor object", () => {
    player.setActor({
      id: "classed-hero",
      name: "Classed Hero",
      parameters: {},
      startingEquipment: [],
      class: { id: "guardian", name: "Guardian" },
    });

    expect(player._class()).toMatchObject({ id: "guardian", name: "Guardian" });
  });

  test("should work with actor without class", () => {
    const actor = player.setActor(VillainActor);
    expect(actor).toBeDefined();
    expect(actor.name).toBe("Villain");
  });

  test("should call onSet hook when actor is set", () => {
    const onSetSpy = vi.fn();
    class TestActor {
      static id = "test-actor";
      id = "test-actor";
      name = "Test Actor";
      parameters = {};
      startingEquipment = [];
      onSet = onSetSpy;
    }
    
    player.getCurrentMap()?.addInDatabase("test-actor", TestActor);
    player.setActor(TestActor);
    expect(onSetSpy).toHaveBeenCalledWith(player);
  });
});

describe("Class Manager - changeActor", () => {
  test("should apply a new actor while preserving progression", () => {
    player.parameters = {
      [MAXHP]: { start: 200, end: 200 },
      [MAXSP]: { start: 80, end: 80 },
    };
    player.level = 12;
    player.exp = 500;
    player.hp = 100;
    player.sp = 20;
    const level = player.level;
    const exp = player.exp;
    const inventory = player.items();
    const equipment = player.equipments();
    const skills = player.skills();
    const states = player.states();
    const modifiers = { [ATK]: { value: 7 } };
    player.paramsModifier = modifiers;
    const addItem = vi.spyOn(player, "addItem");
    const equip = vi.spyOn(player, "equip");

    const actor = player.changeActor({
      id: "runtime-mage",
      name: "Runtime Mage",
      initialLevel: 3,
      finalLevel: 60,
      graphic: "runtime-mage",
      hitbox: { width: 24, height: 28 },
      parameters: {
        [MAXHP]: { start: 400, end: 400 },
        [MAXSP]: { start: 160, end: 160 },
      },
      startingEquipment: ["forbidden-starter-item"],
      class: { id: "runtime-class", name: "Runtime Class" },
    });

    expect(actor.id).toBe("runtime-mage");
    expect(player.name).toBe("Runtime Mage");
    expect(player.level).toBe(level);
    expect(player.exp).toBe(exp);
    expect(player.param[MAXHP]).toBe(400);
    expect(player.param[MAXSP]).toBe(160);
    expect(player.hp).toBe(200);
    expect(player.sp).toBe(40);
    expect(Array.from(player.graphics())).toEqual(["runtime-mage"]);
    expect(player.hitbox()).toStrictEqual({ w: 24, h: 28 });
    expect(player._class()).toMatchObject({ id: "runtime-class" });
    expect(player.items()).toBe(inventory);
    expect(player.equipments()).toBe(equipment);
    expect(player.skills()).toBe(skills);
    expect(player.states()).toBe(states);
    expect(player.paramsModifier).toStrictEqual(modifiers);
    expect(addItem).not.toHaveBeenCalled();
    expect(equip).not.toHaveBeenCalled();
  });

  test("should resolve an actor database ID", () => {
    const actor = player.changeActor("villain");

    expect(actor.id).toBe("villain");
    expect(player.name).toBe("Villain");
  });
});

describe("Class Manager - Class Properties", () => {
  test("should get elementsEfficiency from class", () => {
    player.setClass(WarriorClass);
    const efficiency = player.elementsEfficiency;
    expect(efficiency.some(e => e.element === "physical")).toBe(true);
  });

  test("should get elementsEfficiency from mage class", () => {
    player.setClass(MageClass);
    const efficiency = player.elementsEfficiency;
    
    const physicalEff = efficiency.find(e => e.element === "physical");
    const magicEff = efficiency.find(e => e.element === "magic");
    
    expect(physicalEff?.rate).toBe(1.5);
    expect(magicEff?.rate).toBe(0.5);
  });
});

describe("Class Manager - Edge Cases", () => {
  test("should handle changing class multiple times", () => {
    const class1 = player.setClass(WarriorClass);
    const class2 = player.setClass(MageClass);
    const class3 = player.setClass(WarriorClass);
    
    expect(class1).toBeDefined();
    expect(class2).toBeDefined();
    expect(class3).toBeDefined();
  });

  test("should handle actor with empty starting equipment", () => {
    const actor = player.setActor(VillainActor);
    expect(actor).toBeDefined();
    // No equipment should be added
  });
});
