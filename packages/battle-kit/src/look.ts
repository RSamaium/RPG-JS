import { Assets, ColorMatrixFilter, type Texture } from "pixi.js";
import { MotionBlurFilter, RGBSplitFilter, ZoomBlurFilter } from "pixi-filters";

/**
 * The look of one battler sprite: a hit flash, a tint, a glow and a motion
 * blur, as filters given to a CanvasEngine `<Sprite filters={…}>`. Give it
 * `active` (the filters in use, none at rest) so a sprite at rest is drawn
 * without a filter pass. In a reactive `effect`, keep what the sprite was given
 * in a plain variable: reading the `filters` signal there would make the effect
 * depend on what it sets, and run again and again. The battle GUIs drive it from their signals and never
 * touch the renderer: the filters stay inside the battle kit. Client only.
 *
 * @title BattlerLook
 * @example
 * ```ts
 * // in a .ce component
 * const look = new BattlerLook({ motionBlur: true })
 * const filters = signal([])
 * tick(() => {
 *   look.reset()
 *   if (unit.flash() > 0) look.brightness(3.2)
 *   look.motionBlur(unit.blur() * 34)
 *   if (look.changed(filters())) filters.set(look.active)
 * })
 * // <Sprite filters={filters} />
 * ```
 */
export class BattlerLook {
  /** Every filter of the look; give a sprite `active` instead (only those in use). */
  readonly filters: readonly unknown[];
  private readonly color = new ColorMatrixFilter();
  private readonly motion?: MotionBlurFilter;

  /** @param options.motionBlur - Add a horizontal motion blur (off until `motionBlur(v)` is called with a speed) */
  constructor(options: { motionBlur?: boolean } = {}) {
    if (options.motionBlur) {
      this.motion = new MotionBlurFilter({ velocity: { x: 0, y: 0 }, kernelSize: 9 });
      this.motion.enabled = false;
    }
    this.filters = this.motion ? [this.color, this.motion] : [this.color];
    this.color.enabled = false;
  }

  /**
   * The filters in use now: an empty list at rest (no flash, tint or blur), so the sprite is drawn without any filter pass.
   *
   * @prop {readonly unknown[]} active
   * @memberof BattlerLook
   */
  get active(): readonly unknown[] {
    return this.filters.filter((filter) => (filter as { enabled: boolean }).enabled);
  }

  /**
   * Do the filters in use differ from the ones a sprite was given?
   *
   * @param shown - The filters the sprite has now
   * @returns True when `active` should be given to it again
   */
  changed(shown: readonly unknown[]): boolean {
    const active = this.active;
    return active.length !== shown.length || active.some((filter, i) => filter !== shown[i]);
  }

  /** Back to the plain sprite (no flash, no tint). Returns the look, to chain. */
  reset(): this {
    this.color.reset();
    this.color.enabled = false;
    return this;
  }

  /**
   * Brightens (more than 1) or darkens (less than 1) the sprite.
   *
   * @param amount - 1 is the plain sprite
   * @param combine - Applies over the current tint instead of replacing it
   */
  brightness(amount: number, combine = false): this {
    this.color.brightness(amount, combine);
    this.color.enabled = true;
    return this;
  }

  /**
   * Tints the sprite with a colour (a frozen, broken or poisoned unit…).
   *
   * @param color - Hex colour (`0x9fb6ff`)
   * @param combine - Applies over the current brightness instead of replacing it
   */
  tint(color: number, combine = false): this {
    this.color.tint(color, combine);
    this.color.enabled = true;
    return this;
  }

  /**
   * Horizontal motion blur of a sprite that dashes; 0 turns it off. Needs
   * `motionBlur: true` in the constructor.
   *
   * @param speed - Pixels per frame, negative to the left
   */
  motionBlur(speed: number): this {
    if (!this.motion) return this;
    this.motion.enabled = Math.abs(speed) > 0.01;
    this.motion.velocity = { x: speed, y: 0 };
    return this;
  }
}

/**
 * Screen impacts driven by a battle scene's own signals: a zoom blur toward a
 * point and a chromatic split, as filters given to a CanvasEngine
 * `<Container filters={screen.filters}>`. Use {@link ScreenEffects} instead
 * when the battle kit should time the impacts itself. Client only.
 *
 * @title ScreenFilters
 * @example
 * ```ts
 * const screen = new ScreenFilters()
 * const filters = signal([])
 * tick(() => {
 *   screen.zoomBlur(scene.impact(), 0.5 * width, 0.5 * height)
 *   screen.chromatic(scene.split())
 *   // Only the effects playing: no filter pass at all when none plays.
 *   if (screen.changed(filters())) filters.set(screen.active)
 * })
 * // <Container filters={filters}>
 * ```
 */
export class ScreenFilters {
  /** The filters to give to the container (`filters={screen.filters}`). */
  readonly filters: readonly unknown[];
  private readonly zoom = new ZoomBlurFilter({ strength: 0, innerRadius: 40 });
  private readonly split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });

  constructor() {
    this.zoom.enabled = this.split.enabled = false;
    this.filters = [this.zoom, this.split];
  }

  /**
   * The filters of the effects playing now: an empty list when none plays, so the container is drawn without any filter pass
   * (a filter that is only disabled still costs a pass on every frame).
   *
   * @prop {readonly unknown[]} active
   * @memberof ScreenFilters
   */
  get active(): readonly unknown[] {
    return this.filters.filter((filter) => (filter as { enabled: boolean }).enabled);
  }

  /**
   * Do the effects playing differ from the filters a container was given?
   *
   * @param shown - The filters the container has now
   * @returns True when `active` should be given to it again
   */
  changed(shown: readonly unknown[]): boolean {
    const active = this.active;
    return active.length !== shown.length || active.some((filter, i) => filter !== shown[i]);
  }

  /**
   * Zoom blur toward a point of the screen; a strength near 0 turns it off.
   *
   * @param strength - 0 to about 0.3
   * @param x - Screen x of the centre (px)
   * @param y - Screen y of the centre (px)
   */
  zoomBlur(strength: number, x: number, y: number): this {
    this.zoom.enabled = strength > 0.01;
    this.zoom.strength = strength;
    this.zoom.center = { x, y };
    return this;
  }

  /**
   * Chromatic split of a heavy hit; an amount under 0.3 px turns it off.
   *
   * @param amount - Offset of the red and blue channels (px)
   */
  chromatic(amount: number): this {
    this.split.enabled = amount > 0.3;
    this.split.red = { x: -amount, y: 0 };
    this.split.blue = { x: amount, y: amount * 0.3 };
    return this;
  }
}

/**
 * Loads an image (the image of a spritesheet) and gives its size, so a battle
 * can scale battlers before they are drawn. Client only.
 *
 * @title imageSize
 * @param url - URL of the image
 * @returns Its width and height in pixels
 * @example
 * ```ts
 * const { width, height } = await imageSize(sheet.image)
 * ```
 */
export async function imageSize(url: string): Promise<{ width: number; height: number }> {
  const texture = await Assets.load<Texture>(url);
  return { width: texture.width, height: texture.height };
}
