/**
 * Motion of floating battle numbers, as pure functions of their age (ms), so
 * any renderer (CanvasEngine component, raw Pixi text) animates them the same.
 */
export const backOut = (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;

export interface PopupMotion {
  /** Vertical offset (px, negative = up). */
  y: number;
  scale: number;
  alpha: number;
  done: boolean;
}

/** A whole number: drops in with a bounce and a pop, holds, then lifts and fades. */
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

/** One digit of a number: digits drop one after another (`stagger` ms apart). */
export function digitMotion(age: number, index: number, stagger = 32): { y: number; alpha: number } {
  const k = Math.min(1, Math.max(0, age - index * stagger) / 260);
  return {
    y: -34 * (1 - backOut(k)) - Math.sin(k * Math.PI) * 18,
    alpha: Math.min(1, Math.max(0, age - index * stagger) / 90),
  };
}

/** Lift-and-fade of a whole popup after it has been read (digit popups). */
export function popupLift(age: number, chars: number): { y: number; alpha: number; done: boolean } {
  const hold = 800 + chars * 32;
  const lift = Math.max(0, (age - hold) / 320);
  return { y: -30 * Math.min(1, lift), alpha: 1 - Math.min(1, lift), done: age > hold + 450 };
}
