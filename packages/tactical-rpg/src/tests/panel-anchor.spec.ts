import { describe, it, expect } from "vitest";
import { panelPlacement } from "../client/panel-anchor";

const px = (style: string, name: string) => Number(new RegExp(`${name}:(-?\\d+)px`).exec(style)?.[1]);
const wide = { width: 1568, height: 770 };

describe("where the skill and item menus open", () => {
  it("opens beside the unit, on its right, like the menu of actions", () => {
    const style = panelPlacement({ x: 600, y: 520 }, wide);
    expect(px(style, "left")).toBe(600);
    expect(px(style, "width")).toBe(420);
  });

  it("flips to the left of the unit near the right edge", () => {
    const left = px(panelPlacement({ x: 1400, y: 300 }, wide), "left");
    expect(left + 420).toBeLessThanOrEqual(1400 - 76 + 1);
    expect(left).toBeGreaterThanOrEqual(12);
  });

  it("never covers the dock at the bottom, nor the bar at the top", () => {
    const style = panelPlacement({ x: 600, y: 740 }, wide);
    expect(px(style, "bottom")).toBeGreaterThanOrEqual(130);
    const top = wide.height - px(style, "bottom") - px(style, "max-height");
    expect(top).toBeGreaterThanOrEqual(64 - 1);
  });

  it("follows the unit up the screen", () => {
    expect(px(panelPlacement({ x: 600, y: 200 }, wide), "bottom")).toBeGreaterThan(px(panelPlacement({ x: 600, y: 500 }, wide), "bottom"));
  });

  it("leaves a narrow screen to the sheet, and a missing unit too", () => {
    expect(panelPlacement({ x: 100, y: 300 }, { width: 600, height: 800 })).toBe("");
    expect(panelPlacement(null, wide)).toBe("");
  });
});
