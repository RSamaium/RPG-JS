/**
 * Presentation clock. Everything choreographed (tweens, waits, sprite frames,
 * particles) runs on scaled time: battle speed, skip and hit-stop are just
 * changes of this clock.
 */
export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inCubic: (t: number) => t ** 3,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  outBack: (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
  outExpo: (t: number) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  inQuad: (t: number) => t * t,
};

interface Tween {
  start: number;
  duration: number;
  update: (t: number) => void;
  ease: Ease;
  resolve: () => void;
}

export class Clock {
  now = 0;
  speed = 1;
  /** Temporary multiplier (skip / slow-motion), stacked on `speed`. */
  boost = 1;
  private frozenFor = 0;
  private waits: { at: number; resolve: () => void }[] = [];
  private tweens = new Set<Tween>();

  /** Advance with real elapsed ms; returns the scaled delta actually applied. */
  tick(realMs: number): number {
    if (this.frozenFor > 0) {
      this.frozenFor -= realMs;
      return 0;
    }
    const dt = Math.min(realMs, 100) * this.speed * this.boost;
    this.now += dt;
    for (const tw of [...this.tweens]) {
      const t = Math.min(1, (this.now - tw.start) / tw.duration);
      tw.update(tw.ease(t));
      if (t >= 1) {
        this.tweens.delete(tw);
        tw.resolve();
      }
    }
    if (this.waits.length) {
      const due = this.waits.filter((w) => w.at <= this.now);
      this.waits = this.waits.filter((w) => w.at > this.now);
      due.forEach((w) => w.resolve());
    }
    return dt;
  }

  wait(ms: number): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => this.waits.push({ at: this.now + ms, resolve }));
  }

  tween(duration: number, update: (t: number) => void, e: Ease = ease.outCubic): Promise<void> {
    if (duration <= 0) {
      update(1);
      return Promise.resolve();
    }
    update(e(0));
    return new Promise((resolve) =>
      this.tweens.add({ start: this.now, duration, update, ease: e, resolve }),
    );
  }

  /** Hit-stop: freeze choreography for real milliseconds. */
  freeze(realMs: number) {
    this.frozenFor = Math.max(this.frozenFor, realMs);
  }

  /** Resolve everything pending (battle torn down). */
  flush() {
    for (const tw of this.tweens) {
      tw.update(1);
      tw.resolve();
    }
    this.tweens.clear();
    this.waits.forEach((w) => w.resolve());
    this.waits = [];
  }
}
