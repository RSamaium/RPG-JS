import type { RpgTransportServer } from "./types";

import {
  createMapUpdateHeaders,
  MAP_UPDATE_TOKEN_ENV,
  resolveMapUpdateToken,
} from "../map-update";
export {
  createMapUpdateHeaders,
  isMapUpdateAuthorized,
  MAP_UPDATE_TOKEN_ENV,
  MAP_UPDATE_TOKEN_HEADER,
  readMapUpdateToken,
  resolveMapUpdateToken,
} from "../map-update";

export interface ResolveMapOptions {
  host?: string;
  headers?: Headers;
  mapUpdateToken?: string;
  tiledBasePaths?: string[];
}

type RuntimeProcess = {
  cwd?: () => string;
  env?: Record<string, string | undefined>;
};

function getRuntimeProcess(): RuntimeProcess | undefined {
  return (globalThis as { process?: RuntimeProcess }).process;
}

function getWorkingDirectory(): string | undefined {
  const cwd = getRuntimeProcess()?.cwd;
  if (typeof cwd !== "function") {
    return undefined;
  }

  try {
    return cwd();
  } catch {
    return undefined;
  }
}

function normalizeRoomMapId(roomId: string): string {
  return roomId.startsWith("map-") ? roomId.slice(4) : roomId;
}

function toBasePathPrefix(basePath: string): string {
  const trimmed = basePath.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function extractFileLikeMapDefinition(maps: any[], mapId: string): any | null {
  for (const mapDef of maps) {
    if (typeof mapDef === "object" && mapDef) {
      const candidateId = typeof mapDef.id === "string" ? mapDef.id.replace(/^map-/, "") : "";
      if (candidateId === mapId) {
        return mapDef;
      }
      continue;
    }

    if (typeof mapDef === "string") {
      const fileName = mapDef.split("/").pop()?.replace(/\.tmx$/i, "");
      if (fileName === mapId) {
        return { id: mapId, file: mapDef };
      }
    }
  }

  return null;
}

async function fetchTextByUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch {
    return null;
  }
}

async function readTextByFilePath(pathLike: string): Promise<string | null> {
  try {
    const { readFile } = await import("node:fs/promises");
    const { isAbsolute, join } = await import("node:path");

    const cwd = getWorkingDirectory();
    const candidates = isAbsolute(pathLike) || !cwd ? [pathLike] : [pathLike, join(cwd, pathLike)];

    for (const candidate of candidates) {
      try {
        return await readFile(candidate, "utf8");
      } catch {
        continue;
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function readTextNextToFile(filePath: string, relativePath: string): Promise<string | null> {
  try {
    const { dirname, resolve } = await import("node:path");
    return await readTextByFilePath(resolve(dirname(filePath), relativePath));
  } catch {
    return null;
  }
}

function getTiledBasePaths(paths?: string[]): string[] {
  const values = [
    ...(paths || []),
    getRuntimeProcess()?.env?.RPGJS_TILED_BASE_PATH,
    "map",
    "data",
    "assets/data",
    "assets/map",
  ].filter((value): value is string => !!value);

  return Array.from(new Set(values));
}

async function resolveMapDocument(
  mapId: string,
  mapDefinition: any,
  options: ResolveMapOptions,
): Promise<{ xml: string; sourceUrl?: string; sourcePath?: string }> {
  if (typeof mapDefinition?.data === "string" && mapDefinition.data.includes("<map")) {
    const file = typeof mapDefinition?.file === "string" ? mapDefinition.file.trim() : "";
    if (file && !file.includes("<map") && !/^https?:\/\//i.test(file)) {
      return { xml: mapDefinition.data, sourcePath: file };
    }
    return { xml: mapDefinition.data, sourceUrl: /^https?:\/\//i.test(file) ? file : undefined };
  }

  if (typeof mapDefinition?.file === "string") {
    const file = mapDefinition.file.trim();
    if (file.includes("<map")) {
      return { xml: file };
    }
    if (/^https?:\/\//i.test(file)) {
      const xml = await fetchTextByUrl(file);
      if (xml) {
        return { xml, sourceUrl: file };
      }
    }
    if (file.startsWith("/") && options.host) {
      const sourceUrl = `http://${options.host}${file}`;
      const xml = await fetchTextByUrl(sourceUrl);
      if (xml) {
        return { xml, sourceUrl };
      }
    }
    const xmlFromFile = await readTextByFilePath(file);
    if (xmlFromFile) {
      return { xml: xmlFromFile, sourcePath: file };
    }
  }

  for (const basePath of getTiledBasePaths(options.tiledBasePaths)) {
    const candidatePath = `${basePath.replace(/\/+$/, "")}/${mapId}.tmx`;
    const xml = await readTextByFilePath(candidatePath);
    if (xml) {
      return { xml, sourcePath: candidatePath };
    }
  }

  if (options.host) {
    for (const basePath of getTiledBasePaths(options.tiledBasePaths)) {
      const prefix = toBasePathPrefix(basePath);
      const sourceUrl = `http://${options.host}${prefix}/${mapId}.tmx`;
      const xml = await fetchTextByUrl(sourceUrl);
      if (xml) {
        return { xml, sourceUrl };
      }
    }
  }

  return { xml: "" };
}

export async function enrichMapWithParsedTiledData(payload: any, options: ResolveMapOptions = {}): Promise<void> {
  if (payload?.parsedMap || typeof payload?.id !== "string") {
    return;
  }

  const maps = Array.isArray(payload.__maps) ? payload.__maps : [];
  const mapDefinition = extractFileLikeMapDefinition(maps, payload.id);
  const mapDoc = await resolveMapDocument(payload.id, mapDefinition, options);
  if (!mapDoc.xml) {
    return;
  }

  try {
    const tiledModuleName = "@canvasengine/tiled";
    const tiledModule = await import(/* @vite-ignore */ tiledModuleName);
    const TiledParser = tiledModule?.TiledParser;
    if (!TiledParser) {
      return;
    }

    const mapParser = new TiledParser(mapDoc.xml);
    const parsedMap = mapParser.parseMap();
    const tilesets = Array.isArray(parsedMap?.tilesets) ? parsedMap.tilesets : [];
    const mergedTilesets: any[] = [];

    for (const tileset of tilesets) {
      if (!tileset?.source) {
        mergedTilesets.push(tileset);
        continue;
      }

      let sourceTilesetUrl: string | undefined;
      if (mapDoc.sourceUrl) {
        try {
          sourceTilesetUrl = new URL(tileset.source, mapDoc.sourceUrl).toString();
        } catch {
          sourceTilesetUrl = undefined;
        }
      }

      let tilesetRaw = mapDoc.sourcePath
        ? await readTextNextToFile(mapDoc.sourcePath, tileset.source)
        : null;
      if (!tilesetRaw && sourceTilesetUrl) {
        tilesetRaw = await fetchTextByUrl(sourceTilesetUrl);
      }
      if (!tilesetRaw && options.host) {
        const prefix = toBasePathPrefix(getTiledBasePaths(options.tiledBasePaths)[0] || "map");
        const candidatePath = tileset.source.startsWith("/")
          ? tileset.source
          : `${prefix}/${tileset.source}`.replace(/\/{2,}/g, "/");
        const hostedTilesetUrl = `http://${options.host}${candidatePath.startsWith("/") ? candidatePath : `/${candidatePath}`}`;
        tilesetRaw = await fetchTextByUrl(hostedTilesetUrl);
      }
      tilesetRaw ??= await readTextByFilePath(tileset.source);

      if (!tilesetRaw) {
        mergedTilesets.push(tileset);
        continue;
      }

      try {
        const tilesetParser = new TiledParser(tilesetRaw);
        const parsedTileset = tilesetParser.parseTileset();
        mergedTilesets.push({
          ...tileset,
          ...parsedTileset,
        });
      } catch {
        mergedTilesets.push(tileset);
      }
    }

    parsedMap.tilesets = mergedTilesets;
    payload.data = mapDoc.xml;
    payload.parsedMap = parsedMap;

    if (typeof parsedMap?.width === "number" && typeof parsedMap?.tilewidth === "number") {
      payload.width = parsedMap.width * parsedMap.tilewidth;
    }
    if (typeof parsedMap?.height === "number" && typeof parsedMap?.tileheight === "number") {
      payload.height = parsedMap.height * parsedMap.tileheight;
    }
  } catch {
    return;
  }
}

export async function updateMap(roomId: string, rpgServer: RpgTransportServer, options: ResolveMapOptions = {}): Promise<void> {
  if (!roomId.startsWith("map-")) {
    return;
  }

  try {
    const defaultMapPayload = await createMapUpdatePayload(roomId, rpgServer, options);

    const headers = createMapUpdateHeaders(options.mapUpdateToken, options.headers);

    await rpgServer.onRequest?.({
      url: `http://localhost/parties/main/${roomId}/map/update`,
      method: "POST",
      headers,
      json: async () => defaultMapPayload,
      text: async () => JSON.stringify(defaultMapPayload),
    });

    console.log(`Initialized map for room ${roomId} via POST /map/update`);
  } catch (error) {
    console.warn(`Failed initializing map for room ${roomId}:`, error);
  }
}

export async function createMapUpdatePayload(
  roomId: string,
  rpgServer: RpgTransportServer,
  options: ResolveMapOptions = {},
): Promise<any> {
  const mapId = normalizeRoomMapId(roomId);
  const serverMaps = Array.isArray(rpgServer.maps) ? rpgServer.maps : [];
  const payload: any = {
    id: mapId,
    width: 0,
    height: 0,
    events: [],
    __maps: serverMaps,
  };
  await enrichMapWithParsedTiledData(payload, options);
  delete payload.__maps;
  return payload;
}
