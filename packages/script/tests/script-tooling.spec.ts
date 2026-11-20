import { describe, expect, it } from "vitest";
import { checkScript, simulate } from "../src/testing/tools";
import { SimWorld } from "../src/testing/world";
import { SignalRegistry } from "../src/core/signals";
import { GAME_API_DESCRIPTION } from "../src/game/description";
import { GAME_API_IMPL } from "../src/game/impl";

const run = async (body: string, world: Record<string, unknown> = {}) => {
  const r = await simulate({ source: `export function f() { ${body} }`, call: { fn: "f" }, world });
  if (!r.ok) throw new Error(r.error ?? JSON.stringify(r.diagnostics));
  return r;
};

describe("a listener that runs at most every so often", () => {
  it("runs once per `every` for each player", async () => {
    const program = checkScript(`on("map.tick", { every: 1 }, () => { $player.gold += 1; });`).program!;
    const registry = new SignalRegistry({ description: GAME_API_DESCRIPTION, impl: GAME_API_IMPL });
    registry.install("tick", program);
    const worlds = { alice: new SimWorld({ player: { gold: 0 } }), bob: new SimWorld({ player: { gold: 0 } }) };
    for (let i = 0; i < 3; i++) {
      await registry.emit("map.tick", { map: "town", deltaMs: 16, tick: i, mapTags: [] }, () => worlds.alice, "alice");
    }
    const report = await registry.emit("map.tick", { map: "town", deltaMs: 16, tick: 3, mapTags: [] }, () => worlds.bob, "bob");
    // alice ran once in three ticks, bob has its own rhythm
    expect([worlds.alice.player.gold, worlds.bob.player.gold]).toEqual([1, 1]);
    const skipped = await registry.emit("map.tick", { map: "town", deltaMs: 16, tick: 4, mapTags: [] }, () => worlds.bob, "bob");
    expect(report.listeners[0].ran).toBe(true);
    expect(skipped.listeners[0].why).toMatch(/every/);
  });

  it("refuses an every out of range", () => {
    expect(checkScript(`on("map.tick", { every: 0 }, () => {});`).diagnostics[0].message).toMatch(/"every" is a number of seconds from 0.05 to 3600/);
    expect(checkScript(`on("map.tick", { every: 0.5 }, () => {});`).ok).toBe(true);
  });
});

describe("timers, logs, cutscenes and events for one player", () => {
  it("starts and stops timers of the player", async () => {
    const r = await run(`$player.startTimer("poison", 1, { repeat: true }); $player.startTimer("bomb", 3); const stopped = $player.stopTimer("bomb"); return [stopped, $player.stopTimer("bomb")];`);
    expect(r.value).toEqual([true, false]);
    expect(r.state?.player).toMatchObject({ timers: { poison: { seconds: 1, repeat: true } } });
  });

  it("checks the name, the delay and the options of a timer", async () => {
    for (const [body, error] of [
      [`$player.startTimer("a b", 1);`, /a timer is named/],
      [`$player.startTimer("t", 0);`, /seconds is a number from 0.1 to 3600/],
      [`$player.startTimer("t", 1, { loop: true });`, /option repeat only/],
    ] as const) {
      const r = await simulate({ source: `export function f() { ${body} }`, call: { fn: "f" } });
      expect(r.error).toMatch(error);
    }
  });

  it("writes logs into the effects of a simulation", async () => {
    const r = await run(`log("gold", $player.gold, { kills: 2 });`, { player: { gold: 7 } });
    expect(r.effects).toEqual([{ name: "log", params: { message: 'gold 7 {"kills":2}' } }]);
  });

  it("freezes the player and moves the camera", async () => {
    const r = await run(`$player.canMove = false; $player.cameraFollow("guard", { smoothMove: true, time: 800 }); $player.cameraFollow("player"); $player.canMove = true; return $player.canMove;`);
    expect(r.value).toBe(true);
    expect(r.effects.map((e) => [e.name, e.params])).toEqual([
      ["canMove", { value: false }],
      ["cameraFollow", { target: "guard", smoothMove: true, time: 800 }],
      ["cameraFollow", { target: "player" }],
      ["canMove", { value: true }],
    ]);
    const bad = await simulate({ source: `export function f() { $player.canMove = 0; }`, call: { fn: "f" } });
    expect(bad.error).toMatch(/true or false/);
  });

  it("makes an event or an enemy for the player only", async () => {
    const r = await run(`$map.createDynamicEvent({ id: "ghost", x: 1, y: 2, forPlayer: true }); $map.spawnEnemy({ enemy: "slime", x: 3, y: 4, forPlayer: true });`);
    expect(r.effects.map((e) => (e.params as any).forPlayer)).toEqual([true, true]);
  });
});

describe("the warnings of checkScript", () => {
  const warnings = (source: string) => checkScript(source).warnings.map((w) => w.message);

  it("warns about map.tick without every, and about waiting in it", () => {
    const found = warnings(`on("map.tick", () => { $player.showText("Hi"); });`);
    expect(found).toEqual([expect.stringMatching(/add \{ every: 0.5 \}/), expect.stringMatching(/showText\(\) waits inside a listener of map.tick/)]);
    expect(warnings(`on("map.tick", { every: 1 }, () => { $player.gold += 1; });`)).toEqual([]);
  });

  it("warns about what a loop makes, a follow nothing stops and moves never given back", () => {
    const found = warnings(`export function f() {
      for (let i = 0; i < 3; i++) { $map.spawnEnemy({ enemy: "slime", x: i * 32, y: 0 }); }
      $map.followPlayer("dog");
      $player.canMove = false;
    }`);
    expect(found).toEqual([
      expect.stringMatching(/spawnEnemy\(\) in a loop/),
      expect.stringMatching(/followPlayer\(\) is never stopped/),
      expect.stringMatching(/canMove = false is never set back/),
    ]);
    expect(warnings(`export function f() { $map.followPlayer("dog"); $map.stopEvent("dog"); $player.canMove = false; $player.canMove = true; }`)).toEqual([]);
  });

  it("gives the line of each warning and keeps the script valid", () => {
    const check = checkScript(`export function f() {\n  $map.followPlayer("dog");\n}`);
    expect(check.ok).toBe(true);
    expect(check.warnings[0].line).toBe(2);
  });
});
