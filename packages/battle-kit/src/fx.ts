import { Container } from "pixi.js";
import { FxRuntime, customizeFx, getFxPreset } from "@canvasengine/presets";
import { resolveTargetSpace, type Point } from "./target-space";
import { aim } from "./aim";
import type { PresetOptions } from "./types";
import type { PlayableVisualEffect } from "./visual-effect";

type Preset = Parameters<FxRuntime["preload"]>[0];

/**
 * Plays CanvasEngine effect presets (`@canvasengine/presets`, the engine
 * behind `<Fx>`) into one Pixi layer, from code: any battle event can spawn
 * `swordSlash`, `fireball`, `limitBurst`… recoloured and aimed. Add `layer`
 * to a scene (as a raw child or through a component's `pixiChildren`) and call
 * `update(dt)` every frame.
 */
export class FxPlayer {
  readonly layer = new Container();
  private readonly runtime: FxRuntime;

  constructor(options: { maxParticles?: number } = {}) {
    this.runtime = new FxRuntime({ maxParticles: options.maxParticles ?? 3000 });
  }

  /** True when a preset of that name exists. */
  static has(name?: string) {
    return !!name && !!getFxPreset(name);
  }

  /** A preset recoloured / resized with `customizeFx`. */
  static preset(name: string, o: PresetOptions = {}): Preset | undefined {
    const base = getFxPreset(name);
    if (!base) return undefined;
    return customizeFx(base, {
      color: o.color,
      intensity: o.intensity,
      sizeScale: o.scale,
      speedScale: o.scale,
      lifetimeScale: o.lifetime,
    }) as Preset;
  }

  /**
   * The preset of a Visual Effect, ready to spawn on the caster: its own preset (or its base preset), the emitters that go to
   * the target mapped to `target` (the target seen from the caster, see `resolveTargetSpace`), then its settings applied.
   * `scale` multiplies its size and speed (the screen scale of a battle).
   */
  static visualEffect(effect: PlayableVisualEffect, target: Point, scale = 1): Preset | undefined {
    const source = (effect.preset?.emitters?.length ? effect.preset : effect.base ? getFxPreset(effect.base) : undefined) as Preset | undefined;
    if (!source) return undefined;
    // Mapped first: `customizeFx` expands the recipes, which would lose the target keys of their items.
    const aimed = resolveTargetSpace(source as Parameters<typeof resolveTargetSpace>[0], target) as Preset;
    const s = effect.settings ?? {};
    return customizeFx(aimed, {
      color: s.color,
      intensity: s.intensity,
      sizeScale: (s.sizeScale ?? 1) * scale,
      speedScale: (s.speedScale ?? 1) * scale,
    }) as Preset;
  }

  /** Play a Visual Effect from `from` toward `to` (layer positions); returns a stop function (loops). */
  playEffect(effect: PlayableVisualEffect, from: Point, to: Point, o: { scale?: number; loop?: boolean } = {}): () => void {
    const preset = FxPlayer.visualEffect(effect, { x: to.x - from.x, y: to.y - from.y }, o.scale);
    return preset ? this.play(preset, from.x, from.y, { loop: o.loop }) : () => {};
  }

  /** Play a preset (by name or ready-made) at a layer position; returns a stop function (loops). */
  play(preset: string | Preset, x: number, y: number, o: PresetOptions = {}): () => void {
    const resolved = typeof preset === "string" ? FxPlayer.preset(preset, o) : preset;
    if (!resolved) return () => {};
    const host = new Container();
    host.position.set(x, y);
    host.scale.x = o.flip ? -1 : 1;
    host.rotation = o.rotation ?? 0;
    this.layer.addChild(host);
    let instance: { stop(): void } | null = null;
    let stopped = false;
    void this.runtime.preload(resolved).then(() => {
      if (stopped) return host.destroy({ children: true });
      instance = this.runtime.spawn(host, resolved, {
        loop: !!o.loop,
        onComplete: () => host.destroy({ children: true }),
      });
    });
    return () => {
      stopped = true;
      instance?.stop();
    };
  }

  /** Play a directional preset at `to`, pointing from `from` (attack presets strike to the right). */
  aimed(name: string, from: { x: number; y: number }, to: { x: number; y: number }, o: PresetOptions = {}) {
    return this.play(name, to.x, to.y, { ...o, ...aim(from, to) });
  }

  update(dt: number) {
    this.runtime.update(dt);
  }

  destroy() {
    this.layer.destroy({ children: true });
  }
}
