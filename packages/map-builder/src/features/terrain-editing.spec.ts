// @vitest-environment node
import type { RasterImage } from "@rpgjs/render-map2d";
import { describe, expect, it } from "vitest";
import { pointer } from "../interaction/input";
import { defineAssets } from "../model/assets";
import { defineMap } from "../model/define-map";
import { createMapModel } from "../model/model";
import { createMapView } from "../renderer/view";
import { defineTerrain, maxRadius, paint, readPixel, readTerrain, requireTerrain, terrainPatchHandlers, withinTerrain } from "../terrain";
import { memorySurface, terrain } from "./terrain";

const assets = defineAssets({ grass: { src: "grass.png" }, dirt: { src: "dirt.png" }, water: { src: "water.png" } });
const raster = (src: string): RasterImage => ({ width: 4, height: 4, pixels: Uint8ClampedArray.from({ length: 64 }, (_, i) => (i % 4 === 3 ? 255 : src.length * 20 + i)) });
const palette = defineTerrain({
  grass: { texture: "grass", mode: { type: "hard" } },
  dirt: { texture: "dirt", mode: { type: "hard" } },
  water: { texture: "water", mode: { type: "hard" } },
});

function setup(options: Parameters<typeof terrain>[0] = {}, withTerrain = true) {
  const model = createMapModel(
    defineMap(assets, { id: "m", size: [256, 256], ...(withTerrain ? { terrain: palette.layers([paint.fill("grass"), paint.rect("water", { x: 160, y: 0, width: 96, height: 256 })], { chunk: 64 }) } : {}) }),
    { patchHandlers: [terrainPatchHandlers] },
  );
  const view = createMapView({ model, assets, features: [terrain({ chunk: 128, surface: memorySurface(), loadImage: async (src) => raster(src), onError: () => undefined, edit: true, ...options })], onError: () => undefined });
  const at = (x: number, y: number) => {
    const data = readTerrain(model.state)!;
    return data.materials[readPixel(data.mask, x, y)]?.id;
  };
  return { model, view, at };
}

describe("painting the terrain", () => {
  it("paints a stroke with the brush: press, drag, release", async () => {
    const { view, at } = setup();
    view.terrain.brush!.start({ material: "dirt", radius: 8 });
    expect(view.interaction.feedPointer("down", pointer(20, 20))).toBe(true);
    for (let x = 24; x <= 100; x += 4) view.interaction.feedPointer("move", pointer(x, 20 + (x - 20) / 4));
    view.interaction.feedPointer("up", pointer(100, 40));
    expect(at(20, 20)).toBe("dirt");
    expect(at(60, 30)).toBe("dirt");
    expect(at(100, 40)).toBe("dirt");
    expect(at(60, 80)).toBe("grass");
    await view.terrain.whenIdle();
    view.destroy();
  });

  it("is one undo step for the whole stroke, and redo brings it back exactly", () => {
    const { view, model } = setup();
    const before = readTerrain(model.state)!.mask;
    view.terrain.brush!.start({ material: "dirt", radius: 6 });
    view.interaction.feedPointer("down", pointer(10, 10));
    for (let x = 12; x < 120; x += 3) view.interaction.feedPointer("move", pointer(x, 10 + x / 3));
    view.interaction.feedPointer("up", pointer(120, 50));
    const painted = readTerrain(model.state)!.mask;
    expect(painted).not.toEqual(before);
    expect(model.history.undo()).toMatchObject({ ok: true });
    expect(readTerrain(model.state)!.mask).toEqual(before);
    expect(model.history.undo()).toBeNull(); // nothing else to undo
    model.history.redo();
    expect(readTerrain(model.state)!.mask).toEqual(painted);
    view.destroy();
  });

  it("two strokes are two undo steps", () => {
    const { view, model, at } = setup();
    view.terrain.brush!.start({ material: "dirt", radius: 5 });
    for (const y of [20, 80]) {
      view.interaction.feedPointer("down", pointer(30, y));
      view.interaction.feedPointer("move", pointer(60, y));
      view.interaction.feedPointer("up", pointer(60, y));
    }
    model.history.undo();
    expect(at(40, 80)).toBe("grass");
    expect(at(40, 20)).toBe("dirt");
    view.destroy();
  });

  it("erases with a null material, ignores the secondary button, and does nothing once stopped", () => {
    const { view, model, at } = setup();
    view.terrain.brush!.start({ material: null, radius: 6 });
    expect(view.interaction.feedPointer("down", pointer(30, 30, { button: 2 }))).toBe(false);
    expect(at(30, 30)).toBe("grass");
    view.interaction.feedPointer("down", pointer(30, 30));
    view.interaction.feedPointer("up", pointer(30, 30));
    expect(readPixel(readTerrain(model.state)!.mask, 30, 30)).toBe(0xffff);
    view.terrain.brush!.stop();
    expect(view.terrain.brush!.active).toBeNull();
    expect(view.interaction.feedPointer("down", pointer(100, 100))).toBe(false);
    expect(at(100, 100)).toBe("grass");
    view.destroy();
  });

  it("does not paint on every tiny move: points are spaced", () => {
    const { view, model } = setup();
    const revisions: number[] = [];
    model.subscribe((change) => void revisions.push(change.revision));
    view.terrain.brush!.start({ material: "dirt", radius: 30 }); // spacing: 10 px
    view.interaction.feedPointer("down", pointer(50, 50));
    for (let i = 1; i <= 9; i += 1) view.interaction.feedPointer("move", pointer(50 + i, 50)); // 9 px in all
    expect(revisions).toHaveLength(1);
    view.interaction.feedPointer("move", pointer(61, 50));
    expect(revisions).toHaveLength(2);
    view.destroy();
  });

  it("only takes effect in the modes it is given", () => {
    const { view, at } = setup({ brushModes: ["build"] });
    view.terrain.brush!.start({ material: "dirt", radius: 6 });
    expect(view.interaction.feedPointer("down", pointer(30, 30))).toBe(false); // the view is in `edit`
    expect(at(30, 30)).toBe("grass");
    view.interaction.setModes(["build"]);
    expect(view.interaction.feedPointer("down", pointer(30, 30))).toBe(true);
    expect(at(30, 30)).toBe("dirt");
    view.destroy();
  });

  describe("rules", () => {
    it("requireTerrain: only over the materials that are allowed, checking every pixel", () => {
      const { view, at } = setup({ pipeline: [requireTerrain(["grass"])] });
      const ok = view.submit({ type: "terrain.paint", shape: { type: "circle", x: 40, y: 40, radius: 10 }, material: "dirt" });
      expect(ok).toMatchObject({ ok: true });
      // a circle that reaches the water by a few pixels
      const refused = view.submit({ type: "terrain.paint", shape: { type: "circle", x: 150, y: 100, radius: 12 }, material: "dirt" });
      expect(refused).toMatchObject({ ok: false, rejection: { code: "wrong-ground" } });
      expect(at(150, 100)).toBe("grass");
      expect(at(165, 100)).toBe("water");
      // over what was already dirt: not allowed any more
      expect(view.submit({ type: "terrain.paint", shape: { type: "circle", x: 40, y: 40, radius: 3 }, material: "grass" })).toMatchObject({ ok: false });
      view.destroy();
    });

    it("the brush goes through the same rules, and a refused dab leaves the terrain as it was", () => {
      const { view, at, model } = setup({ pipeline: [requireTerrain(["grass"])] });
      view.terrain.brush!.start({ material: "dirt", radius: 10 });
      view.interaction.feedPointer("down", pointer(120, 100));
      view.interaction.feedPointer("move", pointer(150, 100)); // the segment would cross into the water: refused
      view.interaction.feedPointer("up", pointer(150, 100));
      expect(at(120, 100)).toBe("dirt");
      expect(at(150, 100)).toBe("grass");
      expect(view.interaction.state.get().lastRejection).toMatchObject({ reason: "wrong-ground" });
      model.history.undo();
      expect(at(120, 100)).toBe("grass");
      view.destroy();
    });

    it("requireTerrain looks at the pixels a shape covers, not at its bounding box", () => {
      const model = createMapModel(
        defineMap(assets, { id: "m", size: [128, 128], terrain: palette.layers([paint.fill("grass"), paint.rect("water", { x: 30, y: 30, width: 30, height: 30 })], { chunk: 64 }) }),
        { patchHandlers: [terrainPatchHandlers] },
      );
      const view = createMapView({ model, assets, features: [terrain({ chunk: 128, surface: memorySurface(), loadImage: async (src) => raster(src), onError: () => undefined, pipeline: [requireTerrain(["grass"])] })], onError: () => undefined });
      // the corner of the box of this circle is in the water, the circle itself is not
      expect(view.submit({ type: "terrain.paint", shape: { type: "circle", x: 70, y: 70, radius: 14 }, material: "dirt" })).toMatchObject({ ok: true });
      expect(view.submit({ type: "terrain.paint", shape: { type: "circle", x: 70, y: 70, radius: 20 }, material: "dirt" })).toMatchObject({ ok: false, rejection: { code: "wrong-ground" } });
      view.destroy();
    });

    it("withinTerrain and maxRadius", () => {
      const { view, at } = setup({ pipeline: [withinTerrain(), maxRadius(15)] });
      expect(view.submit({ type: "terrain.paint", shape: { type: "circle", x: 5, y: 5, radius: 10 }, material: "dirt" })).toMatchObject({ ok: false, rejection: { code: "outside-map" } });
      expect(view.submit({ type: "terrain.paint", shape: { type: "stroke", points: [[100, 5], [100, 200]], radius: 10 }, material: "dirt" })).toMatchObject({ ok: false });
      expect(view.submit({ type: "terrain.paint", shape: { type: "circle", x: 100, y: 250, radius: 10 }, material: "dirt" })).toMatchObject({ ok: false, rejection: { code: "outside-map" } }); // the bottom edge
      expect(view.submit({ type: "terrain.paint", shape: { type: "stroke", points: [[60, 200], [120, 200]], radius: 40 }, material: "dirt" })).toMatchObject({ ok: true });
      expect(at(60, 200 + 30)).toBe("grass"); // a stroke too is limited to radius 15
      expect(at(60, 200 + 12)).toBe("dirt");
      expect(view.submit({ type: "terrain.paint", shape: { type: "circle", x: 60, y: 60, radius: 50 }, material: "dirt" })).toMatchObject({ ok: true });
      expect(at(60, 60)).toBe("dirt");
      expect(at(60, 100)).toBe("grass"); // radius 50 was clamped to 15
      expect(view.submit({ type: "terrain.paint", shape: { type: "fill" }, material: "dirt" })).toMatchObject({ ok: true }); // `fill` is whole by design
      view.destroy();
    });

    it("refuses on a map without terrain, with a reason", () => {
      const { view } = setup({}, false);
      expect(view.submit({ type: "terrain.paint", shape: { type: "circle", x: 5, y: 5, radius: 3 }, material: "dirt" })).toMatchObject({ ok: false, rejection: { code: "no-terrain" } });
      view.destroy();
    });
  });

  it("is not editable unless asked: no brush and no intent", () => {
    const model = createMapModel(defineMap(assets, { id: "m", size: [64, 64], terrain: palette.layers([paint.fill("grass")]) }), { patchHandlers: [terrainPatchHandlers] });
    const view = createMapView({ model, assets, features: [terrain({ surface: memorySurface(), loadImage: async (src) => raster(src), onError: () => undefined })], onError: () => undefined });
    expect(view.terrain.brush).toBeUndefined();
    expect(view.interaction.hasIntent("terrain.paint")).toBe(false);
    view.destroy();
  });
});
