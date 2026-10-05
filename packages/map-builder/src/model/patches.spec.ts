// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createMapModel } from "./model";
import type { MapPatch } from "./patches";
import { forest } from "./__fixtures__";

const newModel = () => createMapModel(forest());

/** Applies `patch`, then its inverse, and checks the state is exactly what it was. */
function roundTrip(patch: MapPatch) {
  const model = newModel();
  const before = model.getDefinition();
  const result = model.apply(patch);
  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (!result.ok) return;
  const after = model.getDefinition();

  // Patches and their inverses travel over the network and are stored: they must be JSON.
  expect(JSON.parse(JSON.stringify(result.patches))).toEqual(result.patches);
  expect(JSON.parse(JSON.stringify(result.inverse))).toEqual(result.inverse);

  const undone = model.apply(result.inverse);
  expect(undone.ok).toBe(true);
  expect(model.getDefinition()).toEqual(before);

  // …and the inverse of the inverse brings the change back.
  if (undone.ok) {
    expect(model.apply(undone.inverse).ok).toBe(true);
    expect(model.getDefinition()).toEqual(after);
  }
  return after;
}

const rejected = (patch: unknown) => {
  const model = newModel();
  const before = model.state;
  const result = model.apply(patch as MapPatch);
  expect(result.ok).toBe(false);
  expect(model.state).toBe(before); // a rejected patch changes nothing
  expect(model.revision).toBe(0);
  return result.ok ? undefined : result.rejection;
};

describe("element patches", () => {
  it("element.add appends, or inserts at an index", () => {
    const element = { id: "t3", kind: "tree-oak", x: 10, y: 20 };
    expect(roundTrip({ type: "element.add", element })!.elements.map((e) => e.id)).toEqual(["home", "t1", "t2", "t3"]);
    expect(roundTrip({ type: "element.add", element, index: 1 })!.elements.map((e) => e.id)).toEqual([
      "home",
      "t3",
      "t1",
      "t2",
    ]);
  });

  it("element.add copies the element it receives", () => {
    const model = newModel();
    const element = { id: "t3", kind: "tree-oak", x: 10, y: 20, data: { hits: 1 } };
    model.apply({ type: "element.add", element });
    element.data.hits = 99;
    expect(model.getElement("t3")?.data).toEqual({ hits: 1 });
  });

  it("element.add rejects duplicates, invalid elements and bad indexes", () => {
    expect(rejected({ type: "element.add", element: { id: "t1", kind: "tree-oak", x: 0, y: 0 } })?.code).toBe("duplicate-id");
    expect(rejected({ type: "element.add", element: { id: "z", kind: "", x: 0, y: 0 } })?.code).toBe("invalid-patch");
    expect(rejected({ type: "element.add", element: { id: "z", kind: "k", x: NaN, y: 0 } })?.code).toBe("invalid-patch");
    expect(rejected({ type: "element.add", element: { id: "z", kind: "k", x: 0, y: 0 }, index: 9 })?.code).toBe("invalid-patch");
    expect(rejected({ type: "element.add", element: { id: "z", kind: "k", x: 0, y: 0, f: () => 1 } })?.code).toBe("invalid-patch");
  });

  it("element.remove restores the element at the same position in the list", () => {
    expect(roundTrip({ type: "element.remove", id: "t1" })!.elements.map((e) => e.id)).toEqual(["home", "t2"]);
    expect(rejected({ type: "element.remove", id: "nope" })?.code).toBe("not-found");
  });

  it("element.move changes the position only", () => {
    const after = roundTrip({ type: "element.move", id: "t1", x: 160, y: 96 })!;
    expect(after.elements[1]).toMatchObject({ id: "t1", x: 160, y: 96, data: { hits: 5 } });
    expect(rejected({ type: "element.move", id: "nope", x: 1, y: 1 })?.code).toBe("not-found");
    expect(rejected({ type: "element.move", id: "t1", x: Infinity, y: 1 })?.code).toBe("invalid-patch");
  });

  it("element.update changes the kind and the depth, and null clears the depth", () => {
    const changed = roundTrip({ type: "element.update", id: "t2", set: { kind: "house-red", depth: { z: 9 } } })!;
    expect(changed.elements[2]).toMatchObject({ kind: "house-red", depth: { z: 9 } });
    expect(roundTrip({ type: "element.update", id: "t2", set: { depth: null } })!.elements[2]).not.toHaveProperty("depth");
    // an element with no depth gets one, and the inverse removes it again
    expect(roundTrip({ type: "element.update", id: "t1", set: { depth: { height: 50 } } })!.elements[1]!.depth).toEqual({
      height: 50,
    });
    // scale: set as a number or a pair, cleared with null, and restored by the inverse
    expect(roundTrip({ type: "element.update", id: "t1", set: { scale: 2 } })!.elements[1]!.scale).toBe(2);
    expect(roundTrip({ type: "element.update", id: "t1", set: { scale: [2, 1.5] } })!.elements[1]!.scale).toEqual([2, 1.5]);
    expect(roundTrip({ type: "element.update", id: "t1", set: { scale: null } })!.elements[1]).not.toHaveProperty("scale");
    expect(rejected({ type: "element.update", id: "t1", set: { scale: 0 } })?.code).toBe("invalid-patch");
    expect(rejected({ type: "element.update", id: "t1", set: { scale: [1] } })?.code).toBe("invalid-patch");
    expect(rejected({ type: "element.update", id: "t1", set: { kind: "" } })?.code).toBe("invalid-patch");
    expect(rejected({ type: "element.update", id: "t1", set: { depth: { z: "x" } } })?.code).toBe("invalid-patch");
    expect(rejected({ type: "element.update", id: "nope", set: {} })?.code).toBe("not-found");
  });

  describe("element.data", () => {
    it("merges keys and removes others", () => {
      const after = roundTrip({ type: "element.data", id: "t1", set: { hits: 4, state: "shaken" }, unset: [] })!;
      expect(after.elements[1]!.data).toEqual({ hits: 4, state: "shaken" });
    });

    it("unset removes a key, and the data object disappears when it becomes empty", () => {
      const after = roundTrip({ type: "element.data", id: "t1", unset: ["hits"] })!;
      expect(after.elements[1]).not.toHaveProperty("data");
    });

    it("restores the exact previous data, including an absent data object", () => {
      const after = roundTrip({ type: "element.data", id: "home", set: { owner: "ann" } })!;
      expect(after.elements[0]!.data).toEqual({ owner: "ann" });
    });

    it("rejects invalid payloads", () => {
      expect(rejected({ type: "element.data", id: "t1", set: { a: 1 }, unset: ["a"] })?.message).toMatch(/both set and unset/);
      expect(rejected({ type: "element.data", id: "t1", set: { f: () => 1 } })?.code).toBe("invalid-patch");
      expect(rejected({ type: "element.data", id: "t1", unset: [3] })?.code).toBe("invalid-patch");
      expect(rejected({ type: "element.data", id: "nope", set: {} })?.code).toBe("not-found");
    });

    it("refuses __proto__ and treats inherited names as absent", () => {
      expect(rejected(JSON.parse('{"type":"element.data","id":"t1","set":{"__proto__":{"x":1}}}'))?.code).toBe("invalid-patch");
      const after = roundTrip({ type: "element.data", id: "t1", set: { toString: "x" } })!;
      expect(after.elements[1]!.data).toEqual({ hits: 5, toString: "x" });
    });
  });
});

describe("event patches", () => {
  it("event.add, event.remove and event.move can all be undone", () => {
    const entry = { id: "loot-1", kind: "loot", x: 5, y: 6, graphic: "wood-icon" };
    expect(roundTrip({ type: "event.add", event: entry })!.events.map((e) => e.id)).toEqual(["chest-1", "loot-1"]);
    expect(roundTrip({ type: "event.remove", id: "chest-1" })!.events).toEqual([]);
    expect(roundTrip({ type: "event.move", id: "chest-1", x: 1, y: 2 })!.events[0]).toMatchObject({ x: 1, y: 2 });
  });

  it("rejects duplicates and unknown ids", () => {
    expect(rejected({ type: "event.add", event: { id: "chest-1", kind: "k", x: 0, y: 0 } })?.code).toBe("duplicate-id");
    expect(rejected({ type: "event.remove", id: "nope" })?.code).toBe("not-found");
    expect(rejected({ type: "event.move", id: "nope", x: 1, y: 1 })?.code).toBe("not-found");
  });

  it("an element and an event may share an id", () => {
    expect(roundTrip({ type: "event.add", event: { id: "t1", kind: "k", x: 0, y: 0 } })).toBeDefined();
  });
});

describe("extension.set", () => {
  it("sets, replaces and removes the data a feature owns", () => {
    expect(roundTrip({ type: "extension.set", id: "postFx", value: { bloom: 0.4 } })!.extensions).toEqual({
      terrain: { version: 1 },
      postFx: { bloom: 0.4 },
    });
    expect(roundTrip({ type: "extension.set", id: "terrain", value: { version: 2 } })!.extensions).toEqual({
      terrain: { version: 2 },
    });
    expect(roundTrip({ type: "extension.set", id: "terrain" })!).not.toHaveProperty("extensions");
  });

  it("rejects non-JSON values and a __proto__ id", () => {
    expect(rejected({ type: "extension.set", id: "x", value: () => 1 })?.code).toBe("invalid-patch");
    expect(rejected({ type: "extension.set", id: "" })?.code).toBe("invalid-patch");
    expect(rejected({ type: "extension.set", id: "__proto__", value: 1 })?.code).toBe("invalid-patch");
  });
});

describe("state is immutable", () => {
  it("never mutates a previous state, and shares what did not change", () => {
    const model = newModel();
    const before = model.state;
    const untouched = before.elements[0];
    model.apply({ type: "element.move", id: "t1", x: 1, y: 1 });
    expect(model.state).not.toBe(before);
    expect(before.elements[1]).toMatchObject({ x: 128, y: 96 });
    expect(model.state.elements[0]).toBe(untouched);
    expect(model.state.events).toBe(before.events);
  });
});
