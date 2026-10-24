// @vitest-environment node
import { Container, Rectangle, Sprite } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import { snapToGrid, requireFree } from "../interaction/steps";
import { key } from "../interaction/input";
import { bindKeyboard } from "../interaction/keyboard";
import { createMapView } from "../renderer/view";
import { MapFeatureError, defineMapFeature } from "../renderer/feature";
import { assets, catalog, defaultEditor, editor, overlayLayers, shapesOf, world } from "./__fixtures__";
import { elements, events, history, placement, selection } from "./index";
import { createMapModel } from "../model/model";

const ON_T1 = { x: 150, y: 150 };
const ON_T2 = { x: 280, y: 200 };
const container = (view: ReturnType<typeof editor>["view"], key: string) =>
  view.stages.objects.children.find((child) => child.label === key) as Container | undefined;

describe("pointer events on the map", () => {
  it("become interaction once a feature has something to interact with: the map is the hit area", () => {
    const { view } = editor();
    expect(view.root.eventMode).toBe("static");
    expect(view.root.hitArea).toBeInstanceOf(Rectangle);
    expect(view.root.hitArea).toMatchObject({ x: 0, y: 0, width: 1024, height: 768 });
  });

  it("are left alone by a view that only draws, so it never gets in the way of a game", () => {
    const { view } = editor([elements(), events()]);
    expect(view.root.eventMode).not.toBe("static");
    expect(view.root.hitArea).toBeFalsy();
  });

  it("can be forced on or off", () => {
    expect(editor([elements()], { interactive: true }).view.root.eventMode).toBe("static");
    expect(defaultEditor({ interactive: false }).view.root.eventMode).not.toBe("static");
  });

  it("select what is clicked, using the position in the map and the modifier keys", () => {
    const { view, pointer } = editor();
    pointer.down(ON_T1.x, ON_T1.y);
    pointer.up(ON_T1.x, ON_T1.y);
    expect(view.selection.current).toEqual([{ type: "element", id: "t1" }]);

    pointer.down(ON_T2.x, ON_T2.y, { shiftKey: true });
    pointer.up(ON_T2.x, ON_T2.y, { shiftKey: true });
    expect(view.selection.current).toHaveLength(2);
  });

  it("drag an element, and the picture follows the model", () => {
    const { view, model, pointer } = editor();
    pointer.down(ON_T1.x, ON_T1.y);
    pointer.move(250, 350);
    expect(model.getElement("t1")?.x).toBe(128); // not until it is dropped
    pointer.up(250, 350);

    expect(model.getElement("t1")).toMatchObject({ x: 228, y: 296 });
    expect((container(view, "elements/t1")!.children[0] as Sprite).x).toBe(228);
    expect(container(view, "elements/t1")!.zIndex).toBe(296 + 90);
  });

  it("keep dragging when the pointer leaves the map, and end on release outside", () => {
    const { model, pointer } = editor();
    pointer.down(ON_T1.x, ON_T1.y);
    pointer.move(1500, 900); // far outside the 1024x768 map
    pointer.upOutside(1500, 900);
    expect(model.getElement("t1")).toMatchObject({ x: 128 + 1350, y: 96 + 750 });
  });

  it("only use the main button to select", () => {
    const { view, pointer } = editor();
    pointer.down(ON_T1.x, ON_T1.y, { button: 2 });
    expect(view.selection.current).toEqual([]);
  });
});

describe("feature APIs on the view", () => {
  it("are exposed under the id of the feature, and only for features that have one", () => {
    const { view } = editor();
    expect(Object.keys(view)).toEqual(expect.arrayContaining(["selection", "placement", "history"]));
    expect(view).not.toHaveProperty("elements");
    expect(view).not.toHaveProperty("events");
  });

  it("selection: select, clear, has and subscribe", () => {
    const { view } = editor();
    const seen: number[] = [];
    const stop = view.selection.subscribe((selected) => seen.push(selected.length));
    const t1 = { type: "element", id: "t1" } as const;
    const t2 = { type: "element", id: "t2" } as const;

    view.selection.select(t1);
    view.selection.select(t2, { additive: true });
    expect(view.selection.current).toEqual([t1, t2]);
    expect(view.selection.has(t2)).toBe(true);
    view.selection.select([t1]);
    expect(view.selection.current).toEqual([t1]);
    view.selection.clear();
    expect(view.selection.current).toEqual([]);
    expect(seen).toEqual([1, 2, 1, 0]);

    stop();
    view.selection.select(t1);
    expect(seen).toHaveLength(4);
  });

  it("selection: reports the hover too", () => {
    const { view, pointer } = editor();
    pointer.move(ON_T1.x, ON_T1.y);
    expect(view.selection.hovered).toEqual({ type: "element", id: "t1" });
  });

  it("selection: does not select twice the same target", () => {
    const { view } = editor();
    view.selection.select([{ type: "element", id: "t1" }, { type: "element", id: "t1" }]);
    expect(view.selection.current).toHaveLength(1);
  });

  it("history: undoes and redoes what was done on the map, and the picture follows", () => {
    const { view, pointer } = editor();
    pointer.down(ON_T1.x, ON_T1.y);
    pointer.move(250, 350);
    pointer.up(250, 350);
    view.history.undo();
    expect((container(view, "elements/t1")!.children[0] as Sprite).x).toBe(128);
    view.history.redo();
    expect((container(view, "elements/t1")!.children[0] as Sprite).x).toBe(228);
  });

  it("history: needs a model that has one", () => {
    const model = { ...createMapModel(world()), history: undefined } as never;
    expect(() => createMapView({ model, assets, features: [history()] })).toThrow(/needs a model that has a history/);
  });
});

describe("dependencies and names", () => {
  it("selection and placement need the elements feature, and say so", () => {
    expect(() => editor([selection()])).toThrow('Feature "selection" requires "elements"');
    expect(() => editor([placement({ catalog })])).toThrow('Feature "placement" requires "elements"');
    expect(() => editor([elements(), selection()])).not.toThrow();
  });

  it("a feature cannot take a name the view already uses", () => {
    for (const id of ["root", "interaction", "submit", "effects", "tick"]) {
      expect(() => defineMapFeature({ id })).toThrow(MapFeatureError);
    }
    expect(() => defineMapFeature({ id: "interaction" })).toThrow(/already a property of the view/);
  });

  it("the interaction layer and submit are on every view", () => {
    const { view } = editor([elements()]);
    expect(view.interaction.modes).toEqual(["edit"]);
    expect(view.submit({ type: "element.move", id: "t1", x: 5, y: 5 })).toMatchObject({ ok: false }); // not editable: no intent
  });
});

describe("editing rules", () => {
  it("elements({ pipeline }) applies to every move, whoever asks: a tool or view.submit", () => {
    const { view, model, pointer } = editor([elements({ pipeline: { move: [snapToGrid(32)] } }), selection()]);
    view.submit({ type: "element.move", id: "t1", x: 100, y: 100 });
    expect(model.getElement("t1")).toMatchObject({ x: 96, y: 96 });

    pointer.down(280, 200);
    pointer.move(300, 220);
    pointer.up(300, 220);
    expect(model.getElement("t2")).toMatchObject({ x: 288, y: 192 });
  });

  it("elements({ pipeline }) can protect elements from removal", () => {
    const { view, model } = editor([elements({ pipeline: { remove: [(_i, c) => c.reject("protected")] } }), selection({ remove: true })]);
    view.selection.select({ type: "element", id: "t1" });
    view.interaction.feedKey(key("Delete"));
    expect(model.getElement("t1")).toBeDefined();
    expect(view.interaction.state.get().lastRejection).toMatchObject({ reason: "protected" });
  });

  it("elements({ edit: true }) makes elements editable by view.submit alone", () => {
    const { view, model } = editor([elements({ edit: true })]);
    expect(view.submit({ type: "element.remove", id: "t1" }).ok).toBe(true);
    expect(model.getElement("t1")).toBeUndefined();
  });

  it("keeps move rules out of placement, and the other way round", () => {
    const { view, model } = editor([elements({ pipeline: { move: [(_i, c) => c.reject("no-moves")] } }), selection(), placement({ catalog })]);
    expect(view.submit({ type: "element.move", id: "t1", x: 1, y: 1 })).toMatchObject({ rejection: { code: "no-moves" } });
    view.placement.start("oak");
    view.interaction.feedPointer("down", { x: 400, y: 400, button: 0, modifiers: { shift: false, ctrl: false, alt: false, meta: false } });
    expect(model.getElement("oak-1")).toBeDefined();
  });
});

describe("placing on the view", () => {
  it("shows a ghost that follows the pointer, then puts the item on the map and in the picture", async () => {
    const { view, model, pointer } = defaultEditor({ modes: ["play"] });
    const placed = vi.fn();
    view.placement.onPlaced(placed);
    view.placement.start("oak");
    pointer.move(500, 400);
    await view.whenIdle();

    expect(view.interaction.state.get().ghost).toMatchObject({ x: 468, y: 352, valid: true });
    // the ghost is the last overlay layer: selection, hover, drag and marquee come first
    const holder = overlayLayers(view).at(-1)!.children[0] as Container;
    expect(holder.visible).toBe(true);
    expect(holder.children[0]).toBeInstanceOf(Sprite);

    pointer.down(500, 400);
    pointer.up(500, 400);
    expect(placed).toHaveBeenCalledOnce();
    expect(holder.visible).toBe(false); // the ghost is gone
    expect(model.getElement("oak-1")).toMatchObject({ kind: "tree", x: 468, y: 352 });
    expect(container(view, "elements/oak-1")).toBeDefined();
    expect(view.placement.active).toBeNull();
  });

  it("is typed on the catalog: only its ids can be placed", () => {
    const { view } = editor();
    expect(view.placement.catalog.ids).toEqual(["oak", "cabin"]);
    expect(() => view.placement.start("nope" as never)).toThrow(/not in the catalog/);
  });

  it("refuses a spot the pipeline refuses, and says why", () => {
    const { view, model, pointer } = editor(
      [elements(), placement({ catalog, pipeline: [requireFree()] })],
      { modes: ["play"] },
    );
    const rejected = vi.fn();
    view.placement.onRejected(rejected);
    view.placement.start("oak");
    pointer.down(160, 144);
    expect(rejected).toHaveBeenCalledWith(expect.objectContaining({ reason: "occupied" }));
    expect(model.revision).toBe(0);
  });
});

describe("skins", () => {
  it("draw a frame around the selection, which follows the element when it moves", () => {
    const { view, model } = editor();
    view.selection.select({ type: "element", id: "t1" });
    const frame = () => shapesOf(overlayLayers(view)[0]!).find((shape) => shape.action === "stroke")?.rect;
    expect(frame()).toEqual({ x: 128, y: 96, width: 64, height: 96 });

    model.apply({ type: "element.move", id: "t1", x: 300, y: 400 });
    expect(frame()).toEqual({ x: 300, y: 400, width: 64, height: 96 });

    view.selection.clear();
    expect(shapesOf(overlayLayers(view)[0]!)).toEqual([]);
  });

  it("draw the hover, but not on what is already selected", () => {
    const { view, pointer } = editor();
    pointer.move(ON_T1.x, ON_T1.y);
    expect(shapesOf(overlayLayers(view)[1]!)).toHaveLength(1);
    view.selection.select({ type: "element", id: "t1" });
    expect(shapesOf(overlayLayers(view)[1]!)).toEqual([]);
  });

  it("draw the rubber band and the drag, green when it can land and red when it cannot", () => {
    const { view, pointer } = editor([elements({ pipeline: { move: [requireFree()] } }), selection()]);
    pointer.down(100, 80);
    pointer.move(300, 230);
    expect(shapesOf(overlayLayers(view)[3]!)[0]).toMatchObject({ action: "fill" });
    pointer.up(300, 230);
    view.selection.clear(); // the band selected both trees: drag only one of them

    const green = 0x22c55e;
    const red = 0xef4444;
    pointer.down(ON_T2.x, ON_T2.y);
    pointer.move(ON_T2.x + 5, ON_T2.y + 5);
    expect(shapesOf(overlayLayers(view)[2]!).every((shape) => shape.color === green)).toBe(true);
    pointer.move(150, 150); // onto t1
    expect(shapesOf(overlayLayers(view)[2]!).every((shape) => shape.color === red)).toBe(true);
  });

  it("draw the ghost with the item's image, and an outline that says if it fits", async () => {
    const { view, pointer } = editor([elements(), placement({ catalog, pipeline: [requireFree()] })], { modes: ["play"] });
    view.placement.start("oak");
    pointer.move(500, 400);
    await view.whenIdle();
    const holder = overlayLayers(view)[0]!.children[0] as Container;
    const sprite = holder.children[0] as Sprite;
    const outline = holder.children[1] as Container;
    expect(sprite.visible).toBe(true);
    expect([sprite.x, sprite.y, sprite.width, sprite.height]).toEqual([468, 352, 64, 96]);
    expect(shapesOf({ children: [outline] } as unknown as Container).every((shape) => shape.color === 0x22c55e)).toBe(true);

    pointer.move(160, 144);
    expect(shapesOf({ children: [outline] } as unknown as Container).every((shape) => shape.color === 0xef4444)).toBe(true);
    expect(sprite.tint).toBe(0xef4444);
  });

  it("let a game replace one part and keep the others", () => {
    const created: string[] = [];
    const updates: number[] = [];
    const custom = {
      selection: (context: { layer: Container }) => {
        created.push("selection");
        const marker = new Container();
        marker.label = "custom-selection";
        context.layer.addChild(marker);
        return { update: (s: { selection: readonly unknown[] }) => void updates.push(s.selection.length), destroy: () => void created.push("destroyed") };
      },
    };
    const { view } = editor([elements(), selection({ skin: custom })]);
    expect(created).toEqual(["selection"]);
    expect(overlayLayers(view)).toHaveLength(4); // custom selection + default hover, drag, marquee
    expect(overlayLayers(view)[0]!.children[0]!.label).toBe("custom-selection");

    view.selection.select({ type: "element", id: "t1" });
    expect(updates.at(-1)).toBe(1);
    view.destroy();
    expect(created).toContain("destroyed");
  });

  it("give the layers the time, for animations", () => {
    const ticks: number[] = [];
    const skin = { marquee: () => ({ update: () => undefined, tick: (delta: number) => void ticks.push(delta), destroy: () => undefined }) };
    const { view } = editor([elements(), selection({ skin })]);
    view.tick(16);
    view.tick(17);
    expect(ticks).toEqual([16, 17]);
  });

  it("are removed with the view", () => {
    const { view } = editor();
    const layers = overlayLayers(view);
    view.destroy();
    expect(layers.every((layer) => layer.destroyed)).toBe(true);
  });
});

describe("keyboard", () => {
  const target = () => {
    const listeners = new Set<(event: never) => void>();
    return {
      target: {
        addEventListener: (_type: "keydown", listener: (event: never) => void) => void listeners.add(listener),
        removeEventListener: (_type: "keydown", listener: (event: never) => void) => void listeners.delete(listener),
      },
      press: (event: { key: string; target?: unknown; shiftKey?: boolean }) => {
        const preventDefault = vi.fn();
        listeners.forEach((listener) => listener({ ...event, preventDefault } as never));
        return preventDefault;
      },
      listeners,
    };
  };

  it("bindKeyboard gives keys to the interaction layer and keeps the browser out of what a tool took", () => {
    const { view } = editor();
    const keys = target();
    const unbind = bindKeyboard(view.interaction, keys.target);
    view.selection.select({ type: "element", id: "t1" });

    expect(keys.press({ key: "Escape" })).toHaveBeenCalled(); // cleared the selection
    expect(view.selection.current).toEqual([]);
    expect(keys.press({ key: "Escape" })).not.toHaveBeenCalled(); // nothing to do: left to the browser
    unbind();
    expect(keys.listeners.size).toBe(0);
  });

  it("leaves keys typed in a text field alone", () => {
    const { view } = editor();
    const keys = target();
    bindKeyboard(view.interaction, keys.target);
    view.selection.select({ type: "element", id: "t1" });
    keys.press({ key: "Escape", target: { tagName: "INPUT" } });
    expect(view.selection.current).toHaveLength(1);
    keys.press({ key: "Escape", target: { tagName: "div", isContentEditable: true } });
    expect(view.selection.current).toHaveLength(1);
  });

  it("Delete removes the selection, as one undo step", () => {
    const { view, model } = editor();
    const keys = target();
    bindKeyboard(view.interaction, keys.target);
    view.selection.select([{ type: "element", id: "t1" }, { type: "element", id: "t2" }]);
    keys.press({ key: "Delete" });
    expect(model.state.elements.map((e) => e.id)).toEqual(["home"]);
    expect(container(view, "elements/t1")).toBeUndefined();
    view.history.undo();
    expect(model.state.elements).toHaveLength(3);
  });

  it("mount can listen to the keyboard for the view, and stops with it", async () => {
    const { view } = editor();
    const keys = target();
    const app = {
      init: async () => undefined,
      canvas: {},
      stage: new Container(),
      ticker: { add: () => undefined, remove: () => undefined },
      destroy: () => undefined,
    };
    await view.mount({ appendChild: () => undefined }, { createApplication: () => app as never, keyboard: keys.target });
    expect(keys.listeners.size).toBe(1);
    view.destroy();
    expect(keys.listeners.size).toBe(0);
  });
});

describe("modes", () => {
  it("start in edit, and play takes over when asked: the same view, the same model", () => {
    const { view, pointer } = editor();
    view.interaction.setModes(["play"]);
    pointer.down(ON_T1.x, ON_T1.y);
    expect(view.selection.current).toEqual([]);

    view.interaction.setModes(["edit"]);
    pointer.down(ON_T1.x, ON_T1.y);
    expect(view.selection.current).toHaveLength(1);
  });

  it("can start in another mode, with an actor for the rules", () => {
    const seen: unknown[] = [];
    const { view } = editor([elements({ pipeline: { move: [(_i, c, next) => (seen.push(c.actor), next())] } }), selection()], {
      modes: ["edit"],
      actor: () => ({ name: "ann" }),
    });
    view.submit({ type: "element.move", id: "t1", x: 1, y: 1 });
    expect(seen).toEqual([{ name: "ann" }]);
  });
});

describe("lifecycle", () => {
  it("destroying the view stops the interaction and removes what the features added", () => {
    const { view, pointer, model } = editor();
    view.destroy();
    expect(() => pointer.down(ON_T1.x, ON_T1.y)).not.toThrow();
    expect(() => model.apply({ type: "element.move", id: "t1", x: 1, y: 1 })).not.toThrow();
    expect(view.interaction.feedKey(key("Escape"))).toBe(false);
  });

  it("an interactive view can be hosted like any other", () => {
    const { view } = editor();
    const host = new Container();
    host.addChild(view.root);
    expect(host.children).toContain(view.root);
  });
});
