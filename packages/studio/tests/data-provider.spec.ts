import { describe, expect, test, vi } from "vitest";
import { createCachedGameDataProvider } from "../src/data-provider/provider-factory";
import type { GameDataProvider } from "../src/data-provider/types";

const createSource = () =>
  ({
    kind: "online" as const,
    getProject: vi.fn(
      async (query: { projectId?: string | null; mapId?: string | null }) => ({
        id: query.projectId ?? query.mapId,
      })
    ),
    getMap: vi.fn(async (id: string) => ({ id })),
    getDatabase: vi.fn(async (projectId?: string) => [{ projectId }]),
    getMedia: vi.fn(async (id: string) => ({ id })),
  } satisfies GameDataProvider);

describe("Studio game data provider", () => {
  test("deduplicates concurrent project requests", async () => {
    const source = createSource();
    const provider = createCachedGameDataProvider(source);

    const first = provider.getProject({ projectId: "project-1" });
    const second = provider.getProject({ projectId: "project-1" });

    expect(first).toBe(second);
    await expect(first).resolves.toEqual({ id: "project-1" });
    expect(source.getProject).toHaveBeenCalledTimes(1);
  });

  test("deduplicates concurrent map requests", async () => {
    const source = createSource();
    const provider = createCachedGameDataProvider(source);

    const first = provider.getMap("map-1");
    const second = provider.getMap("map-1");

    expect(first).toBe(second);
    await expect(first).resolves.toEqual({ id: "map-1" });
    expect(source.getMap).toHaveBeenCalledTimes(1);
  });

  test("deduplicates concurrent database requests", async () => {
    const source = createSource();
    const provider = createCachedGameDataProvider(source);

    const first = provider.getDatabase("project-1");
    const second = provider.getDatabase("project-1");

    expect(first).toBe(second);
    await expect(first).resolves.toEqual([{ projectId: "project-1" }]);
    expect(source.getDatabase).toHaveBeenCalledTimes(1);
  });

  test("deduplicates concurrent media requests", async () => {
    const source = createSource();
    const provider = createCachedGameDataProvider(source);

    const first = provider.getMedia("media-1");
    const second = provider.getMedia("media-1");

    expect(first).toBe(second);
    await expect(first).resolves.toEqual({ id: "media-1" });
    expect(source.getMedia).toHaveBeenCalledTimes(1);
  });

  test("keeps project ID and map ID lookup keys distinct", async () => {
    const source = createSource();
    const provider = createCachedGameDataProvider(source);

    await provider.getProject({ projectId: "shared-id" });
    await provider.getProject({ mapId: "shared-id" });
    await provider.getProject({ projectId: "shared-id" });
    await provider.getProject({ mapId: "shared-id" });

    expect(source.getProject).toHaveBeenCalledTimes(2);
    expect(source.getProject).toHaveBeenNthCalledWith(1, {
      projectId: "shared-id",
    });
    expect(source.getProject).toHaveBeenNthCalledWith(2, {
      mapId: "shared-id",
    });
  });

  test("does not share project, map, or database cache entries between IDs", async () => {
    const source = createSource();
    const provider = createCachedGameDataProvider(source);

    await provider.getProject({ projectId: "project-1" });
    await provider.getProject({ projectId: "project-2" });
    await provider.getMap("map-1");
    await provider.getMap("map-2");
    await provider.getDatabase("project-1");
    await provider.getDatabase("project-2");

    expect(source.getProject).toHaveBeenCalledTimes(2);
    expect(source.getMap).toHaveBeenCalledTimes(2);
    expect(source.getDatabase).toHaveBeenCalledTimes(2);
  });

  test.each([
    [
      "project",
      (provider: GameDataProvider) =>
        provider.getProject({ projectId: "project-1" }),
      "getProject",
    ],
    ["map", (provider: GameDataProvider) => provider.getMap("map-1"), "getMap"],
    [
      "database",
      (provider: GameDataProvider) => provider.getDatabase("project-1"),
      "getDatabase",
    ],
    [
      "media",
      (provider: GameDataProvider) => provider.getMedia("media-1"),
      "getMedia",
    ],
  ] as const)(
    "evicts rejected %s requests so they can be retried",
    async (_name, request, method) => {
      const source = createSource();
      source[method].mockRejectedValueOnce(new Error("temporary failure"));
      const provider = createCachedGameDataProvider(source);

      await expect(request(provider)).rejects.toThrow("temporary failure");
      await expect(request(provider)).resolves.toBeDefined();

      expect(source[method]).toHaveBeenCalledTimes(2);
    }
  );

  test("keeps caches isolated between provider instances", async () => {
    const source = createSource();

    await createCachedGameDataProvider(source).getDatabase("project-1");
    await createCachedGameDataProvider(source).getDatabase("project-1");

    expect(source.getDatabase).toHaveBeenCalledTimes(2);
  });
});
