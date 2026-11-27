import { describe, expect, it } from "vitest";
import { ScreenFilters } from "./look";

describe("screen filters of a battle", () => {
  it("give a container only the effects playing: none at rest, so no filter pass", () => {
    const screen = new ScreenFilters();
    expect(screen.active).toEqual([]);
    expect(screen.changed([])).toBe(false);

    screen.zoomBlur(0.2, 100, 100);
    expect(screen.active).toHaveLength(1);
    expect(screen.changed([])).toBe(true);
    const shown = screen.active;
    expect(screen.changed(shown)).toBe(false);

    screen.chromatic(2);
    expect(screen.active).toHaveLength(2);
    expect(screen.changed(shown)).toBe(true);

    screen.zoomBlur(0, 0, 0).chromatic(0);
    expect(screen.active).toEqual([]);
  });
});
