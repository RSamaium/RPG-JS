import { test, expect } from "vitest";
import { describeApi, missingImplementations } from "../src/core/api";
import { GAME_API_DESCRIPTION } from "../src/game/description";
import { GAME_API_IMPL } from "../src/game/impl";

test("the implementation covers exactly what the game API describes", () => {
  expect(missingImplementations(GAME_API_DESCRIPTION, GAME_API_IMPL)).toEqual([]);
});

test("an implementation that forgets or invents a name is reported", () => {
  const impl = { handles: { ...GAME_API_IMPL.handles, $ghost: {} }, functions: { ...GAME_API_IMPL.functions } };
  delete (impl.functions as any).wait;
  expect(missingImplementations(GAME_API_DESCRIPTION, impl)).toEqual(
    expect.arrayContaining(["function wait() is not implemented", "handle $ghost is implemented but not described"]),
  );
});

test("the declarations given to an agent list the handles and functions", () => {
  const d = describeApi(GAME_API_DESCRIPTION);
  expect(d).toContain("declare const $player");
  expect(d).toContain("readonly level: number;");
  expect(d).toMatch(/\*\/ gold: number;/);
  expect(d).not.toContain("readonly gold");
  expect(d).toContain("declare function wait(");
  expect(d).toContain("showText(text: string");
  expect(d).toContain("showChoices(text: string");
});
