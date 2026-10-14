// @vitest-environment node
import { describe, expect, it } from "vitest";
import { defineAssets } from "../model/assets";
import { defineMap, el } from "../model/define-map";
import { MapDefinitionError } from "../model/errors";
import { createMapModel } from "../model/model";
import type { MapPatch } from "../model/patches";
import { clipRect, createMask, paintShape, readAll, readPixel, readRect, shapeBounds, writeRect } from "./mask";
import { decodeRuns, encodeRuns } from "./rle";
import { defineTerrain, paint } from "./define";
import { readTerrain, terrainIssues, tryReadTerrain } from "./data";
import { terrainPatchHandlers } from "./patches";
import { NO_MATERIAL, type TerrainData } from "./types";

const assets = defineAssets({ grass: { src: "/grass.png" }, dirt: { src: "/dirt.png" }, water: { src: "/water.png" }, tree: { src: "/tree.png", size: [32, 32] } });
const terrain = defineTerrain({
  grass: { texture: "grass", mode: { type: "fade", width: 18 } },
  dirt: { texture: "dirt" },
  water: { texture: "water", mode: { type: "water", foam: true }, collision: true },
});

const world = (options: { scale?: number; chunk?: number } = {}) =>
  defineMap(assets, {
    id: "meadow",
    size: [1024, 768],
    elements: [el("tree", { id: "t1", x: 10, y: 10 })],
    terrain: terrain.layers([paint.fill("grass"), paint.circle("water", { x: 300, y: 300, radius: 90 }), paint.stroke("dirt", { points: [[0, 600], [500, 560], [1000, 600]], radius: 20 })], { chunk: 128, ...options }),
  });
const modelOf = (definition = world()) => createMapModel(definition, { patchHandlers: [terrainPatchHandlers] });
const maskOf = (state: { extensions?: unknown }) => readTerrain(state as never)!.mask;

describe("run-length encoding", () => {
  it("round-trips arbitrary values, and a flat chunk is tiny", () => {
    const values = Uint16Array.from({ length: 4096 }, (_, i) => (i * 7919) % 5 === 0 ? 65535 : Math.floor(i / 300));
    expect([...decodeRuns(encodeRuns(values), values.length)]).toEqual([...values]);
    expect(encodeRuns(new Uint16Array(65536).fill(3)).length).toBeLessThan(12);
  });

  it("refuses a run of length zero, which would never advance", () => {
    const zeroRun = btoa(String.fromCharCode(1, 0, 1, 4)); // value 1 x 0, then value 1 x 4
    expect(() => decodeRuns(zeroRun, 4)).toThrow(/runs do not fit/);
  });

  it.each([
    ["not base64", "***", 4],
    ["truncated", encodeRuns(new Uint16Array([1, 1, 1])).slice(0, 2), 3],
    ["too long for the chunk", encodeRuns(new Uint16Array(10)), 4],
    ["too short for the chunk", encodeRuns(new Uint16Array(2)), 4],
  ])("refuses %s", (_name, text, length) => {
    expect(() => decodeRuns(text, length)).toThrow(/terrain mask/);
  });
});

describe("the chunked mask", () => {
  it("paints a circle and tells exactly what changed, and what it was", () => {
    const mask = createMask(512, 512, { chunk: 128, fill: 0 });
    const result = paintShape(mask, { type: "circle", x: 100, y: 100, radius: 10 }, 2);
    expect(result.changed).toBeDefined();
    expect(readPixel(result.mask, 100, 100)).toBe(2);
    expect(readPixel(result.mask, 100, 112)).toBe(0);
    expect(readPixel(mask, 100, 100)).toBe(0); // the input is not touched
    expect(result.before!.every((value) => value === 0)).toBe(true);
    // every pixel outside `changed` is as it was
    const all = readAll(result.mask);
    const was = readAll(mask);
    for (let i = 0; i < all.length; i += 1) {
      const x = i % 512, y = Math.floor(i / 512);
      const inside = x >= result.changed!.x && x < result.changed!.x + result.changed!.width && y >= result.changed!.y && y < result.changed!.y + result.changed!.height;
      if (!inside) expect(all[i]).toBe(was[i]);
    }
  });

  it("shares the chunks it does not touch, and does not store flat chunks", () => {
    const mask = createMask(512, 512, { chunk: 128, fill: 0 });
    const first = paintShape(mask, { type: "circle", x: 40, y: 40, radius: 20 }, 1).mask;
    const second = paintShape(first, { type: "circle", x: 460, y: 460, radius: 20 }, 1).mask;
    expect(Object.keys(first.chunks)).toEqual(["0,0"]);
    expect(second.chunks["0,0"]).toBe(first.chunks["0,0"]);
    expect(Object.keys(second.chunks).sort()).toEqual(["0,0", "3,3"]);
    // painting the same thing again changes nothing
    const again = paintShape(second, { type: "circle", x: 460, y: 460, radius: 20 }, 1);
    expect(again.changed).toBeUndefined();
    expect(again.mask).toBe(second);
    // painting the background back leaves nothing stored
    expect(paintShape(first, { type: "fill" }, 0).mask.chunks).toEqual({});
  });

  it("covers a shape across chunk borders without a seam", () => {
    const mask = createMask(512, 512, { chunk: 64, fill: 0 });
    const painted = paintShape(mask, { type: "rect", x: 50, y: 50, width: 200, height: 30 }, 4).mask;
    for (let x = 40; x < 260; x += 1) expect(readPixel(painted, x, 60)).toBe(x >= 50 && x < 250 ? 4 : 0);
    expect(readRect(painted, { x: 40, y: 49, width: 220, height: 33 })).toEqual(Uint16Array.from({ length: 220 * 33 }, (_, i) => {
      const x = 40 + (i % 220), y = 49 + Math.floor(i / 220);
      return x >= 50 && x < 250 && y >= 50 && y < 80 ? 4 : 0;
    }));
  });

  it("paints strokes as the union of discs along the segments, and a single point as a disc", () => {
    const mask = createMask(256, 256, { chunk: 64, fill: 0 });
    const painted = paintShape(mask, { type: "stroke", points: [[20, 20], [200, 20]], radius: 5 }, 1).mask;
    expect(readPixel(painted, 100, 20)).toBe(1);
    expect(readPixel(painted, 100, 26)).toBe(0);
    expect(readPixel(painted, 15, 20)).toBe(1); // the round cap
    const dot = paintShape(mask, { type: "stroke", points: [[50, 50]], radius: 5 }, 1).mask;
    expect(readPixel(dot, 50, 50)).toBe(1);
    expect(readPixel(dot, 50, 58)).toBe(0);
  });

  it("works at a coarser scale: positions are in world pixels, the mask is smaller", () => {
    const mask = createMask(512, 512, { scale: 4, chunk: 32, fill: 0 });
    expect(mask).toMatchObject({ width: 128, height: 128 });
    const painted = paintShape(mask, { type: "circle", x: 200, y: 200, radius: 40 }, 3).mask;
    expect(readPixel(painted, 50, 50)).toBe(3); // world (200, 200)
    expect(readPixel(painted, 50, 62)).toBe(0); // world (200, 248): outside the radius
  });

  it("ignores a shape outside the mask and clips one that is partly outside", () => {
    const mask = createMask(100, 100, { chunk: 32, fill: 0 });
    expect(paintShape(mask, { type: "circle", x: 500, y: 500, radius: 5 }, 1).changed).toBeUndefined();
    const edge = paintShape(mask, { type: "circle", x: 0, y: 0, radius: 10 }, 1);
    expect(edge.changed).toMatchObject({ x: 0, y: 0 });
    expect(shapeBounds(mask, { type: "stroke", points: [], radius: 3 })).toBeUndefined();
    expect(clipRect(mask, { x: -5, y: -5, width: 3, height: 3 })).toBeUndefined();
  });

  it("restores exactly with the values it reported", () => {
    const mask = createMask(300, 200, { chunk: 64, fill: 0 });
    const a = paintShape(mask, { type: "circle", x: 100, y: 100, radius: 60 }, 1).mask;
    const b = paintShape(a, { type: "stroke", points: [[0, 0], [299, 199]], radius: 12 }, 2);
    const undone = writeRect(b.mask, b.changed!, b.before!);
    expect(readAll(undone.mask)).toEqual(readAll(a));
    expect(undone.mask.chunks).toEqual(a.chunks); // down to the encoded strings
  });

  it("refuses to write a rectangle that is not inside the mask", () => {
    const mask = createMask(64, 64, { chunk: 32, fill: 0 });
    expect(writeRect(mask, { x: 60, y: 60, width: 10, height: 10 }, new Uint16Array(100)).changed).toBeUndefined();
  });
});

describe("terrain patches", () => {
  it("paints through the model, and undo gives back the previous mask exactly", () => {
    const model = modelOf();
    const before = maskOf(model.state);
    const result = model.apply({ type: "terrain.paint", shape: { type: "circle", x: 700, y: 200, radius: 50 }, material: "dirt" });
    expect(result.ok).toBe(true);
    const painted = readTerrain(model.state)!;
    const at = (x: number, y: number) => painted.materials[readPixel(painted.mask, x, y)]?.id;
    expect(at(700, 200)).toBe("dirt");
    expect(at(300, 300)).toBe("water");
    expect(at(10, 10)).toBe("grass");
    model.history.undo();
    expect(maskOf(model.state)).toEqual(before);
    model.history.redo();
    expect(maskOf(model.state)).toEqual(painted.mask);
  });

  it("erases with a null material", () => {
    const model = modelOf();
    model.apply({ type: "terrain.paint", shape: { type: "rect", x: 0, y: 0, width: 64, height: 64 }, material: null });
    expect(readPixel(maskOf(model.state), 10, 10)).toBe(NO_MATERIAL);
    expect(readPixel(maskOf(model.state), 100, 100)).toBe(0);
  });

  it("is one revision, and one undo step, together with other patches", () => {
    const model = modelOf();
    const result = model.apply([
      { type: "terrain.paint", shape: { type: "circle", x: 50, y: 50, radius: 30 }, material: "water" },
      { type: "element.move", id: "t1", x: 50, y: 50 },
    ]);
    expect(result).toMatchObject({ ok: true, revision: 1 });
    model.history.undo();
    expect(model.getElement("t1")).toMatchObject({ x: 10, y: 10 });
    expect(readPixel(maskOf(model.state), 50, 50)).toBe(0);
  });

  it("rejects a bad batch whole: the terrain is not half changed", () => {
    const model = modelOf();
    const before = model.state;
    const result = model.apply([
      { type: "terrain.paint", shape: { type: "circle", x: 50, y: 50, radius: 30 }, material: "water" },
      { type: "terrain.paint", shape: { type: "circle", x: 50, y: 50, radius: 30 }, material: "lava" },
    ]);
    expect(result).toMatchObject({ ok: false, rejection: { code: "not-found", patchIndex: 1 } });
    expect(model.state).toBe(before);
  });

  it.each([
    ["an unknown shape", { shape: { type: "star" }, material: "dirt" }],
    ["a circle with NaN", { shape: { type: "circle", x: NaN, y: 0, radius: 3 }, material: "dirt" }],
    ["a negative radius", { shape: { type: "circle", x: 0, y: 0, radius: -1 }, material: "dirt" }],
    ["a stroke without points", { shape: { type: "stroke", points: [], radius: 3 }, material: "dirt" }],
    ["a stroke point that is not a pair", { shape: { type: "stroke", points: [[1]], radius: 3 }, material: "dirt" }],
    ["no shape", { material: "dirt" }],
  ])("rejects %s", (_name, payload) => {
    const model = modelOf();
    expect(model.apply({ type: "terrain.paint", ...payload } as unknown as MapPatch)).toMatchObject({ ok: false, rejection: { code: "invalid-patch" } });
  });

  it("rejects painting on a map that has no terrain", () => {
    const model = createMapModel(defineMap(assets, { id: "bare", size: [100, 100] }), { patchHandlers: [terrainPatchHandlers] });
    expect(model.apply({ type: "terrain.paint", shape: { type: "fill" }, material: "grass" })).toMatchObject({ ok: false, rejection: { message: expect.stringContaining("no terrain") } });
  });

  it("is unknown to a model that was not given the handlers", () => {
    const model = createMapModel(world());
    expect(model.apply({ type: "terrain.paint", shape: { type: "fill" }, material: "grass" })).toMatchObject({ ok: false, rejection: { code: "unknown-patch" } });
  });

  it("replaces a region with the values an inverse carries, and rejects a region that is wrong", () => {
    const model = modelOf();
    const apply = (patch: Record<string, unknown>) => model.apply({ type: "terrain.region", ...patch } as unknown as MapPatch);
    expect(apply({ x: 10, y: 10, width: 4, height: 4, runs: encodeRuns(new Uint16Array(16).fill(2)) })).toMatchObject({ ok: true });
    expect(readPixel(maskOf(model.state), 12, 12)).toBe(2);
    expect(apply({ x: 10, y: 10, width: 4, height: 4, runs: encodeRuns(new Uint16Array(15)) })).toMatchObject({ ok: false });
    expect(apply({ x: 1020, y: 10, width: 10, height: 4, runs: encodeRuns(new Uint16Array(40)) })).toMatchObject({ ok: false, rejection: { message: expect.stringContaining("outside") } });
    expect(apply({ x: 1.5, y: 0, width: 2, height: 2, runs: "" })).toMatchObject({ ok: false });
    expect(apply({ x: 0, y: 0, width: 2, height: 2, runs: encodeRuns(new Uint16Array(4).fill(9)) })).toMatchObject({ ok: false, rejection: { message: expect.stringContaining("palette") } });
  });

  it("can be sent over the wire: patches and the state survive JSON", () => {
    const model = modelOf();
    const patch: MapPatch = { type: "terrain.paint", shape: { type: "stroke", points: [[10, 10], [400, 400]], radius: 15 }, material: "dirt" };
    const copy = modelOf(JSON.parse(JSON.stringify(model.state)));
    model.apply(patch);
    copy.apply(JSON.parse(JSON.stringify(patch)));
    expect(copy.state).toEqual(model.state);
    expect(JSON.parse(JSON.stringify(model.state))).toEqual(model.state);
  });

  describe("materials and morphology", () => {
    it("adds a material, and refuses to move or remove one the mask refers to", () => {
      const model = modelOf();
      const current = readTerrain(model.state)!.materials;
      expect(model.apply({ type: "terrain.materials", materials: [...current, { id: "sand", texture: "dirt" }] })).toMatchObject({ ok: true });
      expect(model.apply({ type: "terrain.paint", shape: { type: "circle", x: 900, y: 100, radius: 20 }, material: "sand" })).toMatchObject({ ok: true });
      expect(model.apply({ type: "terrain.materials", materials: [...current].reverse() })).toMatchObject({ ok: false, rejection: { message: expect.stringContaining("position") } });
      expect(model.apply({ type: "terrain.materials", materials: current.slice(1) })).toMatchObject({ ok: false });
      // the new material is painted: it cannot go until it is not
      expect(model.apply({ type: "terrain.materials", materials: current })).toMatchObject({ ok: false, rejection: { message: expect.stringContaining("still painted") } });
      expect(model.apply({ type: "terrain.materials", materials: [...current, { id: "grass", texture: "grass" }] })).toMatchObject({ ok: false, rejection: { message: expect.stringContaining("twice") } });
      model.history.undo();
      model.history.undo();
      expect(readTerrain(model.state)!.materials).toEqual(current);
    });

    it("sets the morphology features, and undoes it", () => {
      const model = modelOf();
      const feature = { id: "pond", kind: "hole", params: { depth: 12 }, strokes: [{ id: "s", radius: 20, points: [{ x: 10, y: 10 }] }] };
      expect(model.apply({ type: "terrain.morphology", features: [feature] })).toMatchObject({ ok: true });
      expect(readTerrain(model.state)!.morphology).toEqual([feature]);
      expect(model.apply({ type: "terrain.morphology", features: [{ kind: "hole" }] as never })).toMatchObject({ ok: false });
      model.history.undo();
      expect(readTerrain(model.state)!.morphology).toEqual([]);
    });
  });
});

describe("defining terrain in code", () => {
  it("writes the mask from the recipe, in order, and is deterministic", () => {
    const first = readTerrain(createMapModel(world(), { patchHandlers: [terrainPatchHandlers] }).state)!;
    expect(JSON.stringify(first)).toBe(JSON.stringify(readTerrain(createMapModel(world()).state)!));
    const id = (x: number, y: number) => first.materials[readPixel(first.mask, x, y)]?.id;
    expect(id(5, 5)).toBe("grass");
    expect(id(300, 300)).toBe("water");
    expect(id(500, 560)).toBe("dirt");
    expect(first.materials.map((m) => m.id)).toEqual(["grass", "dirt", "water"]);
    expect(first.materials[2]).toMatchObject({ collision: true, mode: { type: "water", foam: true } });
  });

  it("validates what it is given: unknown material, unknown texture, bad scale", () => {
    expect(() => terrain.build([100, 100], [{ material: "lava" as never, shape: { type: "fill" } }])).toThrow(MapDefinitionError);
    const lonely = defineTerrain({ ghost: { texture: "nowhere" } });
    expect(() => defineMap(assets, { id: "m", size: [10, 10], terrain: lonely.layers([paint.fill("ghost")]) })).toThrow(/unknown asset "nowhere"/);
    expect(() => terrain.build([100, 100], [], { scale: 0 })).toThrow(MapDefinitionError);
  });

  it("keeps the other extensions next to the terrain", () => {
    const definition = defineMap(assets, { id: "m", size: [64, 64], extensions: { weather: { rain: true } }, terrain: terrain.layers([paint.fill("grass")]) });
    expect(Object.keys(definition.extensions!).sort()).toEqual(["terrain", "weather"]);
  });
});

describe("reading the terrain of a state", () => {
  it("is undefined when absent, and explains what is wrong when invalid", () => {
    const bare = createMapModel(defineMap(assets, { id: "bare", size: [10, 10] }));
    expect(readTerrain(bare.state)).toBeUndefined();
    expect(tryReadTerrain(bare.state)).toBeUndefined();
    const broken = { ...world(), extensions: { terrain: { version: 1, materials: [{ id: "a" }], mask: { scale: 1, width: 1, height: 1, chunk: 1, fill: 5, chunks: {} } } } };
    expect(() => readTerrain(broken as never)).toThrow(/materials\[0\]\.texture/);
    expect(tryReadTerrain(broken as never)).toBeUndefined();
  });

  it.each([
    ["a non-object", 3, "must be a JSON object"],
    ["a wrong version", { version: 2 }, ".version"],
    ["a duplicate id", { version: 1, materials: [{ id: "a", texture: "t" }, { id: "a", texture: "t" }], mask: { scale: 1, width: 1, height: 1, chunk: 1, fill: 65535, chunks: {} } }, "used twice"],
    ["a bad chunk key", { version: 1, materials: [], mask: { scale: 1, width: 1, height: 1, chunk: 1, fill: 65535, chunks: { x: "" } } }, "col,row"],
    ["a fill past the palette", { version: 1, materials: [], mask: { scale: 1, width: 1, height: 1, chunk: 1, fill: 3, chunks: {} } }, "palette"],
    ["a fractional chunk size", { version: 1, materials: [], mask: { scale: 1, width: 1, height: 1, chunk: 1.5, fill: 65535, chunks: {} } }, "integer"],
    ["a transition to nowhere", { version: 1, materials: [{ id: "a", texture: "t" }], transitions: [{ from: "a", to: "b", mode: { type: "hard" } }], mask: { scale: 1, width: 1, height: 1, chunk: 1, fill: 65535, chunks: {} } }, "two materials"],
    ["an unknown render mode", { version: 1, materials: [{ id: "a", texture: "t", mode: { type: "lava" } }], mask: { scale: 1, width: 1, height: 1, chunk: 1, fill: 65535, chunks: {} } }, "render mode"],
  ])("reports %s", (_name, value, message) => {
    expect(terrainIssues(value).map((issue) => `${issue.path}: ${issue.message}`).join("\n")).toContain(message);
  });

  it("accepts what defineTerrain produces", () => {
    expect(terrainIssues(world().extensions!.terrain)).toEqual([]);
    const data = world().extensions!.terrain as unknown as TerrainData;
    expect(Object.keys(data.mask.chunks).length).toBeGreaterThan(0);
  });
});
