import { afterEach, describe, expect, it } from "vitest";
import { TURN_BATTLE_I18N } from "../core";
import { connectI18n, t } from "../client/texts";

describe("turn battle texts", () => {
  afterEach(() => connectI18n(undefined));

  it("has every key in each language of its catalog, namespaced `turnBattle.*`", () => {
    expect(Object.keys(TURN_BATTLE_I18N.fr).sort()).toEqual(Object.keys(TURN_BATTLE_I18N.en).sort());
    expect(Object.keys(TURN_BATTLE_I18N.en).every((key) => key.startsWith("turnBattle."))).toBe(true);
  });

  it("reads the i18n service of the engine (the game overrides the texts there)", () => {
    expect(t("turnBattle.attack")).toBe("Attack");
    connectI18n({ t: (key: string, params?: Record<string, unknown>) => `${key}:${JSON.stringify(params ?? {})}` });
    expect(t("turnBattle.steal.success", { item: "Potion" })).toBe('turnBattle.steal.success:{"item":"Potion"}');
  });
});
