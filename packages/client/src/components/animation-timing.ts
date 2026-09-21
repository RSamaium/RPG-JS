type TimedFrame = { time: number; frameX?: number; frameY?: number };

/** Preserve every pose while fitting a one-shot cycle to its combat phase. */
export function fitAnimationTimeline<T extends TimedFrame>(frames: T[], durationMs: number): Array<T | TimedFrame> {
  if (!frames.length || !Number.isFinite(durationMs) || durationMs <= 0) return frames;
  const last = frames[frames.length - 1];
  const hasEnd = last.frameX == null || last.frameY == null;
  const step = frames.length > 1 ? Math.max(1, last.time - frames[frames.length - 2].time) : 1;
  const end = Math.max(1, last.time + (hasEnd ? 0 : step));
  const durationTicks = durationMs * 60 / 1000;
  const result: Array<T | TimedFrame> = frames.map(frame => ({ ...frame, time: frame.time / end * durationTicks }));
  if (!hasEnd) result.push({ time: durationTicks });
  return result;
}
