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

test("every name the families of the API list exists in the API or its signals", () => {
  const exists = (name: string) => {
    if (name.startsWith("on(")) return true;
    if (GAME_API_DESCRIPTION.signals?.[name]) return true;
    const [handle, member] = name.split(".");
    if (!member) return name in GAME_API_DESCRIPTION.functions || name in GAME_API_DESCRIPTION.handles;
    const h = GAME_API_DESCRIPTION.handles[handle];
    return !!h && (!!h.members?.[member] || !!h.methods?.[member]);
  };
  const names = (GAME_API_DESCRIPTION.families ?? []).flatMap((family) => family.names);
  expect(names.filter((name) => !exists(name))).toEqual([]);
  expect(describeApi(GAME_API_DESCRIPTION)).toContain("// ## Positions and sight:");
});

test("the examples of the families pass the check, as a script or as the body of a function", async () => {
  const { checkScript } = await import("../src/testing/tools");
  const failing = (GAME_API_DESCRIPTION.families ?? []).filter((family) => family.example).filter((family) => {
    const asScript = checkScript(family.example!);
    return !asScript.ok && !checkScript(`export function f() { ${family.example} }`).ok;
  });
  expect(failing.map((family) => [family.name, checkScript(`export function f() { ${family.example} }`).diagnostics])).toEqual([]);
});
