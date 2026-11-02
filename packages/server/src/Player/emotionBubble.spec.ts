import { describe, expect, it, vi } from "vitest";
import { RpgPlayer } from "./Player";

describe("showEmotionBubble", () => {
  it("sends the emotion and options as a component animation", () => {
    const showComponentAnimation = vi.fn();
    RpgPlayer.prototype.showEmotionBubble.call({ showComponentAnimation }, "like", { size: 3 });
    expect(showComponentAnimation).toHaveBeenCalledWith("emotion-bubble", {
      size: 3,
      emotion: "like",
    });
  });
});
