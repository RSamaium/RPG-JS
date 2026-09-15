import { describe, expect, test } from "vitest";
import { Context, injector } from "@signe/di";
import { RpgPlayer, provideI18n, provideServerModules } from "../src";
import { applyConnectionLocale, applyPlayerLocale } from "../src/rooms/locale";

describe("server i18n", () => {
  test("validates connection/action locales, isolates players and retains preference after loading", async () => {
    const context = new Context();
    await injector(context, [provideServerModules([]), provideI18n({ messages: {
      en: { hello: "Hello" }, fr: { hello: "Bonjour" },
    } })]);
    const makePlayer = () => {
      const player = new RpgPlayer();
      player.context = context;
      player.conn = { id: Math.random().toString(), state: {}, setState(state: any) { this.state = state; return state; }, send() {}, close() {} };
      return player;
    };
    const first = makePlayer(), second = makePlayer();
    applyConnectionLocale(first, { request: { url: "http://localhost/?locale=fr" } });
    expect(first.t("hello")).toBe("Bonjour");
    expect(second.t("hello")).toBe("Hello");
    for (const value of [null, "fr", { locale: 1 }, { locale: "de" }, { locale: "__proto__" }]) expect(applyPlayerLocale(first, value)).toBe(false);
    expect(first.getLocale()).toBe("fr");
    const saved = await first.save();
    applyPlayerLocale(first, { locale: "en", playerId: second.id });
    await first.load(saved);
    expect(first.getLocale()).toBe("en");
    const reconnected = makePlayer();
    await reconnected.load(saved);
    applyConnectionLocale(reconnected, { request: { url: "http://localhost/?locale=en" } });
    expect(reconnected.t("hello")).toBe("Hello");
    expect(second.getLocale()).toBe("en");
  });
  test("translates through player helpers with module defaults and game overrides", async () => {
    const context = new Context();
    await injector(context, [
      provideServerModules([
        {
          i18n: {
            fr: {
              "npc.hello": "Bonjour module {name}",
            },
          },
        },
      ]),
      provideI18n({
        defaultLocale: "fr",
        fallbackLocale: "en",
        messages: {
          en: {
            "npc.hello": "Hello {name}",
            "npc.fallback": "Fallback",
          },
          fr: {
            "npc.hello": "Bonjour jeu {name}",
          },
        },
      }),
    ]);

    const player = new RpgPlayer();
    player.context = context;

    const { t } = player.i18n();

    expect(player.getLocale()).toBe("fr");
    expect(t("npc.hello", { name: "Sam" })).toBe("Bonjour jeu Sam");
    expect(player.t("npc.fallback")).toBe("Fallback");
    expect(player.t("npc.missing")).toBe("npc.missing");
  });

  test("persists locale in player snapshots", async () => {
    const context = new Context();
    await injector(context, [
      provideServerModules([]),
      provideI18n({
        defaultLocale: "en",
        messages: {
          fr: {
            "npc.hello": "Bonjour",
          },
        },
      }),
    ]);

    const player = new RpgPlayer();
    player.context = context;
    player.setLocale("fr");

    const snapshot = await player.save();
    expect(JSON.parse(snapshot).locale).toBe("fr");

    const restored = new RpgPlayer();
    restored.context = context;
    await restored.load(snapshot);

    expect(restored.getLocale()).toBe("fr");
    expect(restored.t("npc.hello")).toBe("Bonjour");
  });
});
