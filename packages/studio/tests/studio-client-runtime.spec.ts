import { afterEach, describe, expect, test, vi } from "vitest";
import { signal } from "canvasengine";
import {
  configureStudioClientStartupProject,
  displayStudioHudOnce,
  resolveStudioClientStartupQuery,
} from "../src/client";
import {
  configureStudioGameRuntime,
  getGameDataProvider,
  getStudioGameRuntimeConfig,
} from "../src/data-provider";

afterEach(() => {
  configureStudioGameRuntime({ projectId: null, runtimeMode: undefined });
});

describe("Studio client runtime", () => {
  test("resolves the shared MMORPG project and direct map from the page URL", () => {
    expect(resolveStudioClientStartupQuery("?game=project-a&map=town")).toEqual({
      projectId: "project-a",
      directMapId: "town",
    });
    expect(resolveStudioClientStartupQuery("?game=%20%20")).toEqual({
      projectId: undefined,
      directMapId: undefined,
    });
  });

  test("uses the online provider for a project resolved from the URL", () => {
    configureStudioGameRuntime({ projectId: null, runtimeMode: undefined });

    configureStudioClientStartupProject("project-a", {});

    expect(getStudioGameRuntimeConfig()).toMatchObject({
      projectId: "project-a",
      runtimeMode: "online",
    });
    expect(getGameDataProvider().kind).toBe("online");
  });
  test("displays the HUD once with the configured faceset", () => {
    const display = vi.fn();
    const gui = {
      display,
      get: () => ({ data: signal({ marker: "kept" }) }),
      isDisplaying: () => false,
    };
    const engine = {
      globalConfig: {
        hero: {
          faceset: { _id: "faceset-1" },
        },
      },
    };

    displayStudioHudOnce(gui as any, engine as any);

    expect(display).toHaveBeenCalledWith("hud", {
      marker: "kept",
      faceset: {
        id: "faceset-1",
        expression: "happy",
      },
    });
  });

  test("keeps an already displayed HUD mounted during map transitions", () => {
    const display = vi.fn();
    const gui = {
      display,
      get: vi.fn(),
      isDisplaying: () => true,
    };

    displayStudioHudOnce(gui as any, { globalConfig: {} } as any);

    expect(display).not.toHaveBeenCalled();
    expect(gui.get).not.toHaveBeenCalled();
  });
});
