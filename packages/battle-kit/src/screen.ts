import type { Container, Filter } from "pixi.js";
import { RGBSplitFilter, ShockwaveFilter, ZoomBlurFilter } from "pixi-filters";

/**
 * Screen-space impact effects on one container (a camera / viewport): zoom
 * blur, shockwave, chromatic split, plus camera shake and hitstop timers.
 * Positions are given in the container's world space and converted with
 * `toGlobal`. Call `update(dt)` every frame. Each impact fades out on its own
 * over its duration; a new impact of the same kind replaces the running one.
 * Use {@link ScreenFilters} instead when the scene drives the impacts from its
 * own signals. Client only.
 *
 * @title ScreenEffects
 * @example
 * ```ts
 * const screen = new ScreenEffects((x, y) => viewport.toGlobal({ x, y }));
 * screen.attach(viewport);
 * screen.reduced = prefersReducedMotion;
 * ticker.add(({ deltaMS }) => {
 *   screen.update(deltaMS);
 *   const { x, y } = screen.shakeOffset();
 *   viewport.position.set(baseX + x, baseY + y);
 * });
 * screen.zoomBlurAt(target.x, target.y, 0.2);
 * screen.shakeScreen(8);
 * ```
 */
export class ScreenEffects {
  /**
   * The zoom blur filter (driven by `zoomBlurAt`).
   *
   * @prop {ZoomBlurFilter} zoomBlur
   * @memberof ScreenEffects
   */
  readonly zoomBlur = new ZoomBlurFilter({ strength: 0, innerRadius: 140 });
  /**
   * The shockwave filter (driven by `shockwaveAt`).
   *
   * @prop {ShockwaveFilter} shockwave
   * @memberof ScreenEffects
   */
  readonly shockwave = new ShockwaveFilter({ center: { x: 0, y: 0 }, amplitude: 16, wavelength: 120, speed: 700, brightness: 1.12, radius: -1 });
  /**
   * The chromatic split filter (driven by `chromatic`).
   *
   * @prop {RGBSplitFilter} split
   * @memberof ScreenEffects
   */
  readonly split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  /**
   * Remaining hitstop (ms), set by `freeze` and counted down by `update`: the
   * scene reads it to slow or stop its choreography clock while it lasts.
   *
   * @prop {number} hitstop
   * @memberof ScreenEffects
   */
  hitstop = 0;
  /**
   * Reduced motion: new zoom blurs, shockwaves, splits, shakes and hitstops
   * are ignored. Default: false.
   *
   * @prop {boolean} reduced
   * @memberof ScreenEffects
   */
  reduced = false;
  private time = 0;
  private blur = { strength: 0, x: 0, y: 0, until: 0, from: 0 };
  private wave = { until: 0, from: 0 };
  private chroma = { amount: 0, until: 0, from: 0 };
  private shake = { power: 0, until: 0, from: 0 };
  private target: Container | null = null;

  /**
   * @param toGlobal - Converts a world position of the container to a screen
   * position (the filters work in screen space). Default: identity
   */
  constructor(private toGlobal: (x: number, y: number) => { x: number; y: number } = (x, y) => ({ x, y })) {
    this.zoomBlur.enabled = this.shockwave.enabled = this.split.enabled = false;
  }

  /**
   * The three filters (zoom blur, shockwave, split), to add to a container by
   * hand when `attach` does not fit.
   *
   * @prop {Filter[]} filters
   * @memberof ScreenEffects
   */
  get filters(): Filter[] {
    return [this.zoomBlur, this.shockwave, this.split];
  }

  /**
   * Adds the filters to a container, after its own filters. Attaching to
   * another container first detaches from the current one.
   *
   * @title attach
   * @method screen.attach(container)
   * @param {Container} container - The camera / viewport container
   * @returns {void}
   * @memberof ScreenEffects
   * @example
   * ```ts
   * screen.attach(viewport);
   * ```
   */
  attach(container: Container) {
    if (this.target === container) return;
    this.detach();
    this.target = container;
    const current = (container.filters as Filter[] | null) ?? [];
    container.filters = [...current.filter((f) => !this.filters.includes(f)), ...this.filters];
  }

  /**
   * Removes the filters from the attached container, keeping its own ones.
   * Does nothing when not attached.
   *
   * @title detach
   * @method screen.detach()
   * @returns {void}
   * @memberof ScreenEffects
   * @example
   * ```ts
   * onDestroy(() => screen.detach());
   * ```
   */
  detach() {
    if (!this.target) return;
    const own = this.filters;
    this.target.filters = ((this.target.filters as Filter[] | null) ?? []).filter((f) => !own.includes(f));
    this.target = null;
  }

  /**
   * Zoom blur toward a point, fading out over `ms`. Ignored in reduced motion.
   *
   * @title zoomBlurAt
   * @method screen.zoomBlurAt(x, y, strength, ms?)
   * @param {number} x - World x of the centre (px)
   * @param {number} y - World y of the centre (px)
   * @param {number} strength - Initial strength, 0 to about 0.3
   * @param {number} [ms] - Duration (ms). Default: 240
   * @returns {void}
   * @memberof ScreenEffects
   * @example
   * ```ts
   * screen.zoomBlurAt(target.x, target.y, 0.25);
   * ```
   */
  zoomBlurAt(x: number, y: number, strength: number, ms = 240) {
    if (this.reduced) return;
    const g = this.toGlobal(x, y);
    this.blur = { strength, x: g.x, y: g.y, until: this.time + ms, from: this.time };
  }

  /**
   * A shockwave ring from a point, spreading for `ms`. Ignored in reduced
   * motion.
   *
   * @title shockwaveAt
   * @method screen.shockwaveAt(x, y, ms?)
   * @param {number} x - World x of the centre (px)
   * @param {number} y - World y of the centre (px)
   * @param {number} [ms] - Duration (ms). Default: 650
   * @returns {void}
   * @memberof ScreenEffects
   * @example
   * ```ts
   * screen.shockwaveAt(boss.x, boss.y);
   * ```
   */
  shockwaveAt(x: number, y: number, ms = 650) {
    if (this.reduced) return;
    const g = this.toGlobal(x, y);
    this.shockwave.center = { x: g.x, y: g.y };
    this.shockwave.time = 0;
    this.wave = { until: this.time + ms, from: this.time };
  }

  /**
   * Chromatic split of a heavy hit, fading out over `ms` (it turns off below
   * 0.3 px). Ignored in reduced motion.
   *
   * @title chromatic
   * @method screen.chromatic(amount, ms?)
   * @param {number} amount - Initial offset of the red and blue channels (px)
   * @param {number} [ms] - Duration (ms). Default: 320
   * @returns {void}
   * @memberof ScreenEffects
   * @example
   * ```ts
   * screen.chromatic(6);
   * ```
   */
  chromatic(amount: number, ms = 320) {
    if (this.reduced) return;
    this.chroma = { amount, until: this.time + ms, from: this.time };
  }

  /**
   * Camera shake, fading out over `ms`. The effect does not move anything by
   * itself: apply `shakeOffset()` to the camera every frame. Ignored in
   * reduced motion.
   *
   * @title shakeScreen
   * @method screen.shakeScreen(power, ms?)
   * @param {number} power - Initial amplitude (px)
   * @param {number} [ms] - Duration (ms). Default: 220
   * @returns {void}
   * @memberof ScreenEffects
   * @example
   * ```ts
   * screen.shakeScreen(10, 300);
   * ```
   */
  shakeScreen(power: number, ms = 220) {
    if (this.reduced) return;
    this.shake = { power, until: this.time + ms, from: this.time };
  }

  /**
   * Starts a hitstop: raises `hitstop` to `ms` (a shorter one does not
   * shorten the running one). Ignored in reduced motion.
   *
   * @title freeze
   * @method screen.freeze(ms)
   * @param {number} ms - Hitstop length (ms)
   * @returns {void}
   * @memberof ScreenEffects
   * @example
   * ```ts
   * screen.freeze(80);
   * if (screen.hitstop > 0) clock.boost = 0.05;
   * ```
   */
  freeze(ms: number) {
    if (this.reduced) return;
    this.hitstop = Math.max(this.hitstop, ms);
  }

  /**
   * The current shake offset, to add to the camera position.
   *
   * @title shakeOffset
   * @method screen.shakeOffset()
   * @returns {{ x: number; y: number }} Offset in px, `{ x: 0, y: 0 }` when no shake runs
   * @memberof ScreenEffects
   * @example
   * ```ts
   * const { x, y } = screen.shakeOffset();
   * viewport.position.set(baseX + x, baseY + y);
   * ```
   */
  shakeOffset() {
    if (this.time >= this.shake.until) return { x: 0, y: 0 };
    const k = 1 - (this.time - this.shake.from) / Math.max(1, this.shake.until - this.shake.from);
    return { x: Math.sin(this.time * 0.19) * this.shake.power * k, y: Math.cos(this.time * 0.23) * this.shake.power * 0.6 * k };
  }

  /**
   * Advances the effects by real milliseconds: fades the filters, counts the
   * hitstop down. Call it every frame.
   *
   * @title update
   * @method screen.update(dt)
   * @param {number} dt - Real elapsed time (ms)
   * @returns {void}
   * @memberof ScreenEffects
   * @example
   * ```ts
   * ticker.add(({ deltaMS }) => screen.update(deltaMS));
   * ```
   */
  update(dt: number) {
    this.time += dt;
    this.hitstop = Math.max(0, this.hitstop - dt);
    const fade = (from: number, until: number) => (this.time < until ? 1 - (this.time - from) / Math.max(1, until - from) : 0);
    const bk = fade(this.blur.from, this.blur.until);
    this.zoomBlur.enabled = bk > 0.02;
    this.zoomBlur.strength = this.blur.strength * bk;
    this.zoomBlur.center = { x: this.blur.x, y: this.blur.y };
    const wt = this.time < this.wave.until ? (this.time - this.wave.from) / 1000 : -1;
    this.shockwave.enabled = wt >= 0;
    if (wt >= 0) this.shockwave.time = wt;
    const s = this.chroma.amount * fade(this.chroma.from, this.chroma.until);
    this.split.enabled = s > 0.3;
    this.split.red = { x: -s, y: 0 };
    this.split.blue = { x: s, y: 0 };
  }
}
