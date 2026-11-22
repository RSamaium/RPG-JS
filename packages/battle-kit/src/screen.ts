import type { Container, Filter } from "pixi.js";
import { RGBSplitFilter, ShockwaveFilter, ZoomBlurFilter } from "pixi-filters";

/**
 * Screen-space impact effects on one container (a camera / viewport): zoom
 * blur, shockwave, chromatic split, plus camera shake and hitstop timers.
 * Positions are given in the container's world space and converted with
 * `toGlobal`. Call `update(dt)` every frame.
 */
export class ScreenEffects {
  readonly zoomBlur = new ZoomBlurFilter({ strength: 0, innerRadius: 140 });
  readonly shockwave = new ShockwaveFilter({ center: { x: 0, y: 0 }, amplitude: 16, wavelength: 120, speed: 700, brightness: 1.12, radius: -1 });
  readonly split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  /** Remaining hitstop (ms): choreography clocks slow down while it lasts. */
  hitstop = 0;
  /** Reduced motion: filters and shake are skipped. */
  reduced = false;
  private time = 0;
  private blur = { strength: 0, x: 0, y: 0, until: 0, from: 0 };
  private wave = { until: 0, from: 0 };
  private chroma = { amount: 0, until: 0, from: 0 };
  private shake = { power: 0, until: 0, from: 0 };
  private target: Container | null = null;

  constructor(private toGlobal: (x: number, y: number) => { x: number; y: number } = (x, y) => ({ x, y })) {
    this.zoomBlur.enabled = this.shockwave.enabled = this.split.enabled = false;
  }

  get filters(): Filter[] {
    return [this.zoomBlur, this.shockwave, this.split];
  }

  /** Add the filters to a container (keeping its own filters). */
  attach(container: Container) {
    if (this.target === container) return;
    this.detach();
    this.target = container;
    const current = (container.filters as Filter[] | null) ?? [];
    container.filters = [...current.filter((f) => !this.filters.includes(f)), ...this.filters];
  }

  detach() {
    if (!this.target) return;
    const own = this.filters;
    this.target.filters = ((this.target.filters as Filter[] | null) ?? []).filter((f) => !own.includes(f));
    this.target = null;
  }

  zoomBlurAt(x: number, y: number, strength: number, ms = 240) {
    if (this.reduced) return;
    const g = this.toGlobal(x, y);
    this.blur = { strength, x: g.x, y: g.y, until: this.time + ms, from: this.time };
  }

  shockwaveAt(x: number, y: number, ms = 650) {
    if (this.reduced) return;
    const g = this.toGlobal(x, y);
    this.shockwave.center = { x: g.x, y: g.y };
    this.shockwave.time = 0;
    this.wave = { until: this.time + ms, from: this.time };
  }

  chromatic(amount: number, ms = 320) {
    if (this.reduced) return;
    this.chroma = { amount, until: this.time + ms, from: this.time };
  }

  shakeScreen(power: number, ms = 220) {
    if (this.reduced) return;
    this.shake = { power, until: this.time + ms, from: this.time };
  }

  freeze(ms: number) {
    if (this.reduced) return;
    this.hitstop = Math.max(this.hitstop, ms);
  }

  /** Current shake offset (px). */
  shakeOffset() {
    if (this.time >= this.shake.until) return { x: 0, y: 0 };
    const k = 1 - (this.time - this.shake.from) / Math.max(1, this.shake.until - this.shake.from);
    return { x: Math.sin(this.time * 0.19) * this.shake.power * k, y: Math.cos(this.time * 0.23) * this.shake.power * 0.6 * k };
  }

  /** Advance by `dt` real milliseconds. */
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
