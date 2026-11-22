import type { Unit } from "../core/types";

/** The images of the portraits the game gave by id (`studio-face:<media>`, `studio-image:<media>`), registered by the game before the battle. */
export const portraitUrls: Record<string, string> = {};

/** CSS of a unit portrait (HUD sheets, cut-ins): its `portrait` image, or a plain crest. A faceset is a grid of faces: the first one (neutral) is shown. */
export function portraitStyle(unit: Unit | undefined | null) {
  const portrait = unit?.portrait;
  if (portrait?.startsWith("studio-")) {
    const url = portraitUrls[portrait];
    if (url) return portrait.startsWith("studio-face:") ? `background-image:url("${url}");background-size:300% 400%;background-position:0 0` : `background-image:url("${url}");background-size:contain;background-repeat:no-repeat;background-position:50% 50%`;
  } else if (portrait) return `background-image:url("${unit.portrait}");background-size:cover;background-position:50% 0%`;
  const tint = unit?.team === "enemy" ? "color-mix(in srgb, var(--rpg-ui-danger, #ef4444) 30%, var(--rpg-ui-bg, #0b0f16))" : "color-mix(in srgb, var(--rpg-ui-accent, #38bdf8) 25%, var(--rpg-ui-bg, #0b0f16))";
  return `background:radial-gradient(circle at 50% 35%, ${tint}, var(--rpg-ui-bg, #0b0f16) 70%)`;
}
