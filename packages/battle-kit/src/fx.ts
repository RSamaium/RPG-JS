import { Container } from "pixi.js";
import { FxRuntime, customizeFx, getFxPreset } from "@canvasengine/presets";
import { aim, type Point } from "./aim";
import type { PresetOptions } from "./types";
import type { PlayableVisualEffect } from "./visual-effect";

type Preset = Parameters<FxRuntime["preload"]>[0];

/**
 * The look of a preset, what `FxPlayer.preset` tunes: colour, size and speed,
 * intensity and lifetime. Client only.
 *
 * @title FxPresetLook
 * @example
 * ```ts
 * const look: FxPresetLook = { color: "#6dff4a", scale: 1.2 };
 * ```
 */
export type FxPresetLook = Pick<PresetOptions, "color" | "scale" | "intensity" | "lifetime">;

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
 * @title FxPlayer
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
  /**
   * The Pixi container the effects are drawn in: add it to the battle scene.
   *
   * @prop {Container} layer
   * @memberof FxPlayer
   */
  readonly layer = new Container();
  private readonly runtime: FxRuntime;

  /**
   * @param options - Options of the particle runtime
   * @param options.maxParticles - Particle cap of the whole layer. Default: 3000
   */
  constructor(options: { maxParticles?: number } = {}) {
    this.runtime = new FxRuntime({ maxParticles: options.maxParticles ?? 3000 });
  }

  /**
   * Is there a built-in preset (`@canvasengine/presets`) of that name?
   *
   * @title has
   * @method FxPlayer.has(name?)
   * @param {string} [name] - Preset name (`"fireball"`)
   * @returns {boolean} False for an empty or unknown name
   * @memberof FxPlayer
   * @example
   * ```ts
   * const name = FxPlayer.has(skill.fx) ? skill.fx : "hit";
   * ```
   */
  static has(name?: string): boolean {
    return !!name && !!getFxPreset(name);
  }

  /**
   * A built-in preset recoloured and resized with `customizeFx`, without
   * playing it. `scale` multiplies both size and speed. Where and how it is
   * played (`flip`, `rotation`, `loop`) are options of `play`, not of the preset.
   *
   * @title preset
   * @method FxPlayer.preset(name, o?)
   * @param {string} name - Preset name (`"fireball"`)
   * @param {FxPresetLook} [o] - `color`, `scale`, `intensity`, `lifetime`
   * @returns {Preset | undefined} The tuned preset, undefined when the name is unknown
   * @memberof FxPlayer
   * @example
   * ```ts
   * const acid = FxPlayer.preset("fireball", { color: "#6dff4a", intensity: 1.5 });
   * if (acid) fx.play(acid, x, y);
   * ```
   */
  static preset(name: string, o: FxPresetLook = {}): Preset | undefined {
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
   *
   * @title visualEffect
   * @method FxPlayer.visualEffect(effect, target, scale?)
   * @param {PlayableVisualEffect} effect - The Visual Effect to tune
   * @param {Point} target - Position of the target relative to the caster (px)
   * @param {number} [scale] - Size and speed multiplier. Default: 1
   * @returns {Preset | undefined} The tuned preset, undefined when the effect has neither a preset with emitters nor a known `effect` name
   * @memberof FxPlayer
   * @example
   * ```ts
   * const preset = FxPlayer.visualEffect(effect, { x: target.x - caster.x, y: target.y - caster.y }, 0.8);
   * ```
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

  /**
   * Plays a Visual Effect from `from` toward `to` (positions in the layer).
   * Does nothing when the effect cannot be resolved (see `visualEffect`).
   * Use `runVisualEffect` to also schedule its sounds and its hit.
   *
   * @title playEffect
   * @method fx.playEffect(effect, from, to, o?)
   * @param {PlayableVisualEffect} effect - The Visual Effect to play
   * @param {Point} from - Where it starts (the caster), layer px
   * @param {Point} to - Where it goes (the target), layer px
   * @param {object} [o] - Options
   * @param {number} [o.scale] - Size and speed multiplier. Default: 1
   * @param {boolean} [o.loop] - Loop until stopped (auras, statuses)
   * @returns {() => void} Stops the effect (needed for a loop)
   * @memberof FxPlayer
   * @example
   * ```ts
   * const stop = fx.playEffect(aura, hero, hero, { loop: true });
   * // later
   * stop();
   * ```
   */
  playEffect(effect: PlayableVisualEffect, from: Point, to: Point, o: { scale?: number; loop?: boolean } = {}): () => void {
    const target = { x: to.x - from.x, y: to.y - from.y };
    const preset = FxPlayer.visualEffect(effect, target, o.scale);
    return preset ? this.play(preset, from.x, from.y, { loop: o.loop, target }) : () => {};
  }

  /**
   * Plays a preset, by name or ready-made, at a position of the layer. The
   * preset is preloaded first, so it starts asynchronously; its container is
   * destroyed when it completes. An unknown name does nothing.
   *
   * @title play
   * @method fx.play(preset, x, y, o?)
   * @param {string | Preset} preset - A preset name (`"fireball"`) or a preset (`FxPlayer.preset(...)`)
   * @param {number} x - Layer x (px)
   * @param {number} y - Layer y (px)
   * @param {PresetOptions & { target?: Point }} [o] - Tuning (applied to a name only), `flip`, `rotation`, `loop`, and `target`: where the emitters aimed at a target go, relative to `x, y`
   * @returns {() => void} Stops the effect (needed for a loop); safe to call before it started
   * @memberof FxPlayer
   * @example
   * ```ts
   * fx.play("fireball", 120, 80, { color: "#ff6600", scale: 1.2 });
   * const stop = fx.play("poisonAura", unit.x, unit.y, { loop: true });
   * ```
   */
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

  /**
   * Plays a directional preset at `to`, pointing from `from` (attack presets
   * strike to the right): `flip` and `rotation` come from `aim(from, to)`.
   *
   * @title aimed
   * @method fx.aimed(name, from, to, o?)
   * @param {string} name - Preset name (`"swordSlash"`)
   * @param {Point} from - The attacker, layer px
   * @param {Point} to - The target, layer px (where the preset plays)
   * @param {PresetOptions} [o] - Tuning of the preset
   * @returns {() => void} Stops the effect
   * @memberof FxPlayer
   * @example
   * ```ts
   * fx.aimed("swordSlash", attacker, target, { color: elementColor("fire") });
   * ```
   */
  aimed(name: string, from: Point, to: Point, o: PresetOptions = {}): () => void {
    return this.play(name, to.x, to.y, { ...o, ...aim(from, to) });
  }

  /**
   * Advances the particles. Call it every frame (with the scaled delta of a
   * `Clock` so the battle speed and hit-stop apply).
   *
   * @title update
   * @method fx.update(dt)
   * @param {number} dt - Elapsed time (ms)
   * @returns {void}
   * @memberof FxPlayer
   * @example
   * ```ts
   * ticker.add(({ deltaMS }) => fx.update(clock.tick(deltaMS)));
   * ```
   */
  update(dt: number): void {
    this.runtime.update(dt);
  }

  /**
   * Destroys the layer and every effect still playing in it.
   *
   * @title destroy
   * @method fx.destroy()
   * @returns {void}
   * @memberof FxPlayer
   * @example
   * ```ts
   * onDestroy(() => fx.destroy());
   * ```
   */
  destroy(): void {
    this.layer.destroy({ children: true });
  }
}
