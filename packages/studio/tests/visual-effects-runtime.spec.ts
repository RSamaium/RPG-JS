import { describe, expect, it, vi } from "vitest";
import {
  playStudioVisualEffect,
  visualEffectCastPart,
  visualEffectImpactPart,
  visualEffectOptions,
  visualEffectTrailPart,
  type VisualEffect,
} from "../runtime/visual-effects";
import {
  studioProjectileHitReaction,
  studioProjectileLook,
  studioProjectileOptions,
} from "../runtime/projectile";
import { defaultExecutors } from "../runtime/blocks/executors";
import { defaultBlocks } from "../runtime/blocks/blocks";
import { studioProjectileGraphics, studioProjectileLooks } from "../src/projectile-looks";
import { normalizeStudioDatabase } from "../src/database-normalizer";

// A bolt: a flash on the caster, a spark flying to the target, a burst on it at 400 ms.
const bolt: VisualEffect = {
  name: "Bolt",
  duration: 800,
  hitAt: 400,
  settings: { color: "#88ccff", intensity: 1.2 },
  preset: {
    emitters: [
      { burst: 4 },
      { pathSpace: "target", path: [{ x: 0 }, { x: 1 }], rate: 30 },
      { at: "target", burst: 12 },
    ],
  },
  sounds: [
    { sound: "cast", start: 0, volume: 50 },
    { sound: "hit", start: 400 },
  ],
};

describe("Visual Effects of the Studio, played by the engine", () => {
  it("aims at the target, with the tuning, the length and the sounds of the record", () => {
    expect(visualEffectOptions(bolt, { from: { x: 0, y: 0 }, to: { x: 100, y: 50 } })).toEqual({
      name: "hitSpark",
      options: {
        preset: bolt.preset,
        target: { x: 100, y: 50 },
        color: "#88ccff",
        intensity: 1.2,
        duration: 800,
        sounds: [
          { sound: "cast", start: 0, volume: 0.5 },
          { sound: "hit", start: 400, volume: 1 },
        ],
      },
    });
  });

  it("without a target, travels the way it faces over the distance, without its impact", () => {
    const { options } = visualEffectOptions(bolt, { from: { x: 10, y: 10 }, facing: { x: 0, y: 1 }, distance: 96, delay: 100 });
    expect(options.target).toEqual({ x: 10, y: 106 });
    expect(options.delay).toBe(100);
    expect(options.preset?.emitters).toEqual([bolt.preset!.emitters[0], bolt.preset!.emitters[1]]);
  });

  it("plays a record of the database from the center of a character, and says when it hits", () => {
    const playVisualEffect = vi.fn();
    const map = { database: () => ({ bolt }), playVisualEffect };
    const hero = { x: () => 100, y: () => 100, hitbox: () => ({ w: 32, h: 32 }), getCurrentMap: () => map };

    const played = playStudioVisualEffect(hero, "bolt", { from: hero, to: { x: 300, y: 116 }, delay: 50 });

    expect(played).toEqual({ hitAt: 450, duration: 850 });
    expect(playVisualEffect).toHaveBeenCalledWith({ x: 116, y: 116 }, "hitSpark", expect.objectContaining({ target: { x: 300, y: 116 }, delay: 50 }));
    expect(playStudioVisualEffect(hero, "missing", { from: hero })).toBeUndefined();
  });

  it("splits an effect in what starts on the caster, what travels, and what plays on the target", () => {
    expect(visualEffectCastPart(bolt)).toMatchObject({ preset: { emitters: [{ burst: 4 }] }, duration: 400, sounds: [{ sound: "cast" }] });
    expect(visualEffectTrailPart(bolt)).toMatchObject({ preset: { emitters: [{ rate: 30 }] } });
    expect(visualEffectTrailPart(bolt)!.preset!.emitters[0]).not.toHaveProperty("path");
    expect(visualEffectImpactPart(bolt)).toMatchObject({ preset: { emitters: [{ at: "target", burst: 12 }] }, duration: 400, sounds: [{ sound: "hit", start: 0 }] });
  });
});

describe("Projectiles of the Studio", () => {
  it("turns a record into the options of the projectiles of the engine", () => {
    expect(studioProjectileOptions({ trajectory: "bomb", range: 4, duration: 500, height: 40, areaRadius: 2 }, 32)).toEqual({
      projectile: { trajectory: { type: "arc", range: 128, duration: 0.5, height: 40 } },
      area: { radius: 64 },
    });
    expect(studioProjectileOptions({ trajectory: "boomerang", speed: 400, pierce: true, wall: "bounce", count: 3, spreadAngle: 20, lingerMs: 300 }, 16)).toEqual({
      projectile: {
        trajectory: { type: "return", speed: 400, range: 96 },
        pierce: true,
        wall: "bounce",
        linger: { ms: 300 },
        pattern: { type: "cone", count: 3, angle: 20 },
      },
    });
    expect(studioProjectileOptions({ trajectory: "beam" }, 32).projectile.trajectory).toEqual({ type: "instant", range: 192 });
  });

  it("draws its image or its particles, with the parts of its Visual Effect", () => {
    expect(studioProjectileLook({ trajectory: "boomerang", graphic: "boomerang-img" })).toEqual({ graphic: "boomerang-img", spin: 3 });
    expect(studioProjectileLook({ trajectory: "bomb" })).toEqual({ shape: "bomb", rotate: false });
    expect(studioProjectileLook({ trajectory: "straight" }, bolt)).toEqual({
      shape: "none",
      trailFx: { preset: { ...bolt.preset, emitters: [{ rate: 30 }] }, color: "#88ccff", intensity: 1.2 },
      impactFx: { preset: { ...bolt.preset, emitters: [{ at: "target", burst: 12 }] }, color: "#88ccff", intensity: 1.2 },
      impactDuration: 400,
      impactSound: "hit",
    });
  });

  it("registers a look per Projectile record of the database, with its image to load", () => {
    const records = [
      { _id: "fire-arrow", type: "projectile", trajectory: "straight", graphic: { _id: "arrow-img" }, visualEffect: "bolt" },
      { _id: "bolt", type: "visualEffect", ...bolt, sounds: [{ sound: { _id: "hit-sfx" }, start: 400 }] },
      { _id: "potion", type: "item" },
    ];
    expect(studioProjectileLooks(records)).toEqual({
      "fire-arrow": expect.objectContaining({ graphic: "arrow-img", impactSound: "hit-sfx", trailFx: expect.any(Object) }),
    });
    expect(studioProjectileGraphics(records)).toEqual(["arrow-img"]);
  });

  it("lets an event page react to the projectile it waits for", () => {
    const arrow = { type: "arrow", payload: { projectileId: "arrow" } };
    expect(studioProjectileHitReaction({ type: "onAction" }, arrow)).toEqual({ runs: false, reaction: "pass" });
    expect(studioProjectileHitReaction({ type: "onProjectileHit" }, arrow)).toEqual({ runs: true, reaction: "stop" });
    expect(studioProjectileHitReaction({ type: "onProjectileHit", typeData: { projectile: "arrow", reaction: "stick" } }, arrow)).toEqual({ runs: true, reaction: "stick" });
    expect(studioProjectileHitReaction({ type: "onProjectileHit", typeData: { projectile: "bomb" } }, arrow)).toEqual({ runs: false, reaction: "pass" });
  });
});

describe("blocks and records of the database", () => {
  it("has the blocks play_visual_effect and launch_projectile", () => {
    expect(defaultExecutors.play_visual_effect).toBeTypeOf("function");
    expect(defaultExecutors.launch_projectile).toBeTypeOf("function");
    expect(defaultBlocks.map((block) => block.type)).toEqual(expect.arrayContaining(["play_visual_effect", "launch_projectile"]));
  });

  it("reads the Visual Effects of skills, and the items thrown or played with one", () => {
    const database = normalizeStudioDatabase([
      { _id: "fire", type: "skill", name: "Fire", visualEffect: "bolt", action: { mode: "instant" } },
      { _id: "split", type: "skill", name: "Split", visualEffectSplit: true, casterVisualEffect: "glow", targetVisualEffect: "burst" },
      { _id: "volley", type: "skill", name: "Volley", action: { mode: "projectile", projectileId: "fire-arrow" } },
      { _id: "bomb-item", type: "item", itemType: "item", name: "Bomb", throwProjectile: "bomb", throwCooldownMs: 500 },
      { _id: "elixir", type: "item", itemType: "item", name: "Elixir", useVisualEffect: "bolt" },
      { _id: "bolt", type: "visualEffect", ...bolt, sounds: [{ sound: { _id: "hit-sfx" }, start: 400 }] },
    ]);
    expect(database.fire.action.visual).toEqual({ effect: "bolt", split: false });
    expect(database.split.action.visual).toEqual({ split: true, castEffect: "glow", impactEffect: "burst" });
    expect(database.volley.action.projectileId).toBe("fire-arrow");
    expect(database["bomb-item"]).toMatchObject({ action: { mode: "projectile", target: "enemy", cooldownMs: 500, projectileId: "bomb" } });
    expect(database["bomb-item"].onUse).toBeUndefined();
    expect(database.elixir.onUse).toBeTypeOf("function");
    expect(database.bolt.sounds).toEqual([{ sound: "hit-sfx", start: 400 }]);
  });
});
