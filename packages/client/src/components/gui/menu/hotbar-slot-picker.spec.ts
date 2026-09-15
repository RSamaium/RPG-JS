import { afterEach, expect, it, vi } from "vitest";
import { signal } from "canvasengine";
import { TestBed } from "canvasengine/testing";
import Picker from "./hotbar-slot-picker.ce";

vi.mock("../../../core/inject", () => ({ inject: () => ({
  i18n: () => ({ t: (key: string) => key }),
  globalConfig: { keyboardControls: { action: "space", up: "up", down: "down", left: "left", right: "right", escape: "escape" } },
}) }));
let root: Awaited<ReturnType<typeof TestBed.createComponent>>;
afterEach(() => { root?.destroy(); vi.unstubAllGlobals(); document.body.replaceChildren(); });

it("assigns unlocked slots by click, follows focus and rejects locked slots", async () => {
  vi.stubGlobal("joypad", { on: vi.fn(), off: vi.fn(), connected: [] });
  document.body.innerHTML = '<div id="root"></div>';
  const assign = vi.fn(), cancel = vi.fn();
  root = await TestBed.createComponent(Picker, {
    hotbar: signal({ capacity: 3, slots: [] }), entry: signal({ type: "skill", id: "fire", name: "Fire" }),
    onAssign: assign, onCancel: cancel,
  });
  const slots = Array.from(document.querySelectorAll<HTMLButtonElement>('.rpg-hotbar-picker-slot'));
  expect(slots).toHaveLength(10);
  expect(slots[1].disabled).toBe(false);
  expect(slots[1].hasAttribute('disabled')).toBe(false);
  slots[1].focus();
  expect(slots[1].dataset.selected).toBe('true');
  slots[1].click();
  expect(assign).toHaveBeenCalledExactlyOnceWith(1);
  expect(cancel).not.toHaveBeenCalled();
  expect(slots[3].getAttribute('aria-disabled')).toBe('true');
  expect(slots[3].tabIndex).toBe(-1);
  slots[3].click();
  expect(assign).toHaveBeenCalledTimes(1);
});
