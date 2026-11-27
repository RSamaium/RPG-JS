import { describe, expect, it } from "vitest";
import { TACTICAL_I18N } from "../core/messages";

describe("the texts of the tactical battle", () => {
  it("are in English and in French, with the same keys", () => {
    expect(Object.keys(TACTICAL_I18N).sort()).toEqual(["en", "fr"]);
    expect(Object.keys(TACTICAL_I18N.en).sort()).toEqual(Object.keys(TACTICAL_I18N.fr).sort());
  });

  it("have a text for every key, in both languages", () => {
    for (const language of Object.values(TACTICAL_I18N)) for (const [key, text] of Object.entries(language)) expect(text.trim(), key).not.toBe("");
  });

  it("keep the placeholders of the one in the other", () => {
    for (const [key, text] of Object.entries(TACTICAL_I18N.fr)) {
      const braces = (value: string) => (value.match(/\{[a-z]+\}/g) ?? []).sort();
      expect(braces((TACTICAL_I18N.en as Record<string, string>)[key]), key).toEqual(braces(text));
    }
  });

  it("are not French in the English catalog", () => {
    const french = /[àâçéèêëîïôûù]/i;
    for (const [key, text] of Object.entries(TACTICAL_I18N.en)) expect(french.test(text), `${key}: ${text}`).toBe(false);
  });
});
