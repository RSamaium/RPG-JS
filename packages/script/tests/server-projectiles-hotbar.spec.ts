import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createModule, defineModule } from "@rpgjs/common";
import type { RpgClient } from "@rpgjs/client";
import type { RpgPlayer, RpgServer } from "@rpgjs/server";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { ScriptService, provideScripts } from "../src/server";
import { GAME_API_DESCRIPTION } from "../src/game/description";

const Focus = { id: "Focus", name: "Focus", spCost: 4, hitRate: 1, _type: "skill" as const };
const Potion = { id: "Potion", name: "Potion", description: "Restores HP", price: 10, hpValue: 50, consumable: true, _type: "item" as const };

let fixture: TestingFixture | undefined;
// The hooks of an earlier `testing()` stay alive in the next one: every test writes to variables of its own.
let n = 0;
beforeEach(() => { n++; });

const serverModule = defineModule<RpgServer>({
  maps: [{ id: "test-map", file: "" }],
  database: { Potion, Focus },
  player: {
    async onConnected(p) {
      await p.changeMap("test-map", { x: 100, y: 100 });
    },
  },
});

async function start(service: ScriptService) {
  fixture = await testing(createModule("ScriptProjectilesTest", [{ server: serverModule, client: defineModule<RpgClient>({}) }]), {}, { providers: [provideScripts(service)] });
  const client = await fixture.createClient();
  const player: RpgPlayer = await client.waitForMapChange("test-map");
  return { player, map: player.getCurrentMap()! };
}

const settled = (check: () => void) => vi.waitFor(check, { timeout: 2000, interval: 10 });

afterEach(async () => {
  await fixture?.clear();
  fixture = undefined;
  vi.restoreAllMocks();
});

describe("scripts and the hotbar", () => {
  it("emits player.hotbarChange with the action and the slots", async () => {
    const service = new ScriptService();
    service.install({ id: "hotbar", source: `on("player.hotbarChange", { where: { action: "initialize" } }, (e) => { $player.setVariable("hotbar_${n}", e.slots[0].id); });` });
    const { player } = await start(service);
    player.addItem("Potion");

    player.initializeHotbar([{ type: "item", id: "Potion" }]);

    await settled(() => expect(player.getVariable(`hotbar_${n}`)).toBe("Potion"));
  });

  it("assigns a slot of the hotbar from a script", async () => {
    const service = new ScriptService({ signals: { "test.go": { doc: "test", payload: {} } } });
    service.install({ id: "assign", source: `on("test.go", () => { $player.addItem("Potion"); $player.assignHotbarSlot(2, { type: "item", id: "Potion" }); });` });
    const { player, map } = await start(service);

    await service.emit("test.go", {}, { player, map });

    expect(player.getHotbar().slots[2]).toEqual({ type: "item", id: "Potion" });
  });

  it("refuses a slot out of the hotbar", async () => {
    const service = new ScriptService({ signals: { "test.go": { doc: "test", payload: {} } } });
    service.install({ id: "assign", source: `on("test.go", () => { $player.assignHotbarSlot(12, { type: "item", id: "Potion" }); });` });
    const { player, map } = await start(service);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await service.emit("test.go", {}, { player, map });

    expect(player.getHotbar().slots.every((slot) => slot === null)).toBe(true);
    error.mockRestore();
  });
});

describe("scripts and the projectiles", () => {
  it("launches a projectile of the map from a point toward another one", async () => {
    const service = new ScriptService({ signals: { "test.go": { doc: "test", payload: {} } } });
    service.install({ id: "launch", source: `on("test.go", () => { $player.setVariable("projectile_${n}", $map.launchProjectile({ projectile: "arrow", from: { x: 0, y: 0 }, toward: { x: 30, y: 40 }, damage: 7 })); });` });
    const { player, map } = await start(service);
    const emit = vi.spyOn(map.projectiles, "emit");

    await service.emit("test.go", {}, { player, map });

    expect(emit).toHaveBeenCalledTimes(1);
    const options = emit.mock.calls[0][0];
    expect(options).toMatchObject({ type: "arrow", origin: { x: 0, y: 0 }, payload: { damage: 7 } });
    expect(options.direction).toEqual({ x: 0.6, y: 0.8 });
    expect(typeof player.getVariable(`projectile_${n}`)).toBe("string");
  });

  it("refuses a projectile that goes toward its own origin", async () => {
    const service = new ScriptService({ signals: { "test.go": { doc: "test", payload: {} } } });
    service.install({ id: "launch", source: `on("test.go", () => { $map.launchProjectile({ projectile: "arrow", from: { x: 5, y: 5 }, toward: { x: 5, y: 5 } }); });` });
    const { player, map } = await start(service);
    const emit = vi.spyOn(map.projectiles, "emit");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await service.emit("test.go", {}, { player, map });

    expect(emit).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("emits projectile.end to the player who launched the projectile", async () => {
    const service = new ScriptService();
    service.install({ id: "end", source: `on("projectile.end", (e) => { $player.setVariable("end_${n}", e.projectile.type + ":" + e.reason); });` });
    const { player, map } = await start(service);

    player.projectiles.emit({ type: "bomb", origin: { x: 100, y: 100 }, direction: { x: 1, y: 0 }, trajectory: { type: "linear", speed: 400, range: 20 } });
    for (let i = 0; i < 10; i++) map.projectiles.step(0.1);

    await settled(() => expect(String(player.getVariable(`end_${n}`)).startsWith("bomb:")).toBe(true));
  });

  it("gives projectile.end the point where the projectile ended, not its origin", async () => {
    const service = new ScriptService();
    service.install({ id: "end", source: `on("projectile.end", (e) => { $player.setVariable("end_${n}", e.reason + ":" + Math.round(e.x) + ":" + Math.round(e.y) + ":" + e.surface); });` });
    const { player, map } = await start(service);

    // A lob that lands on nothing, short of a target out of its reach.
    player.projectiles.emit({ type: "bomb", origin: { x: 100, y: 100 }, target: { x: 100, y: 500 }, trajectory: { type: "arc", range: 60, duration: 0.2 } });
    for (let i = 0; i < 10; i++) map.projectiles.step(0.1);

    await settled(() => expect(player.getVariable(`end_${n}`)).toBe("land:100:160:ground"));
  });

  it("lobs a projectile onto the point it is launched toward", async () => {
    const service = new ScriptService({ signals: { "test.go": { doc: "test", payload: {} } } });
    service.install({ id: "launch", source: `on("test.go", () => { $map.launchProjectile({ projectile: "bomb", from: { x: 0, y: 0 }, toward: { x: 60, y: 0 }, arc: { height: 30 }, landingRadius: 24, delay: 200 }); });` });
    const { player, map } = await start(service);
    const emit = vi.spyOn(map.projectiles, "emit");

    await service.emit("test.go", {}, { player, map });

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0][0]).toMatchObject({
      type: "bomb",
      target: { x: 60, y: 0 },
      trajectory: { type: "arc", height: 30 },
      landing: { radius: 24 },
      delay: 200,
    });
  });

  it("fires projectile.end for the player of the script when it launches the projectile", async () => {
    const service = new ScriptService({ signals: { "test.go": { doc: "test", payload: {} } } });
    service.install({ id: "launch", source: `on("test.go", () => { $map.launchProjectile({ projectile: "arrow", from: { x: 0, y: 0 }, toward: { x: 10, y: 0 }, range: 20, owner: "player" }); });` });
    service.install({ id: "end", source: `on("projectile.end", (e) => { $player.setVariable("end_${n}", e.projectile.type + ":" + e.reason); });` });
    const { player, map } = await start(service);
    const emit = vi.spyOn(map.projectiles, "emit");

    await service.emit("test.go", {}, { player, map });
    expect(emit.mock.calls[0][1]).toBe(player);
    for (let i = 0; i < 10; i++) map.projectiles.step(0.1);

    await settled(() => expect(String(player.getVariable(`end_${n}`)).startsWith("arrow:")).toBe(true));
  });

  it("launches a projectile without owner by default", async () => {
    const service = new ScriptService({ signals: { "test.go": { doc: "test", payload: {} } } });
    service.install({ id: "launch", source: `on("test.go", () => { $map.launchProjectile({ projectile: "arrow", from: { x: 0, y: 0 }, toward: { x: 10, y: 0 } }); });` });
    const { player, map } = await start(service);
    const emit = vi.spyOn(map.projectiles, "emit");

    await service.emit("test.go", {}, { player, map });

    expect(emit.mock.calls[0][1]).toBeUndefined();
  });

  it("removes the damage of a launched projectile from what it hits", async () => {
    const service = new ScriptService({ signals: { "test.go": { doc: "test", payload: {} } } });
    service.install({ id: "launch", source: `on("test.go", () => { $map.launchProjectile({ projectile: "arrow", from: { x: 0, y: 0 }, toward: { x: 10, y: 0 }, damage: 7 }); });` });
    const { player, map } = await start(service);
    const emit = vi.spyOn(map.projectiles, "emit");
    const target = { hp: 30 };

    await service.emit("test.go", {}, { player, map });
    emit.mock.calls[0][0].onHit!({ target } as any);

    expect(target.hp).toBe(23);
  });

  it("refuses a landing radius without a lob", async () => {
    const service = new ScriptService({ signals: { "test.go": { doc: "test", payload: {} } } });
    service.install({ id: "launch", source: `on("test.go", () => { $map.launchProjectile({ projectile: "arrow", from: { x: 0, y: 0 }, toward: { x: 60, y: 0 }, landingRadius: 24 }); });` });
    const { player, map } = await start(service);
    const emit = vi.spyOn(map.projectiles, "emit");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await service.emit("test.go", {}, { player, map });

    expect(emit).not.toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("scripts that reply to event.projectileHit", () => {
  // The player stands at (100, 100): an event on the right, in the way of an arrow shot to the right.
  async function shootThrough(source: string, setup?: (player: RpgPlayer) => void) {
    const service = new ScriptService();
    service.install({ id: "reply", source });
    const { player, map } = await start(service);
    setup?.(player);
    await map.createDynamicEvent({ id: `crate-${n}`, x: 180, y: 100, event: { name: "Crate" } });
    const onHit = vi.fn();
    const onEnd = vi.fn();
    player.projectiles.emit({
      type: "arrow",
      origin: { x: 140, y: 116 },
      direction: { x: 1, y: 0 },
      trajectory: { type: "linear", speed: 400, range: 160 },
      onHit,
      onEnd,
    });
    for (let i = 0; i < 30; i++) map.projectiles.step(1 / 30);
    return { player, onHit, onEnd };
  }

  it("keeps the projectile behavior without a reply: it stops on the event", async () => {
    const { onHit, onEnd } = await shootThrough(`on("event.projectileHit", () => {});`);
    expect(onHit).toHaveBeenCalledTimes(1);
    expect(onEnd.mock.calls[0][0].reason).toBe("hit");
  });

  it('lets the projectile fly through with "pass"', async () => {
    const { onEnd } = await shootThrough(`on("event.projectileHit", () => "pass");`);
    // It goes on to the end of its range (the hit is still reported, as for any target that lets it through).
    expect(onEnd.mock.calls[0][0].reason).toBe("range");
  });

  it('plants the projectile in the event with "stick"', async () => {
    const { onEnd } = await shootThrough(`on("event.projectileHit", () => { return "stick"; });`);
    expect(onEnd.mock.calls[0][0].x).toBeLessThan(200);
  });

  it("replies from what the player knows, read at once", async () => {
    const source = `on("event.projectileHit", (e) => { if ($player.getVariable("ghost_${n}") === true && e.projectile.type === "arrow") return "pass"; });`;
    const { onEnd } = await shootThrough(source, (player) => player.setVariable(`ghost_${n}`, true));
    expect(onEnd.mock.calls[0][0].reason).toBe("range");
  });

  it("cannot reply from a listener that waits, which still runs", async () => {
    const source = `on("event.projectileHit", () => { $player.setVariable("seen_${n}", true); return "pass"; });`;
    const { player, onEnd } = await shootThrough(source);
    // setVariable is not a reader: the listener waits, so it only observes.
    expect(onEnd.mock.calls[0][0].reason).toBe("hit");
    await settled(() => expect(player.getVariable(`seen_${n}`)).toBe(true));
  });

  it("ignores a reply the signal does not take", async () => {
    const { onEnd } = await shootThrough(`on("event.projectileHit", () => "explode");`);
    expect(onEnd.mock.calls[0][0].reason).toBe("hit");
  });
});

describe("scripts and the skills", () => {
  it("uses a skill the player knows, as player.useSkill does", async () => {
    const service = new ScriptService({ signals: { "test.go": { doc: "test", payload: {} } } });
    service.install({ id: "skill", source: `on("test.go", () => { $player.setVariable("used_${n}", $player.useSkill("Focus")); });` });
    const { player, map } = await start(service);
    player.learnSkill("Focus");
    player.sp = 10;

    await service.emit("test.go", {}, { player, map });

    expect(player.getVariable(`used_${n}`)).toBe(true);
    expect(player.sp).toBe(6);
  });

  it("gives false for a skill the player cannot use", async () => {
    const service = new ScriptService({ signals: { "test.go": { doc: "test", payload: {} } } });
    service.install({ id: "skill", source: `on("test.go", () => { $player.setVariable("used_${n}", $player.useSkill("Focus")); });` });
    const { player, map } = await start(service);

    await service.emit("test.go", {}, { player, map });

    expect(player.getVariable(`used_${n}`)).toBe(false);
  });

  it("refuses a target that is not on the map", async () => {
    const service = new ScriptService({ signals: { "test.go": { doc: "test", payload: {} } } });
    service.install({ id: "skill", source: `on("test.go", () => { $player.useSkill("Focus", { target: "nobody" }); });` });
    const { player, map } = await start(service);
    player.learnSkill("Focus");
    player.sp = 10;
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await service.emit("test.go", {}, { player, map });

    expect(player.sp).toBe(10);
    error.mockRestore();
  });
});

describe("scripts and the visual effects", () => {
  it("plays a visual effect at a point of the map", async () => {
    const service = new ScriptService({ signals: { "test.go": { doc: "test", payload: {} } } });
    service.install({ id: "fx", source: `on("test.go", () => { $map.playVisualEffect({ effect: "holy-burst", at: { x: 40, y: 60 }, preset: { emitters: [] }, duration: 800, scale: 2 }); });` });
    const { player, map } = await start(service);
    const show = vi.spyOn(map, "showComponentAnimation");

    await service.emit("test.go", {}, { player, map });

    expect(show).toHaveBeenCalledWith("rpg:visual-effect", { x: 40, y: 60 }, {
      name: "holy-burst",
      preset: { emitters: [] },
      displayDuration: 800,
      scale: 2,
    });
  });

  it("refuses a preset that is not a particle preset", async () => {
    const service = new ScriptService({ signals: { "test.go": { doc: "test", payload: {} } } });
    service.install({ id: "fx", source: `on("test.go", () => { $map.playVisualEffect({ effect: "burst", at: { x: 40, y: 60 }, preset: { color: "#ffffff" } }); });` });
    const { player, map } = await start(service);
    const show = vi.spyOn(map, "showComponentAnimation");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await service.emit("test.go", {}, { player, map });

    expect(show).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("refuses a visual effect without a name", async () => {
    const service = new ScriptService({ signals: { "test.go": { doc: "test", payload: {} } } });
    service.install({ id: "fx", source: `on("test.go", () => { $map.playVisualEffect({ at: { x: 40, y: 60 } }); });` });
    const { player, map } = await start(service);
    const show = vi.spyOn(map, "showComponentAnimation");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await service.emit("test.go", {}, { player, map });

    expect(show).not.toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("description of the new signals and methods", () => {
  it("describes the signals and the methods", () => {
    for (const signal of ["player.hotbarChange", "player.projectileHit", "event.projectileHit", "projectile.end"]) {
      expect(GAME_API_DESCRIPTION.signals?.[signal], signal).toBeDefined();
    }
    expect(GAME_API_DESCRIPTION.handles.$map.methods?.launchProjectile).toBeDefined();
    expect(GAME_API_DESCRIPTION.handles.$map.methods?.playVisualEffect).toBeDefined();
    expect(GAME_API_DESCRIPTION.handles.$player.methods?.assignHotbarSlot).toBeDefined();
  });
});
