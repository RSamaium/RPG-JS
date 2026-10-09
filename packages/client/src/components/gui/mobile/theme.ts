/** Internal adapter: resolve CSS palette values for canvas-rendered controls. */
export function readMobilePalette(scope: HTMLElement) {
  const css = getComputedStyle(scope);
  const color = (name: string, fallback: string) =>
    css.getPropertyValue("--rpg-ui-" + name).trim() || fallback;
  return {
    surface: color("surface", "#101d35"),
    hover: color("surface-light", "#233c60"),
    background: color("bg", "#080f21"),
    text: color("text", "#eef5ff"),
    accent: color("accent", "#82d7ff"),
    border: color("border", "#6483ac"),
    danger: color("danger", "#f08098"),
  };
}
