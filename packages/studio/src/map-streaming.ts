import {
  getMapChunkKey,
  type MapChunkBounds,
  type MapChunkHitbox,
  type MapStreamChunk,
  type MapStreamDefinition,
  type MapStreamManifest,
  type WorldMapConfig,
} from "@rpgjs/common";
import {
  buildStudioTerrainCollisionPolygons,
  createStudioTerrainRenderData,
} from "./map-renderer";
import type {
  StudioTerrainControlRegion,
  StudioTerrainRenderBounds,
} from "./map-renderer/types";
import { resolveStudioElementSize } from "./studio-element-size";

type StudioElementLayer = "elementsAlwaysLow" | "elementsLow" | "elementsHigh";

export interface StudioMapStreamManifestData {
  map: Record<string, any>;
}

export interface StudioMapStreamChunkData {
  elements: Record<StudioElementLayer, any[]>;
  terrainCells: Array<[number, number, any]>;
  morphologyFeatures: any[];
  terrainControlRegion?: StudioTerrainControlRegion;
}

export interface StudioMapStreamState {
  manifest: MapStreamManifest<StudioMapStreamManifestData>;
  chunks: Map<string, MapStreamChunk<StudioMapStreamChunkData>>;
  map: Record<string, any>;
  generation: number;
  needsRebuild: boolean;
  pendingTerrainRegions: Map<string, StudioTerrainRenderBounds>;
}

export interface PreparedStudioMapPayload {
  id: string;
  width: number;
  height: number;
  data: Record<string, any>;
  events: any[];
  hitboxes: MapChunkHitbox[];
  config?: Record<string, any>;
  database?: any[] | Record<string, any>;
  revision?: string;
  /** Runtime-ready world topology published to every authoritative map room. */
  worldUpdates?: Array<{
    id: string;
    maps: WorldMapConfig[];
  }>;
}

export const STUDIO_TERRAIN_CONTROL_REGIONS = "__studioTerrainControlRegions";

export const STUDIO_DIRECT_LOAD_MARKER = "__studioDirectLoad";

/** A direct standalone load is already component-ready and must not be recompiled in place. */
export function isStudioDirectLoadPayload(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as Record<string, unknown>)[STUDIO_DIRECT_LOAD_MARKER] === true
  );
}

const ELEMENT_LAYERS: StudioElementLayer[] = [
  "elementsAlwaysLow",
  "elementsLow",
  "elementsHigh",
];
let revisionSequence = 0;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function parseArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function identifier(value: unknown): string {
  if (typeof value === "string" || typeof value === "number")
    return String(value).replace(/^#/, "");
  if (!value || typeof value !== "object") return "";
  const entry = value as Record<string, unknown>;
  return identifier(entry._id ?? entry.id ?? entry.mediaId);
}

function finite(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeDrawRules(raw: unknown): Map<string, any> {
  const parsed =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return {};
          }
        })()
      : raw;
  const rules = Array.isArray((parsed as any)?.rules)
    ? (parsed as any).rules
    : [];
  return new Map(
    rules.map((rule: any) => [String(rule?.elementId ?? ""), rule])
  );
}

function prepareElements(map: Record<string, any>): {
  elements: Record<StudioElementLayer, any[]>;
  hitboxes: MapChunkHitbox[];
} {
  const params = map.params ?? {};
  const tilesets = [
    params.tileset,
    params.primaryElementTileset,
    ...parseArray(params.elementTilesets),
  ].filter(Boolean);
  const indexes = new Map<
    string,
    { metadata: any; elements: Map<string, any>; rules: Map<string, any> }
  >();

  for (const tileset of tilesets) {
    const id = identifier(tileset);
    if (!id) continue;
    const entries = parseArray(tileset?.metadata?.elements);
    indexes.set(id, {
      metadata: tileset?.metadata,
      elements: new Map(
        entries.flatMap((entry: any, index: number) => [
          [String(index), entry],
          ...(entry?.id === undefined
            ? []
            : [[String(entry.id), entry] as [string, any]]),
        ])
      ),
      rules: normalizeDrawRules(tileset?.metadata?.drawRules),
    });
  }

  const fallbackTilesetId =
    identifier(params.primaryElementTileset) || identifier(params.tileset);
  const hitboxes: MapChunkHitbox[] = [];
  const layers: Record<StudioElementLayer, any[]> = {
    elementsAlwaysLow: [],
    elementsLow: [],
    elementsHigh: [],
  };

  ELEMENT_LAYERS.forEach((layerName, layerIndex) => {
    parseArray(map[layerName]).forEach((placement, placementIndex) => {
      const tilesetId = identifier(placement?.tilesetId) || fallbackTilesetId;
      const index = indexes.get(tilesetId);
      const source = index?.elements.get(String(placement?.id));
      const rect = source?.rect;
      if (!index || !source || !Array.isArray(rect) || rect.length < 4) return;
      const x = finite(placement.x, Number.NaN);
      const y = finite(placement.y, Number.NaN);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const rule = index.rules.get(String(placement.id));
      const size = resolveStudioElementSize(
        placement,
        source,
        index.metadata,
        finite(rect[2], 1),
        finite(rect[3], 1),
        { drawRule: rule }
      );
      const element = {
        id: source.id ?? placement.id,
        image: source.image,
        rect: source.rect,
        hitbox: source.hitbox,
        tilesetId,
        drawIn: [Math.round(x), Math.round(y), size.baseWidth, size.baseHeight],
        layer: layerIndex,
        scale: size.scale,
        hasShadow: placement.hasShadow ?? source.hasShadow,
        lightSpot: placement.lightSpot ?? source.lightSpot,
        zIndexOffset: finite(placement.zIndexOffset),
        ...(rule
          ? { drawRule: rule, drawRuleId: placement.drawRuleId ?? rule.id }
          : {}),
        __streamId: `${layerName}:${placementIndex}`,
      };
      layers[layerName].push(element);

      if (
        layerName !== "elementsLow" ||
        !source.hitbox ||
        source.hitbox.type === "none"
      )
        return;
      const hitbox = source.hitbox;
      const hx = x + finite(hitbox.x) * size.scale.x;
      const hy = y + finite(hitbox.y) * size.scale.y;
      const width = Math.max(1, finite(hitbox.width, 1) * size.scale.x);
      const height = Math.max(1, finite(hitbox.height, 1) * size.scale.y);
      hitboxes.push({
        id: `studio-element:${placementIndex}`,
        x: hx,
        y: hy,
        width,
        height,
      });
    });
  });

  return { elements: layers, hitboxes };
}

/** Prepare a complete Studio v2 map for authoritative physics and streaming. */
export function prepareStudioMapPayload(
  source: Record<string, any>,
  options: {
    id?: string;
    config?: Record<string, any>;
    database?: any[] | Record<string, any>;
  } = {}
): PreparedStudioMapPayload {
  if (source?.data?.__studioPrepared) {
    const prepared = clone(source) as PreparedStudioMapPayload;
    return {
      ...prepared,
      id: String(options.id ?? prepared.id),
      config: options.config ?? prepared.config,
      database: options.database ?? prepared.database,
    };
  }
  const map = clone(source?.data?.params ? source.data : source);
  if (map?.creationDetails?.version !== "v2") {
    throw new Error(
      `Studio map '${
        options.id ?? map?._id ?? map?.id ?? "unknown"
      }' must use format v2 for MMORPG streaming`
    );
  }
  const id = String(options.id ?? map._id ?? map.id);
  const width = Math.max(1, finite(map.params?.width, 1) * 48);
  const height = Math.max(1, finite(map.params?.height, 1) * 48);
  const preparedElements = prepareElements(map);
  const terrainByTileset = parseArray(map.terrainByTileset);
  const terrainRenderData = createStudioTerrainRenderData({
    ...map,
    terrainByTileset,
  });
  const baseHitboxes: MapChunkHitbox[] = Array.isArray(map.hitboxes)
    ? map.hitboxes
    : [];
  const polygonHitboxes: MapChunkHitbox[] = (
    Array.isArray(map.polygons) ? map.polygons : []
  )
    .filter((points: unknown) => Array.isArray(points) && points.length >= 3)
    .map((points: number[][], index: number) => ({
      id: `studio-polygon:${index}`,
      points,
    }));
  const terrainHitboxes = buildStudioTerrainCollisionPolygons({
    ...map,
    terrainByTileset,
  });
  const events = Array.isArray(source.events)
    ? source.events
    : Array.isArray(map.events)
    ? map.events
    : [];

  return {
    id,
    width,
    height,
    data: {
      ...map,
      id,
      __studioPrepared: true,
      elementsAlwaysLow: preparedElements.elements.elementsAlwaysLow,
      elementsLow: preparedElements.elements.elementsLow,
      elementsHigh: preparedElements.elements.elementsHigh,
      terrain: parseArray(map.terrain),
      terrainByTileset,
      terrainRenderData,
      events,
    },
    events,
    hitboxes: [
      ...baseHitboxes,
      ...polygonHitboxes,
      ...preparedElements.hitboxes,
      ...terrainHitboxes,
    ],
    config: options.config ?? source.config,
    database: options.database ?? source.database,
    revision: String(
      source.revision ??
        map.updatedAt ??
        `${Date.now()}-${(revisionSequence += 1)}`
    ),
  };
}

function elementBounds(element: any): MapChunkBounds {
  const drawIn = element?.drawIn ?? [];
  const scale = element?.scale ?? { x: 1, y: 1 };
  return {
    x: finite(drawIn[0]),
    y: finite(drawIn[1]),
    width: Math.max(1, finite(drawIn[2], 1) * finite(scale.x, 1)),
    height: Math.max(1, finite(drawIn[3], 1) * finite(scale.y, 1)),
  };
}

function intersects(left: MapChunkBounds, right: MapChunkBounds): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function hitboxBounds(hitbox: MapChunkHitbox): MapChunkBounds {
  if ("points" in hitbox) {
    const xs = hitbox.points.map((point) => point[0]);
    const ys = hitbox.points.map((point) => point[1]);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }
  return hitbox;
}

function featureBounds(feature: any): MapChunkBounds {
  const strokes = [
    ...(feature?.strokes ?? []),
    ...(feature?.eraserStrokes ?? []),
    ...(feature?.operations ?? []).map((entry: any) => entry.stroke),
  ].filter(Boolean);
  const points = strokes.flatMap((stroke: any) => stroke.points ?? []);
  const radius = Math.max(
    0,
    ...strokes.map((stroke: any) => finite(stroke.radius))
  );
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const xs = points.map((point: any) => finite(point.x));
  const ys = points.map((point: any) => finite(point.y));
  return {
    x: Math.min(...xs) - radius,
    y: Math.min(...ys) - radius,
    width: Math.max(...xs) - Math.min(...xs) + radius * 2,
    height: Math.max(...ys) - Math.min(...ys) + radius * 2,
  };
}

function sanitizeTemplate(data: Record<string, any>): Record<string, any> {
  const source = clone(data);
  const params = source.params ?? {};
  const sanitizeMedia = (value: any): any => {
    if (!value || typeof value !== "object") return value;
    return {
      ...(value._id !== undefined ? { _id: value._id } : {}),
      ...(value.id !== undefined ? { id: value.id } : {}),
      ...(value.fileName !== undefined ? { fileName: value.fileName } : {}),
      ...(value.image !== undefined ? { image: value.image } : {}),
    };
  };
  const sanitizeMediaList = (value: unknown): any[] =>
    parseArray(value).map(sanitizeMedia);
  const publicParams = {
    width: params.width,
    height: params.height,
    scale: params.scale,
    backgroundMusic: params.backgroundMusic,
    backgroundAmbientSound: params.backgroundAmbientSound,
    combatMusic: params.combatMusic,
    weather: params.weather,
    tileset: sanitizeMedia(params.tileset),
    primaryElementTileset: sanitizeMedia(params.primaryElementTileset),
    elementTilesets: sanitizeMediaList(
      params.elementTilesets ?? params.elementsTilesets
    ),
    baseTerrain: sanitizeMedia(params.baseTerrain),
    primaryTerrainTileset: sanitizeMedia(params.primaryTerrainTileset),
    terrainTilesets: sanitizeMediaList(params.terrainTilesets),
  };
  const terrainRenderData = source.terrainRenderData
    ? {
        ...source.terrainRenderData,
        terrainControl: source.terrainRenderData.terrainControl
          ? {
              ...source.terrainRenderData.terrainControl,
              source: "",
              regions: [],
            }
          : null,
        terrainGrid: [],
        morphologyFeatures: [],
        version: "streamed",
      }
    : null;
  terrainRenderData?.asset?.terrainTextures?.forEach(
    (entry: any) => delete entry.collision
  );

  return {
    id: source.id ?? source._id,
    name: source.name,
    params: publicParams,
    weather: source.weather,
    lighting: source.lighting,
    waterAnimation: source.waterAnimation,
    terrain: [],
    terrainRenderData,
    elementsAlwaysLow: [],
    elementsLow: [],
    elementsHigh: [],
  };
}

export function compileStudioMapStream(
  source: PreparedStudioMapPayload,
  options: { chunkSize?: number } = {}
): MapStreamDefinition<StudioMapStreamManifestData, StudioMapStreamChunkData> {
  const prepared = source.data?.__studioPrepared
    ? source
    : prepareStudioMapPayload(source as any);
  const chunkCells = Math.max(1, Math.floor(options.chunkSize ?? 16));
  const chunkWidth = chunkCells * 48;
  const chunkHeight = chunkCells * 48;
  const columns = Math.ceil(prepared.width / chunkWidth);
  const rows = Math.ceil(prepared.height / chunkHeight);
  const terrain = prepared.data.terrainRenderData;
  const manifest: MapStreamManifest<StudioMapStreamManifestData> = {
    protocol: 1,
    mapId: prepared.id.replace(/^map-/, ""),
    revision: prepared.revision ?? `${Date.now()}-${(revisionSequence += 1)}`,
    width: prepared.width,
    height: prepared.height,
    chunkWidth,
    chunkHeight,
    columns,
    rows,
    renderData: { map: sanitizeTemplate(prepared.data) },
  };
  const chunks: Record<string, MapStreamChunk<StudioMapStreamChunkData>> = {};

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const bounds = {
        x: x * chunkWidth,
        y: y * chunkHeight,
        width: Math.min(chunkWidth, prepared.width - x * chunkWidth),
        height: Math.min(chunkHeight, prepared.height - y * chunkHeight),
      };
      const renderBounds = {
        x: Math.max(0, bounds.x - 48),
        y: Math.max(0, bounds.y - 48),
        width:
          Math.min(prepared.width, bounds.x + bounds.width + 48) -
          Math.max(0, bounds.x - 48),
        height:
          Math.min(prepared.height, bounds.y + bounds.height + 48) -
          Math.max(0, bounds.y - 48),
      };
      const terrainCells: Array<[number, number, any]> = [];
      const minTileX = Math.floor(renderBounds.x / 48);
      const minTileY = Math.floor(renderBounds.y / 48);
      const maxTileX = Math.min(
        (terrain?.widthTiles ?? 1) - 1,
        Math.ceil((renderBounds.x + renderBounds.width) / 48)
      );
      const maxTileY = Math.min(
        (terrain?.heightTiles ?? 1) - 1,
        Math.ceil((renderBounds.y + renderBounds.height) / 48)
      );
      for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
        for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
          const cell = terrain?.terrainGrid?.[tileY]?.[tileX];
          if (cell) terrainCells.push([tileX, tileY, cell]);
        }
      }
      const elements = Object.fromEntries(
        ELEMENT_LAYERS.map((layer) => [
          layer,
          (prepared.data[layer] ?? []).filter((element: any) =>
            intersects(elementBounds(element), renderBounds)
          ),
        ])
      ) as Record<StudioElementLayer, any[]>;
      const morphologyFeatures = (terrain?.morphologyFeatures ?? []).filter(
        (feature: any) => intersects(featureBounds(feature), renderBounds)
      );
      const key = getMapChunkKey(x, y);
      chunks[key] = {
        key,
        x,
        y,
        bounds,
        renderData: {
          elements,
          terrainCells,
          morphologyFeatures,
          terrainControlRegion:
            prepared.data[STUDIO_TERRAIN_CONTROL_REGIONS]?.[key],
        },
        hitboxes: prepared.hitboxes.filter((hitbox) =>
          intersects(hitboxBounds(hitbox), bounds)
        ),
      };
    }
  }
  return { manifest, chunks };
}

function clipTerrainBounds(
  bounds: StudioTerrainRenderBounds,
  manifest: MapStreamManifest<StudioMapStreamManifestData>
): StudioTerrainRenderBounds | null {
  const x = Math.max(0, Math.min(manifest.width, bounds.x));
  const y = Math.max(0, Math.min(manifest.height, bounds.y));
  const right = Math.max(x, Math.min(manifest.width, bounds.x + bounds.width));
  const bottom = Math.max(y, Math.min(manifest.height, bounds.y + bounds.height));
  if (right <= x || bottom <= y) return null;
  return { x, y, width: right - x, height: bottom - y };
}

function getChunkTerrainBounds(
  state: StudioMapStreamState,
  chunk: MapStreamChunk<StudioMapStreamChunkData>
): StudioTerrainRenderBounds {
  let left = chunk.bounds.x;
  let top = chunk.bounds.y;
  let right = chunk.bounds.x + chunk.bounds.width;
  let bottom = chunk.bounds.y + chunk.bounds.height;
  const include = (bounds: StudioTerrainRenderBounds): void => {
    left = Math.min(left, bounds.x);
    top = Math.min(top, bounds.y);
    right = Math.max(right, bounds.x + bounds.width);
    bottom = Math.max(bottom, bounds.y + bounds.height);
  };

  for (const [tileX, tileY] of chunk.renderData.terrainCells) {
    include({ x: tileX * 48, y: tileY * 48, width: 48, height: 48 });
  }
  for (const feature of chunk.renderData.morphologyFeatures) {
    include(featureBounds(feature));
  }
  if (chunk.renderData.terrainControlRegion) {
    include(chunk.renderData.terrainControlRegion);
  }

  return (
    clipTerrainBounds(
      { x: left, y: top, width: right - left, height: bottom - top },
      state.manifest
    ) ?? { ...chunk.bounds }
  );
}

function markTerrainRegion(
  state: StudioMapStreamState,
  chunk: MapStreamChunk<StudioMapStreamChunkData>
): void {
  const bounds = getChunkTerrainBounds(state, chunk);
  state.pendingTerrainRegions.set(
    `${bounds.x}:${bounds.y}:${bounds.width}:${bounds.height}`,
    bounds
  );
}

function rebuildState(state: StudioMapStreamState): void {
  const map = clone(state.manifest.renderData.map);
  const terrain = map.terrainRenderData;
  if (terrain) {
    terrain.terrainGrid = Array.from({ length: terrain.heightTiles }, () =>
      Array(terrain.widthTiles)
    );
    if (terrain.terrainControl) terrain.terrainControl.regions = [];
  }
  const elements = Object.fromEntries(
    ELEMENT_LAYERS.map((key) => [key, new Map<string, any>()])
  ) as Record<StudioElementLayer, Map<string, any>>;
  const features = new Map<string, any>();
  const controlRegions = new Map<string, StudioTerrainControlRegion>();
  for (const chunk of state.chunks.values()) {
    for (const [tileX, tileY, cell] of chunk.renderData.terrainCells)
      terrain.terrainGrid[tileY][tileX] = cell;
    ELEMENT_LAYERS.forEach((layer) =>
      chunk.renderData.elements[layer].forEach((element: any) =>
        elements[layer].set(element.__streamId, element)
      )
    );
    chunk.renderData.morphologyFeatures.forEach((feature: any) =>
      features.set(String(feature.id), feature)
    );
    if (chunk.renderData.terrainControlRegion) {
      controlRegions.set(
        chunk.renderData.terrainControlRegion.key,
        chunk.renderData.terrainControlRegion
      );
    }
  }
  ELEMENT_LAYERS.forEach((layer) => {
    map[layer] = [...elements[layer].values()];
  });
  if (terrain) {
    terrain.morphologyFeatures = [...features.values()];
    terrain.version = `streamed:${state.manifest.revision}:${state.generation}:${[
      ...state.chunks.keys(),
    ]
      .sort()
      .join(",")}`;
    terrain.streamUpdate = {
      revision: state.manifest.revision,
      generation: state.generation,
      dirtyRegions: [...state.pendingTerrainRegions.values()],
      activeRegions: [...state.chunks.values()].map((chunk) =>
        getChunkTerrainBounds(state, chunk)
      ),
    };
    if (terrain.terrainControl) {
      terrain.terrainControl.regions = [...controlRegions.values()];
    }
  }
  state.map = map;
  state.pendingTerrainRegions.clear();
  state.needsRebuild = false;
}

export function createStudioMapStreamState(
  manifest: MapStreamManifest<StudioMapStreamManifestData>
): StudioMapStreamState {
  const state = {
    manifest,
    chunks: new Map(),
    map: {},
    generation: 0,
    needsRebuild: false,
    pendingTerrainRegions: new Map(),
  } as StudioMapStreamState;
  rebuildState(state);
  return state;
}

export function getStudioMapStreamData(
  state: StudioMapStreamState
): Record<string, any> {
  if (state.needsRebuild) {
    state.generation += 1;
    rebuildState(state);
  }
  return state.map;
}

export function applyStudioMapStreamChunk(
  state: StudioMapStreamState,
  chunk: MapStreamChunk<StudioMapStreamChunkData>
): void {
  const previous = state.chunks.get(chunk.key);
  if (previous) markTerrainRegion(state, previous);
  state.chunks.set(chunk.key, chunk);
  markTerrainRegion(state, chunk);
  state.needsRebuild = true;
}

export function removeStudioMapStreamChunk(
  state: StudioMapStreamState,
  key: string
): void {
  const previous = state.chunks.get(key);
  if (!previous) return;
  markTerrainRegion(state, previous);
  state.chunks.delete(key);
  state.needsRebuild = true;
}
