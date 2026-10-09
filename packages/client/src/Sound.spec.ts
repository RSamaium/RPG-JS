import { describe, expect, it, vi } from "vitest";
import { RpgSound } from "./Sound";

describe("RpgSound global compatibility", () => {
  it("routes the legacy global volume facade through the master channel", () => {
    const engine = {
      getSoundVolume: vi.fn(() => 0.75),
      setSoundVolume: vi.fn(),
    };
    RpgSound.init(engine as any);

    expect(RpgSound.global.volume()).toBe(0.75);
    RpgSound.global.volume(0.4);

    expect(engine.setSoundVolume).toHaveBeenCalledWith("master", 0.4);
  });
});
