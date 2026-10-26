import { SKIN_COLORS, framesSkin, ghostLayer } from "./default";
import type { Skin } from "./types";

export interface GameSkinOptions {
  /** Colours of the ghost of the item being placed. */
  readonly ghost?: { readonly valid?: number; readonly invalid?: number; readonly alpha?: number };
  /** `"glow"` (default) gives selections a soft halo, `"line"` a plain frame. */
  readonly outline?: "line" | "glow";
  /** Colour of selections and hovers. */
  readonly color?: number;
  /** Makes the ghost pulse. */
  readonly pulse?: boolean;
}

/**
 * A skin for players rather than editors: a glowing outline instead of a
 * technical frame, and a ghost that can pulse and take the colours of the game.
 */
export function gameSkin(options: GameSkinOptions = {}): Skin {
  return framesSkin(
    { color: options.color ?? 0xfacc15, outline: options.outline ?? "glow" },
    ghostLayer({
      valid: options.ghost?.valid ?? SKIN_COLORS.valid,
      invalid: options.ghost?.invalid ?? SKIN_COLORS.invalid,
      alpha: options.ghost?.alpha ?? 0.7,
      pulse: options.pulse ?? false,
    }),
  );
}
