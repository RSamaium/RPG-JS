import type { RpgClientEngine } from "@rpgjs/client";

/**
 * What a cue of a battle plays: a sound id of the game (registered with
 * `sounds: [...]`), `false` for silence, or a function that plays it.
 */
export type BattleCueSound = string | false | ((engine: RpgClientEngine, volume: number) => void);

/** A synthesized sound: a few tones and noises made with WebAudio, so a battle has sounds before the game gives its own. */
export type SynthesizedCue = (volume: number) => void;

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

/**
 * A tone (oscillator) for a synthesized cue. Does nothing without WebAudio.
 *
 * @param freq - Frequency in Hz
 * @param duration - Length in seconds
 */
export function synthTone(
  freq: number,
  duration: number,
  o: { type?: OscillatorType; gain?: number; slide?: number; delay?: number } = {},
): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + (o.delay ?? 0);
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = o.type ?? "square";
  osc.frequency.setValueAtTime(freq, t);
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * o.slide), t + duration);
  g.gain.setValueAtTime(o.gain ?? 0.08, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

/**
 * A burst of filtered noise for a synthesized cue (a blow, a dash). Does nothing without WebAudio.
 *
 * @param duration - Length in seconds
 */
export function synthNoise(duration: number, o: { gain?: number; filter?: number; delay?: number } = {}): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + (o.delay ?? 0);
  const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * duration), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = o.filter ?? 2400;
  const g = a.createGain();
  g.gain.value = o.gain ?? 0.2;
  src.connect(filter).connect(g).connect(a.destination);
  src.start(t);
}

/**
 * The sound cues of a battle screen (cursor, confirm, hit…). A cue plays the
 * sound the game gave it through `engine.playSound` on the `sfx` channel;
 * without one, the synthesized sound of the battle system. Sound is a bonus:
 * an error never stops the battle. Client only.
 *
 * @example
 * ```ts
 * const cues = new BattleCues<"cursor" | "hit">(
 *   { cursor: (v) => synthTone(880, 0.04, { gain: 0.05 * v }), hit: (v) => synthNoise(0.12, { gain: 0.3 * v }) },
 * );
 * cues.configure(engine, { sounds: { hit: "sword-hit" } });
 * cues.play("hit");
 * ```
 */
export class BattleCues<C extends string> {
  private engine?: RpgClientEngine;
  private sounds: Partial<Record<C, BattleCueSound>> = {};
  /** Muted: no cue plays (the sounds of the effects neither). */
  muted = false;

  /** @param synthesized - The sound of each cue when the game gives none */
  constructor(private readonly synthesized: Record<C, SynthesizedCue>) {}

  /** Binds the cues to the client engine and to the sounds of the game. */
  configure(engine: RpgClientEngine | undefined, o: { sounds?: Partial<Record<C, BattleCueSound>>; muted?: boolean } = {}): void {
    this.engine = engine;
    this.sounds = o.sounds ?? {};
    this.muted = !!o.muted;
  }

  /** Plays a cue at a volume from 0 to 1. */
  play(cue: C, volume = 1): void {
    if (this.muted) return;
    try {
      const sound = this.sounds[cue];
      if (sound === false) return;
      if (typeof sound === "function") return sound(this.engine!, volume);
      if (typeof sound === "string" && this.engine) return void Promise.resolve(this.engine.playSound(sound, { volume, channel: "sfx" })).catch(() => undefined);
      this.synthesized[cue]?.(volume);
    } catch {
      // Audio is a bonus: never break the battle for it.
    }
  }

  /**
   * Plays a sound id of the game (the sound an effect chose) on the `sfx` channel.
   *
   * @returns false when nothing was played (muted, no engine), so the caller can play a cue instead
   */
  playSound(id: string, volume = 1): boolean {
    if (this.muted || !this.engine) return false;
    try {
      void Promise.resolve(this.engine.playSound(id, { volume, channel: "sfx" })).catch(() => undefined);
      return true;
    } catch {
      return false;
    }
  }
}
