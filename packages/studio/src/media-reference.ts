/**
 * A media the API sent whole (the tilesets and terrains of a map, the graphics of its events) already has
 * what the game reads: asking the API for it again only costs a round trip. A reference (an id, or an object that
 * only carries one) has no `fileName` and is still fetched.
 */
export const isHydratedMedia = (value: unknown): boolean => {
  if (!value || typeof value !== "object") return false;
  const media = value as { fileName?: unknown; __placeholder?: unknown };
  return typeof media.fileName === "string" && media.fileName.length > 0 && !media.__placeholder;
};

/**
 * The media a set of params carries whole, by id. A map names its primary tileset by an id while the same media
 * is already inside it (`tileset`, `elementTilesets`, `baseTerrain`, `terrainTilesets`): the id is answered from there.
 */
export const collectEmbeddedMedia = (params: Record<string, unknown> | null | undefined, listKeys: string[], keys: string[]): Map<string, any> => {
  const embedded = new Map<string, any>();
  if (!params) return embedded;
  const parse = (value: unknown): unknown => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (trimmed[0] !== "[" && trimmed[0] !== "{") return value;
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  };
  const candidates: unknown[] = keys.map((key) => parse(params[key]));
  for (const key of listKeys) {
    const list = parse(params[key]);
    if (Array.isArray(list)) candidates.push(...list.map(parse));
  }
  for (const candidate of candidates) {
    if (!isHydratedMedia(candidate)) continue;
    const media = candidate as Record<string, unknown>;
    for (const id of [media._id, media.id]) {
      if (typeof id === "string" && id.length > 0 && !embedded.has(id)) embedded.set(id, candidate);
    }
  }
  return embedded;
};
