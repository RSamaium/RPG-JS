import { describe, expect, it, vi } from "vitest";
import { studioPluginScriptId, syncStudioPluginsToScripts, type StudioScriptHost } from "./plugins";

const plugin = (pluginId: string, version: number, ...names: string[]) => ({
  pluginId,
  version,
  scripts: names.map((name) => ({ name, tree: { type: "Program", name } })),
});

const createHost = (refuse: string[] = []) => {
  const host = {
    install: vi.fn((script: { id: string }) => !refuse.includes(script.id)),
    uninstall: vi.fn(),
  };
  return host satisfies StudioScriptHost;
};

describe("plugins installed in the script host", () => {
  it("installs every script under <pluginId>/<scriptName>, with the version and the tree", () => {
    const host = createHost();
    const report = syncStudioPluginsToScripts(host, [plugin("quests", 2, "main", "rewards"), plugin("shop", 1, "stock")]);

    expect(report.installed).toEqual(["quests/main", "quests/rewards", "shop/stock"]);
    expect(host.install).toHaveBeenCalledWith({ id: "quests/main", version: 2, tree: { type: "Program", name: "main" } });
    expect(studioPluginScriptId("quests", "main")).toBe("quests/main");
  });

  it("leaves a script alone when the plugin version did not change, and replaces it when it did", () => {
    const host = createHost();
    syncStudioPluginsToScripts(host, [plugin("quests", 1, "main")]);
    host.install.mockClear();

    expect(syncStudioPluginsToScripts(host, [plugin("quests", 1, "main")]).installed).toEqual([]);
    expect(host.install).not.toHaveBeenCalled();

    expect(syncStudioPluginsToScripts(host, [plugin("quests", 2, "main")]).installed).toEqual(["quests/main"]);
    expect(host.install).toHaveBeenCalledWith(expect.objectContaining({ id: "quests/main", version: 2 }));
    expect(host.uninstall).not.toHaveBeenCalled();
  });

  it("uninstalls the scripts of a plugin that is gone or disabled, and a script a plugin dropped", () => {
    const host = createHost();
    syncStudioPluginsToScripts(host, [plugin("quests", 1, "main", "old"), plugin("shop", 1, "stock")]);

    const report = syncStudioPluginsToScripts(host, [plugin("quests", 2, "main")]);

    expect(report.removed.sort()).toEqual(["quests/old", "shop/stock"]);
    expect(host.uninstall).toHaveBeenCalledWith("quests/old");
    expect(host.uninstall).toHaveBeenCalledWith("shop/stock");
  });

  it("never touches a script the game installed itself", () => {
    const host = createHost();
    syncStudioPluginsToScripts(host, [plugin("quests", 1, "main")]);
    syncStudioPluginsToScripts(host, []);
    expect(host.uninstall).toHaveBeenCalledTimes(1);
    expect(host.uninstall).toHaveBeenCalledWith("quests/main");
  });

  it("reports a refused script, leaves it out, and tries it again next time", () => {
    const host = createHost(["quests/main"]);
    const first = syncStudioPluginsToScripts(host, [plugin("quests", 1, "main", "other")]);
    expect(first).toEqual({ installed: ["quests/other"], removed: [], refused: ["quests/main"] });

    host.install.mockClear();
    syncStudioPluginsToScripts(host, [plugin("quests", 1, "main", "other")]);
    expect(host.install).toHaveBeenCalledTimes(1);
    expect(host.install).toHaveBeenCalledWith(expect.objectContaining({ id: "quests/main" }));
  });

  it("treats a host that returns nothing as having accepted the script", () => {
    const host = { install: vi.fn(), uninstall: vi.fn() };
    expect(syncStudioPluginsToScripts(host, [plugin("quests", 1, "main")]).installed).toEqual(["quests/main"]);
  });

  it("keeps one history per host", () => {
    const a = createHost();
    const b = createHost();
    syncStudioPluginsToScripts(a, [plugin("quests", 1, "main")]);
    expect(syncStudioPluginsToScripts(b, [plugin("quests", 1, "main")]).installed).toEqual(["quests/main"]);
  });
});
