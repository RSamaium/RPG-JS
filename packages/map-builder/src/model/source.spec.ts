// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { MapDefinitionError } from "./errors";
import { codeMapSource, httpMapSource, jsonMapSource, loadMapRegion, MapSourceError, regionOf, type MapSource } from "./source";
import { forest } from "./__fixtures__";

const json = () => JSON.parse(JSON.stringify(forest()));

describe("map sources", () => {
  it("code, JSON and HTTP sources produce an equivalent definition", async () => {
    const fetchMap = vi.fn(async () => new Response(JSON.stringify(json()), { status: 200 }));
    const sources: MapSource[] = [
      codeMapSource([forest()]),
      jsonMapSource({ maps: { forest: json() } }),
      jsonMapSource({ read: async () => json() }),
      httpMapSource({ baseUrl: "https://example.test/maps/", fetch: fetchMap as unknown as typeof fetch }),
    ];
    for (const source of sources) expect(await source.load("forest")).toEqual(forest());
    expect(fetchMap).toHaveBeenCalledWith("https://example.test/maps/forest", undefined);
  });

  it("returns a fresh copy on every load", async () => {
    const source = codeMapSource([forest()]);
    const first = await source.load("forest");
    const second = await source.load("forest");
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.elements[0]).not.toBe(second.elements[0]);
  });

  it("fails with not-found on an unknown map", async () => {
    for (const source of [codeMapSource([]), jsonMapSource({ maps: {} })]) {
      await expect(source.load("nope")).rejects.toMatchObject({ code: "not-found", mapId: "nope" });
    }
    await expect(jsonMapSource({ maps: {} }).load("toString")).rejects.toBeInstanceOf(MapSourceError);
  });

  it("validates what a JSON source loads", async () => {
    await expect(jsonMapSource({ maps: { bad: { version: 1 } } }).load("bad")).rejects.toBeInstanceOf(MapDefinitionError);
  });

  it("HTTP source maps statuses to errors, encodes ids and forwards headers", async () => {
    const respond = (status: number) => vi.fn(async () => new Response("{}", { status }));
    await expect(httpMapSource({ baseUrl: "/m", fetch: respond(404) as never }).load("x")).rejects.toMatchObject({
      code: "not-found",
    });
    await expect(httpMapSource({ baseUrl: "/m", fetch: respond(500) as never }).load("x")).rejects.toMatchObject({
      code: "load-failed",
    });

    const fetchMap = vi.fn(async () => new Response(JSON.stringify(json())));
    await httpMapSource({
      baseUrl: "/m",
      fetch: fetchMap as never,
      headers: { authorization: "Bearer t" },
    }).load("a b");
    expect(fetchMap).toHaveBeenCalledWith("/m/a%20b", { headers: { authorization: "Bearer t" } });
  });

  it("lists the maps it knows", async () => {
    expect(await codeMapSource([forest()]).list?.()).toEqual(["forest"]);
    expect(await jsonMapSource({ maps: { a: {}, b: {} } }).list?.()).toEqual(["a", "b"]);
  });

  describe("regions", () => {
    const rect = { x: 0, y: 0, width: 300, height: 200 };

    it("keeps what falls inside the rectangle", () => {
      const region = regionOf(forest(), rect);
      expect(region.elements.map((e) => e.id)).toEqual(["t1", "t2"]);
      expect(region.events).toEqual([]);
      expect(region.rect).toBe(rect);
    });

    it("grows the rectangle by a margin, borders included", () => {
      expect(regionOf(forest(), rect, 0).elements.map((e) => e.id)).not.toContain("home");
      expect(regionOf(forest(), { x: 128, y: 96, width: 0, height: 0 }).elements.map((e) => e.id)).toEqual(["t1"]);
      expect(regionOf(forest(), rect, 400).elements.map((e) => e.id)).toContain("home");
    });

    it("is derived from load when the source has no native loadRegion", async () => {
      const region = await loadMapRegion(codeMapSource([forest()]), "forest", rect);
      expect(region.elements.map((e) => e.id)).toEqual(["t1", "t2"]);
    });

    it("prefers the native loadRegion of a source", async () => {
      const native = { id: "forest", rect, elements: [], events: [] };
      const source: MapSource = { load: vi.fn(), loadRegion: vi.fn(async () => native) };
      expect(await loadMapRegion(source, "forest", rect)).toBe(native);
      expect(source.load).not.toHaveBeenCalled();
    });
  });
});
