import { ATTACK_FX_PRESETS } from "@canvasengine/presets";
import { FxPlayer } from "@rpgjs/battle-kit";
import { elementColor } from "@rpgjs/battle-kit/pure";
import type { FxPreset, Scene } from "./scene";

/**
 * VFX. Effects are CanvasEngine presets (`@canvasengine/presets`:
 * ATTACK / COMBAT / MAGIC / EPIC / STATUS FX), recoloured and mirrored with
 * `customizeFx`. A skill or weapon `fx` can name any preset directly
 * (`"swordSlash"`, `"fireball"`, `"holyPillar"`…) or one of the recipes below;
 * games add their own recipes with the client `fx` option.
 */
export interface FxOptions {
  /** CSS colour, e.g. the element colour. */
  color?: string;
  /** Mirror a directional preset (attack presets strike to the right). */
  flip?: boolean;
  rotation?: number;
  /** Size multiplier (screen scale). */
  scale?: number;
  intensity?: number;
  lifetimeScale?: number;
  loop?: boolean;
}

export type FxFn = (scene: Scene, x: number, y: number, o: { color: string; scale: number; crit?: boolean; flip?: boolean }) => void;

/** Play a CanvasEngine preset by name; returns a stop function (for loops). */
export function playPreset(scene: Scene, name: string, x: number, y: number, o: FxOptions = {}): () => void {
  const preset = FxPlayer.preset(name, { color: o.color, intensity: o.intensity, scale: o.scale, lifetime: o.lifetimeScale }) as FxPreset | undefined;
  if (!preset) return () => {};
  return scene.particles(preset, x, y, { flipX: o.flip, rotation: o.rotation, loop: o.loop });
}

export const hasPreset = (name?: string) => FxPlayer.has(name);

/** Weapon strikes (ATTACK_FX_PRESETS) are authored small: battle battlers are bigger. */
export const isAttackPreset = (name?: string) => !!name && name in ATTACK_FX_PRESETS;
export const ATTACK_SCALE = 1.6;

/** Custom particle burst (when no preset fits). */
export function burst(
  color: string,
  o: {
    count?: number;
    speed?: [number, number];
    life?: [number, number];
    size?: number;
    shape?: string;
    gravity?: number;
    angle?: [number, number];
  } = {},
): FxPreset {
  return {
    duration: 120,
    emitters: [
      {
        burst: o.count ?? 18,
        angle: o.angle ?? [0, 360],
        speed: o.speed ?? [160, 420],
        gravity: o.gravity ?? 0,
        drag: 2,
        particle: {
          shape: o.shape ?? "spark",
          align: "velocity",
          lifetime: o.life ?? [220, 460],
          color: ["#ffffff", color],
          alpha: [1, 0],
          scale: [o.size ?? 0.22, 0],
          blendMode: "add",
          ease: "outCubic",
        },
      },
    ],
  };
}

/** Recipes combining presets. Keys are usable as skill / weapon `fx`. */
export const builtinFx: Record<string, FxFn> = {
  slash(scene, x, y, { color, scale, crit, flip }) {
    playPreset(scene, crit ? "heavySlash" : "swordSlash", x, y, { color, scale: scale * ATTACK_SCALE, flip });
  },
  stab(scene, x, y, { color, scale, flip }) {
    playPreset(scene, "pierce", x, y, { color: color ?? "#ff6a4a", scale: scale * ATTACK_SCALE, flip });
  },
  hit(scene, x, y, { color, scale }) {
    playPreset(scene, "hitSpark", x, y, { color, scale });
    playPreset(scene, "impactBurst", x, y, { color, scale: scale * 0.8 });
  },
  fire(scene, x, y, { scale }) {
    playPreset(scene, "fireball", x, y, { scale });
  },
  ice(scene, x, y, { scale }) {
    playPreset(scene, "iceSpikes", x, y + 30 * scale, { scale });
    playPreset(scene, "frostNova", x, y, { scale: scale * 0.8 });
  },
  thunder(scene, x, y, { scale }) {
    playPreset(scene, "thunderStrike", x, y, { scale });
  },
  light(scene, x, y, { scale }) {
    playPreset(scene, "holyLight", x, y, { scale });
  },
  dark(scene, x, y, { scale }) {
    playPreset(scene, "shadowCurse", x, y, { scale });
  },
  heal(scene, x, y, { scale }) {
    playPreset(scene, "healPulse", x, y, { scale });
  },
  burst(scene, x, y, { scale }) {
    playPreset(scene, "holyPillar", x, y + 40 * scale, { scale });
    playPreset(scene, "crystalBurst", x, y, { scale, color: "#ffe9a8" });
  },
};

/** Stagger break: crystal shatter + shockwave. */
export function breakFx(scene: Scene, x: number, y: number, scale: number) {
  playPreset(scene, "crystalBurst", x, y, { scale, color: "#cfe0ff" });
  playPreset(scene, "shockwave", x, y, { scale, color: "#9fb6ff" });
}

/** Enemy dissolving into smoke and embers. */
export function dissolveFx(scene: Scene, x: number, y: number, scale: number) {
  playPreset(scene, "smokePuff", x, y, { scale, color: "#5a2a4a" });
  scene.particles(burst("#ff5a8a", { count: 30, shape: "softCircle", speed: [60, 200], gravity: -260, life: [600, 1100], size: 0.45 }), x, y);
}
