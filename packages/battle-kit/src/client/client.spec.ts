import { describe, expect, it, vi } from "vitest";
import type { RpgClientEngine } from "@rpgjs/client";
import { BattleCues, battleControls } from "../index";

const engine = (keyboardControls: Record<string, unknown> = {}, playSound = vi.fn()) =>
  ({ globalConfig: { keyboardControls }, playSound }) as unknown as RpgClientEngine;

describe("battle controls (client)", () => {
  it("binds the commands to the keyboard controls of the game and the shared gamepad mapping", () => {
    const confirm = vi.fn();
    const endTurn = vi.fn();
    const controls = battleControls(engine({ up: "z", action: "enter", escape: "escape" }), {
      up: () => {},
      action: confirm,
      extra: { endTurn: { bind: "e", button: 3, keyDown: endTurn } },
    }) as Record<string, any>;

    expect(controls.up).toMatchObject({ bind: "z", repeat: true });
    expect(controls.action.bind).toBe("enter");
    expect(controls.escape).toBeUndefined(); // no handler, no control
    expect(controls.gamepad.buttonMapping).toMatchObject({ button_0: "action", button_1: "escape", button_9: "escape", button_3: "endTurn" });
    controls.action.keyDown();
    controls.endTurn.keyDown();
    expect(confirm).toHaveBeenCalledOnce();
    expect(endTurn).toHaveBeenCalledOnce();
  });

  it("leaves the keys to another GUI while paused", () => {
    const confirm = vi.fn();
    let paused = true;
    const controls = battleControls(engine(), { action: confirm, paused: () => paused }) as Record<string, any>;
    controls.action.keyDown();
    expect(confirm).not.toHaveBeenCalled();
    paused = false;
    controls.action.keyDown();
    expect(confirm).toHaveBeenCalledOnce();
  });
});

describe("battle cues (client)", () => {
  it("plays the sound of the game, a function, silence, or the synthesized one", () => {
    const synth = { hit: vi.fn(), cursor: vi.fn(), back: vi.fn() };
    const playSound = vi.fn(() => Promise.resolve());
    const custom = vi.fn();
    const cues = new BattleCues(synth);
    cues.configure(engine({}, playSound), { sounds: { hit: "sword-hit", cursor: custom, back: false } });

    cues.play("hit", 0.5);
    cues.play("cursor");
    cues.play("back");
    expect(playSound).toHaveBeenCalledWith("sword-hit", { volume: 0.5, channel: "sfx" });
    expect(custom).toHaveBeenCalledOnce();
    expect(synth.back).not.toHaveBeenCalled();

    cues.configure(engine({}, playSound));
    cues.play("hit");
    expect(synth.hit).toHaveBeenCalledWith(1);
    cues.muted = true;
    cues.play("hit");
    expect(synth.hit).toHaveBeenCalledOnce();
    expect(cues.playSound("boom")).toBe(false);
  });
});
