import { describe, expect, it } from "vitest";
import {
  CAPPED_PARTICLE_SHARE,
  DEFAULT_EFFECT_MAX_PARTICLES,
  DEFAULT_MAX_LOOPING_EFFECTS,
  VISUAL_EFFECT_KEEP_MARGIN,
  VISUAL_EFFECT_SPAWN_MARGIN,
  normalizeElementVisualEffect,
  selectLiveVisualEffects,
  type ElementVisualEffectCandidate,
} from "./element-visual-effects";
import { resolveStudioElementVisualEffect } from "./studio-element-renderer";

const viewport = { x: 0, y: 0, width: 800, height: 600 };
const torch = (key: string, x: number, y: number): ElementVisualEffectCandidate => ({ key, id: "flame", x, y, zIndex: y });

describe("normalizeElementVisualEffect", () => {
  it("keeps an id, the anchor and the resolved effect", () => {
    expect(normalizeElementVisualEffect({ id: "flame", x: 10.4, y: 20, effect: { maxParticles: 50 } }, { width: 48, height: 96 }))
      .toEqual({ id: "flame", x: 10, y: 20, effect: { maxParticles: 50 } });
  });

  it("anchors in the middle of the element by default", () => {
    expect(normalizeElementVisualEffect({ id: "smoke" }, { width: 48, height: 96 })).toEqual({ id: "smoke", x: 24, y: 48 });
  });

  it("refuses what has no id", () => {
    expect(normalizeElementVisualEffect(null, { width: 1, height: 1 })).toBeNull();
    expect(normalizeElementVisualEffect({ id: "  " }, { width: 1, height: 1 })).toBeNull();
    expect(normalizeElementVisualEffect({ x: 1 }, { width: 1, height: 1 })).toBeNull();
  });
});

describe("selectLiveVisualEffects", () => {
  it("spawns nothing for an element out of sight", () => {
    const { live } = selectLiveVisualEffects([torch("far", 5000, 5000)], viewport);

    expect(live).toEqual([]);
  });

  it("spawns an effect inside the viewport and inside the margin", () => {
    const { live } = selectLiveVisualEffects([torch("in", 400, 300), torch("edge", 800 + VISUAL_EFFECT_SPAWN_MARGIN - 1, 300)], viewport);

    expect(live.map((fx) => fx.key)).toEqual(["in", "edge"]);
  });

  it("keeps an effect alive in the keep margin and destroys it beyond", () => {
    const x = 800 + VISUAL_EFFECT_SPAWN_MARGIN + 50;
    const candidate = torch("edge", x, 300);

    expect(selectLiveVisualEffects([candidate], viewport).live).toEqual([]);
    expect(selectLiveVisualEffects([candidate], viewport, new Set(["edge"])).live).toHaveLength(1);
    expect(selectLiveVisualEffects([torch("gone", 800 + VISUAL_EFFECT_KEEP_MARGIN + 1, 300)], viewport, new Set(["gone"])).live).toEqual([]);
  });

  it("is empty when the viewport is not known", () => {
    expect(selectLiveVisualEffects([torch("a", 0, 0)], null).live).toEqual([]);
  });

  it("never exceeds the cap, the nearest to the center win, and the ones alive keep their place", () => {
    const candidates = Array.from({ length: 10 }, (_, i) => torch(`t${i}`, 40 + i * 70, 300));

    const first = selectLiveVisualEffects(candidates, viewport, new Set(), { cap: 3 });
    expect(first.live).toHaveLength(3);
    expect(first.live.map((fx) => fx.key)).toEqual(["t5", "t6", "t4"]);

    const next = selectLiveVisualEffects(candidates, viewport, new Set(["t0", "t1", "t2"]), { cap: 3 });
    expect(next.live.map((fx) => fx.key).sort()).toEqual(["t0", "t1", "t2"]);
  });

  it("lowers the particles while the cap is reached", () => {
    const candidates = [torch("a", 100, 100), torch("b", 200, 100), { ...torch("c", 300, 100), effect: { maxParticles: 100 } }];

    const capped = selectLiveVisualEffects(candidates, viewport, new Set(), { cap: 2 });
    expect(capped.capped).toBe(true);
    // the two nearest to the center, "c" (own budget of 100) then "b"
    expect(capped.live.map((fx) => fx.maxParticles)).toEqual([Math.round(100 * CAPPED_PARTICLE_SHARE), Math.round(DEFAULT_EFFECT_MAX_PARTICLES * CAPPED_PARTICLE_SHARE)]);

    const free = selectLiveVisualEffects(candidates, viewport, new Set(), { cap: 10 });
    expect(free.capped).toBe(false);
    expect(free.live.map((fx) => fx.maxParticles)).toEqual([100, DEFAULT_EFFECT_MAX_PARTICLES, DEFAULT_EFFECT_MAX_PARTICLES]);
  });

  it("has a sensible default cap", () => {
    const many = Array.from({ length: 100 }, (_, i) => torch(`t${i}`, (i % 10) * 70, Math.floor(i / 10) * 50));

    expect(selectLiveVisualEffects(many, viewport).live).toHaveLength(DEFAULT_MAX_LOOPING_EFFECTS);
  });
});

describe("resolveStudioElementVisualEffect", () => {
  const element = (visualEffect: unknown) => ({
    id: "torch-1",
    image: "tileset.png",
    rect: [0, 0, 48, 96],
    drawIn: [96, 192, 48, 96],
    visualEffect,
  });

  it("places the effect on the map from the anchor local to the element", () => {
    const placed = resolveStudioElementVisualEffect(element({ id: "flame", x: 24, y: 10 }));

    expect(placed).toMatchObject({ id: "flame", x: 96 + 24, y: 192 + 10 });
    expect(placed?.key).toContain("torch-1");
  });

  it("returns null for an element without an effect", () => {
    expect(resolveStudioElementVisualEffect(element(undefined))).toBeNull();
  });
});
