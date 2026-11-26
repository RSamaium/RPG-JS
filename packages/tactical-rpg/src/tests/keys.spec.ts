// canvasengine reads `window` when it loads and the project has no DOM test environment: a minimal one is enough here.
import { vi } from "vitest";
vi.hoisted(() => {
  const target = globalThis as Record<string, unknown>;
  target.window ??= Object.assign(globalThis, { addEventListener() {}, removeEventListener() {} });
  target.navigator ??= { getGamepads: () => [] };
});
import { afterEach, describe, expect, it } from "vitest";
import { keyLabel, keyParams, tacticalBinds } from "../client/keys";
import { dispatch, tacticalControls } from "../client/input-controller";
import { battle, busy, connectEngine, keys, menuItems, mode, receive, selectUnit, t, teardown } from "../client/state";
import { createEncounter } from "./fixture";
import { transition } from "../core/rules";
import { TACTICAL_I18N } from "../core/messages";

const english = (key: string, params: Record<string, unknown> = {}) =>
  ((TACTICAL_I18N.en as Record<string, string>)[key] ?? key).replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
const french = (key: string, params: Record<string, unknown> = {}) =>
  ((TACTICAL_I18N.fr as Record<string, string>)[key] ?? key).replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));

afterEach(() => connectEngine({ t: english } as never));

describe("the keys of the tactical HUD", () => {
  it("have defaults when the game binds nothing", () => {
    expect(tacticalBinds({})).toMatchObject({
      action: "space",
      escape: "escape",
      nextUnit: "page down",
      endPhase: "e",
      danger: "r",
      entry1: "n1",
      entry6: "n6",
    });
  });

  it("are read from the keyboard controls of the game, the hotbar keys giving the entries of the menu", () => {
    const binds = tacticalBinds({
      action: { bind: "enter", action: "action" },
      escape: "backspace",
      tabNext: "tab",
      endPhase: "f",
      danger: ["g", "h"],
      hotbar2: "z",
      entry3: "x",
    });
    expect(binds).toMatchObject({ action: "enter", escape: "backspace", nextUnit: "tab", endPhase: "f", danger: ["g", "h"], entry2: "z", entry3: "x", entry4: "n4" });
  });

  it("drive the controls of the HUD: every entry of the menu has a key", () => {
    const controls = tacticalControls({ globalConfig: { keyboardControls: { endPhase: "f", danger: "g" } } } as never) as Record<string, { bind: unknown }>;
    expect(controls.endPhase.bind).toBe("f");
    expect(controls.danger.bind).toBe("g");
    for (let n = 1; n <= 6; n++) expect(controls[`entry${n}`].bind).toBe(`n${n}`);
  });

  it("are named as the player knows them, in their language", () => {
    expect(keyLabel("space", english)).toBe("Space");
    expect(keyLabel("space", french)).toBe("Espace");
    expect(keyLabel("escape", french)).toBe("Échap");
    expect(keyLabel("n3", english)).toBe("3");
    expect(keyLabel(["up", "w"], english)).toBe("↑");
    expect(keyLabel("e", english)).toBe("E");
    expect(keyLabel("page down", english)).toBe("Page Down");
  });

  it("fill the hints with the keys the game binds", () => {
    expect(keyParams({ escape: "backspace", hotbar6: "y" }, english)).toMatchObject({ escape: "Backspace", entries: "2–Y", action: "Space" });
    connectEngine({ t: english, globalConfig: { keyboardControls: { escape: "q", danger: "v", action: "enter" } } } as never);
    expect(t("tactical.moveHint", keys())).toContain("· Q: back.");
    expect(t("tactical.danger", keys())).toBe("Danger zone (V)");
    expect(t("tactical.speed", keys())).toBe("Speed (hold Enter during the enemy turn: ×3)");
  });
});

describe("the action menu", () => {
  it("shows the key of each entry, and that key picks it", async () => {
    vi.useFakeTimers();
    connectEngine({ t: english, playerIdSignal: () => "", globalConfig: { keyboardControls: { hotbar2: "z" } } } as never);
    teardown();
    await receive({ state: transition(createEncounter(), { type: "start" }, "ally").state });
    busy.set(false);
    const unit = battle()!.units.find((u) => u.team === "ally")!;
    selectUnit(unit);
    mode.set("menu");
    const items = menuItems();
    expect(items.length).toBeGreaterThan(1);
    expect(items.length).toBeLessThanOrEqual(5);
    expect(items.map((i) => i.slot)).toEqual(items.map((_, i) => i + 2));
    expect(items[0].key).toBe("Z");
    expect(items[1].key).toBe("3");
    const wait = items.find((i) => i.id === "wait")!;
    dispatch(`entry${wait.slot}` as never);
    expect(mode()).not.toBe("menu");
    teardown();
    vi.useRealTimers();
  });
});

describe("the texts of the HUD", () => {
  it("never name a key: the keys are parameters", () => {
    const named = /\b(Esc|Enter|Space|Page Down|Tab)\b|Échap|Entrée|Espace|\(R\)/;
    for (const language of Object.values(TACTICAL_I18N))
      for (const [key, text] of Object.entries(language)) if (!key.startsWith("tactical.key.") && key !== "tactical.begin") expect(named.test(text), `${key}: ${text}`).toBe(false);
  });
});
