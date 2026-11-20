import { afterEach, describe, expect, it, vi } from "vitest";
import { Container, Graphics, h, signal, trigger } from "canvasengine";
import { TestBed } from "canvasengine/testing";
import { EventBoundary, type Application, type Container as PixiContainer } from "pixi.js";

/** A weather drawn as the presets draw it: one shape over the whole screen, hit-testable through a static ancestor. */
const fullScreenWeather = () =>
  h(Graphics, {
    eventMode: "passive",
    draw: (graphics: any) => graphics.rect(0, 0, 800, 600).fill({ color: 0xffffff, alpha: 0.2 }),
  });

vi.mock("@canvasengine/presets", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@canvasengine/presets")>()),
  Weather: () => fullScreenWeather(),
}));

const engine = {
  componentAnimations: [],
  projectiles: { renderList: signal([]) },
  sceneMap: { data: signal(null), weather: signal<any>(null) },
  weatherComponents: new Map<string, any>([["blizzard", fullScreenWeather]]),
  gamePause: signal(false),
  visualPause: signal(false),
  music: { setMap: () => {} },
  getSoundVolume: () => 1,
  mapShakeTrigger: trigger(),
};

vi.mock("../../core/inject", () => ({ inject: () => engine }));

const DrawMap = (await import("./draw-map.ce")).default;

afterEach(() => {
  document.body.replaceChildren();
});

/**
 * Renders the map with an event sprite at (100, 100), under a static parent as the pixi-viewport is, and tells
 * whether PixiJS hit-tests the sprite at its centre (the path of a real click, not `interactions.handle`).
 */
async function hitTestEventSprite(weather: unknown) {
  engine.sceneMap.weather.set(weather);
  document.body.innerHTML = '<div id="root"></div>';
  // A click handler makes the sprite static, as the sprites of `engine.interactions` are
  const sprite = h(Graphics, {
    click: vi.fn(),
    draw: (graphics: any) => graphics.rect(100, 100, 32, 32).fill(0xff0000),
  });
  const Scene = () => h(Container, { eventMode: "static" }, h(DrawMap, {}, [sprite]));
  await TestBed.createComponent(Scene);
  // The @for and @if blocks of the map mount on the next ticks
  await new Promise((resolve) => setTimeout(resolve, 50));
  const app = (TestBed as unknown as { lastApp: Application }).lastApp;
  // The boundary the event system of the renderer dispatches pointer events through
  const target = new EventBoundary(app.stage).hitTest(116, 116) as PixiContainer | null;
  return !!target && target === (sprite as any).componentInstance;
}

describe("the weather of a map and the pointer events of the sprites", () => {
  it("lets a click on a sprite through a built-in weather", async () => {
    expect(await hitTestEventSprite({ effect: "snow" })).toBe(true);
  });

  it("lets a click on a sprite through a custom weather component", async () => {
    expect(await hitTestEventSprite({ effect: "blizzard" })).toBe(true);
  });

  it("hits the sprite without a weather", async () => {
    expect(await hitTestEventSprite(null)).toBe(true);
  });
});
