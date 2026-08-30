import { signal } from "canvasengine";
import { describe, expect, it, vi } from "vitest";
import { RpgClientEngine } from "./RpgClientEngine";

describe("RpgClientEngine controls", () => {
  it("publishes replacement controls when the current player is remounted", () => {
    const engine = Object.create(RpgClientEngine.prototype) as RpgClientEngine;
    engine.context = { values: {} } as any;
    engine.controlsReady = { set: vi.fn() } as any;
    engine.activeKeyboardControls = signal<any>(null);
    const firstControls = { applyControl: vi.fn() };
    const replacementControls = { applyControl: vi.fn() };

    engine.setKeyboardControls(firstControls);
    engine.setKeyboardControls(replacementControls);

    expect(engine.activeKeyboardControls()).toBe(replacementControls);
    expect(engine.context.values["inject:KeyboardControls"].values.get("__default__"))
      .toBe(replacementControls);
  });
});
