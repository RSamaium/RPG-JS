/**
 * Motion of floating battle numbers, as pure functions of their age (ms), so
 * any renderer (CanvasEngine component, raw Pixi text) animates them the same.
 */
import { ease } from "./clock";

const backOut = ease.outBack;

/**
 * The state of a floating number at a given age, as `popupMotion` returns
 * it. Any runtime.
 *
 * @title PopupMotion
 * @example
 * ```ts
 * const m: PopupMotion = popupMotion(age);
 * text.y = baseY + m.y;
 * text.scale = m.scale;
 * text.alpha = m.alpha;
 * ```
 */
export interface PopupMotion {
  /**
   * Vertical offset from the anchor (px, negative = up).
   *
   * @prop {number} y
   * @memberof PopupMotion
   */
  y: number;
  /**
   * Scale of the number (pops from 0.6 to 1.3, then settles at 1).
   *
   * @prop {number} scale
   * @memberof PopupMotion
   */
  scale: number;
  /**
   * Opacity, from 1 to 0 during the final lift.
   *
   * @prop {number} alpha
   * @memberof PopupMotion
   */
  alpha: number;
  /**
   * True once the popup has lived its `life`: remove it.
   *
   * @prop {boolean} done
   * @memberof PopupMotion
   */
  done: boolean;
}

/**
 * Motion of a floating number shown as a whole (damage, heal, "Miss"): it
 * drops in with a bounce and a pop, holds, then lifts and fades during its
 * last 400 ms. A pure function of its age, so every renderer animates it the
 * same. Any runtime.
 *
 * @title popupMotion
 * @method popupMotion(age, life?)
 * @param {number} age - Time since the popup appeared (ms)
 * @param {number} [life] - Total lifetime (ms). Default: 1100
 * @returns {PopupMotion} Offset, scale, opacity and whether it is over
 * @example
 * ```ts
 * tick(({ deltaTime }) => {
 *   age += deltaTime;
 *   const m = popupMotion(age);
 *   y.set(baseY + m.y);
 *   scale.set(m.scale);
 *   alpha.set(m.alpha);
 *   if (m.done) remove();
 * });
 * ```
 */
export function popupMotion(age: number, life = 1100): PopupMotion {
  if (age >= life) return { y: -30, scale: 1, alpha: 0, done: true };
  const drop = Math.min(1, Math.max(0, age) / 260);
  const lift = Math.max(0, (age - (life - 400)) / 400);
  const pop = age < 120 ? 0.6 + (age / 120) * 0.7 : Math.max(1, 1.3 - (age - 120) / 400);
  return {
    y: -26 * (1 - backOut(drop)) - Math.sin(drop * Math.PI) * 16 - lift * 30,
    scale: pop,
    alpha: 1 - lift,
    done: false,
  };
}

/**
 * Motion of one digit of a floating number: the digits drop in one after
 * another, `stagger` ms apart, with a bounce. Combine it with `popupLift` for
 * the fade of the whole number. Any runtime.
 *
 * @title digitMotion
 * @method digitMotion(age, index, stagger?)
 * @param {number} age - Time since the number appeared (ms)
 * @param {number} index - Position of the digit, 0 for the first
 * @param {number} [stagger] - Delay between two digits (ms). Default: 32
 * @returns {{ y: number; alpha: number }} Vertical offset (px, negative = up) and opacity of the digit
 * @example
 * ```ts
 * digits.forEach((digit, i) => {
 *   const d = digitMotion(age, i);
 *   digit.y = d.y;
 *   digit.alpha = d.alpha;
 * });
 * ```
 */
export function digitMotion(age: number, index: number, stagger = 32): { y: number; alpha: number } {
  const k = Math.min(1, Math.max(0, age - index * stagger) / 260);
  return {
    y: -34 * (1 - backOut(k)) - Math.sin(k * Math.PI) * 18,
    alpha: Math.min(1, Math.max(0, age - index * stagger) / 90),
  };
}

/**
 * Lift-and-fade of a whole digit popup once it has been read: it holds for
 * `800 + chars * 32` ms, lifts by 30 px while fading over 320 ms, and is done
 * 450 ms after the hold. Any runtime.
 *
 * @title popupLift
 * @method popupLift(age, chars)
 * @param {number} age - Time since the number appeared (ms)
 * @param {number} chars - Number of characters shown (longer numbers stay longer)
 * @returns {{ y: number; alpha: number; done: boolean }} Offset of the whole popup (px), its opacity, and whether it is over
 * @example
 * ```ts
 * const lift = popupLift(age, String(damage).length);
 * container.y = baseY + lift.y;
 * container.alpha = lift.alpha;
 * if (lift.done) remove();
 * ```
 */
export function popupLift(age: number, chars: number): { y: number; alpha: number; done: boolean } {
  const hold = 800 + chars * 32;
  const lift = Math.max(0, (age - hold) / 320);
  return { y: -30 * Math.min(1, lift), alpha: 1 - Math.min(1, lift), done: age > hold + 450 };
}
