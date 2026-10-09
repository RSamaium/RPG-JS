import { afterEach, describe, expect, it, vi } from "vitest";
import { guiTransition, lockGuiInput } from "./lifecycle";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("GUI lifecycle", () => {
  it("keeps nested GUIs locked through the closing key event", () => {
    vi.useFakeTimers();
    const host = { stopProcessingInput: false };
    const closeShop = lockGuiInput(host);
    const closeDialog = lockGuiInput(host);
    closeDialog(); closeDialog(); vi.advanceTimersByTime(50);
    expect(host.stopProcessingInput).toBe(true);
    closeShop(); expect(host.stopProcessingInput).toBe(true);
    vi.advanceTimersByTime(50);
    expect(host.stopProcessingInput).toBe(false);
  });
  it("preserves an existing lock", () => {
    vi.useFakeTimers(); const host = { stopProcessingInput: true };
    lockGuiInput(host)(); vi.runAllTimers(); expect(host.stopProcessingInput).toBe(true);
  });
  it("finishes once after the exit animation", () => {
    vi.useFakeTimers(); const transition = guiTransition(); const finish = vi.fn();
    transition.finish(finish); transition.finish(finish);
    expect(transition.closing()).toBe(true); expect(finish).not.toHaveBeenCalled();
    vi.advanceTimersByTime(180); expect(finish).toHaveBeenCalledTimes(1);
  });
  it("disposes pending callbacks and respects reduced motion", () => {
    vi.useFakeTimers(); vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const finish = vi.fn(); const transition = guiTransition();
    transition.finish(finish); vi.advanceTimersByTime(0); expect(finish).toHaveBeenCalledTimes(1);
    const disposed = guiTransition(); disposed.finish(finish); disposed.dispose();
    vi.runAllTimers(); expect(finish).toHaveBeenCalledTimes(1);
  });
});
