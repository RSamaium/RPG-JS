// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MapDefinitionError } from "./errors";
import { defineMap, el, event } from "./define-map";
import { defineAssets } from "./assets";
import { assets, forest } from "./__fixtures__";

describe("runs without a DOM", () => {
  it("has no document nor window", () => {
    expect(typeof document).toBe("undefined");
    expect(typeof window).toBe("undefined");
  });
});

describe("defineAssets", () => {
  it("knows its references and resolves them", () => {
    expect(assets.kinds).toEqual(["tree-oak", "house-red", "wood-icon"]);
    expect(assets.has("tree-oak")).toBe(true);
    expect(assets.has("tree-ok")).toBe(false);
    expect(assets.resolve("tree-oak")?.hitbox).toEqual([16, 16, 32, 24]);
    expect(assets.resolve("nope")).toBeUndefined();
  });

  it("does not resolve inherited object properties", () => {
    const resolver = defineAssets({ a: { src: "/a.png" } });
    expect(resolver.has("toString")).toBe(false);
    expect(resolver.resolve("constructor")).toBeUndefined();
  });
});

describe("defineMap", () => {
  it("returns a plain, serializable definition", () => {
    const map = forest();
    expect(map.version).toBe(1);
    expect(map.size).toEqual([2560, 1920]);
    expect(map.elements.map((e) => e.id)).toEqual(["home", "t1", "t2"]);
    expect(JSON.parse(JSON.stringify(map))).toEqual(map);
  });

  it("defaults elements and events to empty lists", () => {
    const map = defineMap(assets, { id: "empty", size: [100, 100] });
    expect(map.elements).toEqual([]);
    expect(map.events).toEqual([]);
    expect(map).not.toHaveProperty("extensions");
  });

  it("builds elements and events with el() and event()", () => {
    expect(el("tree-oak", { id: "a", x: 1, y: 2 })).toEqual({ id: "a", kind: "tree-oak", x: 1, y: 2 });
    expect(event("chest", { id: "c", x: 1, y: 2, graphic: "wood-icon" })).toMatchObject({ kind: "chest" });
  });

  it("rejects an unknown asset reference at runtime", () => {
    expect(() =>
      defineMap(assets, { id: "m", size: [10, 10], elements: [el("tree-ok" as never, { id: "a", x: 0, y: 0 })] }),
    ).toThrow(MapDefinitionError);
  });

  it("rejects an unknown event graphic", () => {
    expect(() =>
      defineMap(assets, {
        id: "m",
        size: [10, 10],
        events: [event("chest", { id: "c", x: 0, y: 0, graphic: "nope" as never })],
      }),
    ).toThrow(/unknown asset "nope"/);
  });

  it("reports every problem at once, with its path", () => {
    try {
      defineMap(assets, {
        id: "m",
        size: [10, 10],
        elements: [
          el("tree-oak", { id: "a", x: 0, y: 0 }),
          el("tree-oak", { id: "a", x: Number.NaN, y: 0 }),
        ],
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MapDefinitionError);
      const paths = (error as MapDefinitionError).issues.map((issue) => issue.path);
      expect(paths).toContain("elements[1].x");
      expect(paths).toContain("elements[1].id");
    }
  });

  it("does not share structure with its input", () => {
    const input = el("tree-oak", { id: "a", x: 0, y: 0, data: { hits: 1 } });
    const map = defineMap(assets, { id: "m", size: [10, 10], elements: [input] });
    expect((map.elements[0]!.data as { hits: number }).hits).toBe(1);
    expect(map.elements[0]!.data).not.toBe(input.data);
  });
});
