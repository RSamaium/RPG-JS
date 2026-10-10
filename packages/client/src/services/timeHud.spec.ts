import { describe, expect, test } from "vitest";
import { DEFAULT_TIME_CALENDAR, elapsedMinutesToTimeState, type TimeSnapshot } from "@rpgjs/common";
import { bodyAt, buildHudView, darkness, resolveHudOptions, skyColors } from "./timeHud";

const stateAt = (hour: number, patch: Partial<TimeSnapshot> = {}) =>
  elapsedMinutesToTimeState({
    elapsedMinutes: hour * 60,
    scale: 60,
    paused: false,
    serverTimestamp: 0,
    calendar: { ...DEFAULT_TIME_CALENDAR },
    ...patch,
  });

describe("time hud", () => {
  test("the sky is bright at noon and dark at midnight", () => {
    expect(skyColors(12)).toMatchObject({ top: "#3f8fe0", horizon: "#bfe3ff" });
    expect(skyColors(0)).toMatchObject({ top: "#0a1233", horizon: "#1c2b5e" });
    expect(skyColors(24)).toEqual(skyColors(0));
  });

  test("the sky colors blend between two hours", () => {
    const dawn = skyColors(8);
    expect(dawn.top).not.toBe(skyColors(7).top);
    expect(dawn.top).not.toBe(skyColors(9).top);
  });

  test("the stars show with the darkness", () => {
    expect(darkness(23, "night")).toBe(1);
    expect(darkness(12, "day")).toBe(0);
    expect(darkness(6.25, "dawn")).toBeCloseTo(0.5);
    expect(darkness(19, "dusk")).toBeCloseTo(0.5);
  });

  test("the sun crosses the sky from the left at 6:00 to the right at 18:00", () => {
    expect(bodyAt(6, false)).toMatchObject({ visible: true });
    expect(bodyAt(6, false).x).toBeLessThan(0.1);
    expect(bodyAt(12, false).y).toBeCloseTo(0.28);
    expect(bodyAt(18, false).x).toBeGreaterThan(0.9);
    expect(bodyAt(22, false).visible).toBe(false);
  });

  test("the moon takes over 12 hours later", () => {
    expect(bodyAt(12, true).visible).toBe(false);
    expect(bodyAt(0, true).visible).toBe(true);
    expect(bodyAt(0, true).y).toBeCloseTo(0.28);
  });

  test("builds what the clock shows", () => {
    const view = buildHudView(stateAt(14.5), resolveHudOptions(true));
    expect(view).toMatchObject({ phase: "day", clock: "14:30", day: 1, badge: "", position: "top-right", size: "default" });
    expect(view.style).toContain("--rpg-ui-clock-sky-top:#3f8fe0");
    expect(view.style).toContain("--rpg-ui-clock-sun-opacity:1");
    expect(view.style).toContain("--rpg-ui-clock-moon-opacity:0");
    expect(buildHudView(stateAt(2 + 24 * 2), resolveHudOptions(true)).day).toBe(3);
  });

  test("shows the paused badge, and the fast one from a scale", () => {
    expect(buildHudView(stateAt(8, { paused: true }), resolveHudOptions(true)).badge).toBe("paused");
    expect(buildHudView(stateAt(8, { scale: 2000 }), resolveHudOptions({ fastScale: 1000 })).badge).toBe("fast");
    expect(buildHudView(stateAt(8, { scale: 10 }), resolveHudOptions({ fastScale: 1000 })).badge).toBe("");
  });

  test("takes the position and the size from the options", () => {
    expect(resolveHudOptions({ position: "bottom-left", size: "compact" })).toMatchObject({ position: "bottom-left", size: "compact" });
    expect(resolveHudOptions(undefined)).toMatchObject({ position: "top-right", size: "default" });
  });
});
