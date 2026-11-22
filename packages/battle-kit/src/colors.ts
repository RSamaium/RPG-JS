/** Element colours (CSS), shared by effects and HUDs. Unknown elements fall back to `physical`. */
export const ELEMENT_COLORS: Record<string, string> = {
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
};

export const elementColor = (element?: string) => ELEMENT_COLORS[element ?? "physical"] ?? ELEMENT_COLORS.physical;

/** 0xrrggbb → "#rrggbb". */
export const toCss = (color: number) => `#${color.toString(16).padStart(6, "0")}`;

/** "#rrggbb" → 0xrrggbb. */
export const toHex = (css: string) => Number.parseInt(css.replace("#", ""), 16);
