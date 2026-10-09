import type { GameDataProvider, ProviderConfig, ProjectQuery } from './types';

interface MediaIndex {
  byId?: Record<string, any>;
  items?: any[];
}

const ensureLeadingSlash = (path: string): string => {
  if (!path) return '/game-data';
  return path.startsWith('/') ? path : `/${path}`;
};

const normalizeMediaId = (mediaId: string): string => {
  return mediaId.startsWith('#') ? mediaId.slice(1) : mediaId;
};

const isMatchingMediaIdentifier = (item: any, identifier: string): boolean => {
  if (!item || !identifier) return false;
  const normalizedIdentifier = identifier.startsWith('/') ? identifier.slice(1) : identifier;
  const candidates = [
    item.id,
    item._id,
    item.fileName,
    item.localFileName,
    item.originalName,
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map((value) => (value.startsWith('/') ? value.slice(1) : value));

  return candidates.includes(normalizedIdentifier);
};

const fetchJson = async (url: string, label: string): Promise<any> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`[LocalBundleGameDataProvider] ${label} failed (${response.status}) for ${url}`);
  }
  return response.json();
};

const createPlaceholderProject = (): any => ({
  _id: 'offline-placeholder-project',
  name: 'Offline Project',
  subtitle: 'Bundle missing project data',
  runtimeMode: 'offline',
  keyboardControls: {
    up: 'up',
    down: 'down',
    left: 'left',
    right: 'right',
    action: 'space',
    dash: 'shift',
    escape: 'escape',
    back: 'escape',
  },
  hero: {},
  __placeholder: true,
});

const createPlaceholderMap = (mapId: string): any => ({
  _id: mapId,
  name: `Missing map: ${mapId}`,
  data: '[]',
  events: [],
  hitboxes: [],
  polygons: [],
  fullImage: '',
  gridImage: '',
  params: {},
  __placeholder: true,
});

const createPlaceholderMedia = (mediaId: string): any => {
  const normalized = normalizeMediaId(mediaId);
  const [detectedType] = normalized.split('_');
  return {
    _id: normalized,
    id: normalized,
    type: detectedType || 'spritesheet',
    fileName: '',
    metadata: {},
    __placeholder: true,
  };
};

export class LocalBundleGameDataProvider implements GameDataProvider {
  readonly kind = 'offline' as const;
  private readonly basePath: string;
  private mediaIndexPromise: Promise<MediaIndex> | null = null;

  constructor(config: ProviderConfig) {
    this.basePath = ensureLeadingSlash(config.bundleBasePath);
  }

  async getProject(_query: ProjectQuery): Promise<any> {
    try {
      return await fetchJson(`${this.basePath}/project.json`, 'project read');
    } catch (error) {
      console.warn('[LocalBundleGameDataProvider] fallback project placeholder', error);
      return createPlaceholderProject();
    }
  }

  async getMap(mapId: string): Promise<any> {
    const normalizedMapId = String(mapId ?? '').trim();
    if (!normalizedMapId) {
      console.warn('[LocalBundleGameDataProvider] empty map id, using placeholder');
      return createPlaceholderMap('unknown-map');
    }

    try {
      return await fetchJson(`${this.basePath}/maps/${normalizedMapId}.json`, 'map read');
    } catch (error) {
      console.warn(
        `[LocalBundleGameDataProvider] missing map ${normalizedMapId}, using placeholder`,
        error
      );
      return createPlaceholderMap(normalizedMapId);
    }
  }

  async getMedia(mediaId: string): Promise<any> {
    const normalizedId = normalizeMediaId(mediaId);
    if (!normalizedId) {
      console.warn('[LocalBundleGameDataProvider] empty media id, using placeholder');
      return createPlaceholderMedia('unknown_media');
    }

    try {
      const index = await this.getMediaIndex();
      const byId = index.byId ?? {};
      const direct = byId[normalizedId] ?? byId[`#${normalizedId}`];
      if (direct) {
        return {
          ...direct,
          id: direct.id ?? direct._id ?? normalizedId,
        };
      }

      const byIdentifierInById = Object.values(byId).find((item) =>
        isMatchingMediaIdentifier(item, normalizedId)
      );
      if (byIdentifierInById) {
        return {
          ...byIdentifierInById,
          id: byIdentifierInById.id ?? byIdentifierInById._id ?? normalizedId,
        };
      }

      if (Array.isArray(index.items)) {
        const found = index.items.find((item) => {
          if (isMatchingMediaIdentifier(item, normalizedId)) return true;
          const itemId = item?.id ?? item?._id;
          return itemId === normalizedId || itemId === `#${normalizedId}`;
        });

        if (found) {
          return {
            ...found,
            id: found.id ?? found._id ?? normalizedId,
          };
        }
      }
    } catch (error) {
      console.warn('[LocalBundleGameDataProvider] media index read failed', error);
    }

    console.warn(`[LocalBundleGameDataProvider] missing media ${normalizedId}, using placeholder`);
    return createPlaceholderMedia(normalizedId);
  }

  async getMediaGroup(mediaId: string): Promise<any[]> {
    const index = await this.getMediaIndex();
    const items = Array.isArray(index.items) ? index.items : Object.values(index.byId ?? {});
    return items.filter((item) => item?.metadata?.groupId === mediaId);
  }

  async getDatabase(_projectId?: string): Promise<any[]> {
    try {
      const value = await fetchJson(`${this.basePath}/database.json`, 'database read');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.warn('[LocalBundleGameDataProvider] fallback empty database', error);
      return [];
    }
  }

  private async getMediaIndex(): Promise<MediaIndex> {
    if (!this.mediaIndexPromise) {
      this.mediaIndexPromise = fetchJson(`${this.basePath}/media/media-index.json`, 'media index read');
    }
    return this.mediaIndexPromise;
  }
}
