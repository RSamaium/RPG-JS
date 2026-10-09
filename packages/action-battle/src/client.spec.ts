import { afterEach, describe, expect, test, vi } from "vitest";
import { createActionBattleClient } from "./client";

describe("action battle client attack recovery", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("releases gameplay controls without interrupting a temporary attack animation", () => {
    vi.useFakeTimers();
    const resetAnimationState = vi.fn();
    const setAnimationName = vi.fn();
    const player = {
      animationFixed: false,
      canMove: true,
      directionFixed: false,
      getDirection: () => "down",
      changeDirection: vi.fn(),
      resetAnimationState,
      animationName: {
        set: setAnimationName,
      },
    };
    const engine = {
      scene: {
        getCurrentPlayer: () => player,
      },
      interruptCurrentPlayerMovement: vi.fn(),
    };
    const client = createActionBattleClient({
      attack: {
        lockDurationMs: 350,
      },
      visual: () => {},
      ui: {
        attackPreview: {
          enabled: false,
        },
      },
    });

    (client.engine?.onInput as any)(engine, {
      input: "action",
      data: {
        direction: "down",
      },
    });

    expect(player.animationFixed).toBe(true);

    vi.advanceTimersByTime(350);

    expect(player.animationFixed).toBe(false);
    expect(resetAnimationState).not.toHaveBeenCalled();
    expect(setAnimationName).not.toHaveBeenCalledWith("stand");
  });
});
