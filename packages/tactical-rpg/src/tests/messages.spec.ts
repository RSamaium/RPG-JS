import { describe, expect, it } from "vitest";
import { messages } from "../core/messages";

describe("the texts of the tactical battle", () => {
  it("are in English and in French, with the same keys", () => {
    expect(Object.keys(messages).sort()).toEqual(["en", "fr"]);
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.fr).sort());
  });

  it("have a text for every key, in both languages", () => {
    for (const language of Object.values(messages)) for (const [key, text] of Object.entries(language)) expect(text.trim(), key).not.toBe("");
  });

  it("keep the placeholders of the one in the other", () => {
    for (const [key, text] of Object.entries(messages.fr)) {
      const braces = (value: string) => (value.match(/\{[a-z]+\}/g) ?? []).sort();
      expect(braces((messages.en as Record<string, string>)[key]), key).toEqual(braces(text));
    }
  });

  it("are not French in the English catalog", () => {
    const french = /[àâçéèêëîïôûù]/i;
    for (const [key, text] of Object.entries(messages.en)) expect(french.test(text), `${key}: ${text}`).toBe(false);
  });
});
