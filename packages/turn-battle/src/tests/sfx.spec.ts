import { afterEach, describe, expect, it, vi } from "vitest";
import type { RpgClientEngine } from "@rpgjs/client";
import { cues, sfx, sfxSound } from "../client/sfx";

const engine = () => ({ playSound: vi.fn(() => Promise.resolve()) }) as unknown as RpgClientEngine & { playSound: ReturnType<typeof vi.fn> };

describe("turn battle cues", () => {
  afterEach(() => cues.configure(undefined));

  it("plays the sound the game gives a cue, on the sfx channel", () => {
    const e = engine();
    cues.configure(e, { sounds: { hit: "my-hit", back: false } });
    sfx("hit", 0.7);
    sfx("back");
    expect(e.playSound).toHaveBeenCalledWith("my-hit", { volume: 0.7, channel: "sfx" });
    expect(e.playSound).toHaveBeenCalledOnce();
  });

  it("plays the sound an effect chose, and tells when nothing was played", () => {
    const e = engine();
    cues.configure(e);
    expect(sfxSound("cast-id", 0.5)).toBe(true);
    expect(e.playSound).toHaveBeenCalledWith("cast-id", { volume: 0.5, channel: "sfx" });
    cues.configure(e, { muted: true });
    expect(sfxSound("cast-id")).toBe(false);
  });

  it("never breaks the battle without WebAudio", () => {
    cues.configure(undefined);
    expect(() => sfx("victory")).not.toThrow();
  });
});
