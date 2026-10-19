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

  describe("prefetching media", () => {
    const withBatch = (found: (ids: string[]) => any[]) => {
      const source = {
        ...createSource(),
        getMedia: vi.fn(async (id: string) => ({ _id: id, from: "single" })),
        getMediaMany: vi.fn(async (ids: string[]) => found(ids)),
      };
      return { source, provider: createCachedGameDataProvider(source as any) };
    };

    test("asks for the media together and serves each one from the batch", async () => {
      const { source, provider } = withBatch((ids) => ids.map((id) => ({ _id: id, from: "batch" })));

      provider.prefetchMedia?.(["a", "b", "c", "a"]);

      await expect(provider.getMedia("a")).resolves.toEqual({ _id: "a", from: "batch" });
      await expect(provider.getMedia("c")).resolves.toEqual({ _id: "c", from: "batch" });
      expect(source.getMediaMany).toHaveBeenCalledTimes(1);
      expect(source.getMediaMany).toHaveBeenCalledWith(["a", "b", "c"]);
      expect(source.getMedia).not.toHaveBeenCalled();
    });

    test("does not ask again for media it already has or is fetching", async () => {
      const { source, provider } = withBatch((ids) => ids.map((id) => ({ _id: id })));

      await provider.getMedia("a");
      provider.prefetchMedia?.(["a", "b"]);
      provider.prefetchMedia?.(["b"]);

      expect(source.getMediaMany).toHaveBeenCalledTimes(1);
      expect(source.getMediaMany).toHaveBeenCalledWith(["b"]);
    });

    test("asks for the animations of the idle characters of a batch in one request", async () => {
      const source = {
        ...createSource(),
        getMedia: vi.fn(),
        getMediaMany: vi.fn(async (ids: string[]) =>
          ids.map((id) => ({ _id: id, metadata: id.startsWith("idle") ? { generationMode: "idle" } : {} })),
        ),
        getMediaGroup: vi.fn(async () => [{ _id: "single-walk" }]),
        getMediaGroupMany: vi.fn(async (ids: string[]) => Object.fromEntries(ids.map((id) => [id, [{ _id: `walk-${id}` }]]))),
      };
      const provider = createCachedGameDataProvider(source as any);

      provider.prefetchMedia?.(["idle-1", "idle-2", "tile"]);
      await provider.getMedia("idle-1");

      await expect(provider.getMediaGroup?.("idle-2")).resolves.toEqual([{ _id: "walk-idle-2" }]);
      expect(source.getMediaGroupMany).toHaveBeenCalledTimes(1);
      expect(source.getMediaGroupMany).toHaveBeenCalledWith(["idle-1", "idle-2"]);
      expect(source.getMediaGroup).not.toHaveBeenCalled();
    });

    test("asks for an animation list alone when the group batch fails", async () => {
      const source = {
        ...createSource(),
        getMedia: vi.fn(),
        getMediaMany: vi.fn(async (ids: string[]) => ids.map((id) => ({ _id: id, metadata: { generationMode: "idle" } }))),
        getMediaGroup: vi.fn(async () => [{ _id: "single-walk" }]),
        getMediaGroupMany: vi.fn(async () => {
          throw new Error("404");
        }),
      };
      const provider = createCachedGameDataProvider(source as any);

      provider.prefetchMedia?.(["idle-1"]);
      await provider.getMedia("idle-1");

      await expect(provider.getMediaGroup?.("idle-1")).resolves.toEqual([{ _id: "single-walk" }]);
    });

    test("asks alone for a media the batch did not return", async () => {
      const { source, provider } = withBatch((ids) => ids.filter((id) => id !== "gone").map((id) => ({ _id: id, from: "batch" })));

      provider.prefetchMedia?.(["a", "gone"]);

      await expect(provider.getMedia("a")).resolves.toMatchObject({ from: "batch" });
      await expect(provider.getMedia("gone")).resolves.toMatchObject({ from: "single" });
      expect(source.getMedia).toHaveBeenCalledTimes(1);
      expect(source.getMedia).toHaveBeenCalledWith("gone");
    });

    test("falls back on one request per media when the batch fails, and stops trying batches", async () => {
      const { source, provider } = withBatch(() => {
        throw new Error("404");
      });

      provider.prefetchMedia?.(["a", "b"]);

      await expect(provider.getMedia("a")).resolves.toMatchObject({ from: "single" });
      await expect(provider.getMedia("b")).resolves.toMatchObject({ from: "single" });
      provider.prefetchMedia?.(["c"]);
      expect(source.getMediaMany).toHaveBeenCalledTimes(1);
    });

    test("does nothing for a source with no batch route", async () => {
      const source = createSource();
      const provider = createCachedGameDataProvider(source);

      provider.prefetchMedia?.(["a"]);

      await provider.getMedia("a");
      expect(source.getMedia).toHaveBeenCalledTimes(1);
    });

    test("does not remember a media that cannot be fetched", async () => {
      const { source, provider } = withBatch(() => []);
      source.getMedia.mockRejectedValueOnce(new Error("404")).mockResolvedValueOnce({ _id: "a", from: "single" });

      provider.prefetchMedia?.(["a"]);

      await expect(provider.getMedia("a")).rejects.toThrow("404");
      await expect(provider.getMedia("a")).resolves.toMatchObject({ from: "single" });
    });
  });
});
