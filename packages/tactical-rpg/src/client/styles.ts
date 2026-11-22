import tacticalCss from "../styles/tactical.css";
import cinematicCss from "../styles/cinematic-hud.css";
import hudCss from "../styles/hud.css";
import surfacesCss from "../styles/theme-surfaces.css";

/**
 * The styles of the battle go into the page by the module itself: the page of a published game (`sandbox.html`) links the stylesheet of the
 * interface only, never the one a build makes of the CSS the modules import, so the HUD would be drawn without style online.
 */
export function installTacticalStyles(doc: Document | undefined = typeof document === "undefined" ? undefined : document): void {
  if (!doc || doc.querySelector("style[data-tactical-rpg]")) return;
  const style = doc.createElement("style");
  style.setAttribute("data-tactical-rpg", "");
  style.textContent = [tacticalCss, cinematicCss, hudCss, surfacesCss].join("\n");
  doc.head.append(style);
}
