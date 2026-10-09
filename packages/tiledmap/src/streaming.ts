import {
  getMapChunkKey,
  type MapChunkBounds,
  type MapChunkHitbox,
  type MapStreamChunk,
  type MapStreamDefinition,
  type MapStreamManifest,
} from "@rpgjs/common";

export type TiledMapStreamManifestData = {
  map: any;
  basePath: string;
};

export type TiledMapStreamChunkData = {
  layers: Array<{ id: number | string; cells: Array<[number, number]> }>;
};

export type TiledMapStreamState = {
  manifest: MapStreamManifest<TiledMapStreamManifestData>;
  chunks: Map<string, MapStreamChunk<TiledMapStreamChunkData>>;
  parsedMap: any;
};

let revisionSequence = 0;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function joinPublicPath(basePath: string, source: string): string {
  if (/^(?:https?:)?\/\//i.test(source) || source.startsWith("data:")) return source;
  return `${basePath.replace(/\/$/, "")}/${source.replace(/^\.\//, "")}`;
}

function sanitizeRenderProperties(properties: any): { z: number } | undefined {
  return Number.isFinite(properties?.z) ? { z: properties.z } : undefined;
}

function sanitizeTileset(tileset: any, basePath: string, usedGids: Set<number>): any {
  const next = clone(tileset);
  delete next.source;
  delete next.properties;
  delete next.wangsets;
  delete next.terrains;
  if (next.image?.source) {
    next.image.source = joinPublicPath(basePath, next.image.source);
  }
  if (Array.isArray(next.tiles)) {
    const firstgid = Number(next.firstgid) || 0;
    const renderTiles = next.tiles
      .filter((tile: any) => usedGids.has(firstgid + Number(tile.id)))
      .map((tile: any) => {
        const sanitized = { ...tile };
        delete sanitized.objectgroup;
        sanitized.properties = sanitizeRenderProperties(tile.properties);
        if (!sanitized.properties) delete sanitized.properties;
        delete sanitized.class;
        delete sanitized.type;
        return sanitized;
      })
      .filter((tile: any) => (
        Array.isArray(tile.animation)
        || Array.isArray(tile.animations)
        || !!tile.image
        || !!tile.properties
      ));
    const highestTileId = renderTiles.reduce(
      (highest: number, tile: any) => Math.max(highest, Number(tile.id)),
      -1,
    );
    const renderTilesById = new Map<number, any>(
      renderTiles.map((tile: any) => [Number(tile.id), tile]),
    );
    next.tiles = Array.from(
      { length: highestTileId + 1 },
      (_, id) => renderTilesById.get(id) ?? { id },
    );
  }
  return next;
}

function sanitizeLayerTemplate(layer: any): any | undefined {
  const next = clone(layer);
  next.properties = sanitizeRenderProperties(layer.properties);
  if (!next.properties) delete next.properties;
  delete next.class;
  if (layer?.type === "objectgroup") {
    // Preserve the layer slot/order used by CanvasEngine to mount RPGJS
    // entities, but never disclose the source objects themselves.
    next.objects = [];
    next.data = [];
    next.layers = [];
  }
  else if (layer?.type === "tilelayer") {
    delete next.data;
    next.layers = [];
  }
  else if (Array.isArray(layer?.layers)) {
    next.layers = layer.layers
      .map(sanitizeLayerTemplate)
      .filter((entry: any) => !!entry);
  }
  return next;
}

function visitTileLayers(layers: any[], callback: (layer: any) => void): void {
  for (const layer of layers ?? []) {
    if (layer?.type === "tilelayer") callback(layer);
    if (Array.isArray(layer?.layers)) visitTileLayers(layer.layers, callback);
  }
}

function hitboxBounds(hitbox: MapChunkHitbox): MapChunkBounds | undefined {
  if ("points" in hitbox) {
    if (hitbox.points.length === 0) return undefined;
    const xs = hitbox.points.map((point) => point[0]);
    const ys = hitbox.points.map((point) => point[1]);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }
  const right = hitbox.x + hitbox.width;
  const bottom = hitbox.y + hitbox.height;
  return {
    x: Math.min(hitbox.x, right),
    y: Math.min(hitbox.y, bottom),
    width: Math.abs(hitbox.width),
    height: Math.abs(hitbox.height),
  };
}

function intersects(left: MapChunkBounds, right: MapChunkBounds): boolean {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}

export function compileTiledMapStream(
  mapData: any,
  options: { basePath: string; chunkSize?: number },
): MapStreamDefinition<TiledMapStreamManifestData, TiledMapStreamChunkData> | undefined {
  const parsedMap = mapData?.parsedMap;
  if (!parsedMap || typeof parsedMap.width !== "number" || typeof parsedMap.height !== "number") {
    return undefined;
  }

  const chunkSize = Math.max(1, Math.floor(options.chunkSize ?? 16));
  const tileWidth = Number(parsedMap.tilewidth) || 32;
  const tileHeight = Number(parsedMap.tileheight) || 32;
  const chunkWidth = chunkSize * tileWidth;
  const chunkHeight = chunkSize * tileHeight;
  const columns = Math.ceil(parsedMap.width / chunkSize);
  const rows = Math.ceil(parsedMap.height / chunkSize);
  const revision = String(mapData.revision ?? `${Date.now()}-${revisionSequence += 1}`);
  const publicMap = clone(parsedMap);
  const usedGids = new Set<number>();
  visitTileLayers(parsedMap.layers, (layer) => {
    for (const rawGid of layer.data ?? []) {
      const gid = Number(rawGid) & 0x0fffffff;
      if (gid > 0) usedGids.add(gid);
    }
  });
  delete publicMap.objects;
  delete publicMap.properties;
  publicMap.layers = (parsedMap.layers ?? [])
    .map(sanitizeLayerTemplate)
    .filter((entry: any) => !!entry);
  publicMap.tilesets = (parsedMap.tilesets ?? []).map((tileset: any) => sanitizeTileset(tileset, options.basePath, usedGids));

  const manifest: MapStreamManifest<TiledMapStreamManifestData> = {
    protocol: 1,
    mapId: String(mapData.id).replace(/^map-/, ""),
    revision,
    width: parsedMap.width * tileWidth,
    height: parsedMap.height * tileHeight,
    chunkWidth,
    chunkHeight,
    columns,
    rows,
    renderData: { map: publicMap, basePath: "" },
  };
  const chunks: Record<string, MapStreamChunk<TiledMapStreamChunkData>> = {};
  const hitboxes: MapChunkHitbox[] = Array.isArray(mapData.hitboxes) ? mapData.hitboxes : [];

  for (let chunkY = 0; chunkY < rows; chunkY += 1) {
    for (let chunkX = 0; chunkX < columns; chunkX += 1) {
      const tileStartX = chunkX * chunkSize;
      const tileStartY = chunkY * chunkSize;
      const tileEndX = Math.min(parsedMap.width, tileStartX + chunkSize);
      const tileEndY = Math.min(parsedMap.height, tileStartY + chunkSize);
      const bounds: MapChunkBounds = {
        x: tileStartX * tileWidth,
        y: tileStartY * tileHeight,
        width: (tileEndX - tileStartX) * tileWidth,
        height: (tileEndY - tileStartY) * tileHeight,
      };
      const layers: TiledMapStreamChunkData["layers"] = [];
      visitTileLayers(parsedMap.layers, (layer) => {
        const cells: Array<[number, number]> = [];
        for (let y = tileStartY; y < tileEndY; y += 1) {
          for (let x = tileStartX; x < tileEndX; x += 1) {
            const index = y * parsedMap.width + x;
            const gid = Number(layer.data?.[index] ?? 0);
            if (gid !== 0) cells.push([index, gid]);
          }
        }
        layers.push({ id: layer.id ?? layer.name, cells });
      });
      const key = getMapChunkKey(chunkX, chunkY);
      chunks[key] = {
        key,
        x: chunkX,
        y: chunkY,
        bounds,
        renderData: { layers },
        hitboxes: hitboxes.filter((hitbox) => {
          const geometryBounds = hitboxBounds(hitbox);
          return geometryBounds ? intersects(geometryBounds, bounds) : false;
        }),
      };
    }
  }

  return { manifest, chunks };
}

function initializeLayerData(layers: any[], size: number): void {
  visitTileLayers(layers, (layer) => {
    layer.data = new Array(size).fill(0);
  });
}

function findLayer(layers: any[], id: number | string): any | undefined {
  for (const layer of layers ?? []) {
    if ((layer.id ?? layer.name) === id) return layer;
    const nested = findLayer(layer.layers, id);
    if (nested) return nested;
  }
  return undefined;
}

function rebuildParsedMap(state: TiledMapStreamState): void {
  const parsedMap = clone(state.manifest.renderData.map);
  initializeLayerData(parsedMap.layers, parsedMap.width * parsedMap.height);
  for (const chunk of state.chunks.values()) {
    for (const patch of chunk.renderData.layers) {
      const layer = findLayer(parsedMap.layers, patch.id);
      if (!layer) continue;
      for (const [index, gid] of patch.cells) layer.data[index] = gid;
    }
  }
  state.parsedMap = parsedMap;
}

export function createTiledMapStreamState(
  manifest: MapStreamManifest<TiledMapStreamManifestData>,
): TiledMapStreamState {
  const state: TiledMapStreamState = {
    manifest,
    chunks: new Map(),
    parsedMap: undefined,
  };
  rebuildParsedMap(state);
  return state;
}

export function applyTiledMapStreamChunk(
  state: TiledMapStreamState,
  chunk: MapStreamChunk<TiledMapStreamChunkData>,
): void {
  state.chunks.set(chunk.key, chunk);
  rebuildParsedMap(state);
}

export function removeTiledMapStreamChunk(state: TiledMapStreamState, key: string): void {
  state.chunks.delete(key);
  rebuildParsedMap(state);
}
