import { describe, expect, it, vi } from "vitest";
import { buildStudioPluginClientModules, studioPluginGuiId } from "./client-plugins";
import type { StudioPlugin } from "./data-provider/types";

const plugin = (pluginId: string, client: StudioPlugin["client"], version = 1): StudioPlugin => ({ pluginId, version, scripts: [], client });

/** The modules are real functions: the loader gets them through `importModule`, the way a blob URL gives them. */
const modules = (byCode: Record<string, (host: any) => Record<string, unknown>>) => async (code: string) => ({ default: byCode[code] });

describe("studioPluginGuiId", () => {
  it("names the GUI of a component after its plugin and its path, without the extension", () => {
    expect(studioPluginGuiId("quests", "panel.ce")).toBe("quests_panel");
    expect(studioPluginGuiId("quests", "ui/log.ce")).toBe("quests_ui_log");
  });
});

describe("buildStudioPluginClientModules", () => {
  it("registers each .ce component of a plugin as a GUI of its module, built with the host", async () => {
    const component = () => "component";
    const factory = vi.fn(() => ({ default: component }));
    const host = { canvasengine: { h: () => null } };

    const { modules: built, report } = await buildStudioPluginClientModules({ plugins: [plugin("quests", [{ name: "panel.ce", code: "A" }])], host, importModule: modules({ A: factory }) });

    expect(factory).toHaveBeenCalledWith(expect.objectContaining({ canvasengine: host.canvasengine, require: expect.any(Function) }));
    expect(built).toHaveLength(1);
    expect(built[0].gui).toEqual([{ name: "quests_panel", component }]);
    expect(report).toEqual({ loaded: ["quests"], failed: [] });
  });

  it("takes the default export of index.js as the module of the plugin, and adds the GUIs to its own", async () => {
    const own = { name: "own", component: () => "own" };
    const entry = { engine: { onStart: () => undefined }, gui: [own] };
    const panel = () => "panel";

    const { modules: built } = await buildStudioPluginClientModules({
      plugins: [plugin("quests", [{ name: "index.js", code: "I" }, { name: "panel.ce", code: "P" }])],
      host: {},
      importModule: modules({ I: () => ({ default: entry }), P: () => ({ default: panel }) }),
    });

    expect(built[0].engine).toBe(entry.engine);
    expect(built[0].gui).toEqual([own, { name: "quests_panel", component: panel }]);
  });

  it("gives a file the other files of its plugin through host.require, built once, and never the files of another plugin", async () => {
    const helpers = vi.fn(() => ({ label: (n: number) => `Quests ${n}` }));
    const seen: unknown[] = [];
    const importModule = modules({
      I: (host) => { seen.push(host.require("ui/helpers.js").label(2), host.require("ui/helpers.js") === host.require("ui/helpers.js"), (() => { try { host.require("other.js"); } catch (error) { return (error as Error).message; } })()); return { default: {} }; },
      H: helpers,
      O: () => ({ default: {} }),
    });

    await buildStudioPluginClientModules({
      plugins: [plugin("a", [{ name: "index.js", code: "I" }, { name: "ui/helpers.js", code: "H" }]), plugin("b", [{ name: "other.js", code: "O" }])],
      host: {},
      importModule,
    });

    expect(seen[0]).toBe("Quests 2");
    expect(seen[1]).toBe(true);
    expect(seen[2]).toMatch(/other\.js/);
    expect(helpers).toHaveBeenCalledTimes(1);
  });

  it("reports a plugin whose files import each other in a circle, and keeps the other plugins", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const importModule = modules({
      A: (host) => { host.require("b.js"); return { default: {} }; },
      B: (host) => { host.require("a.js"); return { default: {} }; },
      OK: () => ({ default: () => "ok" }),
    });

    const { modules: built, report } = await buildStudioPluginClientModules({
      plugins: [plugin("loop", [{ name: "index.js", code: "A" }, { name: "a.js", code: "A" }, { name: "b.js", code: "B" }]), plugin("fine", [{ name: "x.ce", code: "OK" }])],
      host: {},
      importModule,
    });

    expect(report).toEqual({ loaded: ["fine"], failed: ["loop"] });
    expect(built).toHaveLength(1);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("reports a plugin whose file throws, and gives no module for plugins without client files", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { modules: built, report } = await buildStudioPluginClientModules({
      plugins: [plugin("bad", [{ name: "x.ce", code: "BAD" }]), plugin("none", undefined), plugin("empty", [])],
      host: {},
      importModule: modules({ BAD: () => { throw new Error("boom"); } }),
    });

    expect(built).toEqual([]);
    expect(report).toEqual({ loaded: [], failed: ["bad"] });
    error.mockRestore();
  });
});
