import { afterEach, describe, expect, it, vi } from "vitest";
import studioServer, { loadStudioPlugins } from "../src/server";
import { configureStudioGameRuntime, resetGameDataProvider } from "../src/data-provider";

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
});
