import { describe, expect, test, vi } from "vitest";
import {
  DialogGui,
  DialogPosition,
  GameoverGui,
  Gui,
  InputGui,
  MenuGui,
  NotificationGui,
  RpgPlayer,
  SaveLoadGui,
  ShopGui,
  TitleGui,
} from "../src";
import { signal } from "@signe/reactive";
import { createHotbarState } from "@rpgjs/common";

const emptyHotbarPlayer = {
  getHotbar: () => createHotbarState(),
  isHotbarEntryTypeAllowed: () => true,
};

describe("GUI", () => {
  test("input gui returns typed text and number values", async () => {
    const player: any = { canMove: true, emit: vi.fn() };

    const textGui = new InputGui(player);
    const textPending = textGui.openInput("Name", { required: true, minLength: 2 });
    await textGui.emit("submit", { value: "Hero" });
    await expect(textPending).resolves.toBe("Hero");

    const numberGui = new InputGui(player);
    const numberPending = numberGui.openInput("Age", { type: "number", min: 1, max: 120 });
    await numberGui.emit("submit", { value: "42" });
    await expect(numberPending).resolves.toBe(42);
    expect(player.canMove).toBe(true);
  });

  test("input gui keeps invalid submissions open and returns null for an empty optional number", async () => {
    const sent: any[] = [];
    const player: any = {
      canMove: true,
      emit(type: string, value: any) {
        sent.push({ type, value });
      },
    };
    const gui = new InputGui(player);
    const pending = gui.openInput("Age", { type: "number", required: true, min: 18 });

    await gui.emit("submit", { value: "nope" });
    expect(player.canMove).toBe(false);
    expect(sent.at(-1)).toMatchObject({
      type: "gui.update",
      value: { guiId: "rpg-input", data: { errorKey: "rpg.input.error.number" } },
    });

    await gui.emit("submit", { value: "18" });
    await expect(pending).resolves.toBe(18);

    const optionalGui = new InputGui(player);
    const optionalPending = optionalGui.openInput("Score", { type: "number" });
    await optionalGui.emit("submit", { value: "" });
    await expect(optionalPending).resolves.toBeNull();
  });

  test("input gui validates text constraints and supports cancellation", async () => {
    const player: any = { canMove: true, emit: vi.fn() };
    const gui = new InputGui(player);
    const pending = gui.openInput("Email", { type: "email", required: true, maxLength: 30 });

    await gui.emit("submit", { value: "invalid" });
    expect(player.emit).toHaveBeenLastCalledWith("gui.update", expect.objectContaining({
      data: expect.objectContaining({ errorKey: "rpg.input.error.email" }),
    }));

    await gui.emit("cancel", {});
    await expect(pending).resolves.toBeNull();
    expect(player.canMove).toBe(true);
  });

  test("dialog gui reuses typed input validation and stays open on errors", async () => {
    const sent: any[] = [];
    const player: any = {
      canMove: true,
      emit(type: string, value: any) {
        sent.push({ type, value });
      },
    };
    const gui = new DialogGui(player);
    const pending = gui.openDialog("How old are you?", {
      input: { type: "number", required: true, min: 18 },
    });

    await gui.emit("submit", { value: "17" });
    expect(player.canMove).toBe(false);
    expect(sent.at(-1)).toMatchObject({
      type: "gui.update",
      value: {
        guiId: "rpg-dialog",
        data: { input: { errorKey: "rpg.input.error.min", errorParams: { min: 18 } } },
      },
    });

    await gui.emit("submit", { value: "21" });
    await expect(pending).resolves.toBe(21);
    expect(player.canMove).toBe(true);
  });
  test("main menu sends cloneable data when inventory data contains signals", () => {
    const inventoryItem = {
      id: signal("sword"),
      name: signal("Bronze Sword"),
      description: signal("A starter weapon"),
      quantity: signal(1),
      atk: signal(5),
      pdef: signal(0),
      sdef: signal(0),
      icon: signal("inventory-icon"),
    };
    const skill = {
      id: signal("fire"),
      name: signal("Fire"),
      description: signal("Small fire spell"),
      spCost: signal(3),
    };
    const sent: any[] = [];
    const player: any = {
      ...emptyHotbarPlayer,
      canMove: signal(true),
      items: signal([inventoryItem]),
      equipments: signal([inventoryItem]),
      skills: signal([skill]),
      param: { str: 4, dex: 3, int: 2, agi: 1, maxHp: 20, maxSp: 10 },
      pdef: 1,
      sdef: 2,
      atk: 5,
      expForNextlevel: signal(150),
      databaseById() {
        return {
          _type: signal("weapon"),
          icon: signal("db-icon"),
          consumable: signal(false),
        };
      },
      emit(type: string, value: any) {
        sent.push(structuredClone({ type, value }));
      },
    };

    const gui = new MenuGui(player);
    const pending = gui.open();

    expect(sent[0]).toMatchObject({
      type: "gui.open",
      value: {
        guiId: "rpg-main-menu",
        data: {
          expForNextlevel: 150,
          items: [
            {
              id: "sword",
              icon: "db-icon",
              type: "weapon",
              hotbarAssignable: false,
              equipped: true,
            },
          ],
          skills: [
            {
              id: "fire",
              name: "Fire",
              spCost: 3,
            },
          ],
        },
      },
    });

    gui.close();
    return pending;
  });

  test("main menu item and equipment actions sync the player and refresh the client", async () => {
    const sent: any[] = [];
    const player: any = {
      ...emptyHotbarPlayer,
      canMove: true,
      items: signal([{ id: "potion", name: "Potion", quantity: 2 }]),
      equipments: signal([]),
      skills: signal([]),
      param: {},
      useItem: vi.fn(),
      equip: vi.fn(),
      syncChanges: vi.fn(),
      showNotification: vi.fn(),
      databaseById() {
        return { _type: "item", consumable: true };
      },
      emit(type: string, value: any) {
        sent.push({ type, value });
      },
    };

    const gui = new MenuGui(player);
    const pending = gui.open();

    expect(sent[0].value.data.items[0]).toMatchObject({
      id: "potion",
      type: "item",
      usable: true,
      hotbarAssignable: true,
    });

    await gui.emit("useItem", { id: "potion", clientActionId: "use-1" });
    await gui.emit("equipItem", { id: "sword", equip: true, clientActionId: "equip-1" });

    expect(player.useItem).toHaveBeenCalledWith("potion");
    expect(player.equip).toHaveBeenCalledWith("sword", true);
    expect(player.syncChanges).toHaveBeenCalledTimes(2);
    expect(player.showNotification).not.toHaveBeenCalled();
    expect(sent.filter((event) => event.type === "gui.update")).toMatchObject([
      { value: { guiId: "rpg-main-menu", clientActionId: "use-1" } },
      { value: { guiId: "rpg-main-menu", clientActionId: "equip-1" } },
    ]);

    gui.close();
    await pending;
  });

  test("main menu reports action errors and still refreshes the menu", async () => {
    const sent: any[] = [];
    const player: any = {
      ...emptyHotbarPlayer,
      canMove: true,
      items: signal([{ id: "potion", name: "Potion", quantity: 1 }]),
      equipments: signal([]),
      skills: signal([]),
      param: {},
      useItem: vi.fn(() => {
        throw { msg: "Cannot use item" };
      }),
      syncChanges: vi.fn(),
      showNotification: vi.fn(),
      databaseById() {
        return { _type: "item", consumable: true };
      },
      emit(type: string, value: any) {
        sent.push({ type, value });
      },
    };

    const gui = new MenuGui(player);
    const pending = gui.open();

    await gui.emit("useItem", { id: "potion", clientActionId: "use-error" });

    expect(player.syncChanges).not.toHaveBeenCalled();
    expect(player.showNotification).toHaveBeenCalledWith("Cannot use item");
    expect(sent.some((event) => event.type === "gui.update" && event.value.clientActionId === "use-error")).toBe(true);

    gui.close();
    await pending;
  });

  test("main menu exit resolves the waiting open call and restores movement", async () => {
    const player: any = {
      ...emptyHotbarPlayer,
      canMove: true,
      items: signal([]),
      equipments: signal([]),
      skills: signal([]),
      param: {},
      emit: vi.fn(),
    };

    const gui = new MenuGui(player);
    const pending = gui.open();

    expect(player.canMove).toBe(false);

    await gui.emit("exit", {});

    await expect(pending).resolves.toBe("exit");
    expect(player.canMove).toBe(true);
    expect(player.emit).toHaveBeenCalledWith("gui.exit", {
      guiId: "rpg-main-menu",
      guiOpenId: expect.any(String),
    });
  });

  test("save/load gui opens sanitized slot data and loads a selected slot", async () => {
    const sent: any[] = [];
    const player: any = {
      canMove: true,
      load: vi.fn(() => Promise.resolve({ ok: true })),
      emit(type: string, value: any) {
        sent.push({ type, value });
      },
    };
    const slots = [
      { id: "slot-0", snapshot: "secret", map: "start" },
      null,
    ] as any[];

    const gui = new SaveLoadGui(player);
    const pending = gui.open(slots, { maxSlots: 3 });

    expect(sent[0]).toEqual({
      type: "gui.open",
      value: {
        guiId: "rpg-save",
        guiOpenId: expect.any(String),
        data: {
          mode: "load",
          slots: [{ id: "slot-0", map: "start" }, null, null],
        },
      },
    });

    await gui.emit("select", { index: 0 });

    expect(player.load).toHaveBeenCalledWith(
      0,
      { reason: "load", source: "gui" },
      { changeMap: true },
    );
    await expect(pending).resolves.toBe(0);
    expect(player.canMove).toBe(true);
  });

  test("save/load gui ignores invalid selections and failed loads", async () => {
    const player: any = {
      canMove: true,
      load: vi.fn(() => Promise.resolve({ ok: false })),
      emit: vi.fn(),
    };
    const gui = new SaveLoadGui(player);
    const pending = gui.open([{ id: "slot-0", snapshot: "secret" }] as any[]);

    await gui.emit("select", { index: -1 });
    await gui.emit("select", { index: 10 });
    await gui.emit("select", { index: "0" });
    await gui.emit("select", { index: 0 });

    expect(player.load).toHaveBeenCalledTimes(1);

    gui.close(null);
    await expect(pending).resolves.toBeNull();
  });

  test("save/load gui updates save slots when saving succeeds", async () => {
    const player: any = {
      canMove: true,
      save: vi.fn(() => Promise.resolve({ meta: { id: "slot-1", map: "town" } })),
      emit: vi.fn(),
    };
    const slots = [null] as any[];
    const gui = new SaveLoadGui(player);
    const pending = gui.open(slots, { mode: "save", maxSlots: 2 });

    await gui.emit("save", { index: 1 });

    expect(player.save).toHaveBeenCalledWith(
      1,
      {},
      { reason: "manual", source: "gui" },
    );
    expect(slots[1]).toEqual({ id: "slot-1", map: "town" });
    await expect(pending).resolves.toBe(1);
  });

  test("title and gameover guis resolve selected entries", async () => {
    const player: any = {
      canMove: true,
      emit: vi.fn(),
    };
    const titleGui = new TitleGui(player);
    const titlePending = titleGui.open({
      title: "RPGJS",
      entries: [{ id: "new", label: "New Game" }],
    });

    await titleGui.emit("select", { id: "new", index: 0 });

    await expect(titlePending).resolves.toEqual({ id: "new", index: 0 });
    expect(player.emit).toHaveBeenCalledWith("gui.exit", {
      guiId: "rpg-title-screen",
      guiOpenId: expect.any(String),
    });

    const gameoverGui = new GameoverGui(player);
    const gameoverPending = gameoverGui.open({
      title: "Defeat",
      entries: [{ id: "retry", label: "Retry" }],
    });

    await gameoverGui.emit("select", { id: "retry", index: 0 });

    await expect(gameoverPending).resolves.toEqual({ id: "retry", index: 0 });
    expect(player.emit).toHaveBeenCalledWith("gui.exit", {
      guiId: "rpg-gameover",
      guiOpenId: expect.any(String),
    });
  });

  test("gui close is idempotent and removes the active gui reference", async () => {
    const player: any = {
      canMove: true,
      _gui: {},
      emit: vi.fn(),
    };
    const gui = new Gui("custom-menu", player);
    player._gui["custom-menu"] = gui;
    const pending = gui.open({}, { waitingAction: true, blockPlayerInput: true });

    gui.close({ ok: true });
    gui.close({ ok: false });

    await expect(pending).resolves.toEqual({ ok: true });
    expect(player._gui["custom-menu"]).toBeUndefined();
    expect(player.canMove).toBe(true);
    expect(player.__guiActionBlockUntil).toBeGreaterThan(Date.now());
    expect(player.emit).toHaveBeenCalledWith("gui.exit", {
      guiId: "custom-menu",
      guiOpenId: expect.any(String),
    });
    expect(player.emit.mock.calls.filter(([type]) => type === "gui.exit")).toHaveLength(1);
  });

  test("ignores stale gui exits from an older open instance", async () => {
    const player: any = new RpgPlayer();
    player.emit = vi.fn();
    player.canMove = true;

    const firstGui = new Gui("custom-menu", player);
    player._gui["custom-menu"] = firstGui;
    firstGui.open({}, { waitingAction: true });
    const staleOpenId = firstGui.openId;

    const secondGui = new Gui("custom-menu", player);
    player._gui["custom-menu"] = secondGui;
    const pending = secondGui.open({}, { waitingAction: true });

    player.removeGui("custom-menu", { stale: true }, staleOpenId);
    expect(player._gui["custom-menu"]).toBe(secondGui);

    player.removeGui("custom-menu", { ok: true }, secondGui.openId);

    await expect(pending).resolves.toEqual({ ok: true });
    expect(player._gui["custom-menu"]).toBeUndefined();
  });

  test("accepts legacy gui exits without a valid open id", async () => {
    const player: any = new RpgPlayer();
    player.emit = vi.fn();
    player.canMove = true;

    const gui = new Gui("custom-menu", player);
    player._gui["custom-menu"] = gui;
    const pending = gui.open({}, { waitingAction: true });

    player.removeGui("custom-menu", { ok: true }, undefined);

    await expect(pending).resolves.toEqual({ ok: true });
    expect(player._gui["custom-menu"]).toBeUndefined();
  });

  test("accepts malformed gui open ids as legacy exits", async () => {
    const player: any = new RpgPlayer();
    player.emit = vi.fn();
    player.canMove = true;

    const gui = new Gui("custom-menu", player);
    player._gui["custom-menu"] = gui;
    const pending = gui.open({}, { waitingAction: true });

    player.removeGui("custom-menu", { ok: true }, (() => gui.openId) as any);

    await expect(pending).resolves.toEqual({ ok: true });
    expect(player._gui["custom-menu"]).toBeUndefined();
  });

  test("notification gui opens without blocking for an action", async () => {
    const player: any = {
      emit: vi.fn(),
    };
    const gui = new NotificationGui(player);

    await expect(gui.open({ message: "Saved" })).resolves.toBeNull();

    expect(player.emit).toHaveBeenCalledWith("gui.open", {
      guiId: "rpg-notification",
      guiOpenId: expect.any(String),
      data: { message: "Saved" },
    });
  });

  test("dialog gui sanitizes choices, blocks movement and restores talk target", async () => {
    const sent: any[] = [];
    const talkWith: any = {
      name: signal("Guard"),
      direction: signal(3),
      breakRoutes: vi.fn(),
      moveRoutes: vi.fn(),
      replayRoutes: vi.fn(),
      changeDirection: vi.fn(),
    };
    const player: any = {
      canMove: true,
      emit(type: string, value: any) {
        sent.push({ type, value });
      },
    };
    const gui = new DialogGui(player);
    const pending = gui.openDialog("Hello", {
      choices: [{ text: "Yes", value: "yes" }],
      talkWith,
      face: { id: "guard", expression: "neutral" },
    });

    expect(player.canMove).toBe(false);
    expect(talkWith.breakRoutes).toHaveBeenCalledWith(true);
    expect(talkWith.moveRoutes).toHaveBeenCalledTimes(1);
    expect(sent[0]).toEqual({
      type: "gui.open",
      value: {
        guiId: "rpg-dialog",
        guiOpenId: expect.any(String),
        data: {
          message: "Hello",
          autoClose: false,
          position: DialogPosition.Bottom,
          fullWidth: false,
          typewriterEffect: true,
          speaker: "Guard",
          choices: [{ text: "Yes" }],
          face: { id: "guard", expression: "neutral" },
        },
      },
    });

    gui.close("yes");

    await expect(pending).resolves.toBe("yes");
    expect(player.canMove).toBe(true);
    expect(player.__guiActionBlockUntil).toBeGreaterThan(Date.now());
    expect(talkWith.replayRoutes).toHaveBeenCalled();
    expect(talkWith.changeDirection).toHaveBeenCalledWith(3);
  });

  test("shop gui builds buy and sell data then refreshes after actions", async () => {
    const sent: any[] = [];
    const inventoryItem = {
      id: signal("potion"),
      name: signal("Potion"),
      description: signal("Restores HP"),
      quantity: signal(3),
      price: signal(20),
    };
    const player: any = {
      canMove: true,
      atk: 4,
      pdef: 2,
      sdef: 1,
      param: { maxHp: 100 },
      items: signal([inventoryItem]),
      equipments: signal([{ id: signal("sword") }]),
      _gold: signal(10),
      buyItem: vi.fn(),
      removeItem: vi.fn(),
      syncChanges: vi.fn(),
      getItem: vi.fn((id: string) => id === "potion" ? inventoryItem : null),
      databaseById(id: string) {
        const database = {
          sword: {
            _type: "weapon",
            name: "Iron Sword",
            description: "Reliable blade",
            price: 100,
            icon: "sword-icon",
            paramsModifier: {
              atk: { value: 8 },
            },
          },
          potion: {
            _type: "item",
            name: "Potion",
            description: "Restores HP",
            price: 20,
            icon: "potion-icon",
          },
        };
        return database[id];
      },
      emit(type: string, value: any) {
        sent.push({ type, value });
      },
    };
    const gui = new ShopGui(player);
    const pending = gui.open({
      items: ["sword"],
      sell: { potion: 0.25 },
      message: "Welcome",
      face: { id: "merchant" },
    });

    expect(sent[0]).toMatchObject({
      type: "gui.open",
      value: {
        guiId: "rpg-shop",
        data: {
          message: "Welcome",
          face: { id: "merchant" },
          items: [
            {
              id: "sword",
              price: 100,
              name: "Iron Sword",
              equipped: true,
              stats: { atk: 8 },
            },
          ],
          sellItems: [
            {
              id: "potion",
              price: 5,
              quantity: 3,
            },
          ],
        },
      },
    });

    await gui.emit("buyItem", { id: "sword", nb: 1, clientActionId: "buy-1" });
    await gui.emit("sellItem", { id: "potion", nb: 2, clientActionId: "sell-1" });

    expect(player.buyItem).toHaveBeenCalledWith("sword", 1);
    expect(player.removeItem).toHaveBeenCalledWith("potion", 2);
    expect(player._gold()).toBe(20);
    expect(player.syncChanges).toHaveBeenCalledTimes(2);
    expect(sent.filter((event) => event.type === "gui.update")).toMatchObject([
      { value: { guiId: "rpg-shop", clientActionId: "buy-1" } },
      { value: { guiId: "rpg-shop", clientActionId: "sell-1" } },
    ]);

    gui.close();
    await pending;
  });
});
