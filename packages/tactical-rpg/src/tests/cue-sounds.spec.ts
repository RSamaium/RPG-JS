// canvasengine reads `window` when it loads and the project has no DOM test environment: a minimal one is enough here.
vi.hoisted(() => {
  const target = globalThis as Record<string, unknown>;
  target.window ??= Object.assign(globalThis, { addEventListener() {}, removeEventListener() {} });
  target.navigator ??= { getGamepads: () => [] };
});
import { describe, it, expect, vi } from "vitest";
import { cues, sound, cue } from "../client/state";

describe("the sounds of the cues of the interface", () => {
  it("plays the sound of the game chosen for a cue, on the sfx channel", () => {
    const played: [string, unknown][] = [];
    cues.configure({ playSound: async (id: string, options: unknown) => void played.push([id, options]) } as never, {
      sounds: { select: "ui-select", confirm: "ui-confirm" },
    });
    sound.set(true);

    cue("select");
    cue("confirm");

    expect(played).toEqual([["ui-select", { volume: 1, channel: "sfx" }], ["ui-confirm", { volume: 1, channel: "sfx" }]]);

    // The sound of the HUD turned off: no cue.
    sound.set(false);
    cue("select");
    expect(played).toHaveLength(2);
  });
});
