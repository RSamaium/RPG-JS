// @vitest-environment node
import { describe, expect, it } from "vitest";
import { key, pointer } from "./input";
import { requireFree, snapToGrid } from "./steps";
import { selectionTool, type SelectionToolOptions } from "./selection-tool";
import { harness } from "./__fixtures__";

const t1 = { type: "element", id: "t1" } as const;
const t2 = { type: "element", id: "t2" } as const;
const chest = { type: "event", id: "chest-1" } as const;

// t1 spans (128,96)-(192,192), t2 (256,160)-(320,256), the house (640,320)-(768,448), the chest (700,600)
const ON_T1 = { x: 150, y: 150 };
const ON_T2 = { x: 280, y: 200 };
const ON_CHEST = { x: 705, y: 605 };
const EMPTY = { x: 20, y: 20 };

function setup(options: SelectionToolOptions = {}) {
  const h = harness();
  h.controller.addTool(selectionTool(options));
  const c = h.controller;
  return {
    ...h,
    down: (p: { x: number; y: number }, mods = {}) => c.feedPointer("down", pointer(p.x, p.y, mods)),
    move: (p: { x: number; y: number }, mods = {}) => c.feedPointer("move", pointer(p.x, p.y, mods)),
    up: (p: { x: number; y: number }, mods = {}) => c.feedPointer("up", pointer(p.x, p.y, mods)),
    click(p: { x: number; y: number }, mods = {}) {
      this.down(p, mods);
      this.up(p, mods);
    },
    selection: () => c.state.get().selection,
    drag: (from: { x: number; y: number }, to: { x: number; y: number }, steps = 1) => {
      c.feedPointer("down", pointer(from.x, from.y));
      for (let i = 1; i <= steps; i++) {
        c.feedPointer("move", pointer(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps));
      }
    },
    drop: (at: { x: number; y: number }) => c.feedPointer("up", pointer(at.x, at.y)),
  };
}

describe("hover", () => {
  it("follows the pointer over elements and events, and clears off them", () => {
    const s = setup();
    s.move(ON_T1);
    expect(s.controller.state.get().hovered).toEqual(t1);
    s.move(ON_CHEST);
    expect(s.controller.state.get().hovered).toEqual(chest);
    s.move(EMPTY);
    expect(s.controller.state.get().hovered).toBeNull();
  });

  it("does not take the event, so other tools can hover too", () => {
    expect(setup().move(ON_T1)).toBe(false);
  });
});

describe("clicking", () => {
  it("selects what is clicked, replacing the previous selection", () => {
    const s = setup();
    s.click(ON_T1);
    expect(s.selection()).toEqual([t1]);
    s.click(ON_T2);
    expect(s.selection()).toEqual([t2]);
  });

  it("selects events too, and can be limited to some kinds of target", () => {
    const s = setup();
    s.click(ON_CHEST);
    expect(s.selection()).toEqual([chest]);
    const onlyElements = setup({ types: ["element"] });
    onlyElements.click(ON_CHEST);
    expect(onlyElements.selection()).toEqual([]);
  });

  it("clears the selection when clicking on nothing", () => {
    const s = setup({ marquee: false });
    s.click(ON_T1);
    s.click(EMPTY);
    expect(s.selection()).toEqual([]);
  });

  it("adds to the selection and removes from it with shift", () => {
    const s = setup();
    s.click(ON_T1);
    s.click(ON_T2, { shift: true });
    expect(s.selection()).toEqual([t1, t2]);
    s.click(ON_T1, { shift: true });
    expect(s.selection()).toEqual([t2]);
  });

  it("keeps the selection when shift-clicking on nothing", () => {
    const s = setup();
    s.click(ON_T1);
    s.click(EMPTY, { shift: true });
    expect(s.selection()).toEqual([t1]);
  });

  it("clicking a member of a multiple selection keeps the group for a drag, then narrows to it on release", () => {
    const s = setup();
    s.click(ON_T1);
    s.click(ON_T2, { shift: true });
    s.down(ON_T1);
    expect(s.selection()).toEqual([t1, t2]); // still both: this could be the start of a drag
    s.up(ON_T1);
    expect(s.selection()).toEqual([t1]);
  });

  it("ignores buttons other than the main one", () => {
    const s = setup();
    expect(s.controller.feedPointer("down", pointer(ON_T1.x, ON_T1.y, { button: 2 }))).toBe(false);
    expect(s.selection()).toEqual([]);
  });

  it("can select by the hitbox only", () => {
    const s = setup({ area: "hitbox" });
    s.click({ x: 150, y: 110 }); // crown
    expect(s.selection()).toEqual([]);
    s.click({ x: 150, y: 175 }); // trunk
    expect(s.selection()).toEqual([t1]);
  });
});

describe("rubber band", () => {
  it("selects what the rectangle touches while it is drawn, and publishes the rectangle", () => {
    const s = setup();
    s.down({ x: 100, y: 80 });
    s.move({ x: 300, y: 230 });
    expect(s.controller.state.get().marquee).toEqual({ x: 100, y: 80, width: 200, height: 150 });
    expect(s.selection()).toEqual([t1, t2]);
    s.move({ x: 200, y: 200 });
    expect(s.selection()).toEqual([t1]); // shrinking the band unselects
    s.up({ x: 200, y: 200 });
    expect(s.controller.state.get().marquee).toBeNull();
    expect(s.selection()).toEqual([t1]);
  });

  it("works in any direction", () => {
    const s = setup();
    s.down({ x: 350, y: 300 }); // empty, below and to the right of both trees
    s.move({ x: 100, y: 80 });
    expect(s.selection()).toEqual([t1, t2]);
  });

  it("with shift, adds to what was selected", () => {
    const s = setup();
    s.click(ON_CHEST);
    s.down({ x: 100, y: 80 }, { shift: true });
    s.move({ x: 300, y: 230 }, { shift: true });
    expect(s.selection()).toEqual([chest, t1, t2]);
  });

  it("can be turned off", () => {
    const s = setup({ marquee: false });
    expect(s.down(EMPTY)).toBe(false);
  });
});

describe("dragging, committed on release", () => {
  it("shows the drag while it goes, and moves the element only on release", () => {
    const s = setup({ drag: {} });
    s.drag(ON_T1, { x: 250, y: 350 });
    expect(s.controller.state.get().drag).toMatchObject({ targets: [t1], delta: { x: 100, y: 200 }, valid: true, live: false });
    expect(s.model.getElement("t1")).toMatchObject({ x: 128, y: 96 });

    s.drop({ x: 250, y: 350 });
    expect(s.model.getElement("t1")).toMatchObject({ x: 228, y: 296 });
    expect(s.controller.state.get().drag).toBeNull();
    expect(s.model.history.status.undoDepth).toBe(1);
  });

  it("is on by default, and can be turned off", () => {
    const off = setup({ drag: false });
    off.drag(ON_T1, { x: 250, y: 350 });
    off.drop({ x: 250, y: 350 });
    expect(off.model.getElement("t1")).toMatchObject({ x: 128, y: 96 });
    expect(off.controller.state.get().drag).toBeNull();
    expect(off.selection()).toEqual([t1]);
  });

  it("is only a click below the threshold", () => {
    const s = setup();
    s.drag(ON_T1, { x: 152, y: 151 });
    expect(s.controller.state.get().drag).toBeNull();
    s.drop({ x: 152, y: 151 });
    expect(s.model.revision).toBe(0);
  });

  it("has a threshold that can be changed", () => {
    const s = setup({ drag: { threshold: 20 } });
    s.drag(ON_T1, { x: 160, y: 150 });
    expect(s.controller.state.get().drag).toBeNull();
    s.move({ x: 175, y: 150 });
    expect(s.controller.state.get().drag).not.toBeNull();
  });

  it("selects what it grabs, then drags it", () => {
    const s = setup();
    s.drag(ON_T2, { x: 380, y: 300 });
    s.drop({ x: 380, y: 300 });
    expect(s.selection()).toEqual([t2]);
    expect(s.model.getElement("t2")).toMatchObject({ x: 356, y: 260 });
    expect(s.model.getElement("t1")).toMatchObject({ x: 128, y: 96 });
  });

  it("moves the whole selection together, as one undo step", () => {
    const s = setup();
    s.click(ON_T1);
    s.click(ON_T2, { shift: true });
    s.drag(ON_T1, { x: 150, y: 450 });
    s.drop({ x: 150, y: 450 });
    expect(s.model.getElement("t1")).toMatchObject({ x: 128, y: 396 });
    expect(s.model.getElement("t2")).toMatchObject({ x: 256, y: 460 });
    expect(s.model.revision).toBe(1);
    s.model.history.undo();
    expect(s.model.getElement("t2")).toMatchObject({ x: 256, y: 160 });
  });

  it("moves relative to where the element started, so a long drag does not drift", () => {
    const s = setup();
    s.drag(ON_T1, { x: 350, y: 250 }, 25);
    s.drop({ x: 350, y: 250 });
    expect(s.model.getElement("t1")).toMatchObject({ x: 328, y: 196 });
  });

  it("lands on the grid when the pipeline snaps", () => {
    const s = setup();
    s.controller.usePipeline("element.move", [snapToGrid(32)]);
    s.drag(ON_T1, { x: 167, y: 171 });
    s.drop({ x: 167, y: 171 });
    expect(s.model.getElement("t1")).toMatchObject({ x: 160, y: 128 });
  });

  it("does not move events, only elements, but still shows the selection", () => {
    const s = setup();
    s.drag(ON_CHEST, { x: 800, y: 700 });
    s.drop({ x: 800, y: 700 });
    expect(s.model.getEvent("chest-1")).toMatchObject({ x: 700, y: 600 });
    expect(s.selection()).toEqual([chest]);
  });

  describe("when the pipeline refuses where it would land", () => {
    const blocked = () => {
      const s = setup();
      s.controller.usePipeline("element.move", [requireFree()]);
      return s;
    };

    it("says so while dragging, with the reason, and does not move on release", () => {
      const s = blocked();
      s.drag(ON_T2, { x: 150, y: 150 }); // t2 onto t1
      expect(s.controller.state.get().drag).toMatchObject({ valid: false, reason: "occupied" });
      s.drop({ x: 150, y: 150 });
      expect(s.model.getElement("t2")).toMatchObject({ x: 256, y: 160 });
      expect(s.model.revision).toBe(0);
    });

    it("becomes valid again when the pointer moves to a free spot", () => {
      const s = blocked();
      s.drag(ON_T2, { x: 150, y: 150 });
      s.move({ x: 500, y: 100 });
      expect(s.controller.state.get().drag).toMatchObject({ valid: true });
      s.drop({ x: 500, y: 100 });
      expect(s.model.getElement("t2")?.x).toBe(256 + 220);
    });

    it("lets a selection drop onto the spots its own members leave", () => {
      const s = blocked();
      s.click(ON_T1);
      s.click(ON_T2, { shift: true });
      // shifts both by (128, 64): t1 lands exactly where t2 was, while t2 moves away
      s.drag(ON_T1, { x: 278, y: 214 });
      expect(s.controller.state.get().drag).toMatchObject({ valid: true });
      s.drop({ x: 278, y: 214 });
      expect(s.model.getElement("t1")).toMatchObject({ x: 256, y: 160 });
      expect(s.model.getElement("t2")).toMatchObject({ x: 384, y: 224 });
    });
  });
});

describe("dragging, live", () => {
  const live = () => setup({ drag: { live: true } });

  it("follows the pointer in the model as it goes", () => {
    const s = live();
    s.drag(ON_T1, { x: 250, y: 350 }, 4);
    expect(s.model.getElement("t1")).toMatchObject({ x: 228, y: 296 });
    expect(s.controller.state.get().drag).toMatchObject({ live: true, valid: true });
    s.drop({ x: 250, y: 350 });
    expect(s.controller.state.get().drag).toBeNull();
  });

  it("is a single undo step however many moves it made", () => {
    const s = live();
    s.drag(ON_T1, { x: 250, y: 350 }, 10);
    s.drop({ x: 250, y: 350 });
    expect(s.model.history.status.undoDepth).toBe(1);
    s.model.history.undo();
    expect(s.model.getElement("t1")).toMatchObject({ x: 128, y: 96 });
  });

  it("makes two drags of the same element two undo steps", () => {
    const s = live();
    s.drag(ON_T1, { x: 250, y: 350 }, 3);
    s.drop({ x: 250, y: 350 });
    s.drag({ x: 250, y: 350 }, { x: 300, y: 400 }, 3);
    s.drop({ x: 300, y: 400 });
    expect(s.model.history.status.undoDepth).toBe(2);
  });

  it("is taken back by Escape, in one step", () => {
    const s = live();
    s.drag(ON_T1, { x: 250, y: 350 }, 5);
    expect(s.controller.feedKey(key("Escape"))).toBe(true);
    expect(s.model.getElement("t1")).toMatchObject({ x: 128, y: 96 });
    expect(s.controller.state.get().drag).toBeNull();
    expect(s.model.history.canUndo).toBe(false);
  });

  it("does not apply a position the pipeline refuses", () => {
    const s = live();
    s.controller.usePipeline("element.move", [requireFree()]);
    s.drag(ON_T2, { x: 150, y: 150 }, 3);
    expect(s.model.getElement("t2")).not.toMatchObject({ x: 128, y: 96 });
    expect(s.controller.state.get().drag).toMatchObject({ valid: false });
  });
});

describe("keys", () => {
  it("Escape cancels a drag in preview mode, without touching the model", () => {
    const s = setup();
    s.drag(ON_T1, { x: 250, y: 350 });
    expect(s.controller.feedKey(key("Escape"))).toBe(true);
    expect(s.controller.state.get().drag).toBeNull();
    s.drop({ x: 250, y: 350 });
    expect(s.model.revision).toBe(0);
  });

  it("Escape cancels a rubber band", () => {
    const s = setup();
    s.down({ x: 100, y: 80 });
    s.move({ x: 300, y: 230 });
    s.controller.feedKey(key("Escape"));
    expect(s.controller.state.get().marquee).toBeNull();
  });

  it("Escape clears the selection, and says so only if there was one", () => {
    const s = setup();
    expect(s.controller.feedKey(key("Escape"))).toBe(false);
    s.click(ON_T1);
    expect(s.controller.feedKey(key("Escape"))).toBe(true);
    expect(s.selection()).toEqual([]);
  });

  it("Delete removes the selected elements as one undo step, when asked to", () => {
    const s = setup({ remove: true });
    s.click(ON_T1);
    s.click(ON_T2, { shift: true });
    expect(s.controller.feedKey(key("Delete"))).toBe(true);
    expect(s.model.getElement("t1")).toBeUndefined();
    expect(s.model.getElement("t2")).toBeUndefined();
    expect(s.model.history.status.undoDepth).toBe(1);
    expect(s.selection()).toEqual([]);
    s.model.history.undo();
    expect(s.model.getElement("t1")).toBeDefined();
  });

  it("Backspace works too, and a refusal of the pipeline keeps the elements", () => {
    const s = setup({ remove: true });
    s.controller.usePipeline("element.remove", [(_i, c) => c.reject("protected")]);
    s.click(ON_T1);
    s.controller.feedKey(key("Backspace"));
    expect(s.model.getElement("t1")).toBeDefined();
    expect(s.controller.state.get().lastRejection).toMatchObject({ reason: "protected" });
  });

  it("does not delete unless asked to, and ignores events", () => {
    const off = setup();
    off.click(ON_T1);
    expect(off.controller.feedKey(key("Delete"))).toBe(false);
    expect(off.model.getElement("t1")).toBeDefined();

    const on = setup({ remove: true });
    on.click(ON_CHEST);
    expect(on.controller.feedKey(key("Delete"))).toBe(false);
    expect(on.model.getEvent("chest-1")).toBeDefined();
  });

  it("does nothing for other keys", () => {
    expect(setup().controller.feedKey(key("a"))).toBe(false);
  });
});

describe("interrupting", () => {
  it("drops a drag in progress when the mode changes, undoing a live one", () => {
    const s = setup({ drag: { live: true } });
    s.drag(ON_T1, { x: 250, y: 350 }, 3);
    s.controller.setModes(["play"]);
    expect(s.model.getElement("t1")).toMatchObject({ x: 128, y: 96 });
    expect(s.controller.state.get().drag).toBeNull();
  });

  it("drops a drag whose element is removed meanwhile", () => {
    const s = setup();
    s.drag(ON_T1, { x: 250, y: 350 });
    s.model.apply({ type: "element.remove", id: "t1" });
    expect(s.controller.state.get().drag).toBeNull();
    expect(() => s.drop({ x: 250, y: 350 })).not.toThrow();
  });

  it("only works in its own modes", () => {
    const s = setup({ modes: ["inspect"] });
    expect(s.down(ON_T1)).toBe(false);
    expect(s.selection()).toEqual([]);
  });
});
