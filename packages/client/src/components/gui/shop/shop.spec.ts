import { afterEach, expect, it, vi } from "vitest";
import { signal } from "canvasengine";
import { TestBed } from "canvasengine/testing";
import Shop from "./shop.ce";

vi.mock("../../../core/inject", () => ({ inject: () => ({
  i18n: () => ({ t: (key: string) => key }),
  scene: { currentPlayer: () => ({ _gold: () => 1000 }) },
  stopProcessingInput: false,
  globalConfig: { keyboardControls: { action: "space", up: "up", down: "down" } },
  playUiSound: vi.fn(),
}) }));
let root: Awaited<ReturnType<typeof TestBed.createComponent>>;
afterEach(() => { root?.destroy(); vi.unstubAllGlobals(); document.body.replaceChildren(); });

it("renders the entire signed change beside the current and preview values", async () => {
  vi.stubGlobal("joypad", { on: vi.fn(), off: vi.fn(), connected: [] });
  document.body.innerHTML = '<div id="root"></div>';
  root = await TestBed.createComponent(Shop, {
    data: signal({ items: [{ id: "blade", name: "Blade", type: "item", price: 20, stats: { atk: 50, agi: -4 } }], playerParams: { atk: 50, agi: 24 } }),
    onFinish: vi.fn(), onInteraction: vi.fn(),
  });
  await vi.waitFor(() => expect(document.querySelector('.rpg-shop-trade-tabs button')).not.toBeNull());
  (document.querySelector('.rpg-shop-trade-tabs button') as HTMLButtonElement).click();
  await vi.waitFor(() => expect([...document.querySelectorAll('.rpg-shop-stat-value')].map(el => el.textContent?.trim())).toEqual(['+50', '-4']));
  expect([...document.querySelectorAll('.rpg-shop-stat-current strong')].map(el => el.textContent)).toEqual(['100', '20']);
});
