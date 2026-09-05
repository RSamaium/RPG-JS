import { ControlsDirective, signal, type Element } from "canvasengine";
import { describe, expect, it, vi } from "vitest";
import { RpgClientEngine } from "./RpgClientEngine";

function createControls() {
  const element = {
    props: { controls: { down: { bind: "down", keyDown: vi.fn() } } },
    propObservables: {},
  } as unknown as Element;
  const controls = new ControlsDirective();
  controls.onInit(element);
  return { controls, destroy: () => controls.onDestroy(element) };
}

describe("RpgClientEngine controls", () => {
  it("does not let a retired character overwrite replacement controls", () => {
    const engine = Object.create(RpgClientEngine.prototype) as RpgClientEngine;
    engine.context = { values: {} } as any;
    engine.controlsReady = signal<boolean | undefined>(undefined);
    engine.activeKeyboardControls = signal<ControlsDirective | null>(null);
    const first = createControls();
    const replacement = createControls();

    try {
      engine.setKeyboardControls(first.controls);
      first.destroy();
      engine.setKeyboardControls(replacement.controls);

      // A retiring character effect can run again while streamed layers change.
      engine.setKeyboardControls(first.controls);

      expect(engine.activeKeyboardControls()).toBe(replacement.controls);
      expect(engine.context.values["inject:KeyboardControls"].values.get("__default__"))
        .toBe(replacement.controls);
      expect(engine.controlsReady()).toBe(true);
    } finally {
      first.destroy();
      replacement.destroy();
    }
  });
});
