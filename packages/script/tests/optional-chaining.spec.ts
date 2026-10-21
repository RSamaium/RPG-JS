import { describe, expect, it } from "vitest";
import { checkScript, simulate } from "../src/testing/tools";

const run = async (body: string, args: unknown[] = [], world: object = {}) => {
  const r = await simulate({ source: `export function f(o) { ${body} }`, call: { fn: "f", args }, world });
  if (!r.ok) throw new Error(r.error ?? JSON.stringify(r.diagnostics));
  return r.value;
};

describe("optional chaining", () => {
  it("reads a member, or gives nothing when what comes before has nothing", async () => {
    expect(await run("return [o?.a, o?.b]", [{ a: 1 }])).toEqual([1, undefined]);
    expect(await run("return o?.a", [null])).toBeUndefined();
    expect(await run("return o?.a", [undefined])).toBeUndefined();
  });

  it("stops the whole chain at the first thing that is missing, as JavaScript does", async () => {
    expect(await run("return o?.a.b.c", [null])).toBeUndefined();
    expect(await run("return o?.a?.b?.c", [{ a: { b: { c: 3 } } }])).toBe(3);
    expect(await run("return o?.a?.b?.c", [{ a: null }])).toBeUndefined();
  });

  it("still fails where JavaScript would: on something that is there but is not an object", async () => {
    await expect(run("return o?.a.b", [{}])).rejects.toThrow(/cannot read "b"/);
  });

  it("reads by a computed key, and the length of a list or a text", async () => {
    expect(await run('const k = "x"; return [o?.[k], o?.list?.length, o?.name?.length]', [{ x: 5, list: [1, 2], name: "abc" }])).toEqual([5, 2, 3]);
    expect(await run("return o?.list?.length", [null])).toBeUndefined();
  });

  it("calls a method of a list or a text only when there is one", async () => {
    expect(await run("return o?.list?.map((x) => x * 2)", [{ list: [1, 2] }])).toEqual([2, 4]);
    expect(await run("return o?.list?.map((x) => x * 2)", [{}])).toBeUndefined();
    expect(await run("return o?.name?.toUpperCase()", [{ name: "kael" }])).toBe("KAEL");
  });

  it("does not run the arguments of a call that is skipped", async () => {
    const r = await simulate({ source: `export function f(o) { o?.list?.map(() => notify("ran")); return 1; }`, call: { fn: "f", args: [{}] } });

    expect(r.ok).toBe(true);
    expect(r.effects).toEqual([]);
  });

  it("works with ?? to give a default", async () => {
    expect(await run("return o?.score ?? 0", [null])).toBe(0);
    expect(await run("return o?.score ?? 0", [{ score: 7 }])).toBe(7);
  });

  it("reads host data that is missing, such as a $state key nobody set", async () => {
    expect(await run("return $state.crafted?.potion ?? 0")).toBe(0);
    expect(await run("return $state.crafted?.potion ?? 0", [], { state: { crafted: { potion: 4 } } })).toBe(4);
  });

  it("refuses to call an optional function, which has no meaning here, and says what to do", () => {
    const check = checkScript("export function f(o) { return o.run?.(); }");

    expect(check.ok).toBe(false);
    expect(check.diagnostics[0].message).toMatch(/optional call/);
  });

  it("refuses to assign through it, as JavaScript does (it does not parse)", () => {
    expect(checkScript("export function f(o) { o?.a = 1; }").ok).toBe(false);
  });
});
