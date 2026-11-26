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
  maps: [{ id: "yard", file: "" }],
  database: {
    potion: { id: "potion", _type: "item", name: "Potion", price: 10, consumable: true, hitRate: 1 },
  },
  player: {
    async onConnected(p) {
      await p.changeMap("yard", { x: 100, y: 100 });
    },
  },
});

async function start(scripts: ScriptSource[]) {
  fixture = await testing(createModule("BridgeTest", [{ server: serverModule, client: defineModule({}) }]), {}, { providers: [provideScripts({ scripts })] });
  const player: RpgPlayer = await (await fixture.createClient()).waitForMapChange("yard");
  return { player, map: player.getCurrentMap()! as any };
}
const settled = (check: () => void, timeout = 2000) => vi.waitFor(check, { timeout, interval: 10 });
const ticking = (check: () => void, timeout = 4000) => vi.waitFor(async () => { await fixture!.nextTickTimes(5); check(); }, { timeout, interval: 10 });
const onLevelUp = (id: string, body: string): ScriptSource => ({ id, source: `on("player.levelUp", () => { ${body} });` });
const levelUp = (player: RpgPlayer) => (player as any).execMethod("onLevelUp", [1]);
const errors = () => vi.spyOn(console, "error").mockImplementation(() => {});

describe("the player, through the names that mirror RpgPlayer", () => {
  it("changes its physics and reads them back", async () => {
    const { player } = await start([onLevelUp("physics", `
      $player.through = true;
      $player.speed = 6;
      $player.setHitbox(20, 24);
      $player.setVariable("physics_${n}", [$player.through, $player.speed, $player.hitbox]);
    `)]);
    await levelUp(player);
    await settled(() => expect(player.getVariable(`physics_${n}`)).toEqual([true, 6, { w: 20, h: 24 }]));
    expect((player as any).through).toBe(true);
  });

  it("flashes, plays a sound and shows components built from data", async () => {
    const { player } = await start([onLevelUp("look", `
      $player.flash({ type: "tint", tint: "#ff0000", duration: 200 });
      $player.playSound("coin", { volume: 0.5 });
      $player.setComponentsTop([{ type: "text", value: "{name}" }, { type: "hpBar" }]);
    `)]);
    const flash = vi.spyOn(player as any, "flash");
    const sound = vi.spyOn(player as any, "playSound");
    const components = vi.spyOn(player as any, "setComponentsTop");
    await levelUp(player);
    expect(flash).toHaveBeenCalledWith({ type: "tint", tint: "#ff0000", duration: 200 });
    expect(sound).toHaveBeenCalledWith("coin", { volume: 0.5 });
    // the data became the components of RPGJS
    const given = components.mock.calls[0][0] as any[];
    expect(given.map((c) => c.type)).toEqual(["text", "hpBar"]);
    expect(given[0].id).toBe("rpg:text");
  });

  it("buys an item, reads its parameters and translates a text", async () => {
    const { player } = await start([onLevelUp("shop", `
      $player.gold = 50;
      $player.buyItem("potion", 2);
      $player.addParameter("luck", { start: 7, end: 70 });
      $player.setVariable("shop_${n}", [$player.gold, $player.getItem("potion").quantity, $player.getParamValue("luck"), typeof $player.t("hello")]);
    `)]);
    await levelUp(player);
    await settled(() => expect(player.getVariable(`shop_${n}`)).toEqual([30, 2, 7, "string"]));
  });

  it("shows and hides the GUIs attached to sprites: its own, or those of players of the map given by id", async () => {
    const { player, map } = await start([onLevelUp("attached", `
      const me = $map.getPlayers()[0].id;
      $player.showAttachedGui();
      $player.showAttachedGui([me, "ana"]);
      $player.showAttachedGui(["nobody", "ana", "ana"]);
      $player.showAttachedGui("nobody");
      $player.hideAttachedGui("ana");
      $player.hideAttachedGui();
    `)]);
    // another player of the map, known by its id only
    const ana = { id: "ana" };
    const getPlayer = map.getPlayer.bind(map);
    vi.spyOn(map, "getPlayer").mockImplementation((id: string) => (id === "ana" ? ana : getPlayer(id)));
    const emitted = vi.spyOn(player as any, "emit");
    await levelUp(player);
    const tooltips = () => emitted.mock.calls.filter(([type]) => type === "gui.tooltip").map(([, value]) => value);
    await settled(() => expect(tooltips()).toHaveLength(5));
    expect(tooltips()).toEqual([
      { players: [player.id], display: true },
      { players: [player.id, "ana"], display: true },
      // an id that is not a player of the map is ignored, an id given twice counts once, and nothing is sent for nobody
      { players: ["ana"], display: true },
      { players: ["ana"], display: false },
      { players: [player.id], display: false },
    ]);
  });

  it("reports a wrong argument with the name of the parameter, and the game goes on", async () => {
    const error = errors();
    const { player } = await start([onLevelUp("bad", `$player.flash({ type: "blink" });`)]);
    await levelUp(player);
    await settled(() => expect(error.mock.calls.some((c) => String(c[0]).includes("options.type must be"))).toBe(true));
  });
});

describe("events, through eventCall, eventGet and eventSet", () => {
  it("walks an event along a route given as data", async () => {
    const { player, map } = await start([onLevelUp("route", `
      $map.eventSet("walker_${n}", "speed", 5);
      $map.eventCall("walker_${n}", "infiniteMoveRoute", ["right", "right", "left", "left"]);
      $player.setVariable("route_${n}", $map.eventGet("walker_${n}", "speed"));
    `)]);
    await map.createDynamicEvent({ id: `walker_${n}`, x: 200, y: 100, event: { name: "walker" } });
    const walker = map.getEvent(`walker_${n}`);
    const start_x = walker.x();
    await levelUp(player);
    await settled(() => expect(player.getVariable(`route_${n}`)).toBe(5));
    await ticking(() => expect(walker.x()).not.toBe(start_x));
  });

  it("refuses a step a route does not have", async () => {
    const error = errors();
    const { player, map } = await start([onLevelUp("bad-route", `$map.eventCall("walker_${n}", "moveRoutes", ["jump"]);`)]);
    await map.createDynamicEvent({ id: `walker_${n}`, x: 200, y: 100, event: { name: "walker" } });
    await levelUp(player);
    await settled(() => expect(error.mock.calls.some((c) => String(c[0]).includes('"jump" is not a step of a route'))).toBe(true));
  });
});

describe("the map, through the names that mirror RpgMap", () => {
  it("finds who is in an area, hides events, and writes to its database", async () => {
    const { player, map } = await start([onLevelUp("area", `
      const near = $map.queryArea({ x: 110, y: 110, radius: 80 }, { targets: "events" }).map((hit) => hit.id);
      const hidden = $map.suspendEvents(["crate_${n}"]);
      const listed = $map.getSuspendedEvents();
      $map.resumeEvents(["crate_${n}"]);
      $map.addInDatabase("elixir_${n}", { name: "Elixir", _type: "item" });
      $player.setVariable("area_${n}", [near, hidden, listed, $map.isEventSuspended("crate_${n}"), $data.get("item", "elixir_${n}").name, $map.getPlayer($player.name) === undefined]);
    `)]);
    await map.createDynamicEvent({ id: `crate_${n}`, x: 130, y: 100, event: { name: "crate" } });
    await map.createDynamicEvent({ id: `far_${n}`, x: 600, y: 600, event: { name: "far" } });
    await levelUp(player);
    await settled(() => expect(player.getVariable(`area_${n}`)).toEqual([[`crate_${n}`], [`crate_${n}`], [`crate_${n}`], false, "Elixir", true]));
  });

  it("drops loot at a point of the map", async () => {
    const { player, map } = await start([onLevelUp("loot", `$player.setVariable("loot_${n}", $map.dropLoot({ x: 150, y: 150, rewards: { gold: 5 } }).length > 0);`)]);
    await levelUp(player);
    await settled(() => expect(player.getVariable(`loot_${n}`)).toBe(true));
  });
});
