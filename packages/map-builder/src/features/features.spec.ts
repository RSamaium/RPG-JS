// @vitest-environment node
import { describe, expect, it } from "vitest";
import { defineAssets } from "../model/assets";
import { defineMap, el, event } from "../model/define-map";
import type { MapPatch } from "../model/patches";
import { MapFeatureError, defineMapFeature, validateFeatures, MAP_FEATURE_API_VERSION } from "../renderer/feature";
import { elements, events, ELEMENTS_FEATURE_ID, EVENTS_FEATURE_ID } from "./index";

const assets = defineAssets({ tree: { src: "/tree.png", size: [10, 10] }, gem: { src: "/gem.png", size: [4, 4] } });
const map = defineMap(assets, {
  id: "m",
  size: [100, 100],
  elements: [el("tree", { id: "a", x: 0, y: 0 }), el("tree", { id: "b", x: 5, y: 5 })],
  events: [event("pickup", { id: "e", x: 1, y: 1, graphic: "gem" }), event("trigger", { id: "silent", x: 2, y: 2 })],
});
const context = { assets };

describe("defineMapFeature", () => {
  it("builds a frozen feature with the current API version and no dependencies by default", () => {
    const feature = defineMapFeature({ id: "demo" });
    expect(feature).toMatchObject({ id: "demo", apiVersion: MAP_FEATURE_API_VERSION, requires: [] });
    expect(Object.isFrozen(feature)).toBe(true);
    expect(Object.isFrozen(feature.requires)).toBe(true);
  });

  it("needs an id", () => {
    expect(() => defineMapFeature({ id: "" })).toThrow(MapFeatureError);
  });

  it("copies its dependencies, so they cannot be changed afterwards", () => {
    const requires = ["elements"];
    const feature = defineMapFeature({ id: "demo", requires });
    requires.push("other");
    expect(feature.requires).toEqual(["elements"]);
  });
});

describe("validateFeatures", () => {
  it("accepts a list whose dependencies are all present, in any order", () => {
    const needs = defineMapFeature({ id: "needs", requires: ["elements"] });
    expect(() => validateFeatures([needs, elements()])).not.toThrow();
    expect(() => validateFeatures([])).not.toThrow();
  });

  it("names the missing feature", () => {
    const needs = defineMapFeature({ id: "needs", requires: ["elements", "events"] });
    expect(() => validateFeatures([needs, elements()])).toThrow('Feature "needs" requires "events"');
  });
});

describe("elements()", () => {
  const feature = elements().render!;

  it("is the elements feature, drawn in the objects stage", () => {
    expect(elements().id).toBe(ELEMENTS_FEATURE_ID);
    expect(feature.stage).toBe("objects");
  });

  it("describes every element, or just one", () => {
    expect(feature.describeAll(map, context).map((node) => node.id)).toEqual(["a", "b"]);
    expect(feature.describeOne(map, "b", context)?.key).toBe("elements/b");
    expect(feature.describeOne(map, "nope", context)).toBeUndefined();
  });

  it.each<[MapPatch, readonly string[] | "all" | "none"]>([
    [{ type: "element.add", element: { id: "n", kind: "tree", x: 0, y: 0 } }, ["n"]],
    [{ type: "element.remove", id: "a" }, ["a"]],
    [{ type: "element.move", id: "a", x: 1, y: 1 }, ["a"]],
    [{ type: "element.update", id: "a", set: { scale: 2 } }, ["a"]],
    [{ type: "element.data", id: "a", set: { k: 1 } }, ["a"]],
    [{ type: "event.move", id: "e", x: 1, y: 1 }, "none"],
    [{ type: "extension.set", id: "x" }, "none"],
  ])("knows which nodes %j affects", (patch, expected) => {
    expect(feature.affected(patch)).toEqual(expected);
  });
});

describe("events()", () => {
  const feature = events().render!;

  it("is the events feature", () => {
    expect(events().id).toBe(EVENTS_FEATURE_ID);
    expect(feature.stage).toBe("objects");
  });

  it("describes only the events that have a graphic", () => {
    expect(feature.describeAll(map, context).map((node) => node.id)).toEqual(["e"]);
    expect(feature.describeOne(map, "silent", context)).toBeUndefined();
    expect(feature.describeOne(map, "e", context)?.key).toBe("events/e");
  });

  it.each<[MapPatch, readonly string[] | "all" | "none"]>([
    [{ type: "event.add", event: { id: "n", kind: "k", x: 0, y: 0 } }, ["n"]],
    [{ type: "event.remove", id: "e" }, ["e"]],
    [{ type: "event.move", id: "e", x: 1, y: 1 }, ["e"]],
    [{ type: "element.move", id: "a", x: 1, y: 1 }, "none"],
  ])("knows which nodes %j affects", (patch, expected) => {
    expect(feature.affected(patch)).toEqual(expected);
  });
});
