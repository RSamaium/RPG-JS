// @vitest-environment jsdom

import { describe, expect, test } from "vitest";
import { Context, injector } from "@signe/di";
import { getOrCreateI18nService } from "@rpgjs/common";
import { provideClientModules } from "./module";
import { provideI18n, RpgClientBuiltinI18n } from "./i18n";

describe("client i18n", () => {
  test("ships complete French labels without adding them to the game's locale list", () => {
    expect(Object.keys(RpgClientBuiltinI18n.fr).sort()).toEqual(Object.keys(RpgClientBuiltinI18n.en).sort());
    const service = getOrCreateI18nService(null, { defaultLocale: "en" });
    service.addMessages(RpgClientBuiltinI18n, "rpgjs-client", 0);
    expect(service.getAvailableLocales()).toEqual(["en"]);
  });
  test("merges client module translations with game overrides", async () => {
    const context = new Context();

    await injector(context, [
      provideClientModules([
        {
          i18n: {
            fr: {
              "menu.title": "Titre du module",
              "menu.module-only": "Module",
            },
          },
        },
      ]),
      provideI18n({
        defaultLocale: "fr",
        messages: {
          fr: {
            "menu.title": "Titre du jeu",
          },
        },
      }),
    ]);

    const service = getOrCreateI18nService(context);

    expect(service.t("menu.title", undefined, "fr")).toBe("Titre du jeu");
    expect(service.t("menu.module-only", undefined, "fr")).toBe("Module");
    expect(RpgClientBuiltinI18n.en["rpg.transition.loading"]).toBe("Loading area…");
  });
});
