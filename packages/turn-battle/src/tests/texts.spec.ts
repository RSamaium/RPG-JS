import { afterEach, describe, expect, it } from "vitest";
import { followLocale, t, TEXTS, TEXTS_BY_LOCALE } from "../client/texts";

describe("texts of the turn battle", () => {
  afterEach(() => {
    followLocale(() => "en");
    for (const key of Object.keys(TEXTS)) delete TEXTS[key];
  });

  it("holds every key of English in French", () => {
    expect(Object.keys(TEXTS_BY_LOCALE.fr).sort()).toEqual(Object.keys(TEXTS_BY_LOCALE.en).sort());
  });

  it("translates in the language of the game", () => {
    followLocale(() => "fr");
    expect(t("tb.attack")).toBe("Attaque");
    followLocale(() => "en");
    expect(t("tb.attack")).toBe("Attack");
  });

  it("falls back to the base language, then to English", () => {
    followLocale(() => "fr-CA");
    expect(t("tb.guard")).toBe("Défense");
    followLocale(() => "ja");
    expect(t("tb.guard")).toBe("Guard");
  });

  it("lets the texts of the game win over the catalog", () => {
    TEXTS["tb.attack"] = "Strike";
    expect(t("tb.attack")).toBe("Strike");
  });
});
