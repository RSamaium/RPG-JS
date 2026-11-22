import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnimationPool } from "../client/animation-pool";

describe("animations of the skills played in the scene", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const pool = () => {
    let items: unknown[] = [];
    const animations = new AnimationPool((next) => (items = next));
    return { animations, items: () => items };
  };

  it("adds a sprite animation where it hits, and takes it away when it ends", () => {
    const { animations, items } = pool();

    const key = animations.play("anim-media", 120, 80, 1.5);

    expect(items()).toEqual([{ key, sheet: "anim-media", x: 120, y: 80, scale: 1.5 }]);
    animations.end(key);
    expect(items()).toEqual([]);
  });

  it("plays several at once, one for each target, each ending on its own", () => {
    const { animations, items } = pool();
    const first = animations.play("a", 0, 0, 1);
    const second = animations.play("a", 50, 0, 1);

    expect((items() as Array<{ key: number }>).map((a) => a.key)).toEqual([first, second]);
    animations.end(first);
    expect((items() as Array<{ key: number }>).map((a) => a.key)).toEqual([second]);
  });

  it("never stays on the screen when the animation does not tell it ended", () => {
    const { animations, items } = pool();
    animations.play("a", 0, 0, 1);

    vi.advanceTimersByTime(5000);

    expect(items()).toEqual([]);
  });

  it("is cleared all at once, and a late end of an animation that is gone changes nothing", () => {
    const { animations, items } = pool();
    const key = animations.play("a", 0, 0, 1);
    animations.play("b", 0, 0, 1);

    animations.clear();
    expect(items()).toEqual([]);
    animations.end(key);
    vi.advanceTimersByTime(5000);
    expect(items()).toEqual([]);
  });
});
