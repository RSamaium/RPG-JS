/**
 * Tiny synthesized sound set (WebAudio, no asset). Replace with real sounds
 * through the `sfx` client option.
 */
export type SfxId =
  | "attack"
  | "cast"
  | "hurt"
  | "cursor"
  | "confirm"
  | "back"
  | "hit"
  | "crit"
  | "break"
  | "heal"
  | "ko"
  | "limit"
  | "victory"
  | "dash";

let ctx: AudioContext | null = null;
let muted = false;
let custom: Partial<Record<SfxId, (volume: number) => void>> = {};
let engine: { playSound?: (id: string, options: { volume: number; channel: string }) => unknown } | undefined;

export function configureSfx(o: { muted?: boolean; sounds?: Partial<Record<SfxId, (volume: number) => void>>; engine?: typeof engine }) {
  muted = !!o.muted;
  custom = o.sounds ?? {};
  engine = o.engine;
}

/**
 * Plays an RPGJS sound id (the sound a skill chose) on the sfx channel. Returns false when nothing was played (muted, no
 * engine, an error), so that the caller can play the sound of the battle instead.
 */
export function sfxSound(id: string, volume = 1): boolean {
  if (muted || !engine?.playSound) return false;
  try {
    void engine.playSound(id, { volume, channel: "sfx" });
    return true;
  } catch {
    return false;
  }
}

/** What a battle cue plays: an RPGJS sound id, `false` for silence, or a function that plays it with the engine. */
export type SfxSound = string | false | ((engine: any, volume: number) => void);

/** The players of the cues given by the `sounds` option, bound to the client engine. The other cues keep their synthesized sound. */
export function sfxPlayers(
  sounds: Partial<Record<SfxId, SfxSound>> | undefined,
  engine: any,
): Partial<Record<SfxId, (volume: number) => void>> {
  return Object.fromEntries(
    Object.entries(sounds ?? {}).map(([cue, sound]) => [
      cue,
      (volume: number) => {
        if (sound === false) return;
        if (typeof sound === "function") return sound(engine, volume);
        void engine.playSound?.(sound, { volume, channel: "sfx" });
      },
    ]),
  );
}

export const setMuted = (value: boolean) => (muted = value);
export const isMuted = () => muted;

function audio(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, o: { type?: OscillatorType; gain?: number; slide?: number; delay?: number } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + (o.delay ?? 0);
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = o.type ?? "square";
  osc.frequency.setValueAtTime(freq, t);
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * o.slide), t + dur);
  g.gain.setValueAtTime(o.gain ?? 0.08, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur: number, o: { gain?: number; filter?: number; delay?: number } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + (o.delay ?? 0);
  const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
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

const builtin: Record<SfxId, (v: number) => void> = {
  attack: (v) => noise(0.1, { gain: 0.12 * v, filter: 2000 }),
  cast: (v) => tone(440, 0.18, { type: "sine", gain: 0.06 * v, slide: 1.8 }),
  hurt: (v) => tone(260, 0.12, { type: "triangle", gain: 0.05 * v, slide: 0.6 }),
  cursor: (v) => tone(880, 0.04, { type: "triangle", gain: 0.05 * v }),
  confirm: (v) => {
    tone(660, 0.06, { type: "triangle", gain: 0.07 * v });
    tone(990, 0.08, { type: "triangle", gain: 0.07 * v, delay: 0.05 });
  },
  back: (v) => tone(440, 0.07, { type: "triangle", gain: 0.06 * v, slide: 0.6 }),
  dash: (v) => noise(0.18, { gain: 0.12 * v, filter: 1200 }),
  hit: (v) => {
    noise(0.12, { gain: 0.35 * v, filter: 3000 });
    tone(140, 0.12, { type: "sine", gain: 0.25 * v, slide: 0.5 });
  },
  crit: (v) => {
    noise(0.2, { gain: 0.45 * v, filter: 5000 });
    tone(220, 0.2, { type: "sawtooth", gain: 0.12 * v, slide: 0.3 });
    tone(1760, 0.12, { type: "square", gain: 0.05 * v, delay: 0.03 });
  },
  break: (v) => {
    for (let i = 0; i < 5; i++) tone(1400 + Math.random() * 1600, 0.12, { type: "triangle", gain: 0.06 * v, delay: i * 0.025 });
    noise(0.3, { gain: 0.3 * v, filter: 6000 });
  },
  heal: (v) => [523, 659, 784].forEach((f, i) => tone(f, 0.18, { type: "sine", gain: 0.07 * v, delay: i * 0.06 })),
  ko: (v) => tone(300, 0.4, { type: "sawtooth", gain: 0.08 * v, slide: 0.25 }),
  limit: (v) => {
    tone(110, 0.8, { type: "sawtooth", gain: 0.1 * v, slide: 4 });
    noise(0.8, { gain: 0.15 * v, filter: 1800 });
  },
  victory: (v) =>
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
      tone(f, i === 5 ? 0.5 : 0.14, { type: "square", gain: 0.05 * v, delay: [0, 0.12, 0.24, 0.36, 0.52, 0.64][i] }),
    ),
};

export function sfx(id: SfxId, volume = 1) {
  if (muted) return;
  try {
    (custom[id] ?? builtin[id])(volume);
  } catch {
    // Audio is a bonus: never break the battle for it.
  }
}
