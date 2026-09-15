import { describe, expect, it } from "vitest";
import { effect } from "canvasengine";
import { createLocalePreferences, resolveBrowserLocale } from "./localePreferences";

describe("locale preferences", () => {
  it.each([
    [["fr-CA", "en"], "fr-CA"], [["fr-BE", "en"], "fr"], [["de", "en"], "en"],
    [["ja"], "en"], [["FR-ca"], "fr-CA"],
  ])("negotiates ordered browser languages %s", (languages, result) => {
    expect(resolveBrowserLocale(["en", "fr", "fr-CA"], "en", languages as string[])).toBe(result);
  });
  it("persists per project, reacts to changes, and discards removed languages", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
    const preferences = createLocalePreferences(["en", "fr"], "en", "a", ["en"], storage);
    const seen: string[] = [];
    const subscription = effect(() => { seen.push(preferences.resolve()); });
    preferences.select("fr");
    expect(seen.at(-1)).toBe("fr");
    expect(createLocalePreferences(["en", "fr"], "en", "a", ["en"], storage).resolve()).toBe("fr");
    expect(createLocalePreferences(["en", "fr"], "en", "b", ["en"], storage).resolve()).toBe("en");
    const removed = createLocalePreferences(["en"], "en", "a", ["fr"], storage);
    expect(removed.preference()).toBe("auto");
    expect(removed.resolve()).toBe("en");
    subscription.subscription.unsubscribe();
  });
});
