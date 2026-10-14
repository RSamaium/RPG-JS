// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createMapModel } from "../model/model";
import type { Tool } from "./controller";
import { createInteraction } from "./controller";
import { key, pointer } from "./input";
import type { MapIntent } from "./intents";
import { requireFree, snapToGrid } from "./steps";
import { assets, describeContext, harness, sceneOf, world } from "./__fixtures__";

const move = (id: string, x: number, y: number): MapIntent => ({ type: "element.move", id, x, y });

describe("submit", () => {
  it("runs the pipeline, then applies the patches the intent resolves to", () => {
    const { controller, model } = harness();
    controller.usePipeline("element.move", [snapToGrid(32)]);
    const result = controller.submit(move("t1", 100, 100));
    expect(result).toMatchObject({ ok: true, revision: 1 });
    expect(model.getElement("t1")).toMatchObject({ x: 96, y: 96 });
  });

  it("applies several intents as one atomic batch: one revision, one undo step", () => {
    const { controller, model } = harness();
    expect(controller.submit([move("t1", 1, 1), move("t2", 2, 2)])).toMatchObject({ ok: true, revision: 1 });
    expect(model.history.status.undoDepth).toBe(1);
    model.history.undo();
    expect(model.getElement("t1")).toMatchObject({ x: 128, y: 96 });
    expect(model.getElement("t2")).toMatchObject({ x: 256, y: 160 });
  });

  it("applies nothing when one intent of a batch is refused, and says which", () => {
    const { controller, model } = harness();
    controller.usePipeline("element.move", [(i, c, next) => (i.id === "t2" ? c.reject("locked") : next())]);
    const result = controller.submit([move("t1", 1, 1), move("t2", 2, 2)]);
    expect(result).toEqual({ ok: false, rejection: { code: "locked", message: "locked", patchIndex: 1 } });
    expect(model.revision).toBe(0);
    expect(model.getElement("t1")?.x).toBe(128);
  });

  it("returns the reason of a refusal as the code of the rejection, and remembers it", () => {
    const { controller } = harness();
    controller.usePipeline("element.move", [(_i, c) => c.reject("not-enough-wood", "Need 2 wood")]);
    const result = controller.submit(move("t1", 1, 1));
    expect(result).toEqual({ ok: false, rejection: { code: "not-enough-wood", message: "Need 2 wood", patchIndex: 0 } });
    expect(controller.state.get().lastRejection).toMatchObject({ reason: "not-enough-wood", intent: { type: "element.move", id: "t1" } });
  });

  it("forgets the last rejection once something succeeds", () => {
    const { controller } = harness();
    controller.submit(move("nope", 1, 1));
    expect(controller.state.get().lastRejection).not.toBeNull();
    controller.submit(move("t1", 1, 1));
    expect(controller.state.get().lastRejection).toBeNull();
  });

  it("refuses an intent nobody knows", () => {
    const { controller, model } = harness();
    expect(controller.submit({ type: "tilling.till" } as never)).toMatchObject({ ok: false, rejection: { code: "unknown-intent" } });
    expect(model.revision).toBe(0);
  });

  it("refuses to move an element that does not exist, with a reason rather than a patch error", () => {
    const { controller } = harness();
    expect(controller.submit(move("ghost", 1, 1))).toMatchObject({ ok: false, rejection: { code: "not-found" } });
  });

  it("removes elements", () => {
    const { controller, model } = harness();
    expect(controller.submit({ type: "element.remove", id: "t1" }).ok).toBe(true);
    expect(model.getElement("t1")).toBeUndefined();
    expect(controller.submit({ type: "element.remove", id: "t1" })).toMatchObject({ ok: false, rejection: { code: "not-found" } });
  });

  it("passes the options on to the model, so a drag can be one undo step", () => {
    const { controller, model } = harness();
    controller.submit(move("t1", 1, 1), { coalesce: "drag" });
    controller.submit(move("t1", 2, 2), { coalesce: "drag" });
    expect(model.history.status.undoDepth).toBe(1);
  });

  it("does not let elements moved together block one another", () => {
    const { controller, model } = harness();
    controller.usePipeline("element.move", [requireFree()]);
    // shifted together by (128, 64): t1 lands exactly where t2 was, while t2 moves away
    expect(controller.submit([move("t1", 256, 160), move("t2", 384, 224)]).ok).toBe(true);
    expect(model.getElement("t1")).toMatchObject({ x: 256, y: 160 });
    // …but the same move for t1 alone would have run into t2
    controller.submit([move("t1", 128, 96), move("t2", 256, 160)]);
    expect(controller.submit(move("t1", 256, 160))).toMatchObject({ ok: false, rejection: { code: "occupied" } });
  });

  it("still blocks a move onto an element that stays", () => {
    const { controller } = harness();
    controller.usePipeline("element.move", [requireFree()]);
    expect(controller.submit(move("t2", 128, 96))).toMatchObject({ ok: false, rejection: { code: "occupied" } });
  });

  it("gives the steps the actor of the game", () => {
    let wood = 1;
    const { controller } = harness({ actor: () => ({ inventory: { wood } }) });
    controller.usePipeline("element.move", [(i, c, next) => ((c.actor as { inventory: { wood: number } }).inventory.wood >= 2 ? next() : c.reject("not-enough-wood"))]);
    expect(controller.submit(move("t1", 1, 1))).toMatchObject({ ok: false, rejection: { code: "not-enough-wood" } });
    wood = 2;
    expect(controller.submit(move("t1", 1, 1)).ok).toBe(true);
  });
});

describe("pipeline and intents registration", () => {
  it("runs the steps in the order they were added, across several calls", () => {
    const { controller } = harness();
    const order: string[] = [];
    controller.usePipeline("element.move", [(i, _c, next) => (order.push("a"), next())]);
    controller.usePipeline("element.move", [(i, _c, next) => (order.push("b"), next()), (i, _c, next) => (order.push("c"), next())]);
    controller.submit(move("t1", 1, 1));
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("removes the steps it added", () => {
    const { controller } = harness();
    const step = vi.fn((i: never, _c: never, next: () => never) => next());
    const stop = controller.usePipeline("element.move", [step as never]);
    stop();
    controller.submit(move("t1", 1, 1));
    expect(step).not.toHaveBeenCalled();
  });

  it("refuses to register an intent twice, and lets it be unregistered", () => {
    const { controller } = harness();
    expect(() => controller.registerIntent("element.move", { resolve: () => [] })).toThrow(/already registered/);
    const stop = controller.registerIntent("element.place", { resolve: () => ({ type: "element.remove", id: "t1" }) });
    stop();
    expect(controller.submit({ type: "element.place", catalogId: "x", x: 0, y: 0 })).toMatchObject({ rejection: { code: "unknown-intent" } });
  });
});

describe("preview", () => {
  it("runs the pipeline without changing anything", () => {
    const { controller, model } = harness();
    controller.usePipeline("element.move", [snapToGrid(32)]);
    expect(controller.preview(move("t1", 100, 100) as never)).toMatchObject({ ok: true, intent: { x: 96, y: 96 } });
    expect(model.revision).toBe(0);
  });

  it("can leave some targets out of the obstacles", () => {
    const { controller } = harness();
    controller.usePipeline("element.move", [requireFree()]);
    // t2 dropped on t1: refused… unless t1 is itself leaving
    expect(controller.preview(move("t2", 128, 96) as never)).toMatchObject({ ok: false });
    expect(controller.preview(move("t2", 128, 96) as never, { ignore: [{ type: "element", id: "t1" }] }).ok).toBe(true);
  });

  it("does not touch the memory of the last rejection", () => {
    const { controller } = harness();
    controller.usePipeline("element.move", [(_i, c) => c.reject("nope")]);
    controller.preview(move("t1", 1, 1) as never);
    expect(controller.state.get().lastRejection).toBeNull();
  });
});

describe("modes and tools", () => {
  const recorder = (id: string, modes: string[], options: Partial<Tool> = {}) => {
    const calls: string[] = [];
    const { pointerDown, key: onKey, ...rest } = options;
    const tool: Tool = {
      id,
      modes,
      pointerDown: (input, controller) => (calls.push(`${id}:down`), pointerDown?.(input, controller) ?? false),
      pointerMove: () => (calls.push(`${id}:move`), false),
      pointerUp: () => void calls.push(`${id}:up`),
      key: (input, controller) => (calls.push(`${id}:key`), onKey?.(input, controller) ?? false),
      cancel: () => void calls.push(`${id}:cancel`),
      ...rest,
    };
    return { tool, calls };
  };

  it("starts in edit mode by default, or in the modes it is given", () => {
    expect(harness().controller.modes).toEqual(["edit"]);
    expect(harness({ modes: ["play"] }).controller.modes).toEqual(["play"]);
  });

  it("only gives events to the tools of an active mode", () => {
    const { controller } = harness();
    const play = recorder("play", ["play"]);
    const edit = recorder("edit", ["edit"]);
    controller.addTool(play.tool);
    controller.addTool(edit.tool);
    controller.feedPointer("down", pointer(1, 1));
    expect(play.calls).toEqual([]);
    expect(edit.calls).toEqual(["edit:down"]);
  });

  it("layers modes: several can be active at once", () => {
    const { controller } = harness({ modes: ["play", "edit"] });
    const play = recorder("play", ["play"]);
    const edit = recorder("edit", ["edit"]);
    controller.addTool(play.tool);
    controller.addTool(edit.tool);
    controller.feedPointer("down", pointer(1, 1));
    expect([...play.calls, ...edit.calls]).toEqual(["play:down", "edit:down"]);
  });

  it("stops at the first tool that takes the event, highest priority first", () => {
    const { controller } = harness({ modes: ["edit"] });
    const low = recorder("low", ["edit"], { priority: 0 });
    const high = recorder("high", ["edit"], { priority: 10, pointerDown: () => true });
    controller.addTool(low.tool);
    controller.addTool(high.tool);
    expect(controller.feedPointer("down", pointer(1, 1))).toBe(true);
    expect(high.calls).toEqual(["high:down"]);
    expect(low.calls).toEqual([]);
  });

  it("gives the moves and the release to the tool that took the press, and only to it", () => {
    const { controller } = harness({ modes: ["edit"] });
    const taker = recorder("taker", ["edit"], { priority: 1, pointerDown: () => true });
    const other = recorder("other", ["edit"]);
    controller.addTool(taker.tool);
    controller.addTool(other.tool);
    controller.feedPointer("down", pointer(1, 1));
    controller.feedPointer("move", pointer(2, 2));
    expect(controller.feedPointer("up", pointer(2, 2))).toBe(true);
    expect(taker.calls).toEqual(["taker:down", "taker:move", "taker:up"]);
    expect(other.calls).toEqual([]);
    // released: the next move goes to everybody again
    controller.feedPointer("move", pointer(3, 3));
    expect(other.calls).toEqual(["other:move"]);
    expect(controller.feedPointer("up", pointer(3, 3))).toBe(false);
  });

  it("lets a tool react only when its gate is open, e.g. a modifier key", () => {
    const { controller } = harness();
    const gated = recorder("gated", ["edit"], { when: (input) => "modifiers" in input && input.modifiers.alt });
    controller.addTool(gated.tool);
    controller.feedPointer("down", pointer(1, 1));
    controller.feedKey(key("a"));
    expect(gated.calls).toEqual([]);
    controller.feedPointer("down", pointer(1, 1, { alt: true }));
    controller.feedKey(key("a", { alt: true }));
    expect(gated.calls).toEqual(["gated:down", "gated:key"]);
  });

  it("cancels the tools of a mode that stops being active, and releases a captured one", () => {
    const { controller } = harness({ modes: ["edit", "play"] });
    const edit = recorder("edit", ["edit"], { pointerDown: () => true });
    const play = recorder("play", ["play"]);
    controller.addTool(edit.tool);
    controller.addTool(play.tool);
    controller.feedPointer("down", pointer(1, 1));

    controller.setModes(["play"]);
    expect(edit.calls).toContain("edit:cancel");
    expect(play.calls).not.toContain("play:cancel");
    expect(controller.feedPointer("up", pointer(1, 1))).toBe(false); // the captured tool was released
  });

  it("does nothing when the modes do not change", () => {
    const { controller } = harness();
    const edit = recorder("edit", ["edit"]);
    controller.addTool(edit.tool);
    controller.setModes(["edit"]);
    expect(edit.calls).toEqual([]);
  });

  it("refuses two tools with the same id, and cancels a tool that is removed", () => {
    const { controller } = harness();
    const a = recorder("a", ["edit"]);
    const remove = controller.addTool(a.tool);
    expect(() => controller.addTool(recorder("a", ["edit"]).tool)).toThrow(/already exists/);
    remove();
    expect(a.calls).toEqual(["a:cancel"]);
    expect(controller.tools).toHaveLength(0);
  });

  it("routes keys the same way", () => {
    const { controller } = harness();
    const taker = recorder("taker", ["edit"], { key: () => true });
    controller.addTool(taker.tool);
    expect(controller.feedKey(key("Escape"))).toBe(true);
    expect(controller.feedKey(key("Escape"))).toBe(true);
  });

  it("remembers the last pointer position", () => {
    const { controller } = harness();
    expect(controller.pointer).toBeNull();
    controller.feedPointer("move", pointer(12, 34));
    expect(controller.pointer).toEqual({ x: 12, y: 34 });
  });

  it("cancel() cancels every tool", () => {
    const { controller } = harness();
    const a = recorder("a", ["edit"]);
    controller.addTool(a.tool);
    controller.cancel();
    expect(a.calls).toEqual(["a:cancel"]);
  });
});

describe("state follows the model", () => {
  it("drops from the selection, the hover and the drag what no longer exists", () => {
    const { controller, model } = harness();
    controller.state.update({
      selection: [{ type: "element", id: "t1" }, { type: "element", id: "t2" }],
      hovered: { type: "element", id: "t1" },
      drag: { targets: [{ type: "element", id: "t1" }], origin: { x: 0, y: 0 }, delta: { x: 1, y: 1 }, valid: true, live: false },
    });
    model.apply({ type: "element.remove", id: "t1" });
    expect(controller.state.get().selection).toEqual([{ type: "element", id: "t2" }]);
    expect(controller.state.get().hovered).toBeNull();
    expect(controller.state.get().drag).toBeNull();
  });

  it("leaves things alone when nothing selected disappeared", () => {
    const { controller, model } = harness();
    controller.state.update({ selection: [{ type: "element", id: "t2" }] });
    const before = controller.state.get();
    model.apply({ type: "element.remove", id: "t1" });
    expect(controller.state.get()).toBe(before);
  });

  it("stops listening and ignores input once destroyed", () => {
    const { controller, model } = harness();
    controller.state.update({ selection: [{ type: "element", id: "t1" }] });
    controller.destroy();
    controller.destroy();
    model.apply({ type: "element.remove", id: "t1" });
    expect(controller.state.get().selection).toHaveLength(1);
    expect(controller.feedPointer("down", pointer(1, 1))).toBe(false);
    expect(controller.feedKey(key("a"))).toBe(false);
  });
});

describe("store", () => {
  it("notifies only when a value changed, with the new state, and isolates failing listeners", () => {
    const onError = vi.fn();
    const model = createMapModel(world());
    const controller = createInteraction({ model, assets, describe: describeContext, nodes: () => sceneOf(model), onError });
    const seen: number[] = [];
    controller.state.subscribe(() => {
      throw new Error("boom");
    });
    controller.state.subscribe((state) => seen.push(state.selection.length));
    controller.state.update({ selection: [{ type: "element", id: "t1" }] });
    controller.state.update({ hovered: null }); // already null: nothing happens
    expect(seen).toEqual([1]);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("stops notifying after unsubscribe", () => {
    const { controller } = harness();
    const listener = vi.fn();
    const stop = controller.state.subscribe(listener);
    stop();
    controller.state.update({ hovered: { type: "element", id: "t1" } });
    expect(listener).not.toHaveBeenCalled();
  });
});
