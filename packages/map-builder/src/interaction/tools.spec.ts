// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { pointer } from "./input";
import { selectionTool } from "./selection-tool";
import { hoverTool, playTool } from "./tools";
import { harness } from "./__fixtures__";

const ON_T1 = { x: 150, y: 150 };
const ON_CHEST = { x: 705, y: 605 };
const EMPTY = { x: 20, y: 20 };

describe("playTool", () => {
  const setup = (options: Partial<Parameters<typeof playTool>[0]> = {}, modes: readonly string[] = ["play"]) => {
    const onInteract = vi.fn();
    const h = harness({ modes });
    h.controller.addTool(playTool({ onInteract, ...options }));
    return { ...h, onInteract, click: (p: { x: number; y: number }, mods = {}) => h.controller.feedPointer("down", pointer(p.x, p.y, mods)) };
  };

  it("tells the game what was clicked: the target, its node and the input", () => {
    const s = setup();
    expect(s.click(ON_CHEST)).toBe(true);
    expect(s.onInteract).toHaveBeenCalledWith(
      { type: "event", id: "chest-1" },
      expect.objectContaining({ key: "events/chest-1", kind: "pickup" }),
      expect.objectContaining({ x: 705, y: 605 }),
      s.controller,
    );
  });

  it("does not react to clicks on nothing, nor to other buttons", () => {
    const s = setup();
    expect(s.click(EMPTY)).toBe(false);
    expect(s.controller.feedPointer("down", pointer(ON_CHEST.x, ON_CHEST.y, { button: 2 }))).toBe(false);
    expect(s.onInteract).not.toHaveBeenCalled();
  });

  it("only looks at events by default, and can look at elements too", () => {
    const s = setup();
    expect(s.click(ON_T1)).toBe(false);
    const both = setup({ types: ["element", "event"] });
    expect(both.click(ON_T1)).toBe(true);
    expect(both.onInteract).toHaveBeenCalledWith({ type: "element", id: "t1" }, expect.anything(), expect.anything(), expect.anything());
  });

  it("is a tool of the play mode only", () => {
    const s = setup({}, ["edit"]);
    expect(s.click(ON_CHEST)).toBe(false);
    expect(s.onInteract).not.toHaveBeenCalled();
  });
});

describe("hoverTool (the inspect mode)", () => {
  it("only tracks what is under the pointer, and never changes anything", () => {
    const h = harness({ modes: ["inspect"] });
    h.controller.addTool(hoverTool());
    h.controller.feedPointer("move", pointer(ON_T1.x, ON_T1.y));
    expect(h.controller.state.get().hovered).toEqual({ type: "element", id: "t1" });
    h.controller.feedPointer("move", pointer(EMPTY.x, EMPTY.y));
    expect(h.controller.state.get().hovered).toBeNull();
    expect(h.controller.feedPointer("down", pointer(ON_T1.x, ON_T1.y))).toBe(false);
    expect(h.controller.state.get().selection).toEqual([]);
    expect(h.model.revision).toBe(0);
  });

  it("forgets what it hovered when the mode ends", () => {
    const h = harness({ modes: ["inspect"] });
    h.controller.addTool(hoverTool());
    h.controller.feedPointer("move", pointer(ON_T1.x, ON_T1.y));
    h.controller.setModes(["play"]);
    expect(h.controller.state.get().hovered).toBeNull();
  });
});

describe("play and edit on the same scene", () => {
  /** The player plays; holding Alt turns the same click into editing. */
  function scene() {
    const h = harness({ modes: ["play", "edit"] });
    const interacted: string[] = [];
    h.controller.addTool(
      playTool({
        types: ["element", "event"],
        onInteract: (target) => void interacted.push(`${target.type}:${target.id}`),
        // a plain click plays, an Alt click is left to the editor
        when: (input) => !("modifiers" in input) || !input.modifiers.alt,
        priority: 10,
      }),
    );
    h.controller.addTool(selectionTool({ remove: true, when: (input) => "modifiers" in input && input.modifiers.alt }));
    const press = (p: { x: number; y: number }, mods = {}) => h.controller.feedPointer("down", pointer(p.x, p.y, mods));
    const release = (p: { x: number; y: number }, mods = {}) => h.controller.feedPointer("up", pointer(p.x, p.y, mods));
    return { ...h, interacted, press, release };
  }

  it("a plain click plays and leaves the selection alone", () => {
    const s = scene();
    s.press(ON_CHEST);
    s.release(ON_CHEST);
    expect(s.interacted).toEqual(["event:chest-1"]);
    expect(s.controller.state.get().selection).toEqual([]);
  });

  it("an Alt click edits instead, and does not play", () => {
    const s = scene();
    s.press(ON_T1, { alt: true });
    s.release(ON_T1, { alt: true });
    expect(s.interacted).toEqual([]);
    expect(s.controller.state.get().selection).toEqual([{ type: "element", id: "t1" }]);
  });

  it("the same element can be played and edited in turn, in one scene, one model", () => {
    const s = scene();
    // edit: drag the tree
    s.press(ON_T1, { alt: true });
    s.controller.feedPointer("move", pointer(250, 350, { alt: true }));
    s.release({ x: 250, y: 350 }, { alt: true });
    expect(s.model.getElement("t1")).toMatchObject({ x: 228, y: 296 });

    // play: click it where it is now
    s.press({ x: 250, y: 350 });
    s.release({ x: 250, y: 350 });
    expect(s.interacted).toEqual(["element:t1"]);
  });

  it("an edit can be undone like in an editor, while the game goes on", () => {
    const s = scene();
    s.press(ON_T1, { alt: true });
    s.controller.feedPointer("move", pointer(250, 350, { alt: true }));
    s.release({ x: 250, y: 350 }, { alt: true });
    s.press(ON_CHEST);
    s.release(ON_CHEST);
    s.model.history.undo();
    expect(s.model.getElement("t1")).toMatchObject({ x: 128, y: 96 });
    expect(s.interacted).toEqual(["event:chest-1"]);
  });

  it("switching modes turns editing off without touching the game", () => {
    const s = scene();
    s.controller.setModes(["play"]);
    s.press(ON_T1, { alt: true });
    expect(s.controller.state.get().selection).toEqual([]);
    s.press(ON_T1);
    expect(s.interacted).toEqual(["element:t1"]);
  });

  it("switching to edit only turns playing off", () => {
    const s = scene();
    s.controller.setModes(["edit"]);
    s.press(ON_CHEST); // no Alt, but play is off and selection is gated on Alt
    expect(s.interacted).toEqual([]);
    s.press(ON_CHEST, { alt: true });
    expect(s.controller.state.get().selection).toEqual([{ type: "event", id: "chest-1" }]);
  });
});
