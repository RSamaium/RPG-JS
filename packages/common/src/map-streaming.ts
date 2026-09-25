/** WebSocket event used to transport server-authoritative map chunks. */
export const MAP_STREAM_EVENT = "map:stream";

/** Client action requesting a fresh manifest and initial interest chunks. */
export const MAP_STREAM_REQUEST_EVENT = "map.stream.request";

/** Coordinates of one map chunk in the provider-defined grid. */
export interface MapChunkCoordinates {
  /** Zero-based horizontal chunk index. */
  x: number;
  /** Zero-based vertical chunk index. */
  y: number;
}

/** Pixel bounds covered by one map chunk. */
export interface MapChunkBounds extends MapChunkCoordinates {
  /** Chunk width in RPGJS pixels. */
  width: number;
  /** Chunk height in RPGJS pixels. */
  height: number;
}

/**
 * Optional height range of a static hitbox, in the same unit as `player.z()`.
 *
 * When `z` is set, the hitbox only blocks characters whose `z` is within
 * `[z, z + zHeight)`. Without `z`, the hitbox blocks characters at every height.
 * Tiled tile collisions use `z = level * zTileHeight` and `zHeight = zTileHeight`,
 * where `level` is the sum of the layer and tile `z` properties.
 */
export interface MapHitboxElevation {
  /** Lowest character `z` blocked by this hitbox. */
  z?: number;
  /** Height of the blocked range. Defaults to infinity. */
  zHeight?: number;
}

/** Serializable static collision geometry sent to the predicting client. */
export type MapChunkHitbox =
  | ({ id?: string; x: number; y: number; width: number; height: number } & MapHitboxElevation)
  | ({ id?: string; points: number[][] } & MapHitboxElevation);

/**
 * Public, format-independent description of a streamed map.
 *
 * The server keeps the complete source map. The client receives this manifest
 * and only the chunks selected by the server's interest window.
 */
export interface MapStreamManifest<TRenderData = unknown> {
  /** Map-stream protocol version. */
  protocol: 1;
  /** Map identifier without the `map-` room prefix. */
  mapId: string;
  /** Provider-defined revision. A change resets all client chunks. */
  revision: string;
  /** Authoritative map width in RPGJS pixels. */
  width: number;
  /** Authoritative map height in RPGJS pixels. */
  height: number;
  /** Width of one interest chunk in RPGJS pixels. */
  chunkWidth: number;
  /** Height of one interest chunk in RPGJS pixels. */
  chunkHeight: number;
  /** Number of chunks on the horizontal axis. */
  columns: number;
  /** Number of chunks on the vertical axis. */
  rows: number;
  /** Public format metadata required to initialize the client renderer. */
  renderData: TRenderData;
}

/** One render/physics chunk produced by a map-format adapter. */
export interface MapStreamChunk<TRenderData = unknown> extends MapChunkCoordinates {
  /** Stable chunk key, normally produced by `getMapChunkKey()`. */
  key: string;
  /** Pixel area represented by this chunk. */
  bounds: MapChunkBounds;
  /** Provider-specific render delta for this chunk. */
  renderData: TRenderData;
  /** Static geometry disclosed for client-side movement prediction. */
  hitboxes: MapChunkHitbox[];
}

/** Complete private result of a server map compilation. */
export interface MapStreamDefinition<TManifestData = unknown, TChunkData = unknown> {
  /** Client-safe map metadata. */
  manifest: MapStreamManifest<TManifestData>;
  /** Private server lookup of every compiled chunk by key. */
  chunks: Record<string, MapStreamChunk<TChunkData>>;
}

/** Batched packet sent to one player when its map interest changes. */
export interface MapStreamPacket<TManifestData = unknown, TChunkData = unknown> {
  /** Map identifier targeted by this packet. */
  mapId: string;
  /** Revision shared with the manifest and all chunks. */
  revision: string;
  /** Manifest included on first delivery and after a revision change. */
  manifest?: MapStreamManifest<TManifestData>;
  /** Newly disclosed or replaced chunks. */
  chunks: MapStreamChunk<TChunkData>[];
  /** Keys that have left the retention window and must be discarded. */
  removed: string[];
}

/** Create the stable key used by transports and adapters for a chunk. */
export function getMapChunkKey(x: number, y: number): string {
  return `${x}:${y}`;
}

/** Resolve the grid cell containing a pixel position. */
export function getMapChunkCoordinates(
  x: number,
  y: number,
  manifest: Pick<MapStreamManifest, "chunkWidth" | "chunkHeight" | "columns" | "rows">,
): MapChunkCoordinates {
  return {
    x: Math.max(0, Math.min(manifest.columns - 1, Math.floor(x / manifest.chunkWidth))),
    y: Math.max(0, Math.min(manifest.rows - 1, Math.floor(y / manifest.chunkHeight))),
  };
}

/** Return every valid key inside a square interest radius. */
export function getMapInterestKeys(
  center: MapChunkCoordinates,
  radius: number,
  manifest: Pick<MapStreamManifest, "columns" | "rows">,
): Set<string> {
  const keys = new Set<string>();
  const safeRadius = Math.max(0, Math.floor(radius));
  for (let y = center.y - safeRadius; y <= center.y + safeRadius; y += 1) {
    if (y < 0 || y >= manifest.rows) continue;
    for (let x = center.x - safeRadius; x <= center.x + safeRadius; x += 1) {
      if (x < 0 || x >= manifest.columns) continue;
      keys.add(getMapChunkKey(x, y));
    }
  }
  return keys;
}
