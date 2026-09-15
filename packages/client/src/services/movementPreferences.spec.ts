import { describe, expect, it, vi } from "vitest";
import { createMovementPreferences, movementPreferences } from "./movementPreferences";

const defaults = () => ({ up: ["up", "w"], down: "down", left: "left", right: "right", action: { bind: "space" }, dash: "shift", escape: "escape" });
const memory = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
};
describe("movement preferences", () => {
  it("persists Action and Back while preserving action payload and resolver", () => {
    const storage = memory();
    const data = () => ({ skillId: "slash" });
    const config = { ...defaults(), action: { bind: "space", action: "skill", data } };
    const prefs = createMovementPreferences(config, "actions", storage);
    expect(prefs.assign("action", "e")).toBe(true);
    expect(config.action).toEqual({ bind: "e", action: "skill", data });
    expect(prefs.assign("escape", "r")).toBe(true);
    expect(prefs.assign("left", "r")).toBe(false);
    const restored = createMovementPreferences(defaults(), "actions", storage);
    expect(restored.bindings()).toMatchObject({ action: "e", escape: "r" });
    expect(prefs.assign("action", "enter")).toBe(true);
    expect(prefs.assign("escape", "escape")).toBe(true);
    prefs.reset();
    expect(config.action).toEqual({ bind: "space", action: "skill", data });
    expect(config.escape).toBe("escape");
  });
  it("refreshes the existing live keyboard without replacing action callbacks", () => {
    const keyDown = vi.fn();
    const setInputs = vi.fn();
    const active = { options: { left: { bind: "left", keyDown }, action: { bind: "space", keyDown } }, keyboard: { setInputs } };
    const engine = { globalConfig: { keyboardControls: defaults(), projectId: "live-movement-test" }, activeKeyboardControls: () => active };
    const prefs = movementPreferences(engine as any);
    prefs.assign("left", "q");
    expect(setInputs).toHaveBeenLastCalledWith({ left: { bind: "q", keyDown }, action: { bind: "space", keyDown } });
    prefs.reset();
    expect(setInputs).toHaveBeenLastCalledWith({ left: { bind: "left", keyDown }, action: { bind: "space", keyDown } });
  });
  it("updates live controls and restores partial overrides without losing default arrays", () => {
    const storage = memory();
    const config = defaults();
    const apply = vi.fn();
    const prefs = createMovementPreferences(config, "a", storage, apply);
    expect(prefs.assign("left", "q")).toBe(true);
    expect(config.left).toBe("q");
    expect(apply).toHaveBeenLastCalledWith(expect.objectContaining({ left: "q" }));
    expect(createMovementPreferences(defaults(), "a", storage).bindings().left).toBe("q");
    expect(createMovementPreferences(defaults(), "b", storage).bindings().left).toBe("left");
    prefs.reset();
    expect(apply).toHaveBeenLastCalledWith(expect.objectContaining({ left: "left" }));
    expect(prefs.bindings().up).toEqual(["up", "w"]);
    expect(createMovementPreferences(defaults(), "a", storage).bindings().left).toBe("left");
  });
  it("rejects duplicates, reserved actions and unsupported keys", () => {
    const prefs = createMovementPreferences({ ...defaults(), action: { bind: ["e", 32] } }, "a");
    for (const key of ["w", "up", "e", "space", "1", "escape", "control"]) expect(prefs.assign("left", key)).toBe(false);
    expect(prefs.assign("left", "q")).toBe(true);
  });
  it("survives corrupt or inaccessible storage", () => {
    const storage = { getItem() { return "not json"; }, setItem() { throw Error(); }, removeItem() { throw Error(); } };
    const prefs = createMovementPreferences(defaults(), "a", storage);
    expect(prefs.assign("left", "q")).toBe(true);
    expect(() => prefs.reset()).not.toThrow();
  });
});
