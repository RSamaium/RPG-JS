import type { VisualEffectSound, VisualEffectTuning } from "@rpgjs/common";

/**
 * Visual Effects of a battle scene: the one-shot particle effect of the core
 * (`map.playVisualEffect`, see `VisualEffectOptions` of `@rpgjs/common`) played
 * inside a battle scene, with the moment the target is hit.
 *
 * This file has no Pixi / CanvasEngine dependency: servers carry the effects in
 * their battle data, clients schedule their sounds and their hit with it (the
 * particles themselves are spawned by `FxPlayer.playEffect`).
 */

/**
 * A Visual Effect as a battle scene plays it. The tuning (`color`, `intensity`,
 * `sizeScale`, `speedScale`) and the sounds use the vocabulary of
 * `map.playVisualEffect`: a sound `volume` goes from 0 to 1 and its `start` is
 * in ms from the start of the effect. Any runtime: servers carry it in their
 * battle data, clients play it.
 *
 * @title PlayableVisualEffect
 * @example
 * ```ts
 * const fireball: PlayableVisualEffect = {
 *   effect: "fireball",
 *   color: "#ff6a00",
 *   duration: 900,
 *   hitAt: 500,
 *   sounds: [{ sound: "whoosh" }, { sound: "boom", start: 500, volume: 0.8 }],
 * };
 * ```
 */
export interface PlayableVisualEffect extends VisualEffectTuning {
  /**
   * A built-in preset of `@canvasengine/presets` (`fireball`), used when
   * `preset` is not given or has no emitters.
   *
   * @prop {string} [effect]
   * @memberof PlayableVisualEffect
   */
  effect?: string;
  /**
   * A resolved particle preset (the payload of a Studio Visual Effect).
   *
   * @prop {Record<string, unknown>} [preset]
   * @memberof PlayableVisualEffect
   */
  preset?: Record<string, unknown>;
  /**
   * Length of the effect in ms (its timeline; one turn of a loop).
   *
   * @prop {number} duration
   * @memberof PlayableVisualEffect
   */
  duration: number;
  /**
   * When the target is hit, in ms from the start: damage, numbers and hit
   * reactions happen here.
   *
   * @prop {number} hitAt
   * @memberof PlayableVisualEffect
   */
  hitAt: number;
  /**
   * Auras and statuses: the effect plays until it is stopped.
   *
   * @prop {boolean} [loop]
   * @memberof PlayableVisualEffect
   */
  loop?: boolean;
  /**
   * Sounds played on the timeline of the effect (`sound` id, `start` in ms,
   * `volume` from 0 to 1, default 1).
   *
   * @prop {VisualEffectSound[]} [sounds]
   * @memberof PlayableVisualEffect
   */
  sounds?: VisualEffectSound[];
}

/**
 * The effects an action (a skill, a command, a beat) shows: either one effect
 * from the caster to the target, or, split, one on the caster and one on each
 * target. Any runtime.
 *
 * @title VisualEffects
 * @example
 * ```ts
 * const thunder: VisualEffects = {
 *   castEffect: { effect: "chargeUp", duration: 500, hitAt: 500 },
 *   impactEffect: { effect: "lightningStrike", duration: 700, hitAt: 200 },
 * };
 * ```
 */
export interface VisualEffects {
  /**
   * One effect that travels from the caster to the target.
   *
   * @prop {PlayableVisualEffect} [effect]
   * @memberof VisualEffects
   */
  effect?: PlayableVisualEffect;
  /**
   * The effect played on the caster (split form).
   *
   * @prop {PlayableVisualEffect} [castEffect]
   * @memberof VisualEffects
   */
  castEffect?: PlayableVisualEffect;
  /**
   * The effect played on each target (split form).
   *
   * @prop {PlayableVisualEffect} [impactEffect]
   * @memberof VisualEffects
   */
  impactEffect?: PlayableVisualEffect;
}

/**
 * The effects a source (a skill, a command, a beat) has, without the empty
 * ones, so it can be spread on a beat without adding `undefined` keys. Any
 * runtime.
 *
 * @title visualEffectsOf
 * @method visualEffectsOf(source)
 * @param {VisualEffects | undefined} source - Any object with `effect`, `castEffect` or `impactEffect`
 * @returns {VisualEffects} A new object with only the effects that are set (empty when `source` is undefined)
 * @example
 * ```ts
 * const beat = { kind: "skill", actor, targets, ...visualEffectsOf(skill) };
 * ```
 */
export function visualEffectsOf(source: VisualEffects | undefined): VisualEffects {
  return {
    ...(source?.effect ? { effect: source.effect } : {}),
    ...(source?.castEffect ? { castEffect: source.castEffect } : {}),
    ...(source?.impactEffect ? { impactEffect: source.impactEffect } : {}),
  };
}

/**
 * One moment of the timeline of an effect, `at` ms from its start: a sound
 * (`volume` from 0 to 1), the hit, or the end. `effectCues` builds them. Any
 * runtime.
 *
 * @title VisualEffectCue
 * @example
 * ```ts
 * for (const cue of effectCues(effect)) {
 *   if (cue.type === "sound") schedule(cue.at, () => play(cue.sound, cue.volume));
 * }
 * ```
 */
export type VisualEffectCue =
  | { at: number; type: "sound"; sound: string; volume: number }
  | { at: number; type: "hit" }
  | { at: number; type: "end" };

const clamp01 = (value: number | undefined) => Math.max(0, Math.min(1, typeof value === "number" && Number.isFinite(value) ? value : 1));

/**
 * The cues of an effect, in order: its sounds at their start, the hit at
 * `hitAt`, the end at `duration` (or at `hitAt` when it is later). Sounds without an id are dropped, a missing
 * or invalid volume becomes 1 and a negative start becomes 0. Any runtime.
 *
 * @title effectCues
 * @method effectCues(effect)
 * @param effect - The effect to schedule
 * @returns The cues sorted by time
 *
 * @example
 * ```ts
 * effectCues({ effect: "slash", duration: 600, hitAt: 250, sounds: [{ sound: "swing" }] });
 * // [{ at: 0, type: "sound", sound: "swing", volume: 1 }, { at: 250, type: "hit" }, { at: 600, type: "end" }]
 * ```
 */
export function effectCues(effect: PlayableVisualEffect): VisualEffectCue[] {
  const cues: VisualEffectCue[] = [
    ...(effect.sounds ?? [])
      .filter((s) => typeof s?.sound === "string" && s.sound)
      .map((s) => ({ at: Math.max(0, s.start ?? 0), type: "sound" as const, sound: s.sound, volume: clamp01(s.volume) })),
    { at: effect.hitAt, type: "hit" },
    // An effect lasts at least until its hit: `done` never resolves before `hit`.
    { at: Math.max(effect.duration, effect.hitAt), type: "end" },
  ];
  // Stable sort: at the same time, the hit comes before the end.
  return cues.sort((a, b) => a.at - b.at);
}

/**
 * A Visual Effect being played, as `runVisualEffect` returns it. Any runtime.
 *
 * @title VisualEffectPlayback
 * @example
 * ```ts
 * const playback = runVisualEffect(effect, options);
 * await playback.hit;
 * applyDamage();
 * await playback.done;
 * ```
 */
export interface VisualEffectPlayback {
  /**
   * When the target is hit (ms from the start), copied from the effect.
   *
   * @prop {number} hitAt
   * @memberof VisualEffectPlayback
   */
  hitAt: number;
  /**
   * Length of the effect (ms), copied from the effect.
   *
   * @prop {number} duration
   * @memberof VisualEffectPlayback
   */
  duration: number;
  /**
   * Resolves at `hitAt` (or when stopped before).
   *
   * @prop {Promise<void>} hit
   * @memberof VisualEffectPlayback
   */
  hit: Promise<void>;
  /**
   * Resolves at the end of the effect; a loop resolves when it is stopped.
   *
   * @prop {Promise<void>} done
   * @memberof VisualEffectPlayback
   */
  done: Promise<void>;
  /**
   * Stops the particles (loops) and the sounds still to come, and resolves
   * `hit` and `done`. Calling it again does nothing.
   *
   * @title stop
   * @method playback.stop()
   * @returns {void}
   * @memberof VisualEffectPlayback
   * @example
   * ```ts
   * onStatusRemoved(() => playback.stop());
   * ```
   */
  stop(): void;
}

/**
 * What `runVisualEffect` needs from the scene that plays the effect. Any
 * runtime: the scene gives the renderer and the clock.
 *
 * @title VisualEffectRunOptions
 * @example
 * ```ts
 * const options: VisualEffectRunOptions = {
 *   spawn: (loop) => fx.playEffect(effect, from, to, { loop }),
 *   wait: (ms) => clock.wait(ms),
 *   sound: (id, volume) => cues.playSound(id, volume),
 *   onHit: () => showDamage(),
 * };
 * ```
 */
export interface VisualEffectRunOptions {
  /**
   * Spawns the particles of the effect, right away.
   *
   * @method options.spawn(loop)
   * @param {boolean} loop - Whether the particles should loop
   * @returns {() => void} What stops them
   * @memberof VisualEffectRunOptions
   */
  spawn(loop: boolean): () => void;
  /**
   * Waits `ms` on the clock of the scene (the battle clock: hit-stop and
   * speed apply).
   *
   * @method options.wait(ms)
   * @param {number} ms - Time to wait (ms)
   * @returns {Promise<void>}
   * @memberof VisualEffectRunOptions
   */
  wait(ms: number): Promise<void>;
  /**
   * Plays a sound of the effect. Without it, the effect is silent.
   *
   * @method options.sound(id, volume)
   * @param {string} id - Sound id of the game
   * @param {number} volume - From 0 to 1
   * @returns {void}
   * @memberof VisualEffectRunOptions
   */
  sound?(id: string, volume: number): void;
  /**
   * Called at `hitAt`, once (not at each turn of a loop), unless stopped
   * before.
   *
   * @method options.onHit()
   * @returns {void}
   * @memberof VisualEffectRunOptions
   */
  onHit?(): void;
  /**
   * Plays the effect once even when it loops (a skill). Default: false.
   *
   * @prop {boolean} [once]
   * @memberof VisualEffectRunOptions
   */
  once?: boolean;
}

/**
 * Plays a Visual Effect: spawns its particles now, plays its sounds at their
 * start and calls `onHit` at `hitAt`. A looping effect (an aura, a status)
 * plays its sounds again at each turn of its timeline until it is stopped.
 * Every wait goes through `o.wait`, so the timeline follows the battle clock.
 * Any runtime.
 *
 * @title runVisualEffect
 * @method runVisualEffect(effect, o)
 * @param effect - The effect to play
 * @param o - How the scene spawns particles, waits and plays sounds
 * @returns The playback: `hit` and `done` promises, and `stop()`
 *
 * @example
 * ```ts
 * const playback = runVisualEffect(effect, {
 *   spawn: (loop) => fx.playEffect(effect, from, to, { loop }),
 *   wait: (ms) => clock.wait(ms),
 *   sound: (id, volume) => engine.playSound(id, { volume }),
 *   onHit: () => showDamage(),
 * });
 * await playback.done;
 * ```
 */
export function runVisualEffect(effect: PlayableVisualEffect, o: VisualEffectRunOptions): VisualEffectPlayback {
  const loop = !!effect.loop && !o.once;
  const cues = effectCues(effect);
  let stopped = false;
  let hitDone = false;
  let resolveHit!: () => void;
  let resolveDone!: () => void;
  const hit = new Promise<void>((resolve) => (resolveHit = resolve));
  const done = new Promise<void>((resolve) => (resolveDone = resolve));
  const stopSpawn = o.spawn(loop);

  const cycle = (first: boolean) => {
    for (const cue of cues) {
      if (cue.type === "hit" && !first) continue;
      void o.wait(cue.at).then(() => {
        if (stopped) return;
        // A callback that fails is logged: the effect goes on, and what waits for its hit or its end is never left waiting.
        const safely = (what: string, fn?: () => void) => {
          try {
            fn?.();
          } catch (error) {
            console.error(`[VisualEffect] ${what} failed`, error);
          }
        };
        if (cue.type === "sound") safely("sound", o.sound && (() => o.sound!(cue.sound, cue.volume)));
        else if (cue.type === "hit") {
          hitDone = true;
          resolveHit();
          safely("onHit", o.onHit);
        } else if (loop && effect.duration > 0) cycle(false);
        else resolveDone();
      });
    }
  };
  cycle(true);

  return {
    hitAt: effect.hitAt,
    duration: effect.duration,
    hit,
    done,
    stop() {
      if (stopped) return;
      stopped = true;
      stopSpawn();
      if (!hitDone) resolveHit();
      resolveDone();
    },
  };
}
