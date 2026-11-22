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
 * in ms from the start of the effect.
 *
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
  /** A built-in preset of `@canvasengine/presets` (`fireball`), used when `preset` is not given. */
  effect?: string;
  /** A resolved particle preset (the payload of a Studio Visual Effect). */
  preset?: Record<string, unknown>;
  /** Length of the effect in ms (its timeline). */
  duration: number;
  /** When the target is hit, in ms: damage, numbers and hit reactions happen here. */
  hitAt: number;
  /** Auras and statuses play until they are stopped. */
  loop?: boolean;
  /** Sounds played on the timeline of the effect. */
  sounds?: VisualEffectSound[];
}

/** The effects an action shows: one from the caster to the target, or (split) one on the caster and one on each target. */
export interface VisualEffects {
  effect?: PlayableVisualEffect;
  castEffect?: PlayableVisualEffect;
  impactEffect?: PlayableVisualEffect;
}

/** The effects a source (a skill, a command, a beat) has, without the empty ones: spread it on a beat. */
export function visualEffectsOf(source: VisualEffects | undefined): VisualEffects {
  return {
    ...(source?.effect ? { effect: source.effect } : {}),
    ...(source?.castEffect ? { castEffect: source.castEffect } : {}),
    ...(source?.impactEffect ? { impactEffect: source.impactEffect } : {}),
  };
}

/** One moment of the timeline of an effect, in ms from its start: a sound (volume from 0 to 1), the hit, the end. */
export type VisualEffectCue =
  | { at: number; type: "sound"; sound: string; volume: number }
  | { at: number; type: "hit" }
  | { at: number; type: "end" };

const clamp01 = (value: number | undefined) => Math.max(0, Math.min(1, typeof value === "number" && Number.isFinite(value) ? value : 1));

/**
 * The cues of an effect, in order: its sounds at their start, the hit at
 * `hitAt`, the end at `duration`.
 *
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
    { at: effect.duration, type: "end" },
  ];
  return cues.sort((a, b) => a.at - b.at);
}

/** A Visual Effect being played. */
export interface VisualEffectPlayback {
  hitAt: number;
  duration: number;
  /** Resolves at `hitAt` (or when stopped before). */
  hit: Promise<void>;
  /** Resolves at the end of the effect; a loop resolves when it is stopped. */
  done: Promise<void>;
  /** Stops the particles (loops) and the sounds still to come. */
  stop(): void;
}

/** What `runVisualEffect` needs from the scene that plays the effect. */
export interface VisualEffectRunOptions {
  /** Spawns the particles of the effect; returns what stops them. */
  spawn(loop: boolean): () => void;
  /** Waits `ms` on the clock of the scene (the battle clock: hit-stop and speed apply). */
  wait(ms: number): Promise<void>;
  /** Plays a sound of the effect (`volume` from 0 to 1). Without it, the effect is silent. */
  sound?(id: string, volume: number): void;
  /** Called at `hitAt`, once (not at each turn of a loop). */
  onHit?(): void;
  /** Plays the effect once even when it loops (a skill). */
  once?: boolean;
}

/**
 * Plays a Visual Effect: spawns its particles now, plays its sounds at their
 * start and calls `onHit` at `hitAt`. A looping effect (an aura, a status)
 * plays its sounds again at each turn of its timeline until it is stopped.
 *
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
        if (cue.type === "sound") o.sound?.(cue.sound, cue.volume);
        else if (cue.type === "hit") {
          hitDone = true;
          o.onHit?.();
          resolveHit();
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
