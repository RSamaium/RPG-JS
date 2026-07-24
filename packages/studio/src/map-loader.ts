"use client";

import MapComponentV2 from "./components/draw-map-v2.ce";
import { inject, RpgClientEngine } from "@rpgjs/client";
import { createSpriteSheetObject, resolveAssetSource } from "./spritesheet-utils";
import { getGameDataProvider, getStudioGameRuntimeConfig } from "./data-provider";
import {
  buildStudioTerrainCollisionPolygons,
  createStudioTerrainRenderData,
} from "./map-renderer";
import { resolveStudioElementSize } from "./studio-element-size";
import { STUDIO_DIRECT_LOAD_MARKER } from "./map-streaming";
import { assignStudioEventPlacementIds } from "./event-placement";

// Type definitions for better type safety
interface GlobalConfig {
  projectId?: string;
  startMapId?: string;
  debugCollisions?: boolean;
  hero?: {
    graphic?: any;
    faceset?: any;
  };
}

interface RpgClientEngineWithConfig extends RpgClientEngine {
  globalConfig: GlobalConfig;
}

type DrawRuleRect = [number, number, number, number];

interface RuntimeDrawRule {
  id: string;
  elementId: string;
  type: "repeat-axis" | "edge-repeat" | "frame-9slice";
  axis: "x" | "y";
  rects: Record<string, DrawRuleRect>;
}

interface TilesetElementEntry {
  element: any;
  index: number;
}

interface TilesetElementsIndex {
  elements: any[];
  metadata: any;
  mapById: Map<string, TilesetElementEntry>;
  mapByIndex: Map<string, TilesetElementEntry>;
  drawRuleByElementId: Map<string, RuntimeDrawRule>;
  drawRuleById: Map<string, RuntimeDrawRule>;
}

let firstMapLoaded = false;
const eventsCacheByBundlePath = new Map<string, Promise<any[]>>();

const toIdentifierString = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") {
    let result = String(value).trim();
    if (!result) return "";

    // Common serialized id formats.
    const objectIdMatch =
      result.match(/^ObjectId\("([^"]+)"\)$/) || result.match(/^ObjectId\('([^']+)'\)$/);
    if (objectIdMatch?.[1]) {
      result = objectIdMatch[1];
    }

    if (result.startsWith("#")) {
      result = result.slice(1);
    }

    if (!result || result === "[object Object]") return "";
    return result;
  }

  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  const fromKnownKeys = [
    record.$oid,
    record.oid,
    record._id,
    record.id,
    record.value,
    record.uuid,
  ];

  for (const candidate of fromKnownKeys) {
    const normalized = toIdentifierString(candidate);
    if (normalized) return normalized;
  }

  return "";
};

const extractMediaReferenceId = (value: unknown): string => {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  return (
    toIdentifierString(record._id) ||
    toIdentifierString(record.id) ||
    toIdentifierString(record.mediaId) ||
    toIdentifierString(record.referenceId)
  );
};

const ensureLeadingSlash = (value: string): string => {
  if (!value) return "/game-data";
  return value.startsWith("/") ? value : `/${value}`;
};

const normalizeBundlePath = (value?: string): string => {
  const normalized = ensureLeadingSlash(value || "/game-data");
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
};

const imageLoadCache = new Map<string, Promise<void>>();

const waitForImageLoad = (source: string): Promise<void> => {
  if (!source || typeof window === "undefined" || typeof Image === "undefined") {
    return Promise.resolve();
  }

  if (!imageLoadCache.has(source)) {
    const promise = new Promise<void>((resolve) => {
      const image = new Image();
      let timeout: ReturnType<typeof setTimeout> | undefined;
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        if (timeout) clearTimeout(timeout);
        resolve();
      };

      const complete = async () => {
        try {
          await image.decode?.();
        } catch {
          // A loaded image can still fail decode in some browsers; keep rendering fallback behavior.
        }
        finish();
      };

      image.onload = complete;
      image.onerror = finish;
      timeout = setTimeout(finish, 15000);
      image.src = source;

      if (image.complete) {
        void complete();
      }
    });

    imageLoadCache.set(source, promise);
  }

  return imageLoadCache.get(source)!;
};

const collectMediaImageSource = (media: any): string => {
  if (!media) return "";
  if (typeof media === "string") return resolveAssetSource(media);
  if (typeof media !== "object") return "";

  const source = media.fileName ?? media.src ?? media.url ?? media.image;
  return typeof source === "string" ? resolveAssetSource(source) : "";
};

const normalizeImageMediaList = (value: unknown): any[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed[0] !== "[" && trimmed[0] !== "{") return [trimmed];
    try {
      const parsed = JSON.parse(trimmed);
      return normalizeImageMediaList(parsed);
    } catch {
      return [value];
    }
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.values)) return record.values;
  }

  return [value];
};

const parseArrayValue = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const waitForMapImages = async (map: any): Promise<void> => {
  const imageSources = new Set<string>();
  const addSource = (source?: string) => {
    if (source) imageSources.add(source);
  };
  const addMedia = (media: any) => {
    addSource(collectMediaImageSource(media));
  };

  addSource(map.fullImage);
  addSource(map.gridImage);
  addMedia(map.params?.tileset);
  addMedia(map.params?.primaryElementTileset);
  addMedia(map.params?.baseTerrain);
  addMedia(map.params?.primaryTerrainTileset);
  normalizeImageMediaList(map.params?.elementTilesets).forEach(addMedia);
  normalizeImageMediaList(map.params?.terrainTilesets).forEach(addMedia);

  await Promise.all(Array.from(imageSources).map((source) => waitForImageLoad(source)));
};

const fetchBundleEvents = async (): Promise<any[]> => {
  const basePath = normalizeBundlePath(getStudioGameRuntimeConfig().bundleBasePath);
  if (!eventsCacheByBundlePath.has(basePath)) {
    const promise = fetch(`${basePath}/events.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`events.json read failed (${response.status})`);
        }
        return response.json();
      })
      .then((value) => (Array.isArray(value) ? value : []))
      .catch(() => []);

    eventsCacheByBundlePath.set(basePath, promise);
  }
  return eventsCacheByBundlePath.get(basePath)!;
};

const resolveMapEventReferences = async (
  events: unknown,
  options: { useLocalBundleEvents: boolean }
): Promise<any[]> => {
  const list = parseArrayValue(events);
  if (list.length === 0) return [];
  if (!options.useLocalBundleEvents) return list;

  const hasEventIdReference = list.some(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      typeof (entry as Record<string, unknown>).eventId === "string"
  );

  if (!hasEventIdReference) {
    return list;
  }

  const bundledEvents = await fetchBundleEvents();
  if (bundledEvents.length === 0) {
    return list;
  }

  const eventsById = new Map<string, any>();
  bundledEvents.forEach((entry) => {
    const ids = [
      entry?.eventId,
      entry?.id,
      entry?._id,
    ]
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    ids.forEach((id) => eventsById.set(id, entry));
  });

  return list.map((entry) => {
    if (!entry || typeof entry !== "object") return entry;
    const candidate = entry as Record<string, unknown>;
    const refId = typeof candidate.eventId === "string" ? candidate.eventId : "";
    if (!refId) return entry;

    const resolved = eventsById.get(refId);
    if (!resolved) return entry;

    const x = typeof candidate.x === "number" ? candidate.x : undefined;
    const y = typeof candidate.y === "number" ? candidate.y : undefined;
    const positionX =
      x ?? (typeof resolved?.position?.x === "number" ? resolved.position.x : undefined);
    const positionY =
      y ?? (typeof resolved?.position?.y === "number" ? resolved.position.y : undefined);

    return {
      ...resolved,
      ...candidate,
      eventId:
        refId ||
        String(
          resolved.eventId ??
            resolved._id ??
            resolved.id ??
            ''
        ),
      id: resolved.id ?? resolved._id ?? refId,
      _id: resolved._id ?? resolved.id ?? refId,
      x: positionX ?? resolved.x,
      y: positionY ?? resolved.y,
      position: {
        ...(resolved.position || {}),
        ...(x !== undefined ? { x } : {}),
        ...(y !== undefined ? { y } : {}),
      },
    };
  });
};

export const loadMap = async (mapId: string) => {
  const client = inject(RpgClientEngine) as RpgClientEngineWithConfig;
  const hasProjectId = Boolean(client.globalConfig.projectId && client.globalConfig.projectId.trim().length > 0);
  const runtimeMode =
    getStudioGameRuntimeConfig().runtimeMode ??
    (client.globalConfig as Record<string, unknown>).runtimeMode;
  const useLocalBundleEvents = runtimeMode !== "online" && !hasProjectId;

  let finalMapId = mapId;
  if (!firstMapLoaded) {
    finalMapId = client.globalConfig.startMapId ?? mapId;
    firstMapLoaded = true
  }

  const mapResponse = await getGameDataProvider().getMap(finalMapId);
  
  const params = mapResponse.params ?? {};
  const isV2 = mapResponse.creationDetails?.version === 'v2';

  const parseJsonValue = (value: unknown): unknown => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed || (trimmed[0] !== '[' && trimmed[0] !== '{')) return value;
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  };

  const normalizeMediaList = (value: unknown): any[] => {
    const parsedValue = parseJsonValue(value);
    if (!parsedValue) return [];
    if (Array.isArray(parsedValue)) return parsedValue;
    if (typeof parsedValue === 'object') {
      const record = parsedValue as Record<string, unknown>;
      if (Array.isArray(record.items)) return record.items;
      if (Array.isArray(record.data)) return record.data;
      if (Array.isArray(record.values)) return record.values;
    }
    return [parsedValue];
  };

  const resolveMediaReference = async (value: unknown): Promise<any> => {
    const parsedValue = parseJsonValue(value);
    if (parsedValue === undefined || parsedValue === null) return parsedValue;
    if (typeof parsedValue === 'object') {
      const referenceId = extractMediaReferenceId(parsedValue);
      if (!referenceId) return parsedValue;
      const candidateIds = Array.from(
        new Set([
          referenceId,
          referenceId.startsWith('#') ? referenceId.slice(1) : referenceId,
        ].filter(Boolean))
      );

      // In online mode the map payload may contain lightweight media refs;
      // hydrate them to ensure metadata-driven rendering works (multi-tileset, draw rules, hitboxes).
      for (const candidateId of candidateIds) {
        try {
          const media = await getGameDataProvider().getMedia(candidateId);
          if (media && !media.__placeholder) {
            return {
              ...parsedValue,
              ...media,
            };
          }
        } catch {
          // Try next candidate id.
        }
      }
      return parsedValue;
    }
    if (typeof parsedValue !== 'string') return parsedValue;

    const raw = parsedValue.trim();
    if (!raw) return parsedValue;

    const candidateIds = Array.from(
      new Set([
        raw,
        raw.startsWith('#') ? raw.slice(1) : raw,
      ].filter(Boolean))
    );

    for (const candidateId of candidateIds) {
      try {
        const media = await getGameDataProvider().getMedia(candidateId);
        if (media && !media.__placeholder) {
          return media;
        }
      } catch {
        // Keep original string reference if no media is found.
      }
    }

    return parsedValue;
  };

  const resolveMediaList = async (value: unknown): Promise<any[]> => {
    const values = normalizeMediaList(value);
    return Promise.all(values.map((entry) => resolveMediaReference(entry)));
  };

  const hydrateEventMediaReferences = async (events: any[]): Promise<any[]> => {
    return Promise.all(events.map(async (event) => {
      if (!event || typeof event !== "object") return event;
      const nextEvent = { ...event };
      if (nextEvent.params?.graphic) {
        nextEvent.params = {
          ...nextEvent.params,
          graphic: await resolveMediaReference(nextEvent.params.graphic),
        };
      }
      if (Array.isArray(nextEvent.triggers)) {
        nextEvent.triggers = await Promise.all(nextEvent.triggers.map(async (trigger: any) => {
          if (!trigger || typeof trigger !== "object") return trigger;
          if (!trigger.graphic) return trigger;
          return {
            ...trigger,
            graphic: await resolveMediaReference(trigger.graphic),
          };
        }));
      }
      return nextEvent;
    }));
  };

  const isAudioAssetSource = (value: string): boolean => {
    return (
      /^(https?:\/\/|\/|data:|blob:)/.test(value) ||
      /\.(aac|flac|m4a|mp3|oga|ogg|opus|wav|webm)(\?.*)?$/i.test(value)
    );
  };

  const resolveAudioSource = async (value: unknown): Promise<string> => {
    const parsedValue = parseJsonValue(value);
    if (!parsedValue) return "";
    if (typeof parsedValue === "string") {
      const source = parsedValue.trim();
      if (!source) return "";
      if (isAudioAssetSource(source)) return resolveAssetSource(source);
    }
    if (typeof parsedValue === "object") {
      const media = parsedValue as Record<string, unknown>;
      const source = media.fileName ?? media.src ?? media.url;
      if (typeof source === "string") return resolveAssetSource(source);
    }

    const resolved = await resolveMediaReference(value);
    if (!resolved) return "";
    if (typeof resolved === "string") return resolveAssetSource(resolved);
    if (typeof resolved === "object") {
      const media = resolved as Record<string, unknown>;
      const source = media.fileName ?? media.src ?? media.url;
      return typeof source === "string" ? resolveAssetSource(source) : "";
    }
    return "";
  };

  params.tileset = await resolveMediaReference(params.tileset);
  params.primaryElementTileset = await resolveMediaReference(params.primaryElementTileset);
  params.baseTerrain = await resolveMediaReference(params.baseTerrain);
  params.primaryTerrainTileset = await resolveMediaReference(params.primaryTerrainTileset);
  params.elementTilesets = await resolveMediaList(params.elementTilesets);
  params.terrainTilesets = await resolveMediaList(params.terrainTilesets);

  params.backgroundMusic = await resolveAudioSource(params.backgroundMusic);
  params.backgroundAmbientSound = await resolveAudioSource(params.backgroundAmbientSound);

  const resolvedMapEvents = assignStudioEventPlacementIds(await hydrateEventMediaReferences(
    await resolveMapEventReferences(mapResponse.events, {
      useLocalBundleEvents,
    })
  ));
  // Merge polygons with hitboxes to create polygon-based hitboxes
  const mergedHitboxes = [...(mapResponse.hitboxes ?? [])];
  
  // Add polygons as hitboxes with points
  if (mapResponse.polygons && Array.isArray(mapResponse.polygons)) {
    mapResponse.polygons.forEach((polygon: number[][], index: number) => {
      if (polygon && Array.isArray(polygon) && polygon.length >= 3) {
        mergedHitboxes.push({
          id: `polygon_${index}`,
          points: polygon,
          // Keep x, y, width, height for backward compatibility
          x: Math.min(...polygon.map(point => point[0])),
          y: Math.min(...polygon.map(point => point[1])),
          width: Math.max(...polygon.map(point => point[0])) - Math.min(...polygon.map(point => point[0])),
          height: Math.max(...polygon.map(point => point[1])) - Math.min(...polygon.map(point => point[1])),
        });
      }
    });
  }

  const mapDataValue = Array.isArray(mapResponse.data)
    ? mapResponse.data
    : JSON.parse(mapResponse.data ?? "[]");

  const map = {
    ...mapResponse,
    id: mapResponse._id,
    fullImage: resolveAssetSource(mapResponse.fullImage),
    gridImage: resolveAssetSource(mapResponse.gridImage),
    data: mapDataValue,
    hitboxes: mergedHitboxes,
    events: resolvedMapEvents,
    params,
  };

  /**
   * Merges element tileset data with position data to create render objects
   * 
   * @param elementTileset - Array of tileset elements with rect and drawIn data
   * @param elementsData - Array of position data with x, y, id
   * @param layerNumber - Layer number for z-index calculation (1 for low, 2 for high)
   * @returns Array of merged elements ready for rendering
   * 
   * @example
   * ```ts
   * const mergedElements = mergeElementsWithTileset(elementTileset, elementsLow, 1);
   * ```
   */
  const normalizeTilesets = (value: any): any[] => {
    return normalizeMediaList(value)
  }

  const toFiniteNumber = (value: unknown): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return value;
  };

  const normalizeDrawRuleRect = (value: unknown): DrawRuleRect | null => {
    if (!Array.isArray(value) || value.length < 4) return null;
    const x = toFiniteNumber(value[0]);
    const y = toFiniteNumber(value[1]);
    const width = toFiniteNumber(value[2]);
    const height = toFiniteNumber(value[3]);
    if (x === null || y === null || width === null || height === null) {
      return null;
    }
    return [
      Math.round(x),
      Math.round(y),
      Math.max(1, Math.round(width)),
      Math.max(1, Math.round(height)),
    ];
  };

  const normalizeRuntimeDrawRule = (value: unknown): RuntimeDrawRule | null => {
    if (!value) return null;
    let source = value;

    if (typeof source === 'string') {
      try {
        source = JSON.parse(source);
      } catch {
        return null;
      }
    }

    if (!source || typeof source !== 'object') return null;
    const candidate = source as Record<string, unknown>;
    const typeRaw = candidate['type'];
    if (
      typeRaw !== 'repeat-axis' &&
      typeRaw !== 'edge-repeat' &&
      typeRaw !== 'frame-9slice'
    ) {
      return null;
    }

    const elementIdRaw = candidate['elementId'];
    if (elementIdRaw === undefined || elementIdRaw === null) return null;

    const rectsRaw = candidate['rects'];
    if (!rectsRaw || typeof rectsRaw !== 'object') return null;

    const rects: Record<string, DrawRuleRect> = {};
    Object.entries(rectsRaw as Record<string, unknown>).forEach(([key, rectValue]) => {
      const normalizedRect = normalizeDrawRuleRect(rectValue);
      if (normalizedRect) {
        rects[key] = normalizedRect;
      }
    });

    if (Object.keys(rects).length === 0) return null;

    return {
      id: typeof candidate['id'] === 'string' ? candidate['id'] : '',
      elementId: String(elementIdRaw),
      type: typeRaw,
      axis: typeRaw === 'frame-9slice' ? 'x' : candidate['axis'] === 'y' ? 'y' : 'x',
      rects,
    };
  };

  const parseTilesetDrawRules = (rawRules: unknown): RuntimeDrawRule[] => {
    if (!rawRules) return [];
    let parsed = rawRules;

    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return [];
      }
    }

    if (!parsed || typeof parsed !== 'object') return [];
    const rules = (parsed as { rules?: unknown[] }).rules;
    if (!Array.isArray(rules)) return [];

    return rules
      .map((rule) => normalizeRuntimeDrawRule(rule))
      .filter((rule): rule is RuntimeDrawRule => rule !== null);
  };

  const parseTilesetElements = (rawElements: unknown): any[] => {
    if (!rawElements) return [];
    if (Array.isArray(rawElements)) return rawElements;
    if (typeof rawElements === 'string') {
      try {
        const parsed = JSON.parse(rawElements);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const buildTilesetElementsMap = (tileset: any): TilesetElementsIndex => {
    const elements = parseTilesetElements(tileset?.metadata?.elements);
    const mapById = new Map<string, TilesetElementEntry>();
    const mapByIndex = new Map<string, TilesetElementEntry>();
    const drawRuleByElementId = new Map<string, RuntimeDrawRule>();
    const drawRuleById = new Map<string, RuntimeDrawRule>();

    elements.forEach((element: any, index: number) => {
      const entry: TilesetElementEntry = { element, index };
      mapByIndex.set(String(index), entry);
      if (element?.id !== undefined && element?.id !== null) {
        mapById.set(String(element.id), entry);
      }
    });

    const drawRules = parseTilesetDrawRules(tileset?.metadata?.drawRules);
    drawRules.forEach((rule) => {
      drawRuleByElementId.set(String(rule.elementId), rule);
      if (rule.id) {
        drawRuleById.set(rule.id, rule);
      }
    });

    return { elements, metadata: tileset?.metadata, mapById, mapByIndex, drawRuleByElementId, drawRuleById };
  };

  const resolveTilesetElement = (
    tileset: TilesetElementsIndex,
    elementId: unknown
  ): TilesetElementEntry | null => {
    if (elementId === undefined || elementId === null) return null;
    const key = String(elementId);
    if (tileset.mapById.has(key)) {
      return tileset.mapById.get(key) || null;
    }
    if (tileset.mapByIndex.has(key)) {
      return tileset.mapByIndex.get(key) || null;
    }
    return null;
  };

  const resolveDrawRuleForElement = (
    elementData: any,
    tileset: TilesetElementsIndex,
    entry: TilesetElementEntry | null
  ): RuntimeDrawRule | undefined => {
    const drawRuleId =
      typeof elementData?.drawRuleId === 'string' && elementData.drawRuleId.length > 0
        ? elementData.drawRuleId
        : null;

    if (drawRuleId && tileset.drawRuleById.has(drawRuleId)) {
      return tileset.drawRuleById.get(drawRuleId);
    }

    const rawId = elementData?.id;
    if (rawId !== undefined && rawId !== null) {
      const byRawId = tileset.drawRuleByElementId.get(String(rawId));
      if (byRawId) {
        return byRawId;
      }
    }

    if (entry) {
      const entryId =
        entry.element?.id !== undefined && entry.element?.id !== null
          ? String(entry.element.id)
          : String(entry.index);
      const byEntryId = tileset.drawRuleByElementId.get(entryId);
      if (byEntryId) {
        return byEntryId;
      }
      return tileset.drawRuleByElementId.get(String(entry.index));
    }

    const directRule = normalizeRuntimeDrawRule(elementData?.drawRule);
    if (directRule) {
      return directRule;
    }

    return undefined;
  }

  const mergeElementsWithTilesets = (
    tilesetsById: Map<string, TilesetElementsIndex>,
    elementsData: any[],
    layerNumber: number,
    fallbackTilesetId?: string
  ): any[] => {
    if (!elementsData || elementsData.length === 0) {
      return []
    }

    const mergedElements: any[] = []
    elementsData.forEach((element) => {
      const tilesetId =
        toIdentifierString(element?.tilesetId) || toIdentifierString(fallbackTilesetId) || ''
      const tileset = tilesetsById.get(tilesetId)
      if (!tileset) return

      const entry = resolveTilesetElement(tileset, element.id)
      if (!entry) return

      const tilesetElement = entry.element
      const rect = tilesetElement?.rect
      if (!Array.isArray(rect) || rect.length < 4) return

      const sourceWidth = toFiniteNumber(rect[2])
      const sourceHeight = toFiniteNumber(rect[3])
      if (sourceWidth === null || sourceHeight === null) return

      const x = toFiniteNumber(element.x)
      const y = toFiniteNumber(element.y)
      if (x === null || y === null) return

      const drawRule = resolveDrawRuleForElement(element, tileset, entry)
      const size = resolveStudioElementSize(
        element,
        tilesetElement,
        tileset.metadata,
        sourceWidth,
        sourceHeight,
        { drawRule }
      )
      const zIndexOffset = toFiniteNumber(element.zIndexOffset) ?? 0

      const mergedElement: Record<string, unknown> = {
        ...tilesetElement,
        tilesetId,
        drawIn: [Math.round(x), Math.round(y), size.baseWidth, size.baseHeight],
        layer: () => layerNumber,
        scale: size.scale,
        hasShadow:
          typeof element.hasShadow === 'boolean'
            ? element.hasShadow
            : tilesetElement.hasShadow,
        lightSpot: element.lightSpot !== undefined ? element.lightSpot : tilesetElement.lightSpot,
        zIndexOffset,
      }

      if (drawRule) {
        mergedElement.drawRule = drawRule
      }

      const drawRuleId =
        typeof element.drawRuleId === 'string' && element.drawRuleId.length > 0
          ? element.drawRuleId
          : drawRule?.id

      if (drawRuleId) {
        mergedElement.drawRuleId = drawRuleId
      }

      mergedElements.push(mergedElement)
    })

    return mergedElements
  }

  /**
   * Merges hitboxes from elementTileset with map hitboxes
   * 
   * @param elementTileset - Array of tileset elements that may contain hitbox data
   * @param elementsData - Array of position data with x, y, id
   * @param existingHitboxes - Array of existing map hitboxes
   * @returns Array of merged hitboxes including elementTileset hitboxes
   * 
   * @example
   * ```ts
   * const mergedHitboxes = mergeElementTilesetHitboxes(elementTileset, elementsLow, map.hitboxes);
   * ```
   */
  const mergeElementTilesetHitboxes = (
    tilesetsById: Map<string, TilesetElementsIndex>,
    elementsData: any[],
    existingHitboxes: any[],
    fallbackTilesetId?: string
  ): any[] => {
    if (!elementsData || elementsData.length === 0) {
      return existingHitboxes
    }

    const mergedHitboxes = [...existingHitboxes]

  // Process each element in the map
  elementsData.forEach((element, index) => {
    const tilesetId =
      toIdentifierString(element?.tilesetId) || toIdentifierString(fallbackTilesetId) || ''
    const tileset = tilesetsById.get(tilesetId)
    if (!tileset) return
    const entry = resolveTilesetElement(tileset, element.id)
    const tilesetElement = entry?.element
    if (tilesetElement && tilesetElement.hitbox && tilesetElement.hitbox.type != 'none') {
      const elementX = toFiniteNumber(element.x)
      const elementY = toFiniteNumber(element.y)
      if (elementX === null || elementY === null) return

      // Calculate the absolute position of the hitbox
      // Get the hitbox relative to the element
      const hitbox = tilesetElement.hitbox
      const sourceRect = Array.isArray(tilesetElement.rect) ? tilesetElement.rect : null
      const sourceRectWidth = sourceRect ? toFiniteNumber(sourceRect[2]) : null
      const sourceRectHeight = sourceRect ? toFiniteNumber(sourceRect[3]) : null
      
      const hitboxX = toFiniteNumber(hitbox.x) ?? 0
      const hitboxY = toFiniteNumber(hitbox.y) ?? 0
      const hitboxWidth = toFiniteNumber(hitbox.width) ?? 0
      const hitboxHeight = toFiniteNumber(hitbox.height) ?? 0

      // If the element has been resized on the map, stretch hitbox accordingly.
      const effectiveSourceWidth =
        sourceRectWidth && sourceRectWidth > 0 ? sourceRectWidth : Math.max(1, hitboxWidth)
      const effectiveSourceHeight =
        sourceRectHeight && sourceRectHeight > 0 ? sourceRectHeight : Math.max(1, hitboxHeight)
      const size = resolveStudioElementSize(
        element,
        tilesetElement,
        tileset.metadata,
        effectiveSourceWidth,
        effectiveSourceHeight
      )
      const finalScaleX = size.scale.x
      const finalScaleY = size.scale.y
      const visualWidth = size.targetWidth
      const visualHeight = size.targetHeight
      const rawHitboxX = elementX + (hitboxX * finalScaleX)
      const rawHitboxY = elementY + (hitboxY * finalScaleY)
      const rawHitboxWidth = hitboxWidth * finalScaleX
      const rawHitboxHeight = hitboxHeight * finalScaleY
      const clampedHitboxX = Math.max(elementX, Math.min(elementX + Math.max(0, visualWidth - 1), rawHitboxX))
      const clampedHitboxY = Math.max(elementY, Math.min(elementY + Math.max(0, visualHeight - 1), rawHitboxY))
      const clampedHitboxRight = Math.max(
        clampedHitboxX + 1,
        Math.min(elementX + visualWidth, rawHitboxX + rawHitboxWidth)
      )
      const clampedHitboxBottom = Math.max(
        clampedHitboxY + 1,
        Math.min(elementY + visualHeight, rawHitboxY + rawHitboxHeight)
      )

      // Create the absolute hitbox with scale applied
      const absoluteHitbox = {
        id: `element_${index}_${tilesetElement.id}`,
        x: clampedHitboxX,
        y: clampedHitboxY,
        width: clampedHitboxRight - clampedHitboxX,
        height: clampedHitboxBottom - clampedHitboxY,
        type: hitbox.type || 'rectangle'
      }

      mergedHitboxes.push(absoluteHitbox)
    }
  })

    return mergedHitboxes
  }

  const primaryElementTileset = map.params.tileset
  const elementTilesets = normalizeTilesets(map.params.elementTilesets)
  const resolvedElementTilesets = elementTilesets.length > 0 ? elementTilesets : (primaryElementTileset ? [primaryElementTileset] : [])
  const tilesetsById = new Map<string, TilesetElementsIndex>()
  resolvedElementTilesets.forEach((tileset: any) => {
    const tilesetId = toIdentifierString(tileset?._id || tileset?.id)
    if (!tilesetId) return
    tilesetsById.set(tilesetId, buildTilesetElementsMap(tileset))
  })

  // Merge elementTileset with elementsAlwaysLow, elementsLow and elementsHigh
  const elementsAlwaysLow = isV2 ? JSON.parse(map.elementsAlwaysLow ?? '[]') : []
  const elementsLow = isV2 ? JSON.parse(map.elementsLow ?? '[]') : []
  const elementsHigh = isV2 ? JSON.parse(map.elementsHigh ?? '[]') : []
  
  const fallbackElementTilesetId =
    toIdentifierString(map.params.primaryElementTileset?._id) ||
    toIdentifierString(map.params.primaryElementTileset?.id) ||
    toIdentifierString(map.params.primaryElementTileset) ||
    toIdentifierString(primaryElementTileset?._id) ||
    toIdentifierString(primaryElementTileset?.id) ||
    ''
  const mergedElementsAlwaysLow = mergeElementsWithTilesets(tilesetsById, elementsAlwaysLow, 0, fallbackElementTilesetId)
  const mergedElementsLow = mergeElementsWithTilesets(tilesetsById, elementsLow, 1, fallbackElementTilesetId)
  const mergedElementsHigh = mergeElementsWithTilesets(tilesetsById, elementsHigh, 2, fallbackElementTilesetId)
  
  const terrainByTileset = isV2
    ? (typeof map.terrainByTileset === 'string' ? JSON.parse(map.terrainByTileset ?? '[]') : (map.terrainByTileset || []))
    : []

  // Merge hitboxes from elementTileset with existing map hitboxes
  // Note: Only elementsLow generate hitboxes (elementsAlwaysLow and elementsHigh don't)
  let finalHitboxes = map.hitboxes
  if (isV2 && tilesetsById.size > 0) {
    // Merge hitboxes only from elementsLow (always-low and high don't have hitboxes)
    finalHitboxes = mergeElementTilesetHitboxes(
      tilesetsById,
      elementsLow,
      finalHitboxes,
      fallbackElementTilesetId
    )
  }

  const terrainCollisionPolygons = isV2 ? buildStudioTerrainCollisionPolygons({
    ...map,
    terrainByTileset,
  }) : [];
  const terrainRenderData = isV2 ? createStudioTerrainRenderData({
    ...map,
    terrainByTileset,
  }) : null;
  const allHitboxes = [
    ...(Array.isArray(finalHitboxes) ? finalHitboxes : []),
    ...terrainCollisionPolygons,
  ];

  firstMapLoaded = true;

  await waitForMapImages(map);

  return {
    [STUDIO_DIRECT_LOAD_MARKER]: true,
    id: finalMapId,
    data: {
      ...map,
      elementsAlwaysLow: isV2 ? mergedElementsAlwaysLow : [],
      elementsLow: isV2 ? mergedElementsLow : [],
      elementsHigh: isV2 ? mergedElementsHigh : [],
      terrain: isV2 ? JSON.parse(map.terrain ?? '[]') : [],
      terrainByTileset: isV2 ? terrainByTileset : [],
      terrainRenderData,
      debugCollisions: client.globalConfig.debugCollisions === true,
    },
    hitboxes: allHitboxes,
    component: MapComponentV2,
    config: client.globalConfig,
    events: map.events,
    width: isV2 ? map.params.width * 48 : map.params.width,
    height: isV2 ? map.params.height * 48 : map.params.height,
    params: {
      backgroundMusic: map.params.backgroundMusic,
      backgroundAmbientSound: map.params.backgroundAmbientSound,
    }
  };
};

export default loadMap;
/// <reference path="./types/canvas-engine.d.ts" />
