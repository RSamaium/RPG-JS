import { Container } from "pixi.js";
import { FxRuntime, customizeFx, getFxPreset } from "@canvasengine/presets";
import { aim, type Point } from "./aim";
import type { PresetOptions } from "./types";
import type { PlayableVisualEffect } from "./visual-effect";

type Preset = Parameters<FxRuntime["preload"]>[0];

/**
 * Plays the CanvasEngine effect presets (`@canvasengine/presets`, the engine
 * behind the `<Fx>` component and `map.playVisualEffect`) inside a battle scene,
 * from code: any battle event can spawn `swordSlash`, `fireball`, `limitBurst`…
 * recoloured and aimed.
 *
 * A battle scene is not made of map objects, so it cannot use
 * `map.playVisualEffect`: add `layer` to the scene (as a child, or through a
 * component's `pixiChildren`) and call `update(dt)` every frame.
 *
 * Client only.
 *
 * @example
 * ```ts
 * const fx = new FxPlayer({ maxParticles: 2000 });
 * scene.addChild(fx.layer);
 * fx.play("fireball", 120, 80, { color: "#ff6600" });
 * fx.playEffect(effect, caster, target);   // a PlayableVisualEffect
 * ticker.add(({ deltaMS }) => fx.update(deltaMS));
 * ```
 */
export class FxPlayer {
  /** The layer the effects are drawn in. */
  readonly layer = new Container();
  private readonly runtime: FxRuntime;

  constructor(options: { maxParticles?: number } = {}) {
    this.runtime = new FxRuntime({ maxParticles: options.maxParticles ?? 3000 });
  }

  /** True when a built-in preset of that name exists. */
  static has(name?: string): boolean {
    return !!name && !!getFxPreset(name);
  }

  /** A built-in preset recoloured / resized with `customizeFx`. */
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
   * The preset of a Visual Effect, tuned and aimed: its own `preset` (or the
   * built-in `effect`), with the emitters that go to the target
   * (`pathSpace: "target"`, `at: "target"`) aimed at `target`, the target seen
   * from the caster. `scale` multiplies its size and speed (the screen scale of
   * a battle).
   */
  static visualEffect(effect: PlayableVisualEffect, target: Point, scale = 1): Preset | undefined {
    const own = effect.preset as Preset | undefined;
    const source = own?.emitters?.length ? own : effect.effect ? getFxPreset(effect.effect) : undefined;
    if (!source) return undefined;
    return customizeFx(
      source as Preset,
      {
        color: effect.color,
        intensity: effect.intensity,
        sizeScale: (effect.sizeScale ?? 1) * scale,
        speedScale: (effect.speedScale ?? 1) * scale,
      },
      target,
    ) as Preset;
  }

  /** Plays a Visual Effect from `from` toward `to` (layer positions); returns a stop function (loops). */
  playEffect(effect: PlayableVisualEffect, from: Point, to: Point, o: { scale?: number; loop?: boolean } = {}): () => void {
    const target = { x: to.x - from.x, y: to.y - from.y };
    const preset = FxPlayer.visualEffect(effect, target, o.scale);
    return preset ? this.play(preset, from.x, from.y, { loop: o.loop, target }) : () => {};
  }

  /** Plays a preset (by name or ready-made) at a layer position; returns a stop function (loops). */
  play(preset: string | Preset, x: number, y: number, o: PresetOptions & { target?: Point } = {}): () => void {
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
        ...(o.target ? { target: o.target } : {}),
        onComplete: () => host.destroy({ children: true }),
      });
    });
    return () => {
      stopped = true;
      instance?.stop();
    };
  }

  /** Plays a directional preset at `to`, pointing from `from` (attack presets strike to the right). */
  aimed(name: string, from: Point, to: Point, o: PresetOptions = {}): () => void {
    return this.play(name, to.x, to.y, { ...o, ...aim(from, to) });
  }

  /** Advances the particles by `dt` ms. */
  update(dt: number): void {
    this.runtime.update(dt);
  }

  destroy(): void {
    this.layer.destroy({ children: true });
  }
}
