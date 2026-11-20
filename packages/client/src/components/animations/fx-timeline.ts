import type { VisualEffectSound } from "@rpgjs/common";

/** What happens on the timeline of a visual effect, `at` ms after it was received. */
export type VisualEffectTimelineEvent =
  | { kind: "start"; at: number }
  | { kind: "sound"; at: number; sound: string; volume: number };

const finite = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/**
 * The timeline of a visual effect: its particles start after `delay`, and each
 * sound at its `start` after `delay`.
 *
 * @returns When the particles start, and the timed events (a start at 0 is not one: the effect is drawn at once).
 */
export function visualEffectTimeline(options: { delay?: number; sounds?: VisualEffectSound[] }): {
  startsAt: number;
  events: VisualEffectTimelineEvent[];
} {
  const startsAt = Math.max(0, finite(options.delay, 0));
  const events: VisualEffectTimelineEvent[] = startsAt > 0 ? [{ kind: "start", at: startsAt }] : [];
  for (const entry of Array.isArray(options.sounds) ? options.sounds : []) {
    if (typeof entry?.sound !== "string" || !entry.sound) continue;
    events.push({
      kind: "sound",
      at: startsAt + Math.max(0, finite(entry.start, 0)),
      sound: entry.sound,
      volume: Math.max(0, Math.min(1, finite(entry.volume, 1))),
    });
  }
  return { startsAt, events };
}
