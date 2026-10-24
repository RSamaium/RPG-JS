// @vitest-environment node
import { describe, expect, it } from "vitest";
import { defineCatalog } from "./catalog";

describe("defineCatalog", () => {
  const catalog = defineCatalog([
    { id: "oak", sprite: "tree" },
    { id: "wooden-house", sprite: "house", data: { owner: "nobody" } },
  ]);

  it("lists, finds and recognises its items", () => {
    expect(catalog.ids).toEqual(["oak", "wooden-house"]);
    expect(catalog.items).toHaveLength(2);
    expect(catalog.get("oak")?.sprite).toBe("tree");
    expect(catalog.get("nope")).toBeUndefined();
    expect(catalog.has("oak")).toBe(true);
    expect(catalog.has("toString")).toBe(false);
  });

  it("refuses an empty id and a duplicate", () => {
    expect(() => defineCatalog([{ id: "", sprite: "x" }])).toThrow(/non-empty id/);
    expect(() => defineCatalog([{ id: "a", sprite: "x" }, { id: "a", sprite: "y" }])).toThrow(/defined twice/);
  });
});
