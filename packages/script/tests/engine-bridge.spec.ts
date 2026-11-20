import { describe, expect, it } from "vitest";
import { checkArguments, checkValue, parseType, readSignature } from "../src/core/types";
import { simulate } from "../src/testing/tools";
import { GAME_API_DESCRIPTION } from "../src/game/description";

const run = async (body: string, world: Record<string, unknown> = {}) => {
  const r = await simulate({ source: `export function f() { ${body} }`, call: { fn: "f" }, world });
  if (!r.ok) throw new Error(r.error ?? JSON.stringify(r.diagnostics));
  return r;
};
const error = async (body: string, world: Record<string, unknown> = {}) =>
  String((await simulate({ source: `export function f() { ${body} }`, call: { fn: "f" }, world })).error);

describe("the types of the signatures", () => {
  it("checks primitives, literals, unions, lists, objects and records", () => {
    const ok = (type: string, value: unknown) => () => checkValue(value, parseType(type), "v");
    expect(ok("number", 3)).not.toThrow();
    expect(ok("number", "3")).toThrow(/v must be a number/);
    expect(ok('"up" | "down"', "down")).not.toThrow();
    expect(ok('"up" | "down"', "north")).toThrow(/"up" or "down"/);
    expect(ok("string[]", ["a", "b"])).not.toThrow();
    expect(ok("string[]", ["a", 2])).toThrow(/v\[1\] must be a string/);
    expect(ok("{ x: number; y?: number }", { x: 1 })).not.toThrow();
    expect(ok("{ x: number; y?: number }", { y: 1 })).toThrow(/v.x is missing/);
    expect(ok("{ x: number }", { x: 1, z: 2 })).toThrow(/takes x \(not "z"\)/);
    expect(ok("Record<string, number>", { a: 1, b: 2 })).not.toThrow();
    expect(ok("Record<string, number>", { a: "1" })).toThrow(/v.a must be a number/);
    expect(ok("(string | Record<string, number>)[]", ["up", { tileLeft: 2 }])).not.toThrow();
    expect(ok("object", { deep: { list: [1, "a", null] } })).not.toThrow();
    expect(ok("object", { f: () => 1 })).toThrow(/plain data/);
    expect(ok("number", Infinity)).toThrow(/finite/);
  });

  it("reads a signature and checks the arguments of a call", () => {
    expect(readSignature("(id: string, data?: { a: number }): void")?.params.map((p) => [p.name, p.optional])).toEqual([["id", false], ["data", true]]);
    expect(() => checkArguments("$player.setHitbox", "(width: number, height: number): void", [32])).toThrow(/needs height/);
    expect(() => checkArguments("$player.setHitbox", "(width: number, height: number): void", [32, 32, 1])).toThrow(/2 arguments at most/);
    expect(() => checkArguments("f", "(...ids: string[]): void", ["a", "b", 3])).toThrow(/ids\[2\] must be a string/);
  });

  it("reads every signature of a name that mirrors the engine", () => {
    const sigs = Object.values(GAME_API_DESCRIPTION.handles).flatMap((h) => Object.values(h.methods ?? {}).filter((m) => m.engine).map((m) => m.sig));
    expect(sigs.length).toBeGreaterThan(60);
    expect(sigs.filter((sig) => !readSignature(sig))).toEqual([]);
  });
});

describe("the names that mirror the engine, in a simulation", () => {
  it("checks the arguments against the signature, calls the engine and records it", async () => {
    const r = await run(`$player.flash({ type: "tint", tint: "#ff0000", duration: 300 }); $player.setHitbox(24, 24); return $player.getParamValue("maxHp");`, { engine: { "player.getParamValue": 140 } });
    expect(r.value).toBe(140);
    expect(r.effects.map((e) => [e.name, e.params])).toEqual([
      ["player.flash", { args: [{ type: "tint", tint: "#ff0000", duration: 300 }] }],
      ["player.setHitbox", { args: [24, 24] }],
      ["player.getParamValue", { args: ["maxHp"] }],
    ]);
    expect(await error(`$player.flash({ type: "blink" });`)).toMatch(/options.type must be "alpha" or "tint" or "both"/);
    // a missing argument is refused when the script is checked; one the check cannot see, when it runs
    expect((await simulate({ source: `export function f() { $player.setHitbox(24); }`, call: { fn: "f" } })).diagnostics?.[0].message).toMatch(/needs 2 arguments/);
    expect(await error(`const args = [24]; $player.setHitbox(...args);`)).toMatch(/needs height/);
    expect(await error(`$player.moveRoutes("up");`)).toMatch(/routes must be a list/);
  });

  it("reads and writes the properties that mirror the engine, with their type", async () => {
    const r = await run(`$player.through = true; $player.speed += 2; return [$player.through, $player.speed];`, { engine: { "player.speed": 4 } });
    expect(r.value).toEqual([true, 6]);
    expect(await error(`$player.through = "yes";`)).toMatch(/through must be a boolean/);
    expect(await error(`$player.mass = 3;`)).toMatch(/cannot be assigned/);
  });

  it("does the same on an event, with eventCall, eventGet and eventSet", async () => {
    const r = await run(
      `$map.eventCall("guard", "moveRoutes", ["left", { tileUp: 2 }, { wait: 0.5 }]); $map.eventSet("guard", "speed", 6); return $map.eventGet("guard", "speed");`,
    );
    expect(r.value).toBe(6);
    expect(r.effects.map((e) => [e.name, e.params])).toEqual([
      ["event.moveRoutes", { id: "guard", args: [["left", { tileUp: 2 }, { wait: 0.5 }]] }],
      ["event.speed", { id: "guard", value: 6 }],
    ]);
    expect(await error(`$map.eventCall("guard", "teleportEverywhere");`)).toMatch(/not a method of a character. Available: .*flash/);
    expect(await error(`$map.eventCall("guard", "flash", { type: "blink" });`)).toMatch(/options.type must be/);
    expect(await error(`$map.eventSet("guard", "mass", 3);`)).toMatch(/cannot be assigned/);
  });
});
