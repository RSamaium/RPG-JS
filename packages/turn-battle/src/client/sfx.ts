import { BattleCues, synthNoise, synthTone, type SynthesizedCue } from "@rpgjs/battle-kit";

/**
 * The sound cues of the turn-based battle. Each one plays the sound the game
 * gives it in the `sounds` client option (a sound id of the game, `false`, or a
 * function); without one, a small synthesized sound (WebAudio, no asset).
 */
export type TurnBattleCue =
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

const synthesized: Record<TurnBattleCue, SynthesizedCue> = {
  attack: (v) => synthNoise(0.1, { gain: 0.12 * v, filter: 2000 }),
  cast: (v) => synthTone(440, 0.18, { type: "sine", gain: 0.06 * v, slide: 1.8 }),
  hurt: (v) => synthTone(260, 0.12, { type: "triangle", gain: 0.05 * v, slide: 0.6 }),
  cursor: (v) => synthTone(880, 0.04, { type: "triangle", gain: 0.05 * v }),
  confirm: (v) => {
    synthTone(660, 0.06, { type: "triangle", gain: 0.07 * v });
    synthTone(990, 0.08, { type: "triangle", gain: 0.07 * v, delay: 0.05 });
  },
  back: (v) => synthTone(440, 0.07, { type: "triangle", gain: 0.06 * v, slide: 0.6 }),
  dash: (v) => synthNoise(0.18, { gain: 0.12 * v, filter: 1200 }),
  hit: (v) => {
    synthNoise(0.12, { gain: 0.35 * v, filter: 3000 });
    synthTone(140, 0.12, { type: "sine", gain: 0.25 * v, slide: 0.5 });
  },
  crit: (v) => {
    synthNoise(0.2, { gain: 0.45 * v, filter: 5000 });
    synthTone(220, 0.2, { type: "sawtooth", gain: 0.12 * v, slide: 0.3 });
    synthTone(1760, 0.12, { type: "square", gain: 0.05 * v, delay: 0.03 });
  },
  break: (v) => {
    for (let i = 0; i < 5; i++) synthTone(1400 + Math.random() * 1600, 0.12, { type: "triangle", gain: 0.06 * v, delay: i * 0.025 });
    synthNoise(0.3, { gain: 0.3 * v, filter: 6000 });
  },
  heal: (v) => [523, 659, 784].forEach((f, i) => synthTone(f, 0.18, { type: "sine", gain: 0.07 * v, delay: i * 0.06 })),
  ko: (v) => synthTone(300, 0.4, { type: "sawtooth", gain: 0.08 * v, slide: 0.25 }),
  limit: (v) => {
    synthTone(110, 0.8, { type: "sawtooth", gain: 0.1 * v, slide: 4 });
    synthNoise(0.8, { gain: 0.15 * v, filter: 1800 });
  },
  victory: (v) =>
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
      synthTone(f, i === 5 ? 0.5 : 0.14, { type: "square", gain: 0.05 * v, delay: [0, 0.12, 0.24, 0.36, 0.52, 0.64][i] }),
    ),
};

/** The cues of the battle screen (configured by `provideTurnBattleClient`). */
export const cues = new BattleCues<TurnBattleCue>(synthesized);

/** Plays a cue of the battle. */
export const sfx = (id: TurnBattleCue, volume = 1) => cues.play(id, volume);

/**
 * Plays a sound id of the game (the sound a skill chose) on the `sfx` channel.
 * Returns false when nothing was played, so the caller plays a cue instead.
 */
export const sfxSound = (id: string, volume = 1) => cues.playSound(id, volume);

export const setMuted = (value: boolean) => (cues.muted = value);
export const isMuted = () => cues.muted;
