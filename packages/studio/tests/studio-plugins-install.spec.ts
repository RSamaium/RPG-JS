import { afterEach, describe, expect, it, vi } from "vitest";
import studioServer, { loadStudioPlugins } from "../src/server";
import { configureStudioGameRuntime, invalidateGameDataProviderProject, resetGameDataProvider } from "../src/data-provider";

const plugins = [{ pluginId: "quests", version: 2, scripts: [{ name: "main", tree: { type: "Program" } }] }];

const mockBundle = (body: unknown = plugins, ok = true) =>
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const path = String(input);
    if (path.endsWith("/plugins.json")) return ok ? Response.json(body) : new Response("nope", { status: 404 });
    return new Response("unexpected", { status: 404 });
  });

afterEach(() => {
  vi.restoreAllMocks();
  configureStudioGameRuntime({ projectId: null, runtimeMode: undefined, bundleBasePath: undefined });
  resetGameDataProvider();
});

describe("installing the plugins of a published snapshot", () => {
  it("gives the plugins of plugins.json to the installer", async () => {
    configureStudioGameRuntime({ projectId: "p1", runtimeMode: "published", bundleBasePath: "https://studio.test/api/published/p1" });
    const fetchMock = mockBundle();
    const install = vi.fn();

    await expect(loadStudioPlugins(install)).resolves.toEqual(plugins);

    expect(fetchMock).toHaveBeenCalledWith("https://studio.test/api/published/p1/plugins.json");
    expect(install).toHaveBeenCalledWith(plugins);
  });

  it("installs an empty list when the snapshot has no plugins.json", async () => {
    configureStudioGameRuntime({ projectId: "p1", runtimeMode: "published", bundleBasePath: "/published" });
    mockBundle(undefined, false);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const install = vi.fn();

    await loadStudioPlugins(install);

    expect(install).toHaveBeenCalledWith([]);
  });

  it("does not stop the game when the installer throws", async () => {
    configureStudioGameRuntime({ projectId: "p1", runtimeMode: "published", bundleBasePath: "/published" });
    mockBundle();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(loadStudioPlugins(() => { throw new Error("bad script"); })).resolves.toEqual([]);
  });

  it("installs them when the server of the game starts", async () => {
    configureStudioGameRuntime({ projectId: "p1", runtimeMode: "published", bundleBasePath: "/published" });
    mockBundle();
    const installPlugins = vi.fn();
    const module: any = studioServer({ projectId: "p1", runtimeMode: "published", installPlugins });

    await module.engine.onStart();

    expect(installPlugins).toHaveBeenCalledWith(plugins);
  });

  it("leaves a shared runtime (resolveStartup) to its host: no single project", async () => {
    mockBundle();
    const installPlugins = vi.fn();
    const module: any = studioServer({ installPlugins, resolveStartup: async () => ({ projectId: "p1", flow: "title" }) });

    await module.engine.onStart();

    expect(installPlugins).not.toHaveBeenCalled();
  });

  it("installs them in the script service of the game and keeps them in step with the data", async () => {
    configureStudioGameRuntime({ projectId: "p1", runtimeMode: "published", bundleBasePath: "/published" });
    let published: unknown = plugins;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).endsWith("/plugins.json") ? Response.json(published) : new Response("no", { status: 404 }));
    const scripts = { install: vi.fn(() => true), uninstall: vi.fn() };
    const module: any = studioServer({ projectId: "p1", runtimeMode: "published", scripts });

    await module.engine.onStart();
    expect(scripts.install).toHaveBeenCalledWith({ id: "quests/main", version: 2, tree: { type: "Program" } });

    // a publication: version 3 of the plugin, and the plugin of another project invalidated meanwhile
    published = [{ ...plugins[0], version: 3 }];
    scripts.install.mockClear();
    invalidateGameDataProviderProject("another-project");
    await vi.waitFor(() => expect(scripts.install).not.toHaveBeenCalled());
    invalidateGameDataProviderProject("p1");
    await vi.waitFor(() => expect(scripts.install).toHaveBeenCalledWith({ id: "quests/main", version: 3, tree: { type: "Program" } }));

    // the plugin is disabled: its scripts are uninstalled
    published = [];
    invalidateGameDataProviderProject("p1");
    await vi.waitFor(() => expect(scripts.uninstall).toHaveBeenCalledWith("quests/main"));
  });

  describe("with the maps of a published version (MMORPG, no server restart)", () => {
    const mapPayload = (version: number, extra: Record<string, unknown> = {}) => ({
      id: "town",
      width: 640,
      height: 480,
      plugins: [{ ...plugins[0], version }],
      ...extra,
    });
    const update = async (module: any, mapData: any) => {
      // the rest of the update (hydrating the map) is not what is tested: it may fail on this minimal payload
      await module.map.onBeforeUpdate(mapData, {}).catch(() => undefined);
    };

    it("replaces the scripts of the room together with its map, and uninstalls the ones a version drops", async () => {
      const scripts = { install: vi.fn(() => true), uninstall: vi.fn() };
      const module: any = studioServer({ projectId: "p1", runtimeMode: "published", scripts });

      await update(module, mapPayload(2));
      expect(scripts.install).toHaveBeenCalledWith({ id: "quests/main", version: 2, tree: { type: "Program" } });

      scripts.install.mockClear();
      await update(module, mapPayload(2));
      expect(scripts.install).not.toHaveBeenCalled();

      await update(module, mapPayload(3));
      expect(scripts.install).toHaveBeenCalledWith({ id: "quests/main", version: 3, tree: { type: "Program" } });

      await update(module, { ...mapPayload(3), plugins: [] });
      expect(scripts.uninstall).toHaveBeenCalledWith("quests/main");
    });

    it("leaves the scripts as they are for an update that carries no plugins", async () => {
      const scripts = { install: vi.fn(() => true), uninstall: vi.fn() };
      const module: any = studioServer({ projectId: "p1", runtimeMode: "published", scripts });
      await update(module, mapPayload(2));
      scripts.install.mockClear();

      const { plugins: _plugins, ...withoutPlugins } = mapPayload(2);
      await update(module, withoutPlugins);

      expect(scripts.install).not.toHaveBeenCalled();
      expect(scripts.uninstall).not.toHaveBeenCalled();
    });

    it("lets the version win over the provider, which cannot know the version this room runs", async () => {
      configureStudioGameRuntime({ projectId: "p1", runtimeMode: "published", bundleBasePath: "/published" });
      mockBundle([{ ...plugins[0], version: 1 }]);
      const scripts = { install: vi.fn(() => true), uninstall: vi.fn() };
      const module: any = studioServer({ projectId: "p1", runtimeMode: "published", scripts });

      await update(module, mapPayload(5));
      scripts.install.mockClear();
      await module.engine.onStart();
      invalidateGameDataProviderProject("p1");
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(scripts.install).not.toHaveBeenCalled();
      expect(scripts.uninstall).not.toHaveBeenCalled();
    });
  });
});
