/** The theme of a project as the game gets it (`project.theme`): what to put on the game, the built-in theme it starts from, and its css. */
export interface StudioTheme {
  id: string;
  base: "default" | "pixel";
  css: string;
}

const STYLE_ID = "rpgjs-studio-theme";
const BASE_CLASS = /^rpg-ui-theme-/;

/**
 * Applies the theme of the project to the game: the boundary `data-rpg-theme` and the class of its base (`rpg-ui-theme-pixel`) on the
 * root of the game, and its css in one `<style>` element. One theme applies at a time: the next call replaces it, and `undefined` gives
 * the default look back. Only the interfaces made of HTML follow a theme (the ones of `@rpgjs/ui-css`).
 *
 * @param theme - The theme of the project, or nothing when it has none.
 * @param root - The element of the game (`#rpg`). Nothing happens when the game has none.
 */
export const applyStudioTheme = (theme: StudioTheme | undefined, root: HTMLElement | null = document.getElementById("rpg")): void => {
  if (!root) return;
  for (const name of [...root.classList].filter((name) => BASE_CLASS.test(name))) root.classList.remove(name);
  if (root.classList.length === 0) root.removeAttribute("class");
  root.removeAttribute("data-rpg-theme");
  let style = document.getElementById(STYLE_ID);
  if (!theme) {
    style?.remove();
    return;
  }
  root.classList.add(`rpg-ui-theme-${theme.base}`);
  root.setAttribute("data-rpg-theme", theme.id);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = theme.css;
};
