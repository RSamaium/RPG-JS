import { describe, expect, test, vi } from "vitest";
import { signal } from "canvasengine";
import { displayStudioHudOnce } from "../src/client";

describe("Studio client runtime", () => {
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
