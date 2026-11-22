import { describe, expect, it } from "vitest";
import { installTacticalStyles } from "../client/styles";

/** A page reduced to what the installer touches. */
const page = () => {
  const added: Array<{ attrs: Record<string, string>; textContent: string }> = [];
  const doc = {
    head: { append: (style: (typeof added)[number]) => added.push(style) },
    querySelector: (selector: string) => (selector === "style[data-tactical-rpg]" ? added[0] ?? null : null),
    createElement: () => {
      const style = { attrs: {} as Record<string, string>, textContent: "", setAttribute(name: string, value: string) { style.attrs[name] = value; } };
      return style;
    },
  };
  return { doc: doc as unknown as Document, added };
};

describe("the styles of the tactical battle", () => {
  it("go into the page by the module, once", () => {
    const { doc, added } = page();

    installTacticalStyles(doc);
    installTacticalStyles(doc);

    expect(added).toHaveLength(1);
  });
});
