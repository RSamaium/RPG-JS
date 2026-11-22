import type { VisualEffectPreset } from "./target-space";

/**
 * Visual Effects: one CanvasEngine preset, the sounds placed on its timeline and the moment the target is hit. This file has no
 * Pixi / CanvasEngine dependency: servers read the records with it, clients schedule their sounds and their hit with it (the preset
 * itself is built by `FxPlayer.visualEffect`).
 */

export interface VisualEffectSound {
  /** Media id of a sound. */
  sound: string;
  /** Start in ms from the start of the effect. */
  start: number;
  /** 0 to 100. */
  volume?: number;
}

export interface VisualEffectSettings {
  color?: string;
  intensity?: number;
  sizeScale?: number;
  speedScale?: number;
}

/** A Visual Effect record of a database. */
export interface VisualEffect {
  name: string;
  category: "attack" | "magic" | "projectile" | "impact" | "aura" | "status";
  /** A built-in preset name (`fireball`), used when `preset` is empty. */
  base?: string;
  preset?: VisualEffectPreset;
  settings?: VisualEffectSettings;
  /** Length of the effect in ms (the timeline). */
  duration: number;
  /** When the target is hit, in ms: damage, numbers and hit reactions happen here. */
  hitAt: number;
  /** Auras and statuses play until stopped. */
  loop?: boolean;
  sounds?: VisualEffectSound[];
}

/** What a game needs to play a Visual Effect record: plain data, carried by the battle beats and states. */
export type PlayableVisualEffect = Pick<VisualEffect, "base" | "preset" | "settings" | "duration" | "hitAt" | "loop" | "sounds">;

/** The effects a skill shows: one effect from the caster to the target, or (split) one on the caster and one on each target. */
export interface VisualEffects {
  effect?: PlayableVisualEffect;
  castEffect?: PlayableVisualEffect;
  impactEffect?: PlayableVisualEffect;
}

/** Length of an effect without one. */
const DEFAULT_DURATION = 1000;
/** Volume of a sound without one, out of 100 . */
const DEFAULT_VOLUME = 80;

const isRecord = (value: unknown): value is Record<string, any> => typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown): number | undefined => (typeof value === "number" && Number.isFinite(value) ? value : undefined);
const mediaId = (value: unknown): string | undefined => {
  const id = typeof value === "string" ? value : isRecord(value) ? value._id ?? value.id : undefined;
  return typeof id === "string" && id.trim() ? id.trim() : undefined;
};

/**
 * A Visual Effect record as the game plays it, or `undefined` when it shows nothing (no preset and no base preset). Its name,
 * category and prompt are left out; `hitAt` stays within the effect.
 */
export function playableVisualEffect(raw: unknown): PlayableVisualEffect | undefined {
  if (!isRecord(raw)) return undefined;
  const preset = isRecord(raw.preset) && Array.isArray(raw.preset.emitters) && raw.preset.emitters.length ? (raw.preset as PlayableVisualEffect["preset"]) : undefined;
  const base = typeof raw.base === "string" && raw.base.trim() ? raw.base.trim() : undefined;
  if (!preset && !base) return undefined;
  const duration = Math.max(0, finite(raw.duration) ?? DEFAULT_DURATION);
  const hitAt = Math.min(duration, Math.max(0, finite(raw.hitAt) ?? 0));
  const settings = isRecord(raw.settings)
    ? Object.fromEntries(
        (["color", "intensity", "sizeScale", "speedScale"] as const).flatMap((key) => {
          const value = raw.settings[key];
          return (key === "color" ? typeof value === "string" && value : finite(value) !== undefined) ? [[key, value]] : [];
        }),
      )
    : {};
  const sounds = (Array.isArray(raw.sounds) ? raw.sounds : []).flatMap((entry: unknown) => {
    const sound = isRecord(entry) ? mediaId(entry.sound) : undefined;
    if (!sound) return [];
    const volume = finite((entry as Record<string, unknown>).volume);
    return [{ sound, start: Math.max(0, finite((entry as Record<string, unknown>).start) ?? 0), ...(volume !== undefined ? { volume: Math.min(100, Math.max(0, volume)) } : {}) }];
  });
  return {
    ...(base ? { base } : {}),
    ...(preset ? { preset } : {}),
    ...(Object.keys(settings).length ? { settings } : {}),
    duration,
    hitAt,
    ...(raw.loop === true ? { loop: true } : {}),
    ...(sounds.length ? { sounds } : {}),
  };
}

/** The effects a source (a skill, a command, a beat) has, without the ones it does not have: spread it on a beat. */
export function visualEffectsOf(source: VisualEffects | undefined): VisualEffects {
  return {
    ...(source?.effect ? { effect: source.effect } : {}),
    ...(source?.castEffect ? { castEffect: source.castEffect } : {}),
    ...(source?.impactEffect ? { impactEffect: source.impactEffect } : {}),
  };
}

/** A Visual Effect of the database by id, as the game plays it: nothing when the id names no effect, or one that shows nothing. */
export const visualEffectOf = (id: unknown, lookup?: (id: string) => Record<string, unknown> | undefined): PlayableVisualEffect | undefined => {
  if (typeof id !== "string" || !id.trim() || !lookup) return undefined;
  const raw = lookup(id.trim());
  return raw && (raw._type === undefined || raw._type === "visualEffect") ? playableVisualEffect(raw) : undefined;
};

/**
 * The Visual Effects of a skill (`action.visual`): `effect`, from the caster to the target, or with `split` a `castEffect` on the
 * caster and an `impactEffect` on each target. Read from the database by the server (`lookup`), so that the battle data carries them whole.
 */
export function skillVisualEffects(visual: unknown, lookup?: (id: string) => Record<string, unknown> | undefined): VisualEffects {
  if (!isRecord(visual)) return {};
  if (visual.split === true) {
    const castEffect = visualEffectOf(visual.castEffect, lookup);
    const impactEffect = visualEffectOf(visual.impactEffect, lookup);
    return { ...(castEffect ? { castEffect } : {}), ...(impactEffect ? { impactEffect } : {}) };
  }
  const effect = visualEffectOf(visual.effect, lookup);
  return effect ? { effect } : {};
}

/** One moment of the timeline of an effect, in ms from its start: a sound (volume from 0 to 1), the hit, the end. */
export type VisualEffectCue = { at: number; type: "sound"; sound: string; volume: number } | { at: number; type: "hit" } | { at: number; type: "end" };

/** The timeline of an effect, in order: its sounds at their start, the hit at `hitAt`, the end at `duration`. */
export function visualEffectTimeline(effect: PlayableVisualEffect): VisualEffectCue[] {
  const cues: VisualEffectCue[] = [
    ...(effect.sounds ?? []).map((s) => ({ at: s.start, type: "sound" as const, sound: s.sound, volume: (s.volume ?? DEFAULT_VOLUME) / 100 })),
    { at: effect.hitAt, type: "hit" },
    { at: effect.duration, type: "end" },
  ];
  return cues.sort((a, b) => a.at - b.at);
}

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

export interface VisualEffectRunOptions {
  /** Spawns the preset of the effect; returns what stops it. */
  spawn(loop: boolean): () => void;
  /** Waits `ms` of the clock of the scene (the battle clock: hit-stop and speed apply). */
  wait(ms: number): Promise<void>;
  /** Plays a sound of the effect (`volume` from 0 to 1). Without it, the effect is silent. */
  sound?(id: string, volume: number): void;
  /** Called at `hitAt`, once (not at each turn of a loop). */
  onHit?(): void;
  /** Plays the effect once even when it loops (a skill). */
  once?: boolean;
}

/**
 * Plays a Visual Effect: spawns its preset now, plays its sounds at their start and calls `onHit` at `hitAt`. A looping effect (an
 * aura, a status) plays its sounds again at each turn of its timeline until it is stopped.
 */
export function runVisualEffect(effect: PlayableVisualEffect, o: VisualEffectRunOptions): VisualEffectPlayback {
  const loop = !!effect.loop && !o.once;
  const timeline = visualEffectTimeline(effect);
  let stopped = false;
  let hitDone = false;
  let resolveHit!: () => void;
  let resolveDone!: () => void;
  const hit = new Promise<void>((resolve) => (resolveHit = resolve));
  const done = new Promise<void>((resolve) => (resolveDone = resolve));
  const stopSpawn = o.spawn(loop);

  const cycle = (first: boolean) => {
    for (const cue of timeline) {
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
