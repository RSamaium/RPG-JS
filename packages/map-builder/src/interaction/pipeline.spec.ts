// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { IntentOf } from "./intents";
import { compose, runPipeline, type PipelineContext, type PipelineStep } from "./pipeline";
import { maxCount, minDistance, requireFree, snapToGrid, withinMap } from "./steps";
import { createMapModel } from "../model/model";
import { assets, describeContext, harness, sceneOf, world } from "./__fixtures__";

const place = (x: number, y: number, overrides: Partial<IntentOf<"element.place">> = {}): IntentOf<"element.place"> => ({
  type: "element.place",
  catalogId: "oak",
  x,
  y,
  ...overrides,
});

const fakeContext = (overrides: Partial<PipelineContext> = {}): PipelineContext => {
  const model = createMapModel(world());
  return {
    state: model.state,
    assets,
    nodes: sceneOf(model),
    scene: sceneOf(model),
    actor: undefined,
    preview: false,
    footprint: () => undefined,
    reject: (reason, message) => ({ ok: false, reason, ...(message ? { message } : {}) }),
    ...overrides,
  };
};

describe("runPipeline", () => {
  it("accepts the intent when there is no step, or every step passes it on", () => {
    const intent = place(1, 2);
    expect(runPipeline([], intent, fakeContext())).toEqual({ ok: true, intent });
    expect(runPipeline([(i, _c, next) => next(), (i, _c, next) => next()], intent, fakeContext())).toEqual({ ok: true, intent });
  });

  it("lets a step modify the intent for the next ones", () => {
    const double: PipelineStep<"element.place"> = (i, _c, next) => next({ ...i, x: i.x * 2 });
    const addTen: PipelineStep<"element.place"> = (i, _c, next) => next({ ...i, x: i.x + 10 });
    expect(runPipeline([double, addTen], place(3, 0), fakeContext())).toEqual({ ok: true, intent: place(16, 0) });
  });

  it("stops at the first refusal and keeps the reason", () => {
    const after = vi.fn((i: IntentOf<"element.place">, _c: PipelineContext, next: (i?: IntentOf<"element.place">) => never) => next());
    const result = runPipeline<"element.place">(
      [(_i, c) => c.reject("not-enough-wood", "Need 2 wood"), after as never],
      place(0, 0),
      fakeContext(),
    );
    expect(result).toMatchObject({ ok: false, reason: "not-enough-wood", message: "Need 2 wood" });
    expect(after).not.toHaveBeenCalled();
  });

  it("returns the intent as it was when refused, e.g. already snapped, so a ghost can sit on the grid", () => {
    const result = runPipeline([snapToGrid(32), (_i, c) => c.reject("nope")], place(40, 70), fakeContext());
    expect(result).toMatchObject({ ok: false, reason: "nope", intent: { x: 32, y: 64 } });
  });

  it("gives every step the actor, and the state", () => {
    const seen: unknown[] = [];
    runPipeline([(i, c, next) => (seen.push(c.actor, c.state.id), next())], place(0, 0), fakeContext({ actor: { wood: 3 } }));
    expect(seen).toEqual([{ wood: 3 }, "world"]);
  });

  it("composes steps into one that can be reused", () => {
    const rules = compose<"element.place">(snapToGrid(10), (i, c) => (i.x > 50 ? c.reject("too-far") : { ok: true, intent: i }));
    expect(runPipeline([rules], place(14, 0), fakeContext())).toMatchObject({ ok: true, intent: { x: 10 } });
    expect(runPipeline([rules], place(96, 0), fakeContext())).toMatchObject({ ok: false, reason: "too-far" });
  });
});

describe("steps", () => {
  const through = (step: PipelineStep<"element.place">, intent: IntentOf<"element.place">, context = fakeContext()) =>
    runPipeline([step], intent, context);

  describe("snapToGrid", () => {
    it("rounds to the nearest cell", () => {
      expect(through(snapToGrid(32), place(47, 49))).toMatchObject({ ok: true, intent: { x: 32, y: 64 } });
      expect(through(snapToGrid(32), place(48, 16))).toMatchObject({ ok: true, intent: { x: 64, y: 32 } });
    });

    it("can start the grid elsewhere", () => {
      expect(through(snapToGrid(32, { x: 5, y: 5 }), place(40, 40))).toMatchObject({ intent: { x: 37, y: 37 } });
    });

    it("refuses a grid without a size", () => {
      expect(() => snapToGrid(0)).toThrow(/greater than 0/);
    });

    it("works on moves too", () => {
      const result = runPipeline([snapToGrid<"element.move">(16)], { type: "element.move", id: "t1", x: 20, y: 9 }, fakeContext());
      expect(result).toMatchObject({ ok: true, intent: { x: 16, y: 16 } });
    });
  });

  describe("withinMap", () => {
    const space = (x: number, y: number, width = 64, height = 96) => ({ bounds: { x, y, width, height } });
    it("refuses what would stick out of the map", () => {
      const ctx = (x: number, y: number) => fakeContext({ footprint: () => space(x, y) });
      expect(through(withinMap(), place(0, 0), ctx(0, 0)).ok).toBe(true);
      expect(through(withinMap(), place(0, 0), ctx(-1, 0))).toMatchObject({ ok: false, reason: "out-of-bounds" });
      expect(through(withinMap(), place(0, 0), ctx(0, -1))).toMatchObject({ ok: false, reason: "out-of-bounds" });
      expect(through(withinMap(), place(0, 0), ctx(961, 0))).toMatchObject({ ok: false, reason: "out-of-bounds" });
      expect(through(withinMap(), place(0, 0), ctx(960, 672)).ok).toBe(true); // exactly in the corner
    });

    it("lets an intent with no footprint through", () => {
      expect(through(withinMap(), place(-999, -999)).ok).toBe(true);
    });
  });

  describe("requireFree", () => {
    const at = (x: number, y: number) => ({ bounds: { x, y, width: 64, height: 96 }, hitbox: { x: x + 16, y: y + 70, width: 32, height: 20 } });

    it("refuses a position whose hitbox overlaps another element's hitbox", () => {
      // t1's trunk is at x 144..176, y 166..186
      expect(through(requireFree(), place(0, 0), fakeContext({ footprint: () => at(128, 96) }))).toMatchObject({ ok: false, reason: "occupied" });
      expect(through(requireFree(), place(0, 0), fakeContext({ footprint: () => at(300, 400) })).ok).toBe(true);
    });

    it("lets sprites overlap as long as the hitboxes do not", () => {
      // crown over the other tree's crown, trunks apart
      expect(through(requireFree(), place(0, 0), fakeContext({ footprint: () => at(160, 96) })).ok).toBe(true);
    });

    it("does not count touching hitboxes as overlapping", () => {
      // t2's trunk starts at x 272; a trunk ending exactly there only touches it
      expect(through(requireFree(), place(0, 0), fakeContext({ footprint: () => ({ bounds: { x: 0, y: 0, width: 1, height: 1 }, hitbox: { x: 240, y: 230, width: 32, height: 20 } }) })).ok).toBe(true);
    });

    it("ignores what the footprint says to ignore, such as the element being moved", () => {
      const footprint = () => ({ ...at(128, 96), ignore: [{ type: "element" as const, id: "t1" }] });
      expect(through(requireFree(), place(0, 0), fakeContext({ footprint })).ok).toBe(true);
    });

    it("looks at events only when asked to", () => {
      const onChest = () => ({ bounds: { x: 700, y: 600, width: 8, height: 8 } });
      expect(through(requireFree(), place(0, 0), fakeContext({ footprint: onChest })).ok).toBe(true);
      expect(through(requireFree({ against: "all" }), place(0, 0), fakeContext({ footprint: onChest }))).toMatchObject({ reason: "occupied" });
    });
  });

  describe("maxCount", () => {
    it("refuses a placement once the limit of an asset is reached", () => {
      expect(through(maxCount("tree", 2), place(0, 0))).toMatchObject({ ok: false, reason: "max-count" });
      expect(through(maxCount("tree", 3), place(0, 0)).ok).toBe(true);
      expect(through(maxCount("house", 1), place(0, 0))).toMatchObject({ ok: false, reason: "max-count" });
      expect(through(maxCount("wood", 1), place(0, 0)).ok).toBe(true);
    });

    it("does not stop an element at the limit from being moved", () => {
      const result = runPipeline([maxCount<"element.move">("tree", 2)], { type: "element.move", id: "t1", x: 0, y: 0 }, fakeContext());
      expect(result.ok).toBe(true);
    });
  });

  describe("minDistance", () => {
    // t1's trunk (its hitbox) is x 144..176, y 166..186; t2's is x 272..304, y 230..250
    const at = (x: number, y: number) => ({ bounds: { x, y, width: 10, height: 10 } });

    it("keeps a distance between collision boxes, from elements of an asset", () => {
      expect(through(minDistance("tree", 20), place(0, 0), fakeContext({ footprint: () => at(186, 170) }))).toMatchObject({ reason: "too-close" }); // 10 px away
      expect(through(minDistance("tree", 20), place(0, 0), fakeContext({ footprint: () => at(200, 170) })).ok).toBe(true); // 24 px away
    });

    it("measures from the trunk, not from the drawn crown", () => {
      // inside t1's drawn bounds (x 128..192), but well clear of its trunk
      expect(through(minDistance("tree", 20), place(0, 0), fakeContext({ footprint: () => at(130, 100) })).ok).toBe(true);
    });

    it("ignores other assets", () => {
      expect(through(minDistance("wood", 500), place(0, 0), fakeContext({ footprint: () => at(186, 170) })).ok).toBe(true);
    });

    it("uses the straight distance, corners included", () => {
      // 3-4-5 triangle: the box at (179, 190) is 3 right of the trunk and 4 below it
      expect(through(minDistance("tree", 6), place(0, 0), fakeContext({ footprint: () => at(179, 190) }))).toMatchObject({ reason: "too-close" });
      expect(through(minDistance("tree", 5), place(0, 0), fakeContext({ footprint: () => at(179, 190) })).ok).toBe(true);
    });
  });

  it("the harness footprint of a real element feeds the steps", () => {
    const { controller } = harness();
    controller.usePipeline("element.move", [requireFree()]);
    // t2 dropped on top of t1's trunk
    expect(controller.preview({ type: "element.move", id: "t2", x: 128, y: 96 })).toMatchObject({ ok: false, reason: "occupied" });
    expect(controller.preview({ type: "element.move", id: "t2", x: 400, y: 96 }).ok).toBe(true);
    void describeContext;
  });
});
