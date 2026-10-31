/**
 * Emotion bubbles: small icons shown above a player or an event.
 *
 * The icon sheet is a 6x5 grid. Each emotion maps to a `[column, row]` cell.
 */

/** Id of the component animation that renders emotion bubbles. */
export const EMOTION_BUBBLE_ANIMATION_ID = "emotion-bubble";

/** Size and grid of the default icon sheet. */
export const EMOTION_BUBBLE_SHEET = {
  width: 192,
  height: 190,
  framesWidth: 6,
  framesHeight: 5,
} as const;

/** Emotion name -> `[column, row]` in the default icon sheet. */
export const EMOTION_BUBBLES = {
  confusion: [0, 0],
  question: [1, 0],
  "like-break": [2, 0],
  surprise: [3, 0],
  "two-dot": [4, 0],
  dollar: [5, 0],
  stars: [0, 1],
  music: [1, 1],
  like: [2, 1],
  exclamation: [3, 1],
  "one-dot": [4, 1],
  jaded: [5, 1],
  star: [0, 2],
  haha: [1, 2],
  sad: [2, 2],
  beads: [3, 2],
  cross: [4, 2],
  hungry: [5, 2],
  zz: [0, 3],
  idea: [1, 3],
  happy: [2, 3],
  bead: [3, 3],
  cloud: [4, 3],
  surprise2: [5, 3],
  z: [0, 4],
  likes: [1, 4],
  empty: [2, 4],
  "three-dot": [3, 4],
  circle: [4, 4],
  hungry2: [5, 4],
} as const satisfies Record<string, readonly [number, number]>;

export type EmotionBubble = keyof typeof EMOTION_BUBBLES;

export interface EmotionBubbleOptions {
  /** Display time in ms once the icon has popped in. Default: `1700`. */
  hold?: number;
  /** Scale of the icon. Default: `2`. */
  size?: number;
  /** Horizontal offset from the center of the character. Default: `0`. */
  offsetX?: number;
  /** Vertical offset from the top of the character. Default: `-8`. */
  offsetY?: number;
  /** Custom icon sheet URL. Defaults to the sheet bundled with the client. */
  image?: string;
  /** Width of the custom sheet image in pixels. */
  width?: number;
  /** Height of the custom sheet image in pixels. */
  height?: number;
  /** Number of columns of the custom sheet. */
  framesWidth?: number;
  /** Number of rows of the custom sheet. */
  framesHeight?: number;
  /** `[column, row]` of the icon. Required for emotions not in the default table. */
  frame?: readonly [number, number];
}
