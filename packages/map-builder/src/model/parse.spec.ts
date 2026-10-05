// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MapDefinitionError } from "./errors";
import { parseMapDefinition } from "./parse";

const valid = () => ({
  version: 1,
  id: "m",
  size: [640, 480],
  elements: [{ id: "a", kind: "tree", x: 1, y: 2 }],
  events: [],
});

const issuesOf = (raw: unknown, options?: Parameters<typeof parseMapDefinition>[1]) => {
  try {
    parseMapDefinition(raw, options);
  } catch (error) {
    return (error as MapDefinitionError).issues.map((issue) => `${issue.path}: ${issue.message}`);
  }
  return [];
};

describe("parseMapDefinition", () => {
  it("accepts a valid definition and copies it", () => {
    const raw = valid();
    const map = parseMapDefinition(raw);
    expect(map).toEqual(raw);
    expect(map).not.toBe(raw);
    expect(map.elements[0]).not.toBe(raw.elements[0]);
  });

  it("rejects what is not an object", () => {
    for (const raw of [null, 3, "x", [], undefined]) expect(issuesOf(raw)).not.toEqual([]);
  });

  it("requires a positive integer version", () => {
    expect(issuesOf({ ...valid(), version: undefined })[0]).toMatch(/^version/);
    expect(issuesOf({ ...valid(), version: 0 })[0]).toMatch(/^version/);
    expect(issuesOf({ ...valid(), version: 1.5 })[0]).toMatch(/^version/);
  });

  it("refuses a version newer than the supported one, and says to upgrade", () => {
    expect(issuesOf({ ...valid(), version: 2 })[0]).toMatch(/newer than the supported version 1; upgrade/);
  });

  it("validates size, ids and numbers", () => {
    const issues = issuesOf({
      version: 1,
      id: "",
      size: [0, 10],
      tileSize: -1,
      elements: [{ id: "a", kind: "", x: "1", y: Infinity }],
      events: [{ id: "e", kind: "k", x: 0, y: 0, graphic: "" }],
    });
    expect(issues.map((i) => i.split(":")[0])).toEqual(
      expect.arrayContaining(["id", "size", "tileSize", "elements[0].kind", "elements[0].x", "elements[0].y", "events[0].graphic"]),
    );
  });

  it("rejects duplicate ids per collection, but allows the same id in elements and events", () => {
    expect(
      issuesOf({ ...valid(), elements: [valid().elements[0], valid().elements[0]] }).some((i) => i.includes("duplicate")),
    ).toBe(true);
    expect(issuesOf({ ...valid(), events: [{ id: "a", kind: "k", x: 0, y: 0 }] })).toEqual([]);
  });

  it("rejects data and extensions that are not JSON", () => {
    expect(issuesOf({ ...valid(), elements: [{ id: "a", kind: "k", x: 0, y: 0, data: { f: () => 1 } }] })).not.toEqual([]);
    expect(issuesOf({ ...valid(), extensions: { terrain: new Date() } })).not.toEqual([]);
  });

  it("validates depth", () => {
    expect(issuesOf({ ...valid(), elements: [{ id: "a", kind: "k", x: 0, y: 0, depth: { z: "high" } }] })[0]).toMatch(
      /depth\.z/,
    );
  });

  it("keeps fields it does not know, at every level (lossless round-trip)", () => {
    const raw = {
      ...valid(),
      futureField: { nested: [1, 2, 3] },
      elements: [{ id: "a", kind: "k", x: 0, y: 0, shadow: "soft" }],
      events: [{ id: "e", kind: "k", x: 0, y: 0, trigger: "touch" }],
      extensions: { postFx: { version: 3, bloom: 0.4 } },
    };
    const map = parseMapDefinition(raw);
    expect(JSON.parse(JSON.stringify(map))).toEqual(raw);
  });

  it("uses the canonical form: an empty data object is omitted", () => {
    const map = parseMapDefinition({ ...valid(), elements: [{ id: "a", kind: "k", x: 0, y: 0, data: {} }] });
    expect(map.elements[0]).not.toHaveProperty("data");
  });

  it("never lets a __proto__ key reach a prototype", () => {
    const raw = JSON.parse(
      '{"version":1,"id":"m","size":[1,1],"elements":[{"id":"a","kind":"k","x":0,"y":0,"data":{"__proto__":{"polluted":true}}}]}',
    );
    const map = parseMapDefinition(raw);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(map.elements[0]!.data)).toBe(Object.prototype);
    expect(Object.keys(map.elements[0]!.data!)).toEqual(["__proto__"]);
  });

  describe("migrations", () => {
    const migrations = {
      1: (raw: Record<string, unknown>) => ({ ...raw, size: [raw.width, raw.height] }),
    };

    it("upgrades an old version step by step", () => {
      const map = parseMapDefinition(
        { version: 1, id: "m", width: 320, height: 200, elements: [], events: [] },
        { currentVersion: 2, migrations },
      );
      expect((map as { version: number }).version).toBe(2);
      expect(map.size).toEqual([320, 200]);
    });

    it("fails clearly when a step is missing", () => {
      expect(issuesOf(valid(), { currentVersion: 3, migrations })[0]).toMatch(/no migration from version 2 to 3/);
    });
  });
});
