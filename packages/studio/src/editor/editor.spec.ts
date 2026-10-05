import { createMapModel, type MapElement } from "@rpgjs/map-builder/model";
import { describe, expect, it } from "vitest";
import { buildEditableMap, editorIdOf, rawListsFromElements, resolveLists, type RawElementLists } from "./adapter";
import { STUDIO_DEV_ORIGIN, resolveStudioEditorOrigins } from "./origins";
import { registerStudioEditorMap, setStudioMapsPaused, unregisterStudioEditorMap } from "./pause";

/** What a Studio map stores, and what the runtime makes of it (the tileset of the element is known, or not). */
const raw: RawElementLists = {
  alwaysLow: [],
  low: [
    { id: "layer-4:0", tilesetId: "ts", x: 280, y: 741 },
    { id: "layer-4:1", tilesetId: "ts", x: 600, y: 300, scale: 2 },
    { id: "ghost", tilesetId: "gone", x: 5, y: 5 },
    { id: "layer-4:0", tilesetId: "ts", x: 900, y: 120 },
  ],
  high: [{ id: "layer-4:2", tilesetId: "ts", x: 50, y: 60 }],
};

const resolveOne = (item: any, layerNumber: number) => {
  if (item.tilesetId !== "ts") return null;
  const size = item.id === "layer-4:2" ? [96, 128] : [64, 96];
  return {
    id: item.id, rect: [0, 0, size[0], size[1]], drawIn: [item.x, item.y, size[0], size[1]],
    hitbox: { x: 16, y: size[1] - 24, width: 32, height: 20 }, zIndexOffset: 0, tilesetId: item.tilesetId, layer: () => layerNumber,
    ...(item.scale ? { scale: item.scale } : {}),
  };
};

const build = () => buildEditableMap({ id: "forest", size: [1920, 1440], raw, resolveOne });

describe("a Studio map as a map builder map", () => {
  it("makes one element per placed element the runtime can draw, with a stable id from its layer and its place in the stored list", () => {
    const { definition } = build();
    expect(definition.elements.map((e) => e.id)).toEqual(["low:0", "low:1", "low:3", "high:0"]); // "ghost" (index 2) has no tileset: not drawn, not here
    expect(editorIdOf("low", 3)).toBe("low:3");
    expect(definition.size).toEqual([1920, 1440]);
  });

  it("puts the stored form in the element, so that the model alone says what to save", () => {
    const { definition } = build();
    expect(definition.elements[1]).toMatchObject({ x: 600, y: 300, scale: 2, data: { layer: "low", raw: raw.low[1] } });
    expect(definition.elements[1]!.data!.raw).not.toBe(raw.low[1]); // a copy: the model never shares structure
  });

  it("gives the map builder the size and the hitbox of each element, from the runtime's own resolution", () => {
    const { definition, assets } = build();
    const asset = assets.resolve(definition.elements[0]!.kind)!;
    expect(asset).toMatchObject({ size: [64, 96], hitbox: [16, 72, 32, 20] });
    expect(assets.has("studio:high:0")).toBe(true);
    expect(assets.has("studio:low:2")).toBe(false);
    expect(assets.kinds).toHaveLength(4);
  });

  it("is a valid map for the model, and moving or removing an element is reflected in what is rebuilt", () => {
    const { definition } = build();
    const model = createMapModel(definition);
    model.apply({ type: "element.move", id: "low:1", x: 640.4, y: 310.6 });
    model.apply({ type: "element.remove", id: "low:0" });
    const lists = rawListsFromElements(model.state.elements);
    expect(lists.low.map((r) => `${r.id}@${r.x},${r.y}`)).toEqual(["layer-4:1@640,311", "layer-4:0@900,120"]);
    expect(lists.low[0]).toMatchObject({ scale: 2, tilesetId: "ts" }); // everything else of the stored form is kept
    expect(lists.high).toHaveLength(1);
    expect(lists.alwaysLow).toEqual([]);
  });

  it("brings back an element that was removed, with its stored form, when the removal is undone", () => {
    const { definition } = build();
    const model = createMapModel(definition);
    model.apply({ type: "element.remove", id: "low:0" });
    expect(model.state.elements.some((e) => e.id === "low:0")).toBe(false);
    model.history.undo();
    expect(rawListsFromElements(model.state.elements).low[0]).toMatchObject({ id: "layer-4:0", x: 280, y: 741 });
  });

  it("rebuilds the runtime's elements from the model, skipping what cannot be drawn", () => {
    const { definition } = build();
    const lists = resolveLists(definition.elements, resolveOne);
    expect(lists.low).toHaveLength(3);
    expect(lists.high).toHaveLength(1);
    expect(lists.low[1]).toMatchObject({ scale: 2, drawIn: [600, 300, 64, 96] });
    const moved = resolveLists(definition.elements.map((e) => (e.id === "low:1" ? { ...e, x: 10, y: 20 } : e)), resolveOne);
    expect(moved.low[1]).toMatchObject({ drawIn: [10, 20, 64, 96] });
  });

  it("ignores elements that do not carry a stored form or a known layer", () => {
    const bad: MapElement[] = [
      { id: "a", kind: "k", x: 1, y: 1 },
      { id: "b", kind: "k", x: 1, y: 1, data: { layer: "middle", raw: {} } },
      { id: "c", kind: "k", x: 1, y: 1, data: { layer: "low", raw: [1] } },
      { id: "d", kind: "k", x: 1, y: 1, data: { layer: "low", raw: { id: "x" } } },
    ];
    expect(rawListsFromElements(bad).low).toEqual([{ id: "x", x: 1, y: 1 }]);
  });
});

describe("who may edit the game", () => {
  it("takes the origins of the game's configuration when it has some", () => {
    expect(resolveStudioEditorOrigins({ studioEditorOrigins: ["https://studio.example.com", 3] }, "https://rpgjs.studio/api", true)).toEqual(["https://studio.example.com"]);
    expect(resolveStudioEditorOrigins({ studioEditorOrigins: [] }, "https://rpgjs.studio/api", true)).toEqual([]);
  });

  it("otherwise trusts the origin of the API, and the local Studio only while developing", () => {
    expect(resolveStudioEditorOrigins({}, "https://rpgjs.studio/api")).toEqual(["https://rpgjs.studio"]);
    expect(resolveStudioEditorOrigins({}, "http://localhost:5173/api", true)).toEqual(["http://localhost:5173", STUDIO_DEV_ORIGIN]);
    expect(resolveStudioEditorOrigins({}, undefined, false)).toEqual([]);
    expect(resolveStudioEditorOrigins({}, "/api", false)).toEqual([]); // a relative URL says nothing about the Studio
    expect(resolveStudioEditorOrigins({}, "not a url", false)).toEqual([]);
  });
});

describe("pausing the game", () => {
  const map = () => {
    const calls: boolean[] = [];
    return { calls, setAutoTick: (enabled: boolean) => void calls.push(enabled) };
  };

  it("stops the loop of every map that is open, and starts it again", () => {
    const a = map();
    const b = map();
    registerStudioEditorMap(a);
    registerStudioEditorMap(b);
    setStudioMapsPaused(true);
    expect(a.calls).toEqual([false]);
    expect(b.calls).toEqual([false]);
    setStudioMapsPaused(false);
    expect(a.calls).toEqual([false, true]);
    unregisterStudioEditorMap(a);
    unregisterStudioEditorMap(b);
    setStudioMapsPaused(true);
    expect(a.calls).toHaveLength(2); // a map that is closed is left alone
    setStudioMapsPaused(false);
  });

  it("keeps a map that opens while the game is paused paused", () => {
    setStudioMapsPaused(true);
    const late = map();
    registerStudioEditorMap(late);
    expect(late.calls).toEqual([false]);
    setStudioMapsPaused(false);
    expect(late.calls).toEqual([false, true]);
    unregisterStudioEditorMap(late);
  });
});
