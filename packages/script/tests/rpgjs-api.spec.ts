import { describe, expect, it } from "vitest";
import { checkScript, runTests, simulate } from "../src/testing/tools";

const run = async (body: string, world: object = {}, extra: object = {}) => {
  const r = await simulate({ source: `export function f() { ${body} }`, call: { fn: "f" }, world, ...extra });
  if (!r.ok) throw new Error(r.error ?? JSON.stringify(r.diagnostics));
  return r;
};

describe("a script speaks the API of RPGJS: $player.showText, $player.addItem, $player.changeMap…", () => {
  it("shows a text, a notification, and asks a choice, as the player of RPGJS does", async () => {
    const r = await run(`
      $player.showText("Hello", { position: "top", speaker: "Mira" });
      $player.showNotification("Saved", { type: "info", time: 2000 });
      const picked = $player.showChoices("Buy?", [{ text: "Yes", value: "yes" }, { text: "No", value: "no" }]);
      return picked && picked.value;
    `, { choices: [0] });

    expect(r.value).toBe("yes");
    expect(r.effects).toEqual([
      { name: "showText", params: { text: "Hello", position: "top", speaker: "Mira" } },
      { name: "showNotification", params: { message: "Saved", type: "info", time: 2000 } },
      { name: "showChoices", params: { text: "Buy?", choices: [{ text: "Yes", value: "yes" }, { text: "No", value: "no" }] } },
    ]);
  });

  it("gives null when the player closes the choice", async () => {
    const r = await run(`return $player.showChoices("Buy?", [{ text: "Yes", value: 1 }, { text: "No", value: 2 }]);`, { choices: [-1] });

    expect(r.value).toBeNull();
  });

  it("changes the map of the player", async () => {
    const r = await run(`$player.changeMap("town", { x: 12, y: 8 }); $player.changeMap("cave");`);

    expect(r.effects).toEqual([
      { name: "changeMap", params: { map: "town", positions: { x: 12, y: 8 } } },
      { name: "changeMap", params: { map: "cave" } },
    ]);
    expect(r.state?.player).toMatchObject({ map: "cave" });
  });

  it("reads an item as RPGJS does, or nothing, and adds and removes items", async () => {
    const r = await run(`
      const before = $player.getItem("Potion");
      $player.addItem("Potion", 3);
      $player.removeItem("Potion");
      $player.removeItem("Elixir", 2);
      return [before, $player.getItem("Potion"), $player.getItem("Potion")?.quantity ?? 0, $player.getItem("Elixir")?.quantity ?? 0, $player.hasItem("Potion")];
    `);

    expect(r.value).toEqual([undefined, { id: "Potion", name: "Potion", quantity: 2 }, 2, 0, true]);
    expect(r.effects.map((e) => e.name)).toEqual(["addItem", "removeItem", "removeItem"]);
  });

  it("changes the gold as a property, and never below zero", async () => {
    const r = await run(`$player.gold += 25; $player.gold -= 10; $player.gold *= 2; $player.gold -= 1000; return $player.gold;`, { player: { gold: 100 } });

    expect(r.value).toBe(0);
    expect(r.effects.map((e: any) => e.params.value)).toEqual([125, 115, 230, 0]);
  });

  it("reads and writes the variables of the player, which hold any plain value", async () => {
    const r = await run(`
      $player.setVariable("visits", ($player.getVariable("visits") ?? 0) + 1);
      $player.setVariable("tournament", true);
      $player.setVariable("quest", { step: 2, tags: ["wolves"] });
      const had = $player.hasVariable("tournament");
      const removed = $player.removeVariable("tournament");
      return [$player.getVariable("visits"), had, removed, $player.hasVariable("tournament"), $player.getVariable("quest").tags[0], $player.getVariable("nothing")];
    `);

    expect(r.value).toEqual([1, true, true, false, "wolves", undefined]);
    expect(r.state?.vars).toEqual({ visits: 1, quest: { step: 2, tags: ["wolves"] } });
  });

  it("keeps a variable apart from what the script holds: changing the value afterwards changes nothing", async () => {
    const r = await run(`const q = { n: 1 }; $player.setVariable("q", q); q.n = 2; return $player.getVariable("q").n;`);

    expect(r.value).toBe(1);
  });

  it("names the event the script runs for", async () => {
    const r = await run(`return [$event.id, $event.name, $event.x, $event.y];`, { event: { id: "chest-1", name: "chest", x: 4, y: 7 } });

    expect(r.value).toEqual(["chest-1", "chest", 4, 7]);
  });

  it("refuses what RPGJS does not have and what a script cannot do, with what is available", () => {
    const names = (source: string) => checkScript(`export function f() { ${source} }`).diagnostics[0]?.message ?? "";

    expect(names('say("hi");')).toMatch(/unknown name "say"/);
    expect(names('notify("hi");')).toMatch(/unknown name "notify"/);
    expect(names("$switch.x = true;")).toMatch(/unknown name "\$switch"/);
    expect(names("$var.x += 1;")).toMatch(/unknown name "\$var"/);
    expect(names("$self.A = true;")).toMatch(/unknown name "\$self"/);
    expect(names('$player.itemCount("x");')).toMatch(/itemCount.*showText/s);
    expect(names('$player.showText("x", { color: "red" });')).toBe("");
  });

  it("refuses a value a variable cannot hold, and a choice that is not one", async () => {
    await expect(run(`$player.setVariable("x", undefined);`)).rejects.toThrow(/removeVariable/);
    await expect(run(`$player.setVariable("x", "y".padEnd(3000, "y"));`)).rejects.toThrow();
    await expect(run(`$player.showChoices("?", [{ text: "only one", value: 1 }]);`)).rejects.toThrow(/choices/);
    await expect(run(`$player.showChoices("?", [{ text: "a" }, { text: "b" }]);`)).rejects.toThrow(/value/);
  });

  it("lets a test expect the texts, the notifications and the effects by their RPGJS names", async () => {
    const report = await runTests(`export function f() { $player.showText("Hi"); $player.showNotification("Done"); $player.addItem("Potion"); }`, [
      { name: "talks", call: { fn: "f" }, expect: { texts: ["Hi"], notifications: ["Done"], effects: ["showText", "showNotification", "addItem"], "player.items.Potion": 1 } },
    ]);

    expect(report.results[0]).toMatchObject({ pass: true, failures: [] });
  });
});
