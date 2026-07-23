import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("@rpgjs/ui-css theme contract", () => {
  test("exports two themes over the same fixture markup", () => {
    const fixture = read("theme-fixture.html");
    expect(fixture).toContain('class="rpg-ui-chat rpg-ui-panel"');
    expect(read("theme-default.css")).toContain("theme-default/theme.css");
    expect(read("theme-pixel.css")).toContain("theme-pixel/theme.css");
  });

  test("base chat primitives use tokens and accessible states", () => {
    const chat = read("src/primitives/chat.css");
    expect(chat).toContain("var(--rpg-ui-chat-width)");
    expect(chat).toContain(":focus-visible");
    expect(chat).toContain("prefers-reduced-motion");
  });
});
