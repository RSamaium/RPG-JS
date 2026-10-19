import { describe, expect, it, vi } from "vitest";
import { collectMapMediaIds, warmUpStartupData } from "./startup-warmup";

describe("collectMapMediaIds", () => {
  it("finds the ids of the tilesets and terrains, whatever their shape", () => {
    expect(collectMapMediaIds({
      tileset: "tileset-a",
      primaryElementTileset: { _id: "elements-1", fileName: "x.png" },
      baseTerrain: "#terrain-1",
      primaryTerrainTileset: { id: "terrain-set" },
      elementTilesets: JSON.stringify([{ _id: "elements-1" }, { _id: "elements-2" }, "elements-3"]),
      terrainTilesets: { items: [{ mediaId: "terrain-set" }, { referenceId: "terrain-9" }] },
    }).sort()).toEqual([
      "elements-1", "elements-2", "elements-3", "terrain-1", "terrain-9", "terrain-set", "tileset-a",
    ]);
  });

  it("ignores what is not a reference", () => {
    expect(collectMapMediaIds(null)).toEqual([]);
    expect(collectMapMediaIds({ tileset: null, elementTilesets: "[]", baseTerrain: "" })).toEqual([]);
  });
});

describe("warmUpStartupData", () => {
  const provider = (map: unknown) => ({
    kind: "online" as const,
    getProject: vi.fn(async (_query: unknown) => ({})),
    getDatabase: vi.fn(async (_id?: string) => [] as any[]),
    getMap: vi.fn(async (_id: string) => map as any),
    getMedia: vi.fn(async (_id: string) => ({})),
  });

  it("asks for the project, the database, the map and then the media of the map", async () => {
    const source = provider({ params: { tileset: "t", primaryElementTileset: { _id: "e" } } });
    warmUpStartupData(source, { projectId: "p", startMapId: "m" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(source.getProject).toHaveBeenCalledWith({ projectId: "p" });
    expect(source.getDatabase).toHaveBeenCalledWith("p");
    expect(source.getMap).toHaveBeenCalledWith("m");
    expect(source.getMedia.mock.calls.map(([id]) => id).sort()).toEqual(["e", "t"]);
  });

  it("asks for nothing it does not know", () => {
    const source = provider({});
    warmUpStartupData(source, {});
    expect(source.getProject).not.toHaveBeenCalled();
    expect(source.getMap).not.toHaveBeenCalled();
  });

  it("never fails the start-up", async () => {
    const source = provider({});
    source.getProject.mockRejectedValue(new Error("offline"));
    source.getMap.mockRejectedValue(new Error("offline"));
    expect(() => warmUpStartupData(source, { projectId: "p", startMapId: "m" })).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
