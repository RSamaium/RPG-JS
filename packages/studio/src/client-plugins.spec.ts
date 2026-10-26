import { describe, expect, it, vi } from "vitest";
import { studioPluginGuiId, loadStudioPluginGuis } from "./client-plugins";
import type { StudioPlugin } from "./data-provider/types";

const plugin = (pluginId: string, client: StudioPlugin["client"]): StudioPlugin => ({ pluginId, version: 1, scripts: [], client });

/** Modules are real functions here: the loader gets them through `importModule`, the way a blob URL gives them. */
const modules = (byCode: Record<string, (host: any) => unknown>) => async (code: string) => ({ default: byCode[code] });

describe("loadStudioPluginGuis", () => {
  it("names the GUI of a client file after its plugin and the file, without the extension", () => {
    expect(studioPluginGuiId("quests", "panel.ce")).toBe("quests_panel");
    expect(studioPluginGuiId("quests", "ui/log.ce")).toBe("quests_ui_log");
  });

  it("builds the component with the host and registers it as a GUI that a script opens", async () => {
    const gui = { add: vi.fn() };
    const component = { id: "component" };
    const factory = vi.fn(() => component);
    const host = { canvasengine: { h: () => null } };

    const report = await loadStudioPluginGuis({ gui, host, plugins: [plugin("quests", [{ name: "panel.ce", code: "A" }])], importModule: modules({ A: factory }) });

    expect(factory).toHaveBeenCalledWith(host);
    expect(gui.add).toHaveBeenCalledWith({ name: "quests_panel", component });
    expect(report).toEqual({ loaded: ["quests_panel"], failed: [] });
  });

  it("keeps loading the other files when one fails, and says which", async () => {
    const gui = { add: vi.fn() };
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const importModule = modules({ OK: () => "c", BAD: () => { throw new Error("boom"); } });

    const report = await loadStudioPluginGuis({
      gui,
      host: {},
      plugins: [plugin("a", [{ name: "bad.ce", code: "BAD" }, { name: "ok.ce", code: "OK" }]), plugin("b", undefined)],
      importModule,
    });

    expect(report).toEqual({ loaded: ["a_ok"], failed: ["a_bad"] });
    expect(gui.add).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("loads a plugin once per version, so asking again after a change replaces nothing twice", async () => {
    const gui = { add: vi.fn() };
    const factory = vi.fn(() => "c");
    const args = { gui, host: {}, importModule: modules({ A: factory }) };

    await loadStudioPluginGuis({ ...args, plugins: [plugin("q", [{ name: "p.ce", code: "A" }])] });
    const again = await loadStudioPluginGuis({ ...args, plugins: [plugin("q", [{ name: "p.ce", code: "A" }])] });

    expect(gui.add).toHaveBeenCalledTimes(1);
    expect(again.loaded).toEqual([]);
  });
});
