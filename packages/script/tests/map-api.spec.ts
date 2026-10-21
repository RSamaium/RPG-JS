import { describe, expect, it } from "vitest";
import { checkScript, simulate } from "../src/testing/tools";

const run = async (body: string, world: object = {}) => {
  const r = await simulate({ source: `export function f() { ${body} }`, call: { fn: "f" }, world });
  if (!r.ok) throw new Error(r.error ?? JSON.stringify(r.diagnostics));
  return r;
};

describe("$map: the map the script runs in, with the names of RpgMap", () => {
  it("names the map", async () => {
    expect((await run("return $map.id", { room: { id: "town", kind: "map" } })).value).toBe("town");
  });

  it("creates an event, which it can then find, list and remove", async () => {
    const r = await run(`
      const id = $map.createDynamicEvent({ id: "shop-1", x: 150, y: 100, name: "shop", graphic: "merchant", hitbox: { width: 40, height: 40 }, through: false });
      const found = $map.getEvent(id);
      const listed = $map.getEvents().map((e) => e.id);
      const removed = $map.removeEvent(id);
      return [id, found, listed, removed, $map.getEvent(id)];
    `);

    expect(r.value).toEqual(["shop-1", { id: "shop-1", name: "shop", x: 150, y: 100 }, ["shop-1"], true, undefined]);
    expect(r.effects.map((e) => e.name)).toEqual(["createDynamicEvent", "removeEvent"]);
    expect(r.effects[0].params).toEqual({ id: "shop-1", x: 150, y: 100, name: "shop", graphic: "merchant", hitbox: { width: 40, height: 40 }, through: false });
  });

  it("gives an id to an event that has none, and a name of its own", async () => {
    const r = await run(`const a = $map.createDynamicEvent({ x: 1, y: 2 }); const b = $map.createDynamicEvent({ x: 3, y: 4 }); return [a !== b, typeof a, $map.getEvent(a).name];`);

    expect(r.value).toEqual([true, "string", ""]);
  });

  it("reads the events of the game, and does not remove them", async () => {
    const r = await run(`return [$map.getEvents().map((e) => e.name), $map.getEvent("npc")?.x, $map.removeEvent("npc"), $map.getEvents().length];`, {
      events: [{ id: "npc", name: "old man", x: 40, y: 50 }],
    });

    expect(r.value).toEqual([["old man"], 40, false, 1]);
  });

  it("lists the players of the map as copies", async () => {
    const r = await run(`return $map.getPlayers().map((p) => [p.id, p.name]);`, { player: { name: "Kael" } });

    expect(r.value).toEqual([["player_1", "Kael"]]);
  });

  it("has variables of its own, with the names of RpgMap", async () => {
    const r = await run(`
      $map.setVariable("gate_open", true);
      $map.setVariable("wave", ($map.getVariable("wave") ?? 0) + 1);
      const had = $map.hasVariable("gate_open");
      const removed = $map.removeVariable("gate_open");
      return [$map.getVariable("wave"), had, removed, $map.hasVariable("gate_open")];
    `);

    expect(r.value).toEqual([1, true, true, false]);
    expect(r.state?.mapVars).toEqual({ wave: 1 });
  });

  it("keeps the variables of the map apart from the ones of the player", async () => {
    const r = await run(`$map.setVariable("x", 1); $player.setVariable("y", 2); return [$player.hasVariable("x"), $map.hasVariable("y")];`);

    expect(r.value).toEqual([false, false]);
  });

  it("stops at 50 events made by scripts on a map", async () => {
    await expect(run(`for (let i = 0; i < 60; i += 1) { $map.createDynamicEvent({ x: i, y: 0 }); }`)).rejects.toThrow(/50 events/);
  });

  it("refuses an event that is not described by plain data, with what is accepted", async () => {
    const bad = (options: string) => run(`$map.createDynamicEvent(${options});`);

    await expect(bad(`{ y: 1 }`)).rejects.toThrow(/x and y/);
    await expect(bad(`{ x: 1, y: 1, onAction: () => {} }`)).rejects.toThrow(/id, x, y, name, graphic, hitbox, through/);
    await expect(bad(`{ x: 1, y: 1, id: "a/b" }`)).rejects.toThrow(/id/);
    await expect(bad(`{ x: 1, y: 1, hitbox: { width: 0, height: 4 } }`)).rejects.toThrow(/hitbox/);
    await expect(bad(`{ x: 1, y: 1, name: 3 }`)).rejects.toThrow(/name/);
    await expect(bad(`{ x: 1e9, y: 1 }`)).rejects.toThrow(/x and y/);
  });

  it("refuses to create an event with an id that is already taken", async () => {
    await expect(run(`$map.createDynamicEvent({ id: "a", x: 1, y: 1 }); $map.createDynamicEvent({ id: "a", x: 2, y: 2 });`)).rejects.toThrow(/already/);
  });

  it("is not there in a room that is not a map, and says how to tell", async () => {
    await expect(run(`return $map.id`, { room: { id: "battle-1", kind: "battle" } })).rejects.toThrow(/not a map.*\$room\.kind/s);
    expect((await run(`return $room.kind === "map" ? $map.id : "no map"`, { room: { id: "battle-1", kind: "battle" } })).value).toBe("no map");
  });

  it("checks the names of $map when the script is checked, with what is available", () => {
    const message = checkScript(`export function f() { $map.explode(); }`).diagnostics[0]?.message ?? "";

    expect(message).toMatch(/Available methods of \$map: createDynamicEvent, getEvent, getEvents, removeEvent, getPlayers, getVariable, setVariable, hasVariable, removeVariable/);
  });
});
