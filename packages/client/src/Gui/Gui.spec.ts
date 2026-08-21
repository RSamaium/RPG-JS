import { describe, expect, test, vi } from "vitest";
import { Context, injector } from "@signe/di";
import { signal } from "canvasengine";
import { PrebuiltGui } from "@rpgjs/common";
import { WebSocketToken } from "../services/AbstractSocket";

vi.mock("../components/gui", () => {
  const component = () => null;
  return {
    DialogboxComponent: component,
    ShopComponent: component,
    SaveLoadComponent: component,
    MainMenuComponent: component,
    NotificationComponent: component,
    TitleScreenComponent: component,
    GameoverComponent: component,
    InputComponent: component,
    HotbarComponent: component,
    CharacterSelectComponent: component,
  };
});

const createGui = async () => {
  const { RpgGui } = await import("./Gui");
  const context = new Context();
  const socket = {
    on: vi.fn(),
    emit: vi.fn(),
  };
  await injector(context, [
    {
      provide: WebSocketToken,
      useValue: socket,
    },
  ]);
  return {
    gui: new RpgGui(context),
    socket,
  };
};

const CanvasGui = () => null;
const VueInventory = {
  name: "inventory",
  render() {
    return null;
  },
};
const VueDialog = {
  name: PrebuiltGui.Dialog,
  render() {
    return null;
  },
};
const VueMainMenu = {
  name: PrebuiltGui.MainMenu,
  render() {
    return null;
  },
};
const VueTooltip = {
  name: "tooltip",
  rpgAttachToSprite: true,
  render() {
    return null;
  },
};

describe("RpgGui Vue integration", () => {
  test("registers the prebuilt input GUI", async () => {
    const { gui } = await createGui();
    expect(gui.get(PrebuiltGui.Input)).toBeDefined();
  });
  test("registers the prebuilt character select GUI", async () => {
    const { gui } = await createGui();
    expect(gui.get(PrebuiltGui.CharacterSelect)).toBeDefined();
  });
  test("tracks GUI open ids and sends them back when closing", async () => {
    const { gui, socket } = await createGui();
    await gui._initialize();
    const openHandler = socket.on.mock.calls.find(([event]) => event === "gui.open")?.[1];

    openHandler({
      guiId: PrebuiltGui.Dialog,
      guiOpenId: "open-1",
      data: { message: "Hello" },
    });

    expect(gui.get(PrebuiltGui.Dialog)?.openId).toBe("open-1");

    gui.guiClose(PrebuiltGui.Dialog, 0, gui.get(PrebuiltGui.Dialog)?.openId);

    expect(socket.emit).toHaveBeenCalledWith("gui.exit", {
      guiId: PrebuiltGui.Dialog,
      guiOpenId: "open-1",
      data: 0,
    });
  });

  test("does not emit malformed GUI open ids", async () => {
    const { gui, socket } = await createGui();

    gui.guiClose(PrebuiltGui.Dialog, 0, (() => "open-1") as any);

    expect(socket.emit).toHaveBeenCalledWith("gui.exit", {
      guiId: PrebuiltGui.Dialog,
      guiOpenId: undefined,
      data: 0,
    });
  });

  test("waits for CanvasEngine GUI dependencies before displaying", async () => {
    const { gui } = await createGui();
    const enabled = signal(true);
    const ready = signal<boolean | undefined>(undefined);

    gui.add({
      id: "canvas-dependency",
      component: CanvasGui,
      autoDisplay: true,
      dependencies: () => [enabled, ready],
    });

    expect(gui.isDisplaying("canvas-dependency")).toBe(false);

    ready.set(true);

    expect(gui.isDisplaying("canvas-dependency")).toBe(true);
  });

  test("ignores stale server close events for previous GUI opens", async () => {
    const { gui, socket } = await createGui();
    await gui._initialize();
    const openHandler = socket.on.mock.calls.find(([event]) => event === "gui.open")?.[1];
    const exitHandler = socket.on.mock.calls.find(([event]) => event === "gui.exit")?.[1];

    openHandler({
      guiId: PrebuiltGui.Dialog,
      guiOpenId: "open-1",
      data: { message: "First" },
    });
    openHandler({
      guiId: PrebuiltGui.Dialog,
      guiOpenId: "open-2",
      data: { message: "Second" },
    });

    exitHandler({
      guiId: PrebuiltGui.Dialog,
      guiOpenId: "open-1",
    });

    expect(gui.isDisplaying(PrebuiltGui.Dialog)).toBe(true);
    expect(gui.get(PrebuiltGui.Dialog)?.data()).toEqual({ message: "Second" });

    exitHandler({
      guiId: PrebuiltGui.Dialog,
      guiOpenId: "open-2",
    });

    expect(gui.isDisplaying(PrebuiltGui.Dialog)).toBe(false);
  });

  test("separates CanvasEngine and Vue GUI registries", async () => {
    const { gui } = await createGui();

    gui.add({
      id: "canvas-tooltip",
      component: CanvasGui,
      attachToSprite: true,
    });
    gui.add({
      id: "inventory",
      component: VueInventory,
    });
    gui.add(VueTooltip);

    expect(gui.get("canvas-tooltip")?.component).toBe(CanvasGui);
    expect(gui.get("inventory")?.component).toBe(VueInventory);
    expect(gui.get("tooltip")?.component).toBe(VueTooltip);
    expect(gui.getAttachedGuis().map(item => item.name)).toEqual(["canvas-tooltip"]);
    expect(gui.getAttachedVueGuis().map(item => item.name)).toEqual(["tooltip"]);
  });

  test("records explicit renderer ownership for both GUI registries", async () => {
    const { gui } = await createGui();

    gui.add({
      id: "explicit-canvas",
      component: CanvasGui,
      renderer: "canvas",
    });
    gui.add({
      id: "explicit-vue",
      component: VueInventory,
      renderer: "vue",
    });

    expect(gui.getAll()["explicit-canvas"].renderer).toBe("canvas");
    expect(gui.getVueGuis()).toEqual([
      expect.objectContaining({
        name: "explicit-vue",
        renderer: "vue",
      }),
    ]);
  });

  test("synchronizes Vue GUI display and hide states through the Vue bridge", async () => {
    const { gui } = await createGui();
    const bridge = {
      updateGuiState: vi.fn(),
      initializeGuiStates: vi.fn(),
    };

    gui.add({
      id: "inventory",
      component: VueInventory,
    });
    gui._setVueGuiInstance(bridge);

    expect(bridge.initializeGuiStates).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "inventory",
        display: false,
        data: {},
        attachToSprite: false,
      }),
    ]);

    gui.display("inventory", { gold: 12 });
    expect(bridge.updateGuiState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "inventory",
        display: true,
        data: { gold: 12 },
        attachToSprite: false,
      }),
    );

    gui.hide("inventory");
    expect(bridge.updateGuiState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "inventory",
        display: false,
      }),
    );
  });

  test("waits for Vue GUI dependencies before display", async () => {
    const { gui } = await createGui();
    const bridge = {
      updateGuiState: vi.fn(),
      initializeGuiStates: vi.fn(),
    };
    const dependency = signal<any>(undefined);

    gui.add({
      id: "inventory",
      component: VueInventory,
      dependencies: () => [dependency],
    });
    gui._setVueGuiInstance(bridge);
    gui.display("inventory", { items: ["potion"] });

    expect(gui.isDisplaying("inventory")).toBe(false);
    expect(bridge.updateGuiState).not.toHaveBeenCalledWith(
      expect.objectContaining({
        display: true,
      }),
    );

    dependency.set({ id: "player" });

    expect(gui.isDisplaying("inventory")).toBe(true);
    expect(bridge.updateGuiState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "inventory",
        display: true,
        data: { items: ["potion"] },
      }),
    );
  });

  test("allows Vue GUI entries to replace prebuilt CanvasEngine GUIs", async () => {
    const { gui } = await createGui();
    const bridge = {
      updateGuiState: vi.fn(),
      initializeGuiStates: vi.fn(),
    };

    gui._setVueGuiInstance(bridge);
    gui.add({
      id: PrebuiltGui.Dialog,
      component: VueDialog,
    });

    expect(gui.get(PrebuiltGui.Dialog)?.component).toBe(VueDialog);
    expect(gui.getAll()[PrebuiltGui.Dialog].component).toBe(VueDialog);
    expect((gui as any).gui()[PrebuiltGui.Dialog]).toBeUndefined();
    expect(gui.getVueGuis().filter(item => item.name === PrebuiltGui.Dialog)).toHaveLength(1);

    gui.display(PrebuiltGui.Dialog, { text: "Hello" });
    expect(bridge.updateGuiState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: PrebuiltGui.Dialog,
        display: true,
        data: { text: "Hello" },
      }),
    );

    gui.hide(PrebuiltGui.Dialog);
    expect(bridge.updateGuiState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: PrebuiltGui.Dialog,
        display: false,
      }),
    );
  });

  test("allows CanvasEngine GUI entries to replace Vue GUI entries with the same id", async () => {
    const { gui } = await createGui();
    const bridge = {
      updateGuiState: vi.fn(),
      initializeGuiStates: vi.fn(),
    };

    gui._setVueGuiInstance(bridge);
    gui.add({
      id: PrebuiltGui.Dialog,
      component: VueDialog,
    });
    gui.add({
      id: PrebuiltGui.Dialog,
      component: CanvasGui,
    });

    expect(gui.get(PrebuiltGui.Dialog)?.component).toBe(CanvasGui);
    expect(gui.getVueGuis().some(item => item.name === PrebuiltGui.Dialog)).toBe(false);
    expect((gui as any).gui()[PrebuiltGui.Dialog].component).toBe(CanvasGui);
    expect(bridge.initializeGuiStates).toHaveBeenLastCalledWith([]);
  });

  test("keeps main menu optimistic reducers when a Vue GUI replaces the prebuilt component", async () => {
    const { gui, socket } = await createGui();
    const bridge = {
      updateGuiState: vi.fn(),
      initializeGuiStates: vi.fn(),
    };

    gui.add({
      id: PrebuiltGui.MainMenu,
      component: VueMainMenu,
    });
    gui._setVueGuiInstance(bridge);
    gui.display(PrebuiltGui.MainMenu, {
      items: [
        {
          id: "potion",
          quantity: 2,
        },
      ],
    });

    gui.guiInteraction(PrebuiltGui.MainMenu, "useItem", { id: "potion" });

    expect(gui.get<{ items: Array<{ id: string; quantity: number }> }>(
      PrebuiltGui.MainMenu
    )?.data().items).toEqual([
      {
        id: "potion",
        quantity: 1,
      },
    ]);
    expect(bridge.updateGuiState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: PrebuiltGui.MainMenu,
        data: {
          items: [
            {
              id: "potion",
              quantity: 1,
            },
          ],
        },
      }),
    );
    expect(socket.emit).toHaveBeenCalledWith(
      "gui.interaction",
      expect.objectContaining({
        guiId: PrebuiltGui.MainMenu,
        name: "useItem",
      }),
    );
  });
});
