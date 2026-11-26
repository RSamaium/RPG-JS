/**
 * Element colours (CSS hex strings), shared by effects and HUDs: `physical`,
 * `fire`, `ice`, `thunder`, `light`, `dark`, `wind`, `earth`, `water` and
 * `heal`. The object is frozen. Any runtime.
 *
 * @title ELEMENT_COLORS
 * @prop {Readonly<Record<string, string>>} ELEMENT_COLORS
 * @example
 * ```ts
 * import { ELEMENT_COLORS } from "@rpgjs/battle-kit/pure";
 *
 * ELEMENT_COLORS.fire; // "#ff7a2a"
 * ```
 */
export const ELEMENT_COLORS: Readonly<Record<string, string>> = Object.freeze({
  physical: "#bff4ff",
  fire: "#ff7a2a",
  ice: "#7fdcff",
  thunder: "#fff06a",
  light: "#ffe9a8",
  dark: "#a56bff",
  wind: "#8dffb0",
  earth: "#d9b27a",
  water: "#4aa8ff",
  heal: "#7dffb2",
});

/**
 * The CSS colour of an element. A missing or unknown element falls back to
 * the `physical` colour. Any runtime.
 *
 * @title elementColor
 * @method elementColor(element?)
 * @param {string} [element] - Element id (`"fire"`). Default: `"physical"`
 * @returns {string} A CSS hex colour (`"#ff7a2a"`)
 * @example
 * ```ts
 * fx.play("fireball", x, y, { color: elementColor(skill.element) });
 * ```
 */
export const elementColor = (element?: string) => ELEMENT_COLORS[element ?? "physical"] ?? ELEMENT_COLORS.physical;

/** 0xrrggbb → "#rrggbb". */
export const toCss = (color: number) => `#${color.toString(16).padStart(6, "0")}`;

/** "#rrggbb" → 0xrrggbb. */
export const toHex = (css: string) => Number.parseInt(css.replace("#", ""), 16);
