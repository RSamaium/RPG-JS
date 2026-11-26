import type { RpgClientEngine } from "@rpgjs/client";

/**
 * What a cue of a battle plays: a sound id of the game (registered with
 * `sounds: [...]`, played on the `sfx` channel), `false` for silence, or a
 * function that plays it (`volume` from 0 to 1). Client only.
 *
 * @title BattleCueSound
 * @example
 * ```ts
 * const sounds: Record<string, BattleCueSound> = {
 *   hit: "sword-hit",
 *   cursor: false,
 *   victory: (engine, volume) => engine.playSound("fanfare", { volume, channel: "bgm" }),
 * };
 * ```
 */
export type BattleCueSound = string | false | ((engine: RpgClientEngine, volume: number) => void);

/**
 * A synthesized sound: a few tones and noises made with WebAudio (`synthTone`,
 * `synthNoise`), so a battle has sounds before the game gives its own.
 * Receives the volume, from 0 to 1. Client only.
 *
 * @title SynthesizedCue
 * @example
 * ```ts
 * const confirm: SynthesizedCue = (v) => {
 *   synthTone(660, 0.06, { gain: 0.06 * v });
 *   synthTone(990, 0.08, { gain: 0.06 * v, delay: 0.05 });
 * };
 * ```
 */
export type SynthesizedCue = (volume: number) => void;

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

/**
 * A tone (oscillator) for a synthesized cue, fading out over its length. The
 * shared `AudioContext` is created (or resumed) on the first call. Does
 * nothing without WebAudio. Client only.
 *
 * @title synthTone
 * @method synthTone(freq, duration, o?)
 * @param {number} freq - Frequency in Hz
 * @param {number} duration - Length in seconds
 * @param {object} [o] - Options
 * @param {OscillatorType} [o.type] - Waveform. Default: `"square"`
 * @param {number} [o.gain] - Start volume. Default: 0.08
 * @param {number} [o.slide] - Frequency multiplier reached at the end (0.5 slides an octave down; never below 30 Hz)
 * @param {number} [o.delay] - Start delay in seconds. Default: 0
 * @returns {void}
 * @example
 * ```ts
 * synthTone(880, 0.05, { gain: 0.05 });                 // cursor blip
 * synthTone(440, 0.3, { type: "sawtooth", slide: 0.5 }); // falling tone
 * ```
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
 * A burst of low-pass filtered noise for a synthesized cue (a blow, a dash),
 * fading out over its length. Does nothing without WebAudio. Client only.
 *
 * @title synthNoise
 * @method synthNoise(duration, o?)
 * @param {number} duration - Length in seconds
 * @param {object} [o] - Options
 * @param {number} [o.gain] - Volume. Default: 0.2
 * @param {number} [o.filter] - Low-pass cut-off frequency in Hz. Default: 2400
 * @param {number} [o.delay] - Start delay in seconds. Default: 0
 * @returns {void}
 * @example
 * ```ts
 * synthNoise(0.12, { gain: 0.3, filter: 1200 }); // a blow
 * ```
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
 * @title BattleCues
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
  /**
   * Muted: no cue plays (the sounds of the effects neither). Default: false.
   *
   * @prop {boolean} muted
   * @memberof BattleCues
   */
  muted = false;

  /** @param synthesized - The synthesized sound of each cue, played when the game gives none */
  constructor(private readonly synthesized: Record<C, SynthesizedCue>) {}

  /**
   * Binds the cues to the client engine and to the sounds of the game.
   * Replaces the previous sounds and mute state.
   *
   * @title configure
   * @method cues.configure(engine, o?)
   * @param {RpgClientEngine | undefined} engine - The client engine; without it, sound ids are not played (the synthesized sounds are)
   * @param {object} [o] - Options
   * @param {Partial<Record<C, BattleCueSound>>} [o.sounds] - The sound of each cue given by the game
   * @param {boolean} [o.muted] - Mute every cue. Default: false
   * @returns {void}
   * @memberof BattleCues
   * @example
   * ```ts
   * cues.configure(engine, { sounds: { hit: "sword-hit", cursor: false }, muted: options.muted });
   * ```
   */
  configure(engine: RpgClientEngine | undefined, o: { sounds?: Partial<Record<C, BattleCueSound>>; muted?: boolean } = {}): void {
    this.engine = engine;
    this.sounds = o.sounds ?? {};
    this.muted = !!o.muted;
  }

  /**
   * Plays a cue: the game's sound for it, or its synthesized sound. Does
   * nothing when muted or when the cue is set to `false`; errors are
   * swallowed.
   *
   * @title play
   * @method cues.play(cue, volume?)
   * @param {C} cue - Name of the cue
   * @param {number} [volume] - From 0 to 1. Default: 1
   * @returns {void}
   * @memberof BattleCues
   * @example
   * ```ts
   * cues.play("cursor");
   * cues.play("hit", 0.6);
   * ```
   */
  play(cue: C, volume = 1): void {
    if (this.muted) return;
    try {
      const sound = this.sounds[cue];
      if (sound === false) return;
      // A sound of the game (an id or a function) needs the engine; without it, the synthesized one plays.
      if (typeof sound === "function" && this.engine) return sound(this.engine, volume);
      if (typeof sound === "string" && this.engine) return void Promise.resolve(this.engine.playSound(sound, { volume, channel: "sfx" })).catch(() => undefined);
      this.synthesized[cue]?.(volume);
    } catch {
      // Audio is a bonus: never break the battle for it.
    }
  }

  /**
   * Plays a sound id of the game (the sound an effect chose) on the `sfx` channel.
   *
   * @title playSound
   * @method cues.playSound(id, volume?)
   * @param {string} id - Sound id of the game
   * @param {number} [volume] - From 0 to 1. Default: 1
   * @returns {boolean} false when nothing was played (muted, no engine), so the caller can play a cue instead
   * @memberof BattleCues
   * @example
   * ```ts
   * if (!cues.playSound(effectSound, 0.8)) cues.play("hit");
   * ```
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
