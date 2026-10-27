import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyStudioTheme } from "./client-theme";

describe("applyStudioTheme", () => {
  let root: HTMLElement;
  const style = () => document.getElementById("rpgjs-studio-theme") as HTMLStyleElement | null;

  beforeEach(() => {
    root = document.createElement("div");
    root.id = "rpg";
    document.body.appendChild(root);
  });
  afterEach(() => {
    root.remove();
    style()?.remove();
  });

  it("puts the theme on the game: its boundary, the built-in theme it starts from, and its css", () => {
    applyStudioTheme({ id: "t1", base: "default", css: '[data-rpg-theme="t1"] { --rpg-ui-accent: #a4db9a; }' }, root);

    expect(root.getAttribute("data-rpg-theme")).toBe("t1");
    expect(root.classList.contains("rpg-ui-theme-default")).toBe(true);
    expect(style()?.textContent).toContain("--rpg-ui-accent: #a4db9a;");
  });

  it("changes the theme: the css, the boundary and the base are replaced, not added", () => {
    applyStudioTheme({ id: "t1", base: "default", css: "a { color: red }" }, root);
    applyStudioTheme({ id: "pixel", base: "pixel", css: "" }, root);

    expect(root.getAttribute("data-rpg-theme")).toBe("pixel");
    expect(root.classList.contains("rpg-ui-theme-pixel")).toBe(true);
    expect(root.classList.contains("rpg-ui-theme-default")).toBe(false);
    expect(document.querySelectorAll("#rpgjs-studio-theme")).toHaveLength(1);
    expect(style()?.textContent).toBe("");
  });

  it("goes back to the default look when the project has no theme", () => {
    applyStudioTheme({ id: "t1", base: "pixel", css: "a { color: red }" }, root);
    applyStudioTheme(undefined, root);

    expect(root.hasAttribute("data-rpg-theme")).toBe(false);
    expect(root.className).toBe("");
    expect(style()).toBeNull();
  });

  it("does nothing when the game has no root yet", () => {
    root.remove();

    expect(() => applyStudioTheme({ id: "t1", base: "default", css: "" }, null)).not.toThrow();
    expect(style()).toBeNull();
  });
});
