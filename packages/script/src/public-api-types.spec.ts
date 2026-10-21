import { describe, expectTypeOf, test } from "vitest";
import type { Condition, ListenFilter, SignalDesc } from "./core/filter";
import type { EmitReport } from "./core/signals";
import type { PlayerPort, ScriptWorld } from "./game/impl";
import { provideScripts, ScriptService, type ScriptServiceOptions, type ScriptSource } from "./server";
import { checkScript, runTests, simulate, SimWorld, SharedStore, type CheckResult, type SimulateInput, type TestCase } from "./testing";

describe("the public API of @rpgjs/script", () => {
  test("provideScripts takes options, a service, or nothing", () => {
    expectTypeOf(provideScripts).parameter(0).toEqualTypeOf<ScriptServiceOptions | ScriptService | undefined>();
  });

  test("a script is given as its text or as its tree, never both", () => {
    expectTypeOf<{ id: string; source: string }>().toExtend<ScriptSource>();
    expectTypeOf<{ id: string; version: number; tree: { type: string } }>().toExtend<ScriptSource>();
    expectTypeOf<{ id: string }>().not.toExtend<ScriptSource>();
    expectTypeOf<{ id: string; source: string; tree: { type: string } }>().not.toExtend<ScriptSource>();
  });

  test("the service installs and emits", () => {
    expectTypeOf<ScriptService["install"]>().returns.toEqualTypeOf<boolean>();
    expectTypeOf<ScriptService["emit"]>().returns.resolves.toEqualTypeOf<EmitReport>();
    expectTypeOf<ScriptService["errors"]>().toEqualTypeOf<{ script: string; message: string }[]>();
  });

  test("a condition is about a switch, a variable, an item or a stat, and a stat is the gold or the level", () => {
    expectTypeOf<{ switch: "tournament"; is: false }>().toExtend<Condition>();
    expectTypeOf<{ variable: "visits"; gte: 3 }>().toExtend<Condition>();
    expectTypeOf<{ item: "potion" }>().toExtend<Condition>();
    expectTypeOf<{ stat: "gold"; gte: 50 }>().toExtend<Condition>();
    expectTypeOf<{ stat: "mana"; gte: 50 }>().not.toExtend<Condition>();
    expectTypeOf<{ where: { "skill.tags": { has: "fire" } }; when: Condition[] }>().toExtend<ListenFilter>();
  });

  test("a signal says what its payload holds", () => {
    expectTypeOf<{ payload: { gained: { type: "number" } } }>().toExtend<SignalDesc>();
    expectTypeOf<{ payload: { gained: { type: "decimal" } } }>().not.toExtend<SignalDesc>();
  });

  test("a world speaks of the game, and the simulation is one", () => {
    expectTypeOf<PlayerPort["changeGold"]>().parameters.toEqualTypeOf<["set" | "add" | "sub" | "mul", number]>();
    expectTypeOf<SimWorld>().toExtend<ScriptWorld>();
    expectTypeOf<ScriptWorld["choose"]>().returns.toEqualTypeOf<Promise<number>>();
  });

  test("the tools check, simulate and test, and an agent can give plain shared values", () => {
    expectTypeOf(checkScript).returns.toEqualTypeOf<CheckResult>();
    expectTypeOf<CheckResult["listeners"]>().toEqualTypeOf<{ signal: string; filter?: ListenFilter }[]>();
    expectTypeOf<{ source: string; call: { fn: string }; world: { shared: { stock: number } } }>().toExtend<SimulateInput>();
    expectTypeOf<{ source: string; emit: { signal: string; payload: object }; world: { shared: SharedStore } }>().toExtend<SimulateInput>();
    expectTypeOf(simulate).returns.resolves.toHaveProperty("listeners");
    expectTypeOf(runTests).parameter(1).toEqualTypeOf<TestCase[]>();
  });
});
