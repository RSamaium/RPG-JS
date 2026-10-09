import { describe, expect, it, vi } from "vitest";

vi.mock("@canvasengine/tiled", () => {
  class MapClass {
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    widthPx: number;
    heightPx: number;
    layers: any[];
    tilesets: any[];
    private blockedTiles: Set<string>;

    constructor(parsedMap: any) {
      this.width = parsedMap.width ?? 0;
      this.height = parsedMap.height ?? 0;
      this.tilewidth = parsedMap.tilewidth ?? 32;
      this.tileheight = parsedMap.tileheight ?? 32;
      this.widthPx = this.width * this.tilewidth;
      this.heightPx = this.height * this.tileheight;
      this.layers = parsedMap.layers;
      this.tilesets = parsedMap.tilesets;
      this.blockedTiles = new Set(parsedMap.blockedTiles ?? []);
      this.tilesIndex = Object.fromEntries(
        (parsedMap.levels ?? [0]).map((level: number) => [level, []]),
      );
    }

    private tilesIndex: Record<number, unknown[]>;

    get zTileHeight() {
      return this.tileheight;
    }

    // Mirrors CanvasEngine: the tile row is shifted by z, and the level is z / zTileHeight
    getTileByPosition(x: number, y: number, z: [number, number] = [0, 0]) {
      const tileX = Math.floor(x / this.tilewidth);
      const tileY = Math.floor((y - z[0]) / this.tileheight);
      const level = Math.floor(z[0] / this.zTileHeight);
      const key = level === 0 ? `${tileX},${tileY}` : `${tileX},${tileY}@${level}`;
      return {
        hasCollision: this.blockedTiles.has(key),
      };
    }
  }

  return { MapClass };
});

import { applyTiledPointEvents, prepareTiledPhysicsData } from "./physics";

describe("prepareTiledPhysicsData", () => {
  it("adds tiled collision hitboxes without duplicating them on repeated preparation", () => {
    const mapData = {
      parsedMap: {
        width: 3,
        height: 2,
        tilewidth: 16,
        tileheight: 20,
        blockedTiles: ["1,0", "2,1"],
      },
      hitboxes: [{ id: "custom-hitbox", x: 4, y: 5, width: 6, height: 7 }],
    };
    const map: any = {};
    const expectedHitboxes = [
      { id: "custom-hitbox", x: 4, y: 5, width: 6, height: 7 },
      { id: "__tiled_collision__:1,0", x: 16, y: 0, width: 16, height: 20, z: 0, zHeight: 20 },
      { id: "__tiled_collision__:2,1", x: 32, y: 20, width: 16, height: 20, z: 0, zHeight: 20 },
    ];

    prepareTiledPhysicsData(mapData, map);

    expect(mapData.width).toBe(48);
    expect(mapData.height).toBe(40);
    expect(mapData.hitboxes).toEqual(expectedHitboxes);

    prepareTiledPhysicsData(mapData, map);

    expect(mapData.hitboxes).toEqual(expectedHitboxes);
  });

  it("removes stale generated tiled hitboxes when blocked tiles change", () => {
    const mapData = {
      parsedMap: {
        width: 2,
        height: 1,
        tilewidth: 32,
        tileheight: 32,
        blockedTiles: ["0,0"],
      },
      hitboxes: [],
    };
    const map: any = {};

    prepareTiledPhysicsData(mapData, map);
    expect(mapData.hitboxes).toEqual([
      { id: "__tiled_collision__:0,0", x: 0, y: 0, width: 32, height: 32, z: 0, zHeight: 32 },
    ]);

    mapData.parsedMap.blockedTiles = [];
    prepareTiledPhysicsData(mapData, map);

    expect(mapData.hitboxes).toEqual([]);
  });

  it("gives each tile collision the z range of its Tiled level", () => {
    const mapData = {
      parsedMap: {
        width: 2,
        height: 1,
        tilewidth: 32,
        tileheight: 32,
        levels: [0, 2],
        blockedTiles: ["0,0", "1,0@2"],
      },
      hitboxes: [],
    };

    prepareTiledPhysicsData(mapData, {});

    expect(mapData.hitboxes).toEqual([
      { id: "__tiled_collision__:0,0", x: 0, y: 0, width: 32, height: 32, z: 0, zHeight: 32 },
      { id: "__tiled_collision__:1,0@2", x: 32, y: 0, width: 32, height: 32, z: 64, zHeight: 32 },
    ]);
  });

  it("adds v4 map helpers backed by Tiled data", () => {
    const groundLayer = { name: "Ground", data: [1, 0, 2, 3] };
    const mapData = {
      parsedMap: {
        width: 2,
        height: 2,
        tilewidth: 16,
        tileheight: 20,
        layers: [groundLayer],
        tilesets: [{ firstgid: 1, name: "base" }],
      },
    };
    const map: any = {};

    prepareTiledPhysicsData(mapData, map);

    expect(map.layers).toBe(mapData.parsedMap.layers);
    expect(map.zTileHeight).toBe(20);
    expect(map.getLayerByName("Ground")).toBe(groundLayer);
    expect(map.getTileIndex(1, 1)).toBe(3);
    expect(map.getTileOriginPosition(1, 1)).toEqual({ x: 16, y: 20 });
    expect(map.getTileByPosition(16, 20)).toEqual({ hasCollision: false });
    expect(map.getTileByIndex(2)).toMatchObject({ gid: 2, id: 2, index: 2, layer: groundLayer });

    expect(map.setTile(1, 0, "Ground", { gid: 8 })).toEqual({ gid: 8 });
    expect(groundLayer.data[1]).toBe(8);

    expect(map.updateTileset({ firstgid: 1, name: "base", tilecount: 4 })).toEqual({
      firstgid: 1,
      name: "base",
      tilecount: 4,
    });
    expect(map.tiled.tilesets).toEqual([{ firstgid: 1, name: "base", tilecount: 4 }]);
    expect(mapData.parsedMap.tilesets).toEqual([{ firstgid: 1, name: "base", tilecount: 4 }]);
  });
});

describe("tiled point positions", () => {
  it("extracts named point objects as map positions", () => {
    const mapData = {
      parsedMap: {
        width: 1,
        height: 1,
        objects: [
          { point: true, name: "start", x: 10, y: 20 },
          { point: true, name: "entrance", x: 30, y: 40 },
        ],
      },
    };

    prepareTiledPhysicsData(mapData, {});

    expect(mapData.positions).toEqual({
      start: { x: 10, y: 20 },
      entrance: { x: 30, y: 40 },
    });
  });

  it("uses class or type as a fallback for the special start position", () => {
    const mapData = {
      parsedMap: {
        width: 1,
        height: 1,
        objects: [
          { point: true, class: "start", x: 10, y: 20 },
          { point: true, type: "start", x: 30, y: 40 },
        ],
      },
    };

    prepareTiledPhysicsData(mapData, {});

    expect(mapData.positions).toEqual({
      start: { x: 10, y: 20 },
    });
  });

  it("keeps explicitly named start before class or type fallback", () => {
    const mapData = {
      parsedMap: {
        width: 1,
        height: 1,
        objects: [
          { point: true, name: "start", x: 10, y: 20 },
          { point: true, class: "start", x: 30, y: 40 },
        ],
      },
    };

    prepareTiledPhysicsData(mapData, {});

    expect(mapData.positions).toEqual({
      start: { x: 10, y: 20 },
    });
  });
});

describe("applyTiledPointEvents", () => {
  it("places direct object events by matching their name with a tiled point", () => {
    const mapData = {
      parsedMap: {
        objects: [
          { point: true, name: "EV-1", x: 10, y: 20 },
        ],
      },
      events: [
        { name: "EV-1", onInit() {} },
      ],
    };

    applyTiledPointEvents(mapData);

    expect(mapData.events).toEqual([
      {
        event: { name: "EV-1", onInit: expect.any(Function) },
        x: 10,
        y: 20,
      },
    ]);
  });

  it("places wrapped object events by matching the wrapped event name", () => {
    const mapData = {
      parsedMap: {
        objects: [
          { point: true, name: "EV-1", x: 10, y: 20 },
        ],
      },
      events: [
        { id: "event-id", event: { name: "EV-1", onInit() {} } },
      ],
    };

    applyTiledPointEvents(mapData);

    expect(mapData.events).toEqual([
      {
        id: "event-id",
        event: { name: "EV-1", onInit: expect.any(Function) },
        x: 10,
        y: 20,
      },
    ]);
  });

  it("places class events decorated with EventData metadata", () => {
    class NpcEvent {}
    (NpcEvent as any)._name = "EV-1";
    (NpcEvent as any).prototype._name = "EV-1";

    const mapData = {
      parsedMap: {
        objects: [
          { point: true, name: "EV-1", x: 10, y: 20 },
        ],
      },
      events: [
        { event: NpcEvent },
      ],
    };

    applyTiledPointEvents(mapData);

    expect(mapData.events).toEqual([
      {
        event: NpcEvent,
        x: 10,
        y: 20,
      },
    ]);
  });

  it("does not override explicit event coordinates", () => {
    const mapData = {
      parsedMap: {
        objects: [
          { point: true, name: "EV-1", x: 10, y: 20 },
        ],
      },
      events: [
        { x: 50, y: 60, event: { name: "EV-1" } },
      ],
    };

    applyTiledPointEvents(mapData);

    expect(mapData.events).toEqual([
      { x: 50, y: 60, event: { name: "EV-1" } },
    ]);
  });
});
