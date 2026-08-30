import { describe, expect, it } from "vitest";
import {
  applyTiledMapStreamChunk,
  compileTiledMapStream,
  createTiledMapStreamState,
  removeTiledMapStreamChunk,
} from "./streaming";

describe("Tiled map streaming adapter", () => {
  it("removes private Tiled data and rebuilds a sparse client map", () => {
    const definition = compileTiledMapStream({
      id: "demo",
      parsedMap: {
        width: 4,
        height: 2,
        tilewidth: 32,
        tileheight: 32,
        objects: [{ name: "secret-event" }],
        properties: { serverSecret: true },
        layers: [
          {
            id: 1,
            name: "ground",
            type: "tilelayer",
            width: 4,
            height: 2,
            data: [1, 2, 0, 0, 0, 0, 3, 4],
            properties: { z: 1, serverSecret: true },
          },
          { id: 2, name: "events", type: "objectgroup", objects: [{ name: "secret-event" }] },
        ],
        tilesets: [{
          firstgid: 1,
          source: "private.tsx",
          name: "tiles",
          image: { source: "tiles.png", width: 64, height: 64 },
          wangsets: [{ name: "private-editor-metadata" }],
          tiles: [{ id: 0, properties: { collision: true, z: 2 } }],
        }],
      },
      hitboxes: [
        { id: "wall", x: 0, y: 0, width: 32, height: 32 },
        { id: "wide-wall", x: 48, y: 0, width: 32, height: 32 },
        { id: "wide-polygon", points: [[48, 0], [80, 0], [80, 32], [48, 32]] },
      ],
    }, { basePath: "/assets", chunkSize: 2 })!;

    expect(definition.manifest.renderData.map.objects).toBeUndefined();
    expect(definition.manifest.renderData.map.properties).toBeUndefined();
    expect(definition.manifest.renderData.map.tilesets[0].source).toBeUndefined();
    expect(definition.manifest.renderData.map.tilesets[0].wangsets).toBeUndefined();
    expect(definition.manifest.renderData.map.tilesets[0].image.source).toBe("/assets/tiles.png");
    expect(definition.manifest.renderData.map.tilesets[0].tiles).toEqual([
      { id: 0, properties: { z: 2 } },
    ]);
    expect(definition.manifest.renderData.map.layers[0].properties).toEqual({ z: 1 });
    expect(definition.manifest.renderData.map.layers[1].objects).toEqual([]);
    expect(definition.chunks["0:0"].hitboxes.map((hitbox) => hitbox.id)).toEqual([
      "wall",
      "wide-wall",
      "wide-polygon",
    ]);
    expect(definition.chunks["1:0"].hitboxes.map((hitbox) => hitbox.id)).toEqual([
      "wide-wall",
      "wide-polygon",
    ]);

    const state = createTiledMapStreamState(definition.manifest);
    applyTiledMapStreamChunk(state, definition.chunks["0:0"]);
    expect(state.parsedMap.layers[0].data).toEqual([1, 2, 0, 0, 0, 0, 0, 0]);

    applyTiledMapStreamChunk(state, definition.chunks["1:0"]);
    expect(state.parsedMap.layers[0].data).toEqual([1, 2, 0, 0, 0, 0, 3, 4]);

    removeTiledMapStreamChunk(state, "0:0");
    expect(state.parsedMap.layers[0].data).toEqual([0, 0, 0, 0, 0, 0, 3, 4]);
  });
});
