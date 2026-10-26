import { describe, expect, it } from "vitest";
import { simulate } from "../src/testing/tools";

const run = async (body: string, world: object = {}) => {
  const r = await simulate({ source: `export function f() { ${body} }`, call: { fn: "f" }, world });
  if (!r.ok) throw new Error(r.error ?? JSON.stringify(r.diagnostics));
  return r;
};

describe("a script opens, updates and closes the GUIs of a game, as player.gui(id) does in RPGJS", () => {
  it("opens a GUI with data and the options of RPGJS, updates it and closes it", async () => {
    const r = await run(`
      $player.openGui("quests_panel", { count: 2 }, { blockPlayerInput: true });
      $player.updateGui("quests_panel", { count: 3 });
      $player.closeGui("quests_panel", { done: true });
    `);

    expect(r.effects).toEqual([
      { name: "openGui", params: { id: "quests_panel", data: { count: 2 }, blockPlayerInput: true } },
      { name: "updateGui", params: { id: "quests_panel", data: { count: 3 } } },
      { name: "closeGui", params: { id: "quests_panel", data: { done: true } } },
    ]);
  });

  it("opens a GUI with no data, and does not block the player unless asked", async () => {
    const r = await run(`$player.openGui("quests_panel");`);

    expect(r.effects).toEqual([{ name: "openGui", params: { id: "quests_panel" } }]);
  });

  it("refuses an id that is not a GUI of a plugin: the GUIs of the game (rpg-…) are not the scripts'", async () => {
    await expect(run(`$player.openGui("rpg-title-screen");`)).rejects.toThrow(/GUI/);
    await expect(run(`$player.openGui("");`)).rejects.toThrow(/GUI/);
    await expect(run(`$player.openGui(3);`)).rejects.toThrow(/GUI/);
    await expect(run(`$player.closeGui("rpg-main-menu");`)).rejects.toThrow(/GUI/);
  });

  it("refuses data that is too big or not plain, and options that do not exist", async () => {
    await expect(run(`let t = "x"; for (let i = 0; i < 13; i++) { t = t + t; } $player.openGui("quests_panel", { text: t });`)).rejects.toThrow(/characters/);
    await expect(run(`$player.openGui("quests_panel", {}, { waitingAction: true });`)).rejects.toThrow(/blockPlayerInput/);
  });
});
