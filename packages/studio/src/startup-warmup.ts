import type { GameDataProvider } from "./data-provider";

const toId = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const parseJson = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || (trimmed[0] !== "[" && trimmed[0] !== "{")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

/** A media reference of a map is an id, a `#id`, or an object that carries one. */
const referenceId = (value: unknown): string => {
  const parsed = parseJson(value);
  if (typeof parsed === "string") {
    const raw = parsed.trim();
    return raw.startsWith("#") ? raw.slice(1) : raw;
  }
  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    return toId(record._id) || toId(record.id) || toId(record.mediaId) || toId(record.referenceId);
  }
  return "";
};

const referenceList = (value: unknown): unknown[] => {
  const parsed = parseJson(value);
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    for (const key of ["items", "data", "values"]) {
      if (Array.isArray(record[key])) return record[key] as unknown[];
    }
  }
  return [parsed];
};

/**
 * Ids of the media a map needs to be drawn (its tilesets and terrains): the slowest answers of the
 * start-up, because they carry whole tileset descriptions.
 */
export const collectMapMediaIds = (params: Record<string, unknown> | null | undefined): string[] => {
  if (!params) return [];
  const references = [
    params.tileset,
    params.primaryElementTileset,
    params.baseTerrain,
    params.primaryTerrainTileset,
    ...referenceList(params.elementTilesets),
    ...referenceList(params.terrainTilesets),
  ];
  return [...new Set(references.map(referenceId).filter(Boolean))];
};

/**
 * Asks, as early as possible, for what the first map needs: the project, the database, the start
 * map and, once the map has arrived, its tilesets. The provider keeps what it fetches, so the real
 * steps find the answers already there, or on their way, instead of paying each round trip in turn.
 */
export const warmUpStartupData = (
  provider: GameDataProvider,
  options: { projectId?: string | null; startMapId?: string | null },
): void => {
  const ignore = (request: Promise<unknown> | undefined) => void request?.catch(() => undefined);
  const projectId = options.projectId?.trim();
  if (projectId) {
    ignore(provider.getProject({ projectId }));
    ignore(provider.getDatabase(projectId));
  }
  const startMapId = options.startMapId?.trim();
  if (startMapId) {
    provider
      .getMap(startMapId)
      .then((map) => collectMapMediaIds(map?.params).forEach((id) => ignore(provider.getMedia(id))))
      .catch(() => undefined);
  }
};
