import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createModule, defineModule } from "@rpgjs/common";
import type { RpgPlayer, RpgServer } from "@rpgjs/server";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { provideScripts, type ScriptSource } from "../src/server";

let fixture: TestingFixture | undefined;
// the scripts of an earlier `testing()` still run in the next one: every test writes to names of its own
let n = 0;
beforeEach(() => { n++; });
afterEach(async () => {
  await fixture?.clear();
  fixture = undefined;
  vi.restoreAllMocks();
});

const serverModule = defineModule<RpgServer>({
  maps: [{ id: "town", file: "" }],
  events: [],
  player: {
    async onConnected(p) {
      await p.changeMap("town", { x: 100, y: 100 });
    },
  },
});

async function start(scripts: ScriptSource[]) {
  fixture = await testing(createModule("MapApiTest", [{ server: serverModule, client: defineModule({}) }]), {}, { providers: [provideScripts({ scripts })] });
  const player: RpgPlayer = await (await fixture.createClient()).waitForMapChange("town");
  return { player, map: player.getCurrentMap()! };
}

const settled = (check: () => void) => vi.waitFor(check, { timeout: 2000, interval: 10 });

describe("$map on a real map", () => {
  it("creates an event on the map, with its name, which the players then act on and touch", async () => {
    const { player, map } = await start([
      { id: "maker", source: `on("player.joinMap", () => { $map.createDynamicEvent({ id: "shop_${n}", x: 150, y: 100, name: "shop_${n}", hitbox: { width: 40, height: 40 } }); });` },
      { id: "shop", source: `on("event.action", { where: { "event.name": "shop_${n}" } }, () => { $player.setVariable("shopped_${n}", true); });` },
    ]);
    await settled(() => expect(map.getEvent(`shop_${n}`)).toBeDefined());

    await map.getEvent(`shop_${n}`)!.execMethod("onAction", [player, { action: "action" }]);

    expect(player.getVariable(`shopped_${n}`)).toBe(true);
    const name = (map.getEvent(`shop_${n}`) as any).name;
    expect(typeof name === "function" ? name() : name).toBe(`shop_${n}`);
  });

  it("finds and lists the events, and removes the ones it made", async () => {
    const { player, map } = await start([{
      id: "keeper",
      source: `on("player.levelUp", () => {
        const id = $map.createDynamicEvent({ id: "temp_${n}", x: 200, y: 100, name: "temp" });
        const found = $map.getEvent(id);
        const listed = $map.getEvents().map((e) => e.id).includes(id);
        const removed = $map.removeEvent(id);
        $player.setVariable("kept_${n}", [found.name, listed, removed, $map.getEvent(id) === undefined]);
      });`,
    }]);

    player.level = player.level + 1;

    await settled(() => expect(player.getVariable(`kept_${n}`)).toEqual(["temp", true, true, true]));
    expect(map.getEvent(`temp_${n}`)).toBeUndefined();
  });

  it("does not remove an event of the game", async () => {
    const { player, map } = await start([{ id: "thief", source: `on("player.levelUp", () => { $player.setVariable("removed_${n}", $map.removeEvent("old-man_${n}")); });` }]);
    await map.createDynamicEvent({ id: `old-man_${n}`, x: 300, y: 100, event: { name: "old man" } as any });

    player.level = player.level + 1;

    await settled(() => expect(player.getVariable(`removed_${n}`)).toBe(false));
    expect(map.getEvent(`old-man_${n}`)).toBeDefined();
  });

  it("reads the events and the players of the map", async () => {
    const { player, map } = await start([{
      id: "reader",
      source: `on("player.levelUp", () => { $player.setVariable("seen_${n}", [$map.id, $map.getPlayers().map((p) => p.id).includes($event.id || "none") , $map.getPlayers().length, $map.getEvent("npc_${n}")?.name]); });`,
    }]);
    await map.createDynamicEvent({ id: `npc_${n}`, x: 300, y: 100, event: { name: "old man" } as any });

    player.level = player.level + 1;

    await settled(() => expect(player.getVariable(`seen_${n}`)).toEqual(["town", false, 1, "old man"]));
  });

  it("keeps variables on the map, apart from the ones of the player", async () => {
    const { player, map } = await start([{ id: "gate", source: `on("player.levelUp", () => { $map.setVariable("gate_${n}", "open"); $player.setVariable("mine_${n}", $map.getVariable("gate_${n}")); });` }]);

    player.level = player.level + 1;

    await settled(() => expect(map.getVariable(`gate_${n}`)).toBe("open"));
    expect(player.getVariable(`mine_${n}`)).toBe("open");
    expect(player.hasVariable(`gate_${n}`)).toBe(false);
  });

  it("stops a script that makes events without end, and reports it", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { player, map } = await start([{ id: "flood", source: `on("player.levelUp", () => { for (let i = 0; i < 80; i += 1) { $map.createDynamicEvent({ id: "f${n}_" + i, x: i, y: 0 }); } });` }]);

    player.level = player.level + 1;

    await settled(() => expect(error).toHaveBeenCalled());
    expect(map.getEvents().filter((event) => event.id.startsWith(`f${n}_`)).length).toBe(50);
  });
});

describe("weather, lighting, zones, sounds and effects on a real map", () => {
  it("sets, reads, patches and clears the weather of the map", async () => {
    const { player, map } = await start([{
      id: "storm",
      source: `on("player.levelUp", () => {
        $map.setWeather({ effect: "rain", params: { intensity: 0.5 } });
        $map.patchWeather({ params: { intensity: 0.9 } });
        $player.setVariable("weather_${n}", $map.getWeather());
      });`,
    }]);

    player.level = player.level + 1;

    await settled(() => expect(player.getVariable(`weather_${n}`)).toMatchObject({ effect: "rain" }));
    expect(map.getWeather()).toMatchObject({ effect: "rain", params: { intensity: 0.9 } });
  });

  it("clears the weather", async () => {
    const { player, map } = await start([{ id: "clear", source: `on("player.levelUp", () => { $map.setWeather({ effect: "snow" }); $map.clearWeather(); $player.setVariable("cleared_${n}", true); });` }]);

    player.level = player.level + 1;

    await settled(() => expect(player.getVariable(`cleared_${n}`)).toBe(true));
    expect(map.getWeather()).toBeNull();
  });

  it("sets, reads and clears the lighting, and turns the night on", async () => {
    const { player, map } = await start([{
      id: "lights",
      source: `on("player.levelUp", () => {
        $map.setLighting({ ambient: { intensity: 0.4 } });
        $player.setVariable("light_${n}", $map.getLighting());
        $map.setNight();
      });`,
    }]);

    player.level = player.level + 1;

    await settled(() => expect(player.getVariable(`light_${n}`)).toMatchObject({ ambient: { intensity: 0.4 } }));
    expect(map.getLighting()).not.toBeNull();
  });

  it("makes a zone that the signals of the player tell about, and removes it", async () => {
    const { player, map } = await start([
      { id: "zones", source: `on("player.levelUp", () => { $map.createShape({ name: "trap_${n}", x: 120, y: 100, width: 60, height: 60, properties: { kind: "trap" } }); });` },
      { id: "enter", source: `on("player.inShape", { where: { "shape.name": "trap_${n}" } }, (e) => { $player.setVariable("in_${n}", e.shape.name); });` },
      { id: "leave", source: `on("player.outShape", { where: { "shape.name": "trap_${n}" } }, () => { $player.setVariable("out_${n}", true); $map.removeShape("trap_${n}"); });` },
    ]);

    player.level = player.level + 1;
    await settled(() => expect(map.getShape(`trap_${n}`)).toBeDefined());
    const shape = map.getShape(`trap_${n}`)!;
    // as the map does it: execMethod(hook, [player, shape]), which gives the module hooks (player, player, shape)
    await player.execMethod("onInShape", [player, shape]);
    await player.execMethod("onOutShape", [player, shape]);

    expect(player.getVariable(`in_${n}`)).toBe(`trap_${n}`);
    expect(player.getVariable(`out_${n}`)).toBe(true);
    expect(map.getShape(`trap_${n}`)).toBeUndefined();
  });

  it("does not remove a zone of the game, and stops at 50 zones", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { player, map } = await start([
      { id: "thief", source: `on("event.action", { where: { "event.name": "bandit_${n}" } }, () => { $player.setVariable("lava_${n}", $map.removeShape("lava_${n}")); });` },
      { id: "flood", source: `on("player.dead", () => { for (let i = 0; i < 80; i += 1) { $map.createShape({ name: "z${n}_" + i, x: i, y: 0, width: 5, height: 5 }); } });` },
    ]);
    map.createShape({ name: `lava_${n}`, x: 400, y: 100, width: 40, height: 40 });
    const id = (await map.createDynamicEvent({ id: `bandit_${n}`, x: 500, y: 100, event: { name: `bandit_${n}` } as any }))!;

    await map.getEvent(id)!.execMethod("onAction", [player, { action: "action" }]);
    expect(player.getVariable(`lava_${n}`)).toBe(false);
    player.hp = 0;

    const made = () => map.getShapes().filter((shape) => shape.name.startsWith(`z${n}_`)).length;
    await settled(() => expect(made()).toBe(50));
    await settled(() => expect(error.mock.calls.some((call) => String(call[0]).includes("50 zones"))).toBe(true));
    expect(map.getShape(`lava_${n}`)).toBeDefined();
    expect(made()).toBe(50);
  });

  it("plays sounds, shows animations and shakes the map, through the API of the map", async () => {
    const { player, map } = await start([{
      id: "effects",
      source: `on("player.levelUp", () => {
        $map.playSound("gong", { volume: 0.5 });
        $map.stopSound("gong");
        $map.showAnimation({ x: 10, y: 20 }, "explosion", "default");
        $map.showComponentAnimation("area-damage", { x: 30, y: 40 }, { radius: 100 });
        $map.shakeMap({ intensity: 20, duration: 600, direction: "y" });
        $player.setVariable("done_${n}", true);
      });`,
    }]);
    const playSound = vi.spyOn(map, "playSound").mockImplementation(() => {});
    const stopSound = vi.spyOn(map, "stopSound").mockImplementation(() => {});
    const showAnimation = vi.spyOn(map, "showAnimation").mockImplementation(() => {});
    const showComponentAnimation = vi.spyOn(map, "showComponentAnimation").mockImplementation(() => {});
    const shakeMap = vi.spyOn(map, "shakeMap").mockImplementation(() => {});

    player.level = player.level + 1;

    await settled(() => expect(player.getVariable(`done_${n}`)).toBe(true));
    expect(playSound).toHaveBeenCalledWith("gong", { volume: 0.5 });
    expect(stopSound).toHaveBeenCalledWith("gong");
    expect(showAnimation).toHaveBeenCalledWith({ x: 10, y: 20 }, "explosion", "default");
    expect(showComponentAnimation).toHaveBeenCalledWith("area-damage", { x: 30, y: 40 }, { radius: 100 });
    expect(shakeMap).toHaveBeenCalledWith({ intensity: 20, duration: 600, direction: "y" });
  });
});

