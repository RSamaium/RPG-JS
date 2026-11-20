import { describe, expect, it } from "vitest";
import { visualEffectTimeline } from "./fx-timeline";

describe("visualEffectTimeline", () => {
  it("starts at once without a delay, and plays each sound at its start", () => {
    expect(visualEffectTimeline({ sounds: [{ sound: "whoosh" }, { sound: "boom", start: 300, volume: 0.5 }] })).toEqual({
      startsAt: 0,
      events: [
        { kind: "sound", at: 0, sound: "whoosh", volume: 1 },
        { kind: "sound", at: 300, sound: "boom", volume: 0.5 },
      ],
    });
  });

  it("shifts the particles and the sounds by the delay, and leaves out what is not a sound", () => {
    expect(visualEffectTimeline({ delay: 200, sounds: [{ sound: "boom", start: 100, volume: 3 }, { sound: "" } as any, null as any] })).toEqual({
      startsAt: 200,
      events: [
        { kind: "start", at: 200 },
        { kind: "sound", at: 300, sound: "boom", volume: 1 },
      ],
    });
  });
});
