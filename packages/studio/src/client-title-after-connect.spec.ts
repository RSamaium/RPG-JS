// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const gui = vi.hoisted(() => ({ display: vi.fn() }));
const splash = vi.hoisted(() => ({ dismiss: vi.fn() }));

vi.mock("@rpgjs/client", () => ({
  HudComponent: {},
  PrebuiltComponentAnimations: {},
  TitleScreenComponent: {},
  RpgClient: {},
  RpgClientEngine: "engine",
  RpgGui: "gui",
  inject: () => gui,
  dismissStartupSplash: splash.dismiss,
}));
vi.mock("@rpgjs/common", () => ({ defineModule: (module: unknown) => module }));
vi.mock("canvasengine", () => ({ trigger: () => undefined }));
vi.mock("./components/fade.ce", () => ({ default: () => null }));
vi.mock("./components/cinematic.ce", () => ({ default: () => null }));
vi.mock("./components/up.ce", () => ({ default: () => null }));
vi.mock("./spritesheet-utils", () => ({
  prepareSpriteSheetObject: () => ({}),
  resolveAssetSource: (value: unknown) => String(value ?? ""),
  resolveSpritesheet: async () => undefined,
}));
vi.mock("./data-provider", () => ({
  configureStudioGameRuntime: () => undefined,
  getStudioGameRuntimeConfig: () => ({ projectId: "project-a" }),
  getGameDataProvider: () => ({
    getProject: async () => ({ _id: "project-a", name: "Game", menus: { titleScreen: { enabled: true } } }),
    getDatabase: async () => [],
    getMap: async () => undefined,
    prefetchMedia: () => undefined,
  }),
}));
vi.mock("./data-provider/http-game-data-provider", () => ({ keepStudioApiAnswers: () => undefined }));
vi.mock("./map-renderer/terrain-renderer/terrain-worker-client", () => ({ TerrainWorkerClient: { warm: () => undefined, prefetchImages: () => undefined } }));
vi.mock("./startup-warmup", () => ({ collectMediaIds: () => [], warmUpStartupData: () => undefined }));
vi.mock("./startup-preload", () => ({ setStudioMediaPreload: () => undefined, waitForStudioMediaPreload: async () => undefined }));

import studioClient from "./client";

const makeEngine = (deferred: boolean, connected: boolean) => ({
  globalConfig: {},
  isConnectionDeferred: () => deferred,
  isConnected: () => connected,
  addSpriteSheet: vi.fn(),
});

const titleDisplays = () => gui.display.mock.calls.filter(([id]) => id === "rpg-title-screen");

beforeEach(() => {
  gui.display.mockClear();
  splash.dismiss.mockClear();
});

describe("the title screen and a deferred connection", () => {
  it("is shown at start when the connection is not deferred", async () => {
    const module: any = studioClient({ projectId: "project-a" } as any);
    await module.engine.onStart(makeEngine(false, false));
    expect(titleDisplays()).toHaveLength(1);
  });

  it("waits for the connection when it is deferred, behind the account screen", async () => {
    const module: any = studioClient({ projectId: "project-a" } as any);
    await module.engine.onStart(makeEngine(true, false));
    expect(titleDisplays()).toHaveLength(0);
    // the startup splash still gives way to the first screen (the sign-in screen)
    expect(splash.dismiss).toHaveBeenCalled();

    await module.engine.onConnected();
    expect(titleDisplays()).toHaveLength(1);

    await module.engine.onConnected();
    expect(titleDisplays()).toHaveLength(1);
  });

  it("is shown at start when the deferred connection is already open", async () => {
    const module: any = studioClient({ projectId: "project-a" } as any);
    await module.engine.onStart(makeEngine(true, true));
    expect(titleDisplays()).toHaveLength(1);
  });
});
