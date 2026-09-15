import { describe, expect, test } from "vitest";
import { Context, injector } from "@signe/di";
import {
  createI18nProvider,
  getOrCreateI18nService,
  registerI18nMessages,
} from "./i18n";

describe("i18n service", () => {
  test("lists only game catalogues, with a default when none exist", () => {
    const service = getOrCreateI18nService(null, { defaultLocale: "ja" });
    service.addMessages({ en: { hello: "Hello" }, fr: { hello: "Bonjour" } }, "rpgjs-client", 0);
    expect(service.getAvailableLocales()).toEqual(["ja"]);
    service.configure({ messages: { de: { hello: "Hallo" }, es: { hello: "Hola" } } });
    expect(service.getAvailableLocales()).toEqual(["de", "es"]);
    expect(getOrCreateI18nService(null, { messages: { fr: {} } }).getAvailableLocales()).toEqual(["fr"]);
  });
  test("translates with fallback locale and raw key fallback", () => {
    const service = getOrCreateI18nService(null, {
      defaultLocale: "fr",
      fallbackLocale: "en",
      messages: {
        en: {
          "npc.hello": "Hello {name}",
          "npc.only-en": "Only English",
        },
        fr: {
          "npc.hello": "Bonjour {name}",
        },
      },
    });

    expect(service.t("npc.hello", { name: "Alex" }, "fr")).toBe("Bonjour Alex");
    expect(service.t("npc.only-en", undefined, "fr")).toBe("Only English");
    expect(service.t("npc.missing", undefined, "fr")).toBe("npc.missing");
  });

  test("lets game messages override module messages", async () => {
    const context = new Context();

    registerI18nMessages(context, {
      fr: {
        "module.title": "Titre du module",
      },
    }, "module", 10);

    await injector(context, [
      createI18nProvider({
        defaultLocale: "fr",
        messages: {
          fr: {
            "module.title": "Titre du jeu",
          },
        },
      }),
    ]);

    const service = getOrCreateI18nService(context);
    expect(service.t("module.title", undefined, "fr")).toBe("Titre du jeu");
  });
});
