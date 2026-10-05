// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { asyncCommitter } from "../model/__fixtures__";
import { createMapModel } from "../model/model";
import { defineCatalog } from "./catalog";
import { createInteraction, type InteractionController } from "./controller";
import { registerElementIntents } from "./builtin-intents";
import { key, pointer } from "./input";
import { createPlacement, type PlacementOptions } from "./placement";
import { selectionTool } from "./selection-tool";
import { maxCount, requireFree, snapToGrid, withinMap } from "./steps";
import { assets, describeContext, harness, sceneOf, world } from "./__fixtures__";

const catalog = defineCatalog([
  { id: "oak", sprite: "tree" },
  { id: "cabin", sprite: "house", data: { owner: "nobody" } },
]);

function setup(options: Partial<PlacementOptions<typeof catalog>> = {}, modes: readonly string[] = ["play"]) {
  const h = harness({ modes });
  const placement = createPlacement(h.controller as unknown as InteractionController, { catalog, ...options });
  const c = h.controller;
  return {
    ...h,
    placement: placement.api,
    dispose: placement.dispose,
    move: (x: number, y: number) => c.feedPointer("move", pointer(x, y)),
    click: (x: number, y: number, mods = {}) => {
      c.feedPointer("down", pointer(x, y, mods));
      c.feedPointer("up", pointer(x, y, mods));
    },
    ghost: () => c.state.get().ghost,
  };
}

describe("ghost", () => {
  it("does not exist until something is being placed, nor until the pointer has moved", () => {
    const s = setup();
    s.move(500, 400);
    expect(s.ghost()).toBeNull();
    const fresh = setup();
    fresh.placement.start("oak");
    expect(fresh.controller.state.get().placing).toBe("oak");
    expect(fresh.ghost()).toBeNull();
    fresh.move(500, 400);
    expect(fresh.ghost()).not.toBeNull();
  });

  it("appears at once when the pointer is already known", () => {
    const s = setup();
    s.move(500, 400);
    s.placement.start("oak");
    expect(s.ghost()).toMatchObject({ catalogId: "oak", kind: "tree", x: 468, y: 352, valid: true });
  });

  it("follows the pointer, centred on it by default", () => {
    const s = setup();
    s.placement.start("oak");
    s.move(500, 400);
    expect(s.ghost()).toMatchObject({ x: 468, y: 352 });
    s.move(600, 300);
    expect(s.ghost()).toMatchObject({ x: 568, y: 252 });
  });

  it("can hang from another point of the item", () => {
    const place = (anchor: "top-left" | "center" | "bottom-center") => {
      const s = setup({ anchor });
      s.placement.start("oak");
      s.move(500, 400);
      return s.ghost();
    };
    expect(place("top-left")).toMatchObject({ x: 500, y: 400 });
    expect(place("center")).toMatchObject({ x: 468, y: 352 });
    expect(place("bottom-center")).toMatchObject({ x: 468, y: 304 });
  });

  it("sits where the pipeline puts it, on the grid, and says where it would stand", () => {
    const s = setup({ pipeline: [snapToGrid(32)] });
    s.placement.start("oak");
    s.move(500, 400);
    expect(s.ghost()).toMatchObject({ x: 480, y: 352, valid: true, bounds: { x: 480, y: 352, width: 64, height: 96 }, hitbox: { x: 496, y: 422, width: 32, height: 20 } });
  });

  it("is valid or not according to the same rules that validate the placement, with the reason", () => {
    const s = setup({ pipeline: [requireFree(), withinMap()] });
    s.placement.start("oak");
    s.move(500, 400);
    expect(s.ghost()).toMatchObject({ valid: true });
    s.move(160, 144); // onto the trunk of t1
    expect(s.ghost()).toMatchObject({ valid: false, reason: "occupied" });
    s.move(2, 2); // half off the map
    expect(s.ghost()).toMatchObject({ valid: false, reason: "out-of-bounds" });
  });

  it("still sits on the grid when refused", () => {
    const s = setup({ pipeline: [snapToGrid(32), requireFree()] });
    s.placement.start("oak");
    s.move(160, 144);
    expect(s.ghost()).toMatchObject({ valid: false, x: 128, y: 96 });
  });

  it("is shaped by the rules of the item as well", () => {
    const withRules = defineCatalog([{ id: "oak", sprite: "tree", pipeline: [(_i, c) => c.reject("not-here")] }]);
    const h = harness({ modes: ["play"] });
    const placement = createPlacement(h.controller as unknown as InteractionController, { catalog: withRules });
    placement.api.start("oak");
    h.controller.feedPointer("move", pointer(500, 400));
    expect(h.controller.state.get().ghost).toMatchObject({ valid: false, reason: "not-here" });
  });
});

describe("placing", () => {
  it("puts the item on the map where the ghost is, and stops placing", () => {
    const s = setup({ pipeline: [snapToGrid(32)] });
    const placed = vi.fn();
    s.placement.onPlaced(placed);
    s.placement.start("oak");
    s.move(500, 400);
    s.click(500, 400);

    expect(s.model.getElement("oak-1")).toMatchObject({ kind: "tree", x: 480, y: 352 });
    expect(placed).toHaveBeenCalledWith({ catalogId: "oak", id: "oak-1", x: 480, y: 352 });
    expect(s.placement.active).toBeNull();
    expect(s.ghost()).toBeNull();
    expect(s.model.history.status.undoDepth).toBe(1);
  });

  it("gives the element the data of the item", () => {
    const s = setup();
    s.placement.start("cabin");
    s.move(400, 400);
    s.click(400, 400);
    expect(s.model.getElement("cabin-1")?.data).toEqual({ owner: "nobody" });
  });

  it("places where the click is even if the pointer never moved first", () => {
    const s = setup({ anchor: "top-left" });
    s.placement.start("oak");
    s.click(300, 500);
    expect(s.model.getElement("oak-1")).toMatchObject({ x: 300, y: 500 });
  });

  it("keeps placing, with fresh ids, when asked to", () => {
    const s = setup({ keepPlacing: true });
    s.placement.start("oak");
    s.click(400, 400);
    s.click(500, 500);
    s.click(600, 600);
    expect(s.model.state.elements.filter((e) => e.kind === "tree").map((e) => e.id)).toEqual(["t1", "t2", "oak-1", "oak-2", "oak-3"]);
    expect(s.placement.active).toBe("oak");
  });

  it("never reuses an id that is taken", () => {
    const model = createMapModel(world());
    model.apply({ type: "element.add", element: { id: "oak-1", kind: "tree", x: 900, y: 100 } });
    const h = harness({ model });
    const placement = createPlacement(h.controller as unknown as InteractionController, { catalog });
    placement.api.start("oak");
    h.controller.feedPointer("down", pointer(400, 400));
    expect(model.getElement("oak-2")).toBeDefined();
  });

  it("uses the id factory it is given", () => {
    const s = setup({ idFactory: (item, taken) => `my-${item.id}-${taken.size}` });
    s.placement.start("oak");
    s.click(400, 400);
    expect(s.model.getElement("my-oak-3")).toBeDefined();
  });

  it("refuses when the pipeline does, keeps the world as it was, and tells why", () => {
    const s = setup({ pipeline: [requireFree()] });
    const rejected = vi.fn();
    const placed = vi.fn();
    s.placement.onRejected(rejected);
    s.placement.onPlaced(placed);
    s.placement.start("oak");
    s.click(160, 144);

    expect(rejected).toHaveBeenCalledWith({ catalogId: "oak", reason: "occupied", message: "Something is already there" });
    expect(placed).not.toHaveBeenCalled();
    expect(s.model.revision).toBe(0);
    expect(s.placement.active).toBe("oak"); // still in hand: the player can try elsewhere
    expect(s.controller.state.get().lastRejection).toMatchObject({ reason: "occupied" });
  });

  it("applies the rules of the item after those of the feature, with the actor of the game", () => {
    const wood = { value: 1 };
    const rules = defineCatalog([
      {
        id: "oak",
        sprite: "tree",
        pipeline: [(_i, c, next) => ((c.actor as { wood: number }).wood >= 2 ? next() : c.reject("not-enough-wood", "Need 2 wood"))],
      },
    ]);
    const h = harness({ modes: ["play"], actor: () => ({ wood: wood.value }) });
    const order: string[] = [];
    const placement = createPlacement(h.controller as unknown as InteractionController, {
      catalog: rules,
      pipeline: [(_i, _c, next) => (order.push("feature"), next())],
    });
    const rejected = vi.fn();
    placement.api.onRejected(rejected);
    placement.api.start("oak");

    h.controller.feedPointer("down", pointer(400, 400));
    expect(rejected).toHaveBeenCalledWith(expect.objectContaining({ reason: "not-enough-wood", message: "Need 2 wood" }));
    expect(order).toContain("feature");

    wood.value = 2;
    h.controller.feedPointer("down", pointer(400, 400));
    expect(h.model.getElement("oak-1")).toBeDefined();
  });

  it("stops at a limit, such as two trees: the world already has two", () => {
    const s = setup({ pipeline: [maxCount("tree", 2)] });
    const rejected = vi.fn();
    s.placement.onRejected(rejected);
    s.placement.start("oak");
    s.click(400, 400);
    expect(s.model.getElement("oak-1")).toBeUndefined();
    expect(rejected).toHaveBeenCalledWith(expect.objectContaining({ reason: "max-count" }));
  });

  it("allows one more tree below the limit", () => {
    const s = setup({ pipeline: [maxCount("tree", 3)] });
    s.placement.start("oak");
    s.click(400, 400);
    expect(s.model.getElement("oak-1")).toBeDefined();
  });

  it("never reuses the number of an element that was removed", () => {
    const s = setup();
    s.placement.start("oak");
    s.click(400, 400);
    s.model.apply({ type: "element.remove", id: "oak-1" });
    s.placement.start("oak");
    s.click(500, 500);
    expect(s.model.getElement("oak-1")).toBeUndefined();
    expect(s.model.getElement("oak-2")).toBeDefined();
  });

  it("does not waste a number on a refused attempt, and counts each item on its own", () => {
    const s = setup({ pipeline: [requireFree()], keepPlacing: true });
    s.placement.start("oak");
    s.click(160, 144); // refused
    s.click(400, 400);
    s.placement.start("cabin");
    s.click(100, 600);
    expect(s.model.getElement("oak-1")).toBeDefined();
    expect(s.model.getElement("oak-2")).toBeUndefined();
    expect(s.model.getElement("cabin-1")).toBeDefined();
  });

  it("stops listening to a listener that unsubscribed", () => {
    const s = setup();
    const placed = vi.fn();
    const stop = s.placement.onPlaced(placed);
    stop();
    s.placement.start("oak");
    s.click(400, 400);
    expect(placed).not.toHaveBeenCalled();
  });
});

describe("cancelling", () => {
  it("Escape, the secondary button and cancel() stop placing", () => {
    const s = setup();
    s.placement.start("oak");
    s.move(500, 400);
    expect(s.controller.feedKey(key("Escape"))).toBe(true);
    expect(s.placement.active).toBeNull();
    expect(s.ghost()).toBeNull();

    s.placement.start("oak");
    s.controller.feedPointer("down", pointer(500, 400, { button: 2 }));
    expect(s.placement.active).toBeNull();

    s.placement.start("oak");
    s.placement.cancel();
    expect(s.controller.state.get().placing).toBeNull();
  });

  it("Escape means nothing when nothing is being placed", () => {
    expect(setup().controller.feedKey(key("Escape"))).toBe(false);
  });

  it("stops when the mode no longer allows it", () => {
    const s = setup({}, ["play", "edit"]);
    s.placement.start("oak");
    s.controller.setModes(["inspect"]);
    expect(s.placement.active).toBeNull();
  });

  it("start() refuses an item that is not in the catalog", () => {
    expect(() => setup().placement.start("oaks" as never)).toThrow(/not in the catalog/);
  });

  it("ignores other buttons while placing", () => {
    const s = setup();
    s.placement.start("oak");
    expect(s.controller.feedPointer("down", pointer(500, 400, { button: 1 }))).toBe(false);
    expect(s.placement.active).toBe("oak");
  });
});

describe("modes and other tools", () => {
  it("takes the click before the selection tool, so placing does not select", () => {
    const s = setup({}, ["play", "edit"]);
    s.controller.addTool(selectionTool());
    s.placement.start("oak");
    s.click(160, 144); // over t1
    expect(s.controller.state.get().selection).toEqual([]);
    expect(s.model.getElement("oak-1")).toBeDefined();
  });

  it("lets the selection tool work again once placing is over", () => {
    const s = setup({}, ["play", "edit"]);
    s.controller.addTool(selectionTool());
    s.placement.start("oak");
    s.placement.cancel();
    s.click(150, 150);
    expect(s.controller.state.get().selection).toEqual([{ type: "element", id: "t1" }]);
  });

  it("works in play and in edit by default, a builder plays", () => {
    for (const mode of ["play", "edit"]) {
      const s = setup({}, [mode]);
      s.placement.start("oak");
      s.click(400, 400);
      expect(s.model.getElement("oak-1"), mode).toBeDefined();
    }
    const inspect = setup({}, ["inspect"]);
    inspect.placement.start("oak");
    inspect.click(400, 400);
    expect(inspect.model.getElement("oak-1")).toBeUndefined();
  });

  it("can be restricted to some modes", () => {
    const s = setup({ modes: ["edit"] }, ["play"]);
    s.placement.start("oak");
    s.click(400, 400);
    expect(s.model.getElement("oak-1")).toBeUndefined();
  });
});

describe("registration", () => {
  it("dispose removes the intent, the rules and the tool", () => {
    const s = setup();
    s.dispose();
    expect(s.controller.submit({ type: "element.place", catalogId: "oak", x: 1, y: 1 })).toMatchObject({ rejection: { code: "unknown-intent" } });
    expect(s.controller.tools).toHaveLength(0);
  });

  it("refuses an item that is not in the catalog when asked directly", () => {
    const s = setup();
    expect(s.controller.submit({ type: "element.place", catalogId: "nope", x: 1, y: 1 })).toMatchObject({
      ok: false,
      rejection: { code: "unknown-catalog-item" },
    });
  });

  it("can be submitted as a plain intent, with or without an id", () => {
    const s = setup();
    expect(s.controller.submit({ type: "element.place", catalogId: "oak", x: 1, y: 1, id: "mine" }).ok).toBe(true);
    expect(s.controller.submit({ type: "element.place", catalogId: "oak", x: 9, y: 9 }).ok).toBe(true);
    expect(s.model.getElement("mine")).toBeDefined();
    expect(s.model.getElement("oak-1")).toBeDefined();
  });
});

describe("with a committer that answers later", () => {
  it("reports the result when it arrives", async () => {
    const model = createMapModel(world(), { committer: asyncCommitter() });
    const controller = createInteraction({ model, assets, describe: describeContext, nodes: () => sceneOf(model), modes: ["play"] });
    registerElementIntents(controller as never);
    const { api } = createPlacement(controller, { catalog, pipeline: [requireFree()] });
    const placed = vi.fn();
    const rejected = vi.fn();
    api.onPlaced(placed);
    api.onRejected(rejected);

    api.start("oak");
    controller.feedPointer("down", pointer(400, 400));
    expect(placed).not.toHaveBeenCalled(); // not confirmed yet
    await vi.waitFor(() => expect(placed).toHaveBeenCalledOnce());
    expect(model.getElement("oak-1")).toBeDefined();
    expect(api.active).toBeNull();

    api.start("oak");
    controller.feedPointer("down", pointer(160, 144)); // refused by the pipeline: no waiting
    expect(rejected).toHaveBeenCalledWith(expect.objectContaining({ reason: "occupied" }));
  });
});
