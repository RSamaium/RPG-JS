import { afterEach, describe, expect, it } from "vitest";
import { TURN_BATTLE_I18N } from "../core";
import { connectI18n, t } from "../client/texts";

describe("turn battle texts", () => {
  afterEach(() => connectI18n(undefined));

  it("has every key in each language of its catalog, namespaced `turnBattle.*`", () => {
    expect(Object.keys(TURN_BATTLE_I18N.fr).sort()).toEqual(Object.keys(TURN_BATTLE_I18N.en).sort());
    expect(Object.keys(TURN_BATTLE_I18N.en).every((key) => key.startsWith("turnBattle."))).toBe(true);
  });

  it("has the same placeholders in each language (a sentence is one key, filled with params)", () => {
    const holes = (text: string) => (text.match(/\{[^{}]+\}/g) ?? []).sort();
    for (const [key, text] of Object.entries(TURN_BATTLE_I18N.en)) expect([key, holes(TURN_BATTLE_I18N.fr[key])]).toEqual([key, holes(text)]);
  });

  it("fills the placeholders of the English defaults before the engine is connected", () => {
    expect(t("turnBattle.spCost", { cost: 18 })).toBe("18 MP");
    expect(t("turnBattle.player", { index: 2 })).toBe("Player 2");
    expect(t("turnBattle.weakTo", { element: t("turnBattle.el.fire") })).toBe("Weak · Fire");
    expect(t("turnBattle.unknown.key")).toBe("turnBattle.unknown.key");
  });

  it("does not name keyboard keys in the menu help (the controls are configurable)", () => {
    for (const texts of Object.values(TURN_BATTLE_I18N)) expect(texts["turnBattle.keys"]).not.toMatch(/Enter|Esc|Tab|Page|Entrée|Échap|↑|↓/);
  });

  it("reads the i18n service of the engine (the game overrides the texts there)", () => {
    expect(t("turnBattle.attack")).toBe("Attack");
    connectI18n({ t: (key: string, params?: Record<string, unknown>) => `${key}:${JSON.stringify(params ?? {})}` });
    expect(t("turnBattle.steal.success", { item: "Potion" })).toBe('turnBattle.steal.success:{"item":"Potion"}');
  });
});
