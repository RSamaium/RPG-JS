import { describe, expect, test } from "vitest";
import { RpgEvent, RpgMap, RpgPlayer } from "@rpgjs/server";
import { ENGINE_COVERAGE, type EngineCoverage } from "../src/game/engine-coverage";
import { GAME_API_DESCRIPTION } from "../src/game/description";

/** The public methods and properties of a class of the engine, its parents and mixins included (not the ones starting with _). */
function publicNames(cls: { prototype: object }): string[] {
  const names = new Set<string>();
  for (let proto = cls.prototype; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, name)!;
      if (name !== "constructor" && !name.startsWith("_") && (typeof descriptor.value === "function" || descriptor.get)) names.add(name);
    }
  }
  return [...names].sort();
}

const decided = (coverage: EngineCoverage) => [...Object.keys(coverage.exposed), ...Object.values(coverage.excluded).flat()];

/** Whether the game API has a name such as `$player.addItem` or `distance`. */
function inGameApi(name: string): boolean {
  const [handle, member] = name.split(".");
  if (!member) return name in GAME_API_DESCRIPTION.functions;
  const h = GAME_API_DESCRIPTION.handles[handle];
  return !!h && (!!h.members?.[member] || !!h.methods?.[member]);
}

const playerNames = publicNames(RpgPlayer);
const classes: [keyof typeof ENGINE_COVERAGE, string[]][] = [
  ["player", playerNames],
  // what an event has beyond the methods of a player
  ["event", publicNames(RpgEvent).filter((name) => !playerNames.includes(name))],
  ["map", publicNames(RpgMap)],
];

describe("every method of the engine is exposed to scripts or excluded with a reason", () => {
  test.each(classes)("%s: each public method has a decision", (key, names) => {
    const known = new Set(decided(ENGINE_COVERAGE[key]));
    // A new method of the engine lands here: expose it in the game API, or exclude it with a reason in engine-coverage.ts
    expect(names.filter((name) => !known.has(name))).toEqual([]);
  });

  test.each(classes)("%s: no decision is about a method the engine no longer has, nor made twice", (key, names) => {
    const all = decided(ENGINE_COVERAGE[key]);
    expect(all.filter((name) => !names.includes(name))).toEqual([]);
    expect(all.filter((name, i) => all.indexOf(name) !== i)).toEqual([]);
  });

  test("every name an exposed method maps to is in the game API", () => {
    const targets = Object.values(ENGINE_COVERAGE).flatMap((coverage) => Object.values(coverage.exposed));
    expect(targets.filter((name) => !inGameApi(name))).toEqual([]);
  });

  test("each exclusion gives a reason", () => {
    for (const coverage of Object.values(ENGINE_COVERAGE)) {
      for (const [reason, names] of Object.entries(coverage.excluded)) {
        expect(reason.length).toBeGreaterThan(20);
        expect(names.length).toBeGreaterThan(0);
      }
    }
  });
});
