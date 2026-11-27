import { afterEach, describe, expect, it } from "vitest";
import type { BattleView } from "../core";
import { actionLabel, scanText } from "../client/director";
import { connectI18n } from "../client/texts";

const echo = { t: (key: string, params?: Record<string, unknown>) => `${key}${params ? JSON.stringify(params) : ""}` };

describe("texts of the choreography", () => {
  afterEach(() => connectI18n(undefined));

  it("writes the option of a custom command with one key, so each language orders the words", () => {
    expect(actionLabel({ label: "Summon", option: "Phoenix" })).toBe("Summon: Phoenix");
    expect(actionLabel({ label: "Fire" })).toBe("Fire");
    connectI18n(echo);
    expect(actionLabel({ label: "Summon", option: "Phoenix" })).toBe('turnBattle.commandOption{"command":"Summon","option":"Phoenix"}');
  });

  it("writes what a scan shows with one key per part", () => {
    const foe = { hp: 180, stats: { maxHp: 250 }, weaknesses: ["fire"], resists: [] } as unknown as BattleView["combatants"][number];
    expect(scanText(foe)).toBe("HP 180/250 · Weak: Fire");
    connectI18n(echo);
    expect(scanText(foe)).toBe('turnBattle.scan.hp{"hp":180,"maxHp":250} · turnBattle.scan.weak{"elements":"turnBattle.el.fire"}');
  });
});
