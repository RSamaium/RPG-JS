// canvasengine reads `window` when it loads and the project has no DOM test environment: a minimal one is enough here.
vi.hoisted(() => {
  const target = globalThis as Record<string, unknown>;
  target.window ??= Object.assign(globalThis, { addEventListener() {}, removeEventListener() {} });
});
import { describe, it, expect, vi, afterEach } from "vitest";
import { battlerFaces, faceFrame, portraitStyle } from "../client/portraits";
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

describe("portrait of a unit drawn from its character of the map", () => {
  afterEach(() => battlerFaces.set({}));
  const hero = { team: "ally", battler: "hero" } as Unit;

  it("is the character of its battler when the unit has no portrait", () => {
    battlerFaces.set({ hero: "data:image/png;base64,AAA" });
    const style = portraitStyle(hero);
    expect(style).toContain('url("data:image/png;base64,AAA")');
    expect(style).toContain("image-rendering:pixelated");
  });

  it("leaves the place to the portrait the unit has", () => {
    battlerFaces.set({ hero: "data:image/png;base64,AAA" });
    expect(portraitStyle({ ...hero, portrait: "/faces/aria.png" } as Unit)).toContain("/faces/aria.png");
  });

  it("shows the standing frame facing down of a map spritesheet", () => {
    // As Presets.RMSpritesheet(3, 4): standing is the middle column, facing down the first row.
    const stand = { animations: ({ direction }: { direction: string }) => [[{ time: 0, frameX: 1, frameY: direction === "down" ? 0 : 2 }]] };
    expect(faceFrame({ textures: { stand } })).toEqual({ x: 1, y: 0 });
  });

  it("falls back on walking, then on the first frame of the sheet", () => {
    const walk = { animations: () => [[{ time: 0, frameX: 0, frameY: 0 }, { time: 10, frameX: 1, frameY: 0 }]] };
    expect(faceFrame({ textures: { walk } })).toEqual({ x: 0, y: 0 });
    expect(faceFrame({})).toEqual({ x: 0, y: 0 });
  });
});
