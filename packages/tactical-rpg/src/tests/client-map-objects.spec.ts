// canvasengine reads `window` when it loads and the project has no DOM test environment: a minimal one is enough here.
vi.hoisted(() => {
  const target = globalThis as Record<string, unknown>;
  target.window ??= Object.assign(globalThis, { addEventListener() {}, removeEventListener() {} });
  target.navigator ??= { getGamepads: () => [] };
});
import { describe, it, expect, vi } from "vitest";
vi.mock("@rpgjs/common", async (original) => ({
  ...(await original<typeof import("@rpgjs/common")>()),
  createModule: (_name: string, value: unknown) => value,
}));
vi.mock("@rpgjs/client", async (original) => ({
  ...(await original<typeof import("@rpgjs/client")>()),
  defineModule: (value: unknown) => value,
}));
vi.mock("@rpgjs/battle-kit", async (original) => ({
  ...(await original<typeof import("@rpgjs/battle-kit")>()),
  hideGuisDuringBattle: () => () => {},
}));
vi.mock("../ui/tactical-hud.ce", () => ({ default: {} }));
vi.mock("../ui/battlefield.ce", () => ({ default: {} }));
// The field draws with Pixi: not needed to enter and leave a battle.
vi.mock("../client/field", () => ({ field: {} }));
import { provideTacticalClient } from "../client";
import { enter } from "../client/state";

describe("the map during a tactical battle", () => {
  it("hides the events and the players of the map for this client, and shows them again after the battle", () => {
    const showAgain = vi.fn();
    const battlefield = { clear: vi.fn(), displayEffect: vi.fn(async () => {}) };
    const engine = {
      t: (key: string) => key,
      globalConfig: {},
      getComponentAnimation: () => battlefield,
      addComponentAnimation: vi.fn(),
      setCameraFollow: vi.fn(),
      hideMapObjects: vi.fn(() => showAgain),
    };
    const [module] = provideTacticalClient() as unknown as [{ client: { engine: { onStart(engine: unknown): void } } }];
    module.client.engine.onStart(engine);

    const leave = enter();
    expect(engine.hideMapObjects).toHaveBeenCalledWith({ events: true, players: true });
    expect(showAgain).not.toHaveBeenCalled();

    leave();
    expect(showAgain).toHaveBeenCalledTimes(1);
  });
});
