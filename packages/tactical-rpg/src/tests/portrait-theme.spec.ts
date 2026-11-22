import { describe, it, expect } from "vitest";
import { portraitStyle } from "../client/portraits";
import type { Unit } from "../core/types";

const unit = (team: "ally" | "enemy") => ({ team }) as Unit;

describe("portrait of a unit without an image", () => {
  it("is painted with the colours of the theme of the game", () => {
    for (const team of ["ally", "enemy"] as const) {
      const style = portraitStyle(unit(team));
      expect(style).toContain("var(--rpg-ui-bg");
      expect(style).not.toMatch(/#[0-9a-f]{6}(?![^(]*\))/i);
    }
    expect(portraitStyle(unit("enemy"))).toContain("var(--rpg-ui-danger");
    expect(portraitStyle(unit("ally"))).toContain("var(--rpg-ui-accent");
  });
});
