import { createTiledMapServerModule } from "./server";
import { createModule, type RpgProvider } from "@rpgjs/common";
import {
  createTiledMapClientProviders,
} from "./client-provider";

export interface TiledMapOptions {
  /** Public URL prefix for image assets and, in standalone mode, TMX/TSX files. */
  basePath: string;
  /** Callback invoked after a standalone client loads a map. */
  onLoadMap?: (map: string) => Promise<void>;
  /** MMORPG chunk streaming configuration, or `false` to disable the built-in adapter. */
  streaming?: false | {
    /** Width and height of a chunk in Tiled cells. Defaults to 16. */
    chunkSize?: number;
    /** Chunk radius disclosed around the authoritative player position. Defaults to 2. */
    loadRadius?: number;
    /** Chunk radius retained by clients to reduce boundary churn. Defaults to 3. */
    retainRadius?: number;
  };
}

/**
 * Install Tiled rendering, authoritative physics, and progressive MMORPG chunks.
 *
 * In standalone mode the browser loads TMX/TSX directly. In MMORPG mode the
 * server keeps those sources private and sends only sanitized render/physics
 * chunks selected from the authoritative player position.
 *
 * @param options - Tiled asset path and optional streaming window.
 * @returns A combined RPGJS module with runtime-specific providers.
 */
export function provideTiledMap(
  options: TiledMapOptions = { basePath: "map" },
): RpgProvider[] {
  const clientFeature = createTiledMapClientProviders?.(options);
  const server = createTiledMapServerModule?.(options);
  return createModule("TiledMap", [
    {
      server,
      client: clientFeature?.client,
    },
    ...(clientFeature?.providers ?? []),
  ]);
}
