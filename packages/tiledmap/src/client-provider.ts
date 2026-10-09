/// <reference path="./types/canvas-engine.d.ts" />

import { provideClientMapStreaming } from "@rpgjs/client";
import { TiledParser } from "@canvasengine/tiled";
import client from "./client";
import Tiled from "./tiled.ce";
import { prepareTiledPhysicsData } from "./physics";
import type { TiledMapOptions } from "./index";
import {
  applyTiledMapStreamChunk,
  createTiledMapStreamState,
  removeTiledMapStreamChunk,
  type TiledMapStreamChunkData,
  type TiledMapStreamManifestData,
  type TiledMapStreamState,
} from "./streaming";

async function loadDirectTiledMap(map: string, options: TiledMapOptions) {
  const response = await fetch(`${options.basePath}/${map}.tmx`);
  if (!response.ok) throw new Error(`Unable to load Tiled map '${map}': ${response.status} ${response.statusText}`);
  const mapData = await response.text();
  const parser = new TiledParser(mapData);
  const parsedMap = parser.parseMap();
  const tilesets: any[] = [];

  for (const tileset of parsedMap.tilesets) {
    const tilesetResponse = await fetch(`${options.basePath}/${tileset.source}`);
    if (!tilesetResponse.ok) {
      throw new Error(`Unable to load Tiled tileset '${tileset.source}': ${tilesetResponse.status} ${tilesetResponse.statusText}`);
    }
    const tilesetData = await tilesetResponse.text();
    const tilesetParser = new TiledParser(tilesetData);
    const parsedTileset = tilesetParser.parseTileset();
    parsedTileset.image.source = `${options.basePath}/${parsedTileset.image.source}`;
    tilesets.push({ ...tileset, ...parsedTileset });
  }

  parsedMap.tilesets = tilesets;
  const mapObject: any = {
    data: mapData,
    component: Tiled,
    parsedMap,
    id: map,
    params: { basePath: options.basePath },
  };
  prepareTiledPhysicsData(mapObject, mapObject);
  await options.onLoadMap?.(map);
  return mapObject;
}

export function createTiledMapClientProviders(
  options: TiledMapOptions,
): { client: typeof client; providers: any[] } {
  return {
    client,
    providers: [
      ...provideClientMapStreaming<TiledMapStreamManifestData, TiledMapStreamChunkData, TiledMapStreamState>({
        adapter: {
          component: Tiled,
          createState: createTiledMapStreamState,
          applyChunk: applyTiledMapStreamChunk,
          removeChunk: removeTiledMapStreamChunk,
          getData: (state) => state.parsedMap,
          getParams: (manifest) => ({ basePath: manifest.renderData.basePath }),
        },
        directLoad: (map) => loadDirectTiledMap(map, options),
      }),
    ],
  };
}
