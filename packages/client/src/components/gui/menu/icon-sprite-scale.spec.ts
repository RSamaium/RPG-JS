import { afterEach, expect, it, vi } from "vitest";
import { signal } from "canvasengine";
import { TestBed } from "canvasengine/testing";
import SkillsMenu from "./skills-menu.ce";
import Picker from "./hotbar-slot-picker.ce";

const iconSheet = { id: "spark", image: "/spark.png", framesWidth: 1, framesHeight: 1, textures: { default: { animations: () => [[{ time: 0, frameX: 0, frameY: 0 }]] } } };

vi.mock("../../../core/inject", () => ({ inject: () => ({
  i18n: () => ({ t: (key: string) => key }),
  getSpriteSheet: () => iconSheet,
  playUiSound: () => {},
  globalConfig: { keyboardControls: { action: "space", up: "up", down: "down", left: "left", right: "right", escape: "escape" } },
}) }));

let root: Awaited<ReturnType<typeof TestBed.createComponent>>;
afterEach(() => { root?.destroy(); vi.unstubAllGlobals(); document.body.replaceChildren(); });

// DOMSprite already fits the icon into width/height (objectFit="contain"): an extra
// `scale` prop draws the icon at twice the size of its box.
const iconScales = (selector: string) =>
  Array.from(document.querySelectorAll<HTMLElement>(selector)).map((element) => element.style.transform);

it("draws the skill icons in the size of their box in the skills menu", async () => {
  vi.stubGlobal("joypad", { on: vi.fn(), off: vi.fn(), connected: [] });
  document.body.innerHTML = '<div id="root"></div>';
  root = await TestBed.createComponent(SkillsMenu, {
    data: signal({ skills: [{ id: "spark", name: "Spark", icon: "spark", spCost: 1 }], hotbar: { slots: [] } }),
    assignmentOpen: signal(false),
    onBack: vi.fn(),
  });

  const transforms = iconScales(".rpg-ui-menu-row-icon *, .rpg-ui-menu-panel-hero-icon *");
  expect(transforms.length).toBeGreaterThan(0);
  expect(transforms.filter((transform) => /scale\(2/.test(transform))).toEqual([]);
});

it("draws the slot icons in the size of their box in the hotbar slot picker", async () => {
  vi.stubGlobal("joypad", { on: vi.fn(), off: vi.fn(), connected: [] });
  document.body.innerHTML = '<div id="root"></div>';
  root = await TestBed.createComponent(Picker, {
    hotbar: signal({ capacity: 3, slots: [{ index: 0, type: "skill", name: "Spark", icon: "spark", entry: { id: "spark" }, usable: true }] }),
    entry: signal({ type: "skill", id: "fire", name: "Fire" }),
    onAssign: vi.fn(), onCancel: vi.fn(),
  });

  const transforms = iconScales(".rpg-hotbar-picker-slot *");
  expect(transforms.length).toBeGreaterThan(0);
  expect(transforms.filter((transform) => /scale\(2/.test(transform))).toEqual([]);
});
