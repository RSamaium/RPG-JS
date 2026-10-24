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

  describe("weather and lighting", () => {
    it("sets, reads, patches and clears the weather as plain data", async () => {
      const r = await run(`
        const none = $map.getWeather();
        $map.setWeather({ effect: "rain", params: { intensity: 0.5 } });
        const set = $map.getWeather();
        $map.patchWeather({ params: { intensity: 0.9 } });
        const patched = $map.getWeather();
        $map.clearWeather();
        return [none, set, patched, $map.getWeather()];
      `);

      expect(r.value).toEqual([null, { effect: "rain", params: { intensity: 0.5 } }, { effect: "rain", params: { intensity: 0.9 } }, null]);
      expect(r.effects.map((e) => e.name)).toEqual(["setWeather", "patchWeather", "clearWeather"]);
    });

    it("sets, reads and clears the lighting, and turns the day or the night on", async () => {
      const r = await run(`
        $map.setLighting({ ambient: { intensity: 0.4 }, spots: [{ x: 10, y: 20, radius: 80 }] });
        const set = $map.getLighting();
        $map.patchLighting({ ambient: { intensity: 0.2 } });
        $map.setNight();
        $map.setDay();
        $map.transitionLighting({ ambient: { intensity: 1 } }, { duration: 2000, easing: "easeInOut" });
        $map.clearLighting();
        return [set.spots.length, $map.getLighting()];
      `);

      expect(r.value).toEqual([1, null]);
      expect(r.effects.map((e) => e.name)).toEqual(["setLighting", "patchLighting", "setNight", "setDay", "transitionLighting", "clearLighting"]);
      expect(r.effects[4].params).toEqual({ to: { ambient: { intensity: 1 } }, duration: 2000, easing: "easeInOut" });
    });

    it("refuses what is not plain data or is too big, and an option that does not exist", async () => {
      await expect(run(`$map.setWeather(3);`)).rejects.toThrow(/weather/);
      await expect(run(`$map.setWeather({ effect: () => 1 });`)).rejects.toThrow();
      await expect(run(`$map.setLighting({ spots: ${JSON.stringify(Array.from({ length: 400 }, (_, i) => ({ x: i, y: i, radius: 50 })))} });`)).rejects.toThrow(/characters/);
      await expect(run(`$map.transitionLighting({}, { duration: -1 });`)).rejects.toThrow(/duration/);
      await expect(run(`$map.transitionLighting({}, { easing: "bounce" });`)).rejects.toThrow(/easing/);
    });
  });

  describe("shapes", () => {
    it("creates a zone, reads it back, lists it and removes it", async () => {
      const r = await run(`
        const name = $map.createShape({ name: "spawn", x: 100, y: 200, width: 50, height: 60, color: "#ffd700", collision: false, properties: { kind: "treasure" } });
        const found = $map.getShape(name);
        const listed = $map.getShapes().map((s) => s.name);
        const removed = $map.removeShape(name);
        return [name, found, listed, removed, $map.getShape(name)];
      `);

      expect(r.value).toEqual(["spawn", { name: "spawn", x: 100, y: 200, width: 50, height: 60 }, ["spawn"], true, undefined]);
      expect(r.effects.map((e) => e.name)).toEqual(["createShape", "removeShape"]);
    });

    it("gives a name to a zone that has none, and does not remove a zone of the game", async () => {
      const r = await run(`const a = $map.createShape({ x: 0, y: 0, width: 5, height: 5 }); return [typeof a, $map.removeShape("lava"), $map.getShapes().length];`, { shapes: [{ name: "lava", x: 1, y: 1, width: 9, height: 9 }] });

      expect(r.value).toEqual(["string", false, 2]);
    });

    it("stops at 50 zones made by scripts, refuses a taken name and a bad zone", async () => {
      await expect(run(`for (let i = 0; i < 60; i += 1) { $map.createShape({ x: i, y: 0, width: 5, height: 5 }); }`)).rejects.toThrow(/50 zones/);
      await expect(run(`$map.createShape({ name: "a", x: 0, y: 0, width: 5, height: 5 }); $map.createShape({ name: "a", x: 9, y: 9, width: 5, height: 5 });`)).rejects.toThrow(/already/);
      await expect(run(`$map.createShape({ x: 0, y: 0, width: 0, height: 5 });`)).rejects.toThrow(/width and height/);
      await expect(run(`$map.createShape({ x: 0, y: 0, width: 5, height: 5, color: "red" });`)).rejects.toThrow(/color/);
      await expect(run(`$map.createShape({ x: 0, y: 0, width: 5, height: 5, onEnter: () => {} });`)).rejects.toThrow(/name, x, y, width, height/);
    });
  });

  describe("sounds and effects", () => {
    it("plays and stops a sound for the players of the map", async () => {
      const r = await run(`$map.playSound("rain-loop", { volume: 0.5, loop: true }); $map.playSound("gong"); $map.stopSound("rain-loop");`);

      expect(r.effects).toEqual([
        { name: "playSound", params: { id: "rain-loop", volume: 0.5, loop: true } },
        { name: "playSound", params: { id: "gong" } },
        { name: "stopSound", params: { id: "rain-loop" } },
      ]);
    });

    it("shows an animation, a component animation, and shakes the map", async () => {
      const r = await run(`
        $map.showAnimation({ x: 10, y: 20 }, "explosion");
        $map.showAnimation({ x: 10, y: 20 }, "hero", "attack");
        $map.showComponentAnimation("area-damage", { x: 30, y: 40 }, { radius: 100, color: "red" });
        $map.shakeMap({ intensity: 20, duration: 600, direction: "y" });
        $map.shakeMap();
      `);

      expect(r.effects).toEqual([
        { name: "showAnimation", params: { position: { x: 10, y: 20 }, graphic: "explosion", animationName: "default" } },
        { name: "showAnimation", params: { position: { x: 10, y: 20 }, graphic: "hero", animationName: "attack" } },
        { name: "showComponentAnimation", params: { id: "area-damage", position: { x: 30, y: 40 }, params: { radius: 100, color: "red" } } },
        { name: "shakeMap", params: { intensity: 20, duration: 600, direction: "y" } },
        { name: "shakeMap", params: {} },
      ]);
    });

    it("refuses a value out of range, and says which", async () => {
      await expect(run(`$map.playSound("a", { volume: 3 });`)).rejects.toThrow(/volume/);
      await expect(run(`$map.playSound(7);`)).rejects.toThrow(/sound/);
      await expect(run(`$map.showAnimation({ x: "a", y: 1 }, "g");`)).rejects.toThrow(/position/);
      await expect(run(`$map.shakeMap({ intensity: 1000 });`)).rejects.toThrow(/intensity/);
      await expect(run(`$map.shakeMap({ direction: "z" });`)).rejects.toThrow(/direction/);
      await expect(run(`$map.shakeMap({ speed: 1 });`)).rejects.toThrow(/intensity, duration, frequency, direction/);
    });
  });
});
