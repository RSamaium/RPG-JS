/** Options of the smoothing of the characters that are not the current player. */
export interface RemoteSmoothingOptions {
  /** Walk to each received position instead of jumping to it. Defaults to `true`. */
  enabled: boolean;
  /** The walk lasts `factor` x the measured time between two updates. Defaults to `1.5`. */
  factor: number;
  /** Shortest walk, in milliseconds. Defaults to `16`. */
  minDuration: number;
  /** Longest walk, in milliseconds. Defaults to `150`. */
  maxDuration: number;
  /** A silence longer than this (milliseconds) is not a walk: the character jumps. Defaults to `250`. */
  maxGap: number;
  /** A move longer than this (pixels) is a teleport or a map change: the character jumps. Defaults to `128`. */
  teleportDistance: number;
}

export const DEFAULT_REMOTE_SMOOTHING: RemoteSmoothingOptions = {
  enabled: true,
  factor: 1.5,
  minDuration: 16,
  maxDuration: 150,
  maxGap: 250,
  teleportDistance: 128,
};

const positive = (value: unknown, fallback: number, allowZero = false): number =>
  typeof value === "number" && Number.isFinite(value) && (allowZero ? value >= 0 : value > 0) ? value : fallback;

/**
 * Reads the `remoteSmoothing` entry of the client global config: `false` turns it off, an object overrides some of the
 * defaults, anything else gives the defaults. A value that is not a usable number keeps its default.
 */
export function resolveRemoteSmoothingOptions(config: unknown): RemoteSmoothingOptions {
  if (config === false) return { ...DEFAULT_REMOTE_SMOOTHING, enabled: false };
  if (!config || typeof config !== "object") return { ...DEFAULT_REMOTE_SMOOTHING };
  const value = config as Partial<Record<keyof RemoteSmoothingOptions, unknown>>;
  const minDuration = positive(value.minDuration, DEFAULT_REMOTE_SMOOTHING.minDuration, true);
  return {
    enabled: value.enabled !== false,
    factor: positive(value.factor, DEFAULT_REMOTE_SMOOTHING.factor),
    minDuration,
    maxDuration: Math.max(minDuration, positive(value.maxDuration, DEFAULT_REMOTE_SMOOTHING.maxDuration, true)),
    maxGap: positive(value.maxGap, DEFAULT_REMOTE_SMOOTHING.maxGap),
    teleportDistance: positive(value.teleportDistance, DEFAULT_REMOTE_SMOOTHING.teleportDistance),
  };
}

/**
 * Presentation only: shows a character that is not the current player walking to each position the server sent,
 * instead of jumping to it. The walk lasts as long as the measured rhythm of the updates, so it follows the sync
 * rate of the server. It interpolates (about one update of delay) and never goes past the last position received,
 * so a character that stops or turns does not overshoot.
 */
export class RemoteSmoothing {
  private last?: number;
  private interval = 50;

  constructor(private readonly options: () => RemoteSmoothingOptions = () => DEFAULT_REMOTE_SMOOTHING) {}

  /** Duration, in milliseconds, of the walk from `current` to `target` received at `now`. `0` is a jump. */
  duration(current: number, target: number, now: number): number {
    const options = this.options();
    const elapsed = this.last === undefined ? 0 : now - this.last;
    this.last = now;
    if (!options.enabled) return 0;
    // First update, or a long silence: jump.
    if (elapsed <= 0 || elapsed > options.maxGap) return 0;
    // Follows the real rhythm of the server.
    this.interval = (this.interval + elapsed) / 2;
    // Teleport or map change: jump.
    if (Math.abs(target - current) > options.teleportDistance) return 0;
    return Math.max(options.minDuration, Math.min(options.maxDuration, Math.round(this.interval * options.factor)));
  }
}
