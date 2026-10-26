// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeBundleBasePath } from "./bundle-path";
import { parseStudioDraftRequest, STUDIO_PREVIEW_TOKEN_HEADER, STUDIO_PREVIEW_TOKEN_STORAGE_KEY } from "./draft-request";
import { HttpGameDataProvider } from "./http-game-data-provider";
import { LocalBundleGameDataProvider } from "./local-bundle-game-data-provider";
import {
  configureStudioGameRuntime,
  createGameDataProvider,
  getGameDataProvider,
  resetGameDataProvider,
  resolveEffectiveRuntimeMode,
  shouldReadEventsFromBundle,
} from "./provider-factory";
import { resolveRuntimeModeOrNull } from "./runtime-mode";

const setUrl = (search: string) => window.history.replaceState(null, "", `/${search}`);
const answers = () => ((globalThis as any)[Symbol.for("rpgjs.studio.api-answers")] as Map<string, unknown>);

beforeEach(() => {
  setUrl("");
  window.sessionStorage.clear();
  configureStudioGameRuntime({ projectId: null, runtimeMode: undefined, apiBaseUrl: undefined, bundleBasePath: undefined, previewToken: undefined });
});

afterEach(() => {
  vi.unstubAllGlobals();
  answers()?.clear();
  resetGameDataProvider();
});

describe("bundle base path", () => {
  it("accepts a path, a path without slash and the URL of a published snapshot", () => {
    expect(normalizeBundleBasePath()).toBe("/game-data");
    expect(normalizeBundleBasePath("game-data/")).toBe("/game-data");
    expect(normalizeBundleBasePath("/bundle")).toBe("/bundle");
    expect(normalizeBundleBasePath("https://studio.test/api/published/p1/")).toBe("https://studio.test/api/published/p1");
  });
});

describe("published runtime mode", () => {
  it("reads the bundle with a provider of kind published and keeps the project id", async () => {
    configureStudioGameRuntime({ projectId: "p1", runtimeMode: "published", bundleBasePath: "https://studio.test/api/published/p1" });
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ _id: "p1" }) }));
    vi.stubGlobal("fetch", fetchMock);

    const provider = getGameDataProvider();
    expect(provider.kind).toBe("published");
    await provider.getProject({ projectId: "p1" });
    expect(fetchMock).toHaveBeenCalledWith("https://studio.test/api/published/p1/project.json");
  });

  it("is a mode the runtime knows by name (?runtime=published)", () => {
    setUrl("?runtime=published");
    expect(resolveRuntimeModeOrNull()).toBe("published");
  });

  it("reads the events from the bundle whatever the project id, never for the draft", () => {
    expect(shouldReadEventsFromBundle({ runtimeMode: "published", hasProjectId: true })).toBe(true);
    expect(shouldReadEventsFromBundle({ runtimeMode: "offline", hasProjectId: false })).toBe(true);
    expect(shouldReadEventsFromBundle({ runtimeMode: undefined, hasProjectId: false })).toBe(true);
    expect(shouldReadEventsFromBundle({ runtimeMode: "offline", hasProjectId: true })).toBe(false);
    expect(shouldReadEventsFromBundle({ runtimeMode: "online", hasProjectId: false })).toBe(false);
  });
});

describe("draft or published, without a rebuild", () => {
  it("parses ?editor and ?preview, with an optional token", () => {
    expect(parseStudioDraftRequest("")).toEqual({ draft: false });
    expect(parseStudioDraftRequest("?editor")).toEqual({ draft: true });
    expect(parseStudioDraftRequest("?preview=1")).toEqual({ draft: true });
    expect(parseStudioDraftRequest("?preview=abc123")).toEqual({ draft: true, token: "abc123" });
    expect(parseStudioDraftRequest("?editor=tok&game=p1")).toEqual({ draft: true, token: "tok" });
  });

  it("plays the published snapshot on any other URL", () => {
    configureStudioGameRuntime({ projectId: "p1", runtimeMode: "published" });
    expect(resolveEffectiveRuntimeMode()).toBe("published");
    expect(shouldReadEventsFromBundle({ runtimeMode: "published", hasProjectId: true })).toBe(true);
  });

  it("reads the draft online for ?editor and ?preview, events included", () => {
    configureStudioGameRuntime({ projectId: "p1", runtimeMode: "published" });
    setUrl("?editor");
    expect(resolveEffectiveRuntimeMode()).toBe("online");
    expect(getGameDataProvider().kind).toBe("online");
    expect(shouldReadEventsFromBundle({ runtimeMode: "published", hasProjectId: true })).toBe(false);
  });

  it("sends the preview token in a header, keeps it for the tab and takes it off the address", async () => {
    configureStudioGameRuntime({ projectId: "p1", runtimeMode: "published", apiBaseUrl: "https://studio.test/api" });
    setUrl("?preview=secret-token&game=p1");
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ id: "m" }) }));
    vi.stubGlobal("fetch", fetchMock);

    await getGameDataProvider().getMap("m");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://studio.test/api/game/maps/m",
      { headers: { [STUDIO_PREVIEW_TOKEN_HEADER]: "secret-token" } },
    );
    expect(window.location.search).not.toContain("secret-token");
    expect(window.location.search).toContain("game=p1");
    expect(window.sessionStorage.getItem(STUDIO_PREVIEW_TOKEN_STORAGE_KEY)).toBe("secret-token");
  });

  it("uses the token kept for the tab after a reload, or the one of the config", async () => {
    window.sessionStorage.setItem(STUDIO_PREVIEW_TOKEN_STORAGE_KEY, "stored");
    configureStudioGameRuntime({ projectId: "p1", runtimeMode: "published", apiBaseUrl: "https://studio.test/api" });
    setUrl("?editor");
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock);
    await getGameDataProvider().getMap("m1");
    expect(fetchMock).toHaveBeenLastCalledWith("https://studio.test/api/game/maps/m1", { headers: { [STUDIO_PREVIEW_TOKEN_HEADER]: "stored" } });

    window.sessionStorage.clear();
    configureStudioGameRuntime({ previewToken: "from-config" });
    await getGameDataProvider().getMap("m2");
    expect(fetchMock).toHaveBeenLastCalledWith("https://studio.test/api/game/maps/m2", { headers: { [STUDIO_PREVIEW_TOKEN_HEADER]: "from-config" } });
  });

  it("sends no header and no token for the published snapshot", async () => {
    configureStudioGameRuntime({ projectId: "p1", runtimeMode: "published", previewToken: "unused", bundleBasePath: "/published" });
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock);
    await getGameDataProvider().getMap("m");
    expect(fetchMock).toHaveBeenCalledWith("/published/maps/m.json");
  });
});

describe("plugins of a project", () => {
  const plugins = [{ pluginId: "quests", version: 3, scripts: [{ name: "main", tree: { type: "Program" } }] }];

  it("are read from plugins.json of a bundle, and are empty when it has none", async () => {
    const provider = new LocalBundleGameDataProvider({ apiBaseUrl: "", bundleBasePath: "/published" }, "published");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => plugins })));
    expect(await provider.getPlugins()).toEqual(plugins);

    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await provider.getPlugins()).toEqual([]);
  });

  it("are read from /game/plugins of the API", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => plugins }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new HttpGameDataProvider({ apiBaseUrl: "https://studio.test/api", bundleBasePath: "" });
    expect(await provider.getPlugins("p1")).toEqual(plugins);
    expect(fetchMock).toHaveBeenCalledWith("https://studio.test/api/game/plugins?projectId=p1");
    await expect(provider.getPlugins()).rejects.toThrow(/projectId/);
  });

  it("go through the cached provider of the game, and are read again after an invalidation", async () => {
    configureStudioGameRuntime({ projectId: "p1", runtimeMode: "published", bundleBasePath: "/published" });
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => plugins }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = getGameDataProvider();
    await provider.getPlugins!("p1");
    await provider.getPlugins!("p1");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const { invalidateGameDataProviderProject } = await import("./provider-factory");
    invalidateGameDataProviderProject("p1");
    await provider.getPlugins!("p1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("the mode `published` is not the fallback of the auto mode", () => {
    expect(createGameDataProvider("published", { apiBaseUrl: "", bundleBasePath: "/b" }).kind).toBe("published");
    expect(createGameDataProvider("auto", { apiBaseUrl: "", bundleBasePath: "/b" }).kind).toBe("auto-fallback");
  });
});
