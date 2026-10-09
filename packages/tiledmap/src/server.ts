import { RpgMap, RpgServer, provideServerMapStreaming } from "@rpgjs/server";
import { MapClass } from "@canvasengine/tiled";
import { defineModule } from "@rpgjs/common";
import { applyTiledPointEvents, prepareTiledPhysicsData } from "./physics";
import { compileTiledMapStream } from "./streaming";
import type { TiledMapOptions } from "./index";

declare module "@rpgjs/server" {
  interface RpgMap {
    /**
     * CanvasEngine Tiled map instance attached by `@rpgjs/tiledmap`.
     */
    tiled?: MapClass;
    /**
     * Tiled layers from the parsed map.
     */
    layers?: any[];
    /**
     * Height used by tile depth calculations. Defaults to the Tiled tile height.
     */
    zTileHeight?: number;
    /**
     * v4 compatibility helper. Returns a Tiled layer by its name.
     */
    getLayerByName?(name: string): any;
    /**
     * v4 compatibility helper. Returns the one-dimensional tile index for tile coordinates.
     */
    getTileIndex?(x: number, y: number): number;
    /**
     * v4 compatibility helper. Returns the pixel origin of a tile coordinate.
     */
    getTileOriginPosition?(x: number, y: number): { x: number; y: number };
    /**
     * v4 compatibility helper. Returns Tiled tile information from pixel coordinates.
     */
    getTileByPosition?(x: number, y: number, z?: number): any;
    /**
     * v4 compatibility helper. Returns Tiled tile information from a one-dimensional index.
     */
    getTileByIndex?(tileIndex: number): any;
    /**
     * v4 compatibility helper. Updates a tile in a Tiled tile layer.
     */
    setTile?(x: number, y: number, layer: string | number, tileInfo: any): any;
    /**
     * v4 compatibility helper. Updates the parsed Tiled tileset list.
     */
    updateTileset?(tileset: any): any;
  }
}

export interface RpgTiledMap extends RpgMap {
  tiled: MapClass;
}

export function createTiledMapServerModule(
  options: TiledMapOptions = { basePath: "map" },
): RpgServer {
  const streamingOptions = options.streaming === false ? undefined : options.streaming ?? {};
  const streamingModule = streamingOptions
    ? provideServerMapStreaming({
        compile(mapData: unknown) {
          return compileTiledMapStream(mapData, {
            basePath: options.basePath,
            chunkSize: streamingOptions.chunkSize,
          });
        },
      }, streamingOptions)
    : undefined;

  return defineModule<RpgServer>({
    map: {
      async onBeforeUpdate(mapData: unknown, map: RpgMap): Promise<void> {
        prepareTiledPhysicsData(mapData, map);
        applyTiledPointEvents(mapData);
        await streamingModule?.map?.onBeforeUpdate?.(mapData, map);
      },
      onJoin(player, map) {
        return streamingModule?.map?.onJoin?.(player, map);
      },
      onLeave(player, map) {
        return streamingModule?.map?.onLeave?.(player, map);
      },
      onPhysicsInit(map: any, context: { mapData: any }) {
        prepareTiledPhysicsData(context?.mapData, map);
      },
    },
  });
}

export default createTiledMapServerModule();
