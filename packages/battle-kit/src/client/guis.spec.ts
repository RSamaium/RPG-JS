import { afterEach, describe, expect, it, vi } from "vitest";

/** A GUI service of the client: which GUIs exist, which are displayed. */
const gui = vi.hoisted(() => {
  const displayed = new Set<string>();
  const all: Record<string, { openId?: string; data: () => unknown }> = {};
  return {
    displayed,
    all,
    getAll: () => all,
    get: (id: string) => all[id],
    isDisplaying: (id: string) => displayed.has(id),
    hide: vi.fn((id: string) => void displayed.delete(id)),
    display: vi.fn((id: string) => void displayed.add(id)),
  };
});
vi.mock("@rpgjs/client", () => ({ inject: () => gui, RpgGui: class {} }));
import { hideGuisDuringBattle } from "./guis";

afterEach(() => {
  vi.useRealTimers();
  gui.displayed.clear();
  for (const id of Object.keys(gui.all)) delete gui.all[id];
  gui.hide.mockClear();
  gui.display.mockClear();
});

/** The battle screen and a HUD of the map are displayed. */
function screen() {
  vi.useFakeTimers();
  gui.all.battle = { data: () => ({}) };
  gui.all.hud = { openId: "hud-1", data: () => ({}) };
  gui.displayed.add("battle").add("hud");
}

describe("the GUIs of the game during a battle", () => {
  it("are hidden, kept hidden while the battle lasts, and shown again when it ends", () => {
    screen();
    const restore = hideGuisDuringBattle("battle");
    expect(gui.isDisplaying("hud")).toBe(false);
    // The map shows its HUD again meanwhile: hidden again.
    gui.displayed.add("hud");
    vi.advanceTimersByTime(250);
    expect(gui.isDisplaying("hud")).toBe(false);

    restore();
    expect(gui.isDisplaying("hud")).toBe(true);
  });

  it("are shown again, and no longer hidden, when the battle screen goes away without ending the battle", () => {
    screen();
    hideGuisDuringBattle("battle");
    expect(gui.isDisplaying("hud")).toBe(false);
    // The client lost its connection: the battle screen is gone, nobody calls restore.
    gui.displayed.delete("battle");
    vi.advanceTimersByTime(250);
    expect(gui.isDisplaying("hud")).toBe(true);
    // A GUI shown later (the next battle, a menu) stays shown.
    gui.all.menu = { data: () => ({}) };
    gui.displayed.add("menu");
    vi.advanceTimersByTime(1000);
    expect(gui.isDisplaying("menu")).toBe(true);
  });

  it("wait for the battle screen to show before they count it as gone", () => {
    vi.useFakeTimers();
    gui.all.hud = { openId: "hud-1", data: () => ({}) };
    gui.displayed.add("hud");
    hideGuisDuringBattle("battle");
    vi.advanceTimersByTime(1000);
    expect(gui.isDisplaying("hud")).toBe(false);
  });
});
