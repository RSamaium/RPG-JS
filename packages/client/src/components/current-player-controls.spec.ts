import { signal, type ControlsDirective } from "canvasengine";
import { describe, expect, it, vi } from "vitest";
import { observeCurrentPlayerControls } from "./current-player-controls";

describe("current player controls effect lifetime", () => {
  it("stops publishing synchronously before asynchronous character removal", () => {
    const currentPlayer = signal(false);
    const controls = {} as ControlsDirective;
    const register = vi.fn();
    const subscription = observeCurrentPlayerControls(currentPlayer, controls, register);

    expect(register).not.toHaveBeenCalled();
    currentPlayer.set(true);
    expect(register).toHaveBeenCalledExactlyOnceWith(controls);

    // Called at the start of onBeforeDestroy, before removal hooks can yield.
    expect(() => subscription.unsubscribe()).not.toThrow();
    expect(subscription.closed).toBe(true);
    currentPlayer.set(false);
    currentPlayer.set(true);
    expect(register).toHaveBeenCalledOnce();
    // The later mount cleanup may dispose the same subscription again.
    expect(() => subscription.unsubscribe()).not.toThrow();
  });
});
