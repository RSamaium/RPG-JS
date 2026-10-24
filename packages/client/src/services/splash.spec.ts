// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  dismissStartupSplash,
  hasStartupSplash,
  setStartupSplashLabel,
} from "./splash";

const mountSplash = () => {
  document.body.innerHTML =
    '<div id="rpg-splash"><p data-rpg-splash-label></p></div>';
  return document.getElementById("rpg-splash")!;
};

describe("startup splash", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  test("does nothing when the page has no splash", () => {
    expect(hasStartupSplash()).toBe(false);
    expect(() => setStartupSplashLabel("Loading")).not.toThrow();
    expect(() => dismissStartupSplash()).not.toThrow();
  });

  test("fills the label", () => {
    const splash = mountSplash();
    setStartupSplashLabel("Loading area…");
    expect(splash.querySelector("[data-rpg-splash-label]")!.textContent).toBe("Loading area…");
  });

  test("fades out, then removes the splash", () => {
    vi.useFakeTimers();
    const splash = mountSplash();
    expect(hasStartupSplash()).toBe(true);

    dismissStartupSplash();
    expect(splash.dataset.leaving).toBe("true");
    expect(hasStartupSplash()).toBe(false);
    expect(document.getElementById("rpg-splash")).not.toBeNull();

    vi.advanceTimersByTime(1000);
    expect(document.getElementById("rpg-splash")).toBeNull();
  });

  test("removes the splash when its fade ends", () => {
    mountSplash();
    dismissStartupSplash();
    document.getElementById("rpg-splash")!.dispatchEvent(new Event("transitionend"));
    expect(document.getElementById("rpg-splash")).toBeNull();
  });
});
