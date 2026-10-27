import { describe, expect, test, vi } from "vitest";
import { MenuGui, resolveMenuCustomEntries, sanitizeMenuPanel } from "../src/Gui/MenuGui";
import { signal } from "@signe/reactive";
import { createHotbarState } from "@rpgjs/common";

const quests = [
  {
    id: "wolves",
    title: "Wolves of the north",
    subtitle: "Talk to the hunter",
    badge: "2/5",
    progress: { value: 2, max: 5 },
    actions: [{ id: "track", label: "Track" }, { id: "abandon", label: "Abandon", disabled: true }],
  },
  { id: "herbs", title: "Herbs", text: "Bring 3 herbs" },
];

const createPlayer = () => {
  const sent: any[] = [];
  const player: any = {
    canMove: true,
    getHotbar: () => createHotbarState(),
    isHotbarEntryTypeAllowed: () => true,
    items: signal([]),
    equipments: signal([]),
    skills: signal([]),
    param: {},
    syncChanges: vi.fn(),
    showNotification: vi.fn(),
    t: (key: string) => key,
    emit: (type: string, value: any) => sent.push({ type, value }),
  };
  return { player, sent };
};

const openedData = (sent: any[]) => sent.find((event) => event.type === "gui.open").value.data;
const updates = (sent: any[]) => sent.filter((event) => event.type === "gui.update");

describe("entries a game adds to the main menu", () => {
  test("come after the built-in entries, with the plain data of their panel", async () => {
    const { player, sent } = createPlayer();
    const gui = new MenuGui(player);
    const pending = gui.open({ entries: [{ id: "quests", label: "Quests", panel: { title: "Quests", list: quests, empty: "No quest" } }] });

    const data = openedData(sent);
    expect(data.menus.map((entry: any) => entry.id)).toEqual(["status", "items", "skills", "equip", "options", "save", "exit", "quests"]);
    expect(data.menus.at(-1)).toMatchObject({ id: "quests", label: "Quests", disabled: false });
    expect(data.panels.quests).toEqual({
      title: "Quests",
      list: [
        { id: "wolves", title: "Wolves of the north", subtitle: "Talk to the hunter", badge: "2/5", progress: { value: 2, max: 5 }, actions: quests[0].actions },
        { id: "herbs", title: "Herbs", text: "Bring 3 herbs" },
      ],
      empty: "No quest",
    });

    gui.close();
    await pending;
  });

  test("cannot redefine a built-in entry, and an id is taken once", () => {
    const entries = resolveMenuCustomEntries([
      { id: "items", label: "My items" },
      { id: "quests", label: "Quests" },
      { id: "quests", label: "Again" },
      { id: "", label: "No id" },
      { label: "No id at all" } as any,
    ]);
    expect(entries.map((entry) => `${entry.id}:${entry.label}`)).toEqual(["quests:Quests"]);
  });

  test("a panel keeps only plain data: no function, no unknown key, a bounded progress", () => {
    const panel = sanitizeMenuPanel({
      title: "T",
      secret: "x",
      list: [
        { id: "a", title: "A", onClick: () => "boom", progress: { value: 9, max: 3 } },
        { id: "a", title: "Duplicate" },
        { title: "No id" },
        { id: "b", title: "B", progress: { value: 1, max: 0 } },
      ],
    });
    expect(panel).toEqual({ title: "T", list: [{ id: "a", title: "A", progress: { value: 3, max: 3 } }, { id: "b", title: "B" }] });
    expect(JSON.stringify(panel)).not.toContain("boom");
    expect(sanitizeMenuPanel("nope")).toBeUndefined();
  });

  test("a function given as entries is read again at each refresh, so a panel follows the player", async () => {
    const { player, sent } = createPlayer();
    let done = false;
    const onEntryAction = vi.fn(() => { done = true; });
    const gui = new MenuGui(player);
    const pending = gui.open({
      entries: () => [{ id: "quests", label: "Quests", panel: { list: [{ id: "wolves", title: "Wolves", badge: done ? "Done" : "Open", actions: [{ id: "track", label: "Track" }] }] } }],
      onEntryAction,
    });
    expect(openedData(sent).panels.quests.list[0].badge).toBe("Open");

    await gui.emit("entryAction", { entry: "quests", action: "track", item: "wolves", clientActionId: "a1" });

    expect(updates(sent).at(-1).value.data.panels.quests.list[0].badge).toBe("Done");
    expect(updates(sent).at(-1).value.clientActionId).toBe("a1");
    gui.close();
    await pending;
  });
});

describe("the actions of a panel are validated by the server", () => {
  const open = () => {
    const { player, sent } = createPlayer();
    const onEntryAction = vi.fn();
    const gui = new MenuGui(player);
    const pending = gui.open({
      entries: [
        { id: "quests", label: "Quests", panel: { list: quests, actions: [{ id: "refresh", label: "Refresh" }] } },
        { id: "locked", label: "Locked", disabled: true, panel: { actions: [{ id: "go", label: "Go" }] } },
        { id: "bestiary", label: "Bestiary" },
      ],
      onEntryAction,
    });
    return { gui, pending, player, sent, onEntryAction };
  };

  test("runs an action the panel offers, for a row or for the whole panel", async () => {
    const { gui, pending, player, onEntryAction } = open();
    await gui.emit("entryAction", { entry: "quests", action: "track", item: "wolves" });
    await gui.emit("entryAction", { entry: "quests", action: "refresh" });
    await gui.emit("entryAction", { entry: "quests", action: "refresh", item: "herbs" });

    expect(onEntryAction.mock.calls.map(([context]) => [context.entry, context.action, context.item])).toEqual([
      ["quests", "track", "wolves"],
      ["quests", "refresh", undefined],
      ["quests", "refresh", "herbs"],
    ]);
    expect(onEntryAction.mock.calls[0][0].player).toBe(player);
    gui.close();
    await pending;
  });

  test("refuses what the panel does not offer: unknown entry, action, row, disabled action or entry, wrong types", async () => {
    const { gui, pending, onEntryAction } = open();
    for (const attempt of [
      { entry: "nope", action: "track", item: "wolves" },
      { entry: "quests", action: "delete-everything" },
      { entry: "quests", action: "track" }, // a row action without its row
      { entry: "quests", action: "track", item: "herbs" }, // another row
      { entry: "quests", action: "abandon", item: "wolves" }, // disabled
      { entry: "locked", action: "go" }, // disabled entry
      { entry: "bestiary", action: "open" }, // an entry without panel only sends open:<id>
      { entry: "items", action: "refresh" }, // a built-in entry
      { entry: 1, action: {} },
      {},
    ]) {
      await gui.emit("entryAction", attempt as any);
    }
    expect(onEntryAction).not.toHaveBeenCalled();
    gui.close();
    await pending;
  });

  test("an entry without a panel sends open:<id> to the game", async () => {
    const { gui, pending, onEntryAction } = open();
    await gui.emit("open:bestiary", {});
    expect(onEntryAction).toHaveBeenCalledWith(expect.objectContaining({ entry: "bestiary", action: "open" }));
    gui.close();
    await pending;
  });

  test("an error of the game is reported to the player and the menu still refreshes", async () => {
    const { player, sent } = createPlayer();
    const gui = new MenuGui(player);
    const pending = gui.open({
      entries: [{ id: "quests", label: "Quests", panel: { actions: [{ id: "go", label: "Go" }] } }],
      onEntryAction: () => { throw new Error("nope"); },
    });
    await gui.emit("entryAction", { entry: "quests", action: "go" });
    expect(player.showNotification).toHaveBeenCalled();
    expect(updates(sent)).toHaveLength(1);
    gui.close();
    await pending;
  });
});
