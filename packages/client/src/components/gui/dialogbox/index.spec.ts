import { afterEach, expect, it, vi } from "vitest";
import { signal } from "canvasengine";
import { TestBed } from "canvasengine/testing";
import Dialogue from "./index.ce";

vi.mock("../../../core/inject", () => ({ inject: () => ({
  i18n: () => ({ t: (key: string) => key }),
  scene: {}, stopProcessingInput: false,
  globalConfig: { keyboardControls: { action: "space", up: "up", down: "down" } },
  playUiSound: vi.fn(),
}) }));
let root: Awaited<ReturnType<typeof TestBed.createComponent>>;
afterEach(() => { root?.destroy(); vi.restoreAllMocks(); document.body.replaceChildren(); });

it("starts at the first measured page even with typewriter disabled", async () => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(60);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
    return { height: Math.ceil(Array.from(this.textContent || "").length / 20) * 20 } as DOMRect;
  });
  document.body.innerHTML = '<div id="root"></div>';
  root = await TestBed.createComponent(Dialogue, {
    data: signal({ message: "START " + "A long journey. ".repeat(40), typewriterEffect: false }),
    onFinish: vi.fn(),
  });
  await vi.waitFor(() => {
    const text = document.querySelector('.rpg-ui-dialog-content')?.textContent || "";
    expect(text.startsWith("START ")).toBe(true);
    expect(text.length).toBeLessThanOrEqual(40);
  });
});

it("shows no continuation arrow during typing or in front of final choices", async () => {
  vi.stubGlobal("joypad", { on: vi.fn(), off: vi.fn(), connected: [] });
  let now = 1000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  document.body.innerHTML = '<div id="root"></div>';
  root = await TestBed.createComponent(Dialogue, {
    data: signal({ message: "Choose the path. ".repeat(4), choices: [{ text: "Forest" }, { text: "River" }], typewriterEffect: true }),
    onFinish: vi.fn(),
  });
  await vi.waitFor(() => expect(document.querySelector('.rpg-ui-dialog-actions')).not.toBeNull());
  expect(document.querySelector('.rpg-ui-dialog-continue')).toBeNull();
  now += 200;
  (document.querySelector('.rpg-ui-dialog-content') as HTMLElement).click();
  await vi.waitFor(() => expect(document.querySelectorAll('.rpg-ui-dialog-choice')).toHaveLength(2));
  expect(document.querySelector('.rpg-ui-dialog-continue')).toBeNull();
  expect(document.querySelector('.rpg-ui-dialog-content')?.textContent).toBe("Choose the path. ".repeat(4));
  vi.unstubAllGlobals();
});

it("reserves input space and lets the form own Enter/submit on the final page", async () => {
  const interaction = vi.fn();
  document.body.innerHTML = '<div id="root"></div>';
  root = await TestBed.createComponent(Dialogue, {
    data: signal({ message: "Your name?", input: { type: "text", defaultValue: "Luna" }, typewriterEffect: false }),
    onInteraction: interaction, onFinish: vi.fn(),
  });
  await vi.waitFor(() => expect(document.querySelector('.rpg-ui-dialog-actions input')).not.toBeNull());
  expect(document.querySelector('.rpg-ui-dialog-continue')).toBeNull();
  document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  expect(interaction).toHaveBeenCalledWith("submit", expect.anything());
});

it("advances on Enter after the opening guard, ignores held keys and hides the page counter", async () => {
  let now = 1000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const finish = vi.fn();
  document.body.innerHTML = '<div id="root"></div>';
  root = await TestBed.createComponent(Dialogue, {
    data: signal({ message: "First page. ".repeat(35), typewriterEffect: false }),
    onFinish: finish,
  });
  await vi.waitFor(() => expect(document.querySelector('.rpg-ui-dialog-content')?.textContent).toContain('First page.'));
  const first = document.querySelector('.rpg-ui-dialog-content')!.textContent;
  const enter = (repeat = false) => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat, bubbles: true, cancelable: true }));
  enter();
  expect(document.querySelector('.rpg-ui-dialog-content')!.textContent).toBe(first);
  now += 200; enter(true);
  expect(document.querySelector('.rpg-ui-dialog-content')!.textContent).toBe(first);
  enter();
  await vi.waitFor(() => expect(document.querySelector('.rpg-ui-dialog-content')!.textContent).not.toBe(first));
  expect(document.querySelector('.rpg-ui-dialog-continue')!.textContent).not.toMatch(/\d+\s*\/\s*\d+/);
  expect(finish).not.toHaveBeenCalled();
  now += 200; enter();
  await vi.waitFor(() => expect(finish).toHaveBeenCalledTimes(1));
});
