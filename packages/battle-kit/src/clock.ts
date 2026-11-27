/**
 * Presentation clock. Everything choreographed (tweens, waits, sprite frames,
 * particles) runs on scaled time: battle speed, skip and hit-stop are just
 * changes of this clock.
 */

/**
 * An easing function: maps a progress from 0 to 1 to an eased progress
 * (usually from 0 to 1, `outBack` overshoots a little). Any runtime.
 *
 * @title Ease
 * @prop {(t: number) => number} Ease
 * @example
 * ```ts
 * const smoothStep: Ease = (t) => t * t * (3 - 2 * t);
 * await clock.tween(300, (k) => (sprite.alpha = k), smoothStep);
 * ```
 */
export type Ease = (t: number) => number;

/**
 * The built-in easing functions of the battle kit: `linear`, `outCubic`
 * (the default of `Clock.tween`), `inCubic`, `inOutCubic`, `outBack`
 * (overshoots then settles), `outExpo` and `inQuad`. Each takes a progress
 * from 0 to 1. Any runtime.
 *
 * @title ease
 * @prop {Record<string, Ease>} ease
 * @example
 * ```ts
 * import { ease } from "@rpgjs/battle-kit/pure";
 *
 * await clock.tween(400, (k) => (unit.x = from + (to - from) * k), ease.outBack);
 * ease.inOutCubic(0.5); // 0.5
 * ```
 */
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

/**
 * The presentation clock of a battle scene. Everything choreographed (tweens,
 * waits, sprite frames, particles) runs on its scaled time, so the battle
 * speed, a skip and a hit-stop are only changes of this clock. Feed it the
 * real elapsed time with `tick` every frame. It has no renderer dependency.
 * Any runtime.
 *
 * @title Clock
 * @example
 * ```ts
 * import { Clock, ease } from "@rpgjs/battle-kit/pure";
 *
 * const clock = new Clock();
 * clock.speed = 2;                               // battle speed x2
 * ticker.add(({ deltaMS }) => clock.tick(deltaMS));
 *
 * await clock.tween(300, (k) => (sprite.x = 100 * k), ease.outCubic);
 * clock.freeze(80);                              // hit-stop
 * await clock.wait(500);
 * ```
 */
export class Clock {
  /**
   * Current scaled time (ms) since the clock was created.
   *
   * @prop {number} now
   * @memberof Clock
   */
  now = 0;
  /**
   * Battle speed multiplier (1 = normal, 2 = twice as fast). Default: 1.
   *
   * @prop {number} speed
   * @memberof Clock
   */
  speed = 1;
  /**
   * Temporary multiplier (skip / slow-motion), stacked on `speed`. Default: 1.
   *
   * @prop {number} boost
   * @memberof Clock
   */
  boost = 1;
  private frozenFor = 0;
  private waits: { at: number; resolve: () => void }[] = [];
  private tweens = new Set<Tween>();

  /**
   * Advances the clock by real elapsed milliseconds: runs the tweens and
   * resolves the waits that are due. The real time is capped at 100 ms per
   * call (a frame after a hidden tab does not jump the battle) and scaled by
   * `speed * boost`. While a hit-stop (`freeze`) lasts, nothing moves.
   *
   * @title tick
   * @method clock.tick(realMs)
   * @param {number} realMs - Real elapsed time since the last call (ms)
   * @returns {number} The scaled delta actually applied (ms), 0 while frozen
   * @memberof Clock
   * @example
   * ```ts
   * ticker.add(({ deltaMS }) => {
   *   const dt = clock.tick(deltaMS);
   *   fx.update(dt);
   * });
   * ```
   */
  tick(realMs: number): number {
    if (this.frozenFor > 0) {
      this.frozenFor -= realMs;
      return 0;
    }
    const dt = Math.min(realMs, 100) * this.speed * this.boost;
    this.now += dt;
    for (const tw of [...this.tweens]) {
      const t = Math.min(1, (this.now - tw.start) / tw.duration);
      try {
        tw.update(tw.ease(t));
      } catch (error) {
        // A broken animation ends here: it must not hold the other tweens and every wait of the battle.
        console.error("[Clock] a tween failed", error);
        this.tweens.delete(tw);
        tw.resolve();
        continue;
      }
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

  /**
   * Waits on the scaled time of the clock (battle speed and hit-stop apply).
   *
   * @title wait
   * @method clock.wait(ms)
   * @param {number} ms - Scaled time to wait (ms); 0 or less resolves at once
   * @returns {Promise<void>} Resolves once the clock has advanced by `ms`, or on `flush`
   * @memberof Clock
   * @example
   * ```ts
   * await clock.wait(400);
   * showDamage();
   * ```
   */
  wait(ms: number): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => this.waits.push({ at: this.now + ms, resolve }));
  }

  /**
   * Animates a value from 0 to 1 over a scaled duration. `update` is called
   * once right away with the eased start, then at each `tick`, and finally
   * with 1.
   *
   * @title tween
   * @method clock.tween(duration, update, e?)
   * @param {number} duration - Scaled length (ms); 0 or less calls `update(1)` at once
   * @param {(t: number) => void} update - Receives the eased progress
   * @param {Ease} [e] - Easing function. Default: `ease.outCubic`
   * @returns {Promise<void>} Resolves when the tween ends, or on `flush`
   * @memberof Clock
   * @example
   * ```ts
   * await clock.tween(250, (k) => (sprite.alpha = 1 - k), ease.linear);
   * ```
   */
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

  /**
   * Hit-stop: freezes the choreography for real milliseconds. A shorter freeze
   * during a longer one does not shorten it.
   *
   * @title freeze
   * @method clock.freeze(realMs)
   * @param {number} realMs - Real time to stay frozen (ms)
   * @returns {void}
   * @memberof Clock
   * @example
   * ```ts
   * onCriticalHit(() => clock.freeze(90));
   * ```
   */
  freeze(realMs: number) {
    this.frozenFor = Math.max(this.frozenFor, realMs);
  }

  /**
   * Is something still running on the clock: a tween, or a wait not yet over?
   *
   * @title busy
   * @prop {boolean} busy
   * @memberof Clock
   * @example
   * ```ts
   * while (clock.busy) clock.flush();
   * ```
   */
  get busy(): boolean {
    return this.tweens.size > 0 || this.waits.length > 0;
  }

  /**
   * Ends everything pending: each tween gets `update(1)` and resolves, each
   * wait resolves. Call it when the battle scene is torn down so no
   * choreography stays blocked.
   *
   * @title flush
   * @method clock.flush()
   * @returns {void}
   * @memberof Clock
   * @example
   * ```ts
   * onDestroy(() => clock.flush());
   * ```
   */
  flush() {
    const tweens = [...this.tweens];
    this.tweens.clear();
    for (const tw of tweens) {
      try {
        tw.update(1);
      } catch (error) {
        // As in `tick`: a broken animation must not leave the others and the waits pending.
        console.error("[Clock] a tween failed", error);
      }
      tw.resolve();
    }
    this.waits.forEach((w) => w.resolve());
    this.waits = [];
  }
}
