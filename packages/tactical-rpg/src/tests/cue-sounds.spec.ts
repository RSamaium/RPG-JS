// canvasengine reads `window` when it loads and the project has no DOM test environment: a minimal one is enough here.
vi.hoisted(() => {
  const target = globalThis as Record<string, unknown>;
  target.window ??= Object.assign(globalThis, { addEventListener() {}, removeEventListener() {} });
  target.navigator ??= { getGamepads: () => [] };
});
import { describe, it, expect, vi } from "vitest";
import { CUE_SOUNDS, sound, connectEngine, cue } from "../client/state";

describe("the sounds of the cues of the interface", () => {
  it("plays the sound of the game chosen for a cue, on the sfx channel", () => {
    const played: [string, unknown][] = [];
    connectEngine({ playSound: async (id: string, options: unknown) => void played.push([id, options]) } as never);
    sound.set(true);
    Object.assign(CUE_SOUNDS, { select: "ui-select", confirm: "ui-confirm" });

    cue("select");
    cue("confirm");

    expect(played).toEqual([["ui-select", { channel: "sfx" }], ["ui-confirm", { channel: "sfx" }]]);
  });
});
