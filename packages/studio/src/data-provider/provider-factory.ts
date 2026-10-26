import { apiUrl } from '../constants';
import { HttpGameDataProvider } from './http-game-data-provider';
import { LocalBundleGameDataProvider } from './local-bundle-game-data-provider';
import type {
  GameDataProvider,
  GameRuntimeMode,
  PlayerStartConfigQuery,
  ProviderConfig,
  StudioPlugin,
} from './types';
import { resolveRuntimeModeOrNull } from './runtime-mode';
import { STUDIO_PREVIEW_TOKEN_HEADER, resolveStudioDraftRequestFromPage } from './draft-request';

const getDefaultConfig = (): ProviderConfig => ({
  apiBaseUrl: apiUrl,
  bundleBasePath: '/game-data',
});

class AutoFallbackGameDataProvider implements GameDataProvider {
  readonly kind = 'auto-fallback' as const;

  constructor(
    private readonly local: LocalBundleGameDataProvider,
    private readonly http: HttpGameDataProvider
  ) {}

  async getProject(query: { projectId?: string | null; mapId?: string | null }): Promise<any> {
    try {
      const localValue = await this.local.getProject(query);
      if (
        localValue &&
        !localValue.__placeholder &&
        (!query.projectId || !localValue._id || String(localValue._id) === String(query.projectId))
      ) {
        return localValue;
      }
    } catch (error) {
      console.warn('[AutoFallbackGameDataProvider] local project failed, fallback to online', error);
    }
    return this.http.getProject(query);
  }

  async getMap(mapId: string): Promise<any> {
    try {
      const localValue = await this.local.getMap(mapId);
      if (localValue && !localValue.__placeholder) {
        return localValue;
      }
    } catch (error) {
      console.warn('[AutoFallbackGameDataProvider] local map failed, fallback to online', error);
    }
    return this.http.getMap(mapId);
  }

  async getMedia(mediaId: string): Promise<any> {
    try {
      const localValue = await this.local.getMedia(mediaId);
      if (localValue && !localValue.__placeholder) {
        return localValue;
      }
    } catch (error) {
      console.warn('[AutoFallbackGameDataProvider] local media failed, fallback to online', error);
    }
    return this.http.getMedia(mediaId);
  }

  async getMediaGroup(mediaId: string): Promise<any[]> {
    try {
      const localValue = await this.local.getMediaGroup(mediaId);
      if (localValue.length > 0) return localValue;
    } catch {
      // The online provider can supply groups absent from the local bundle.
    }
    return this.http.getMediaGroup(mediaId);
  }

  async getDatabase(projectId?: string): Promise<any[]> {
    try {
      const localValue = await this.local.getDatabase(projectId);
      if (localValue.length > 0) {
        return localValue;
      }
    } catch (error) {
      console.warn('[AutoFallbackGameDataProvider] local database failed, fallback to online', error);
    }
    return this.http.getDatabase(projectId);
  }

  async getPlugins(projectId?: string): Promise<StudioPlugin[]> {
    try {
      const localValue = await this.local.getPlugins(projectId);
      if (localValue.length > 0) return localValue;
    } catch (error) {
      console.warn('[AutoFallbackGameDataProvider] local plugins failed, fallback to online', error);
    }
    return this.http.getPlugins(projectId);
  }
}

class CachedGameDataProvider implements GameDataProvider {
  readonly kind: GameDataProvider['kind'];
  private projectByKey = new Map<string, Promise<any>>();
  private mapById = new Map<string, Promise<any>>();
  private mediaById = new Map<string, Promise<any>>();
  private mediaGroupById = new Map<string, Promise<any[]>>();
  private databaseByProjectId = new Map<string, Promise<any[]>>();
  private pluginsByProjectId = new Map<string, Promise<StudioPlugin[]>>();

  constructor(private readonly source: GameDataProvider) {
    this.kind = source.kind;
  }

  invalidateProject(projectId: string): void {
    this.projectByKey.delete(`projectId:${projectId}`);
    this.databaseByProjectId.delete(projectId);
    this.pluginsByProjectId.delete(projectId);
  }

  getProject(query: { projectId?: string | null; mapId?: string | null }): Promise<any> {
    let key: string | null = null;
    if (query.projectId) key = `projectId:${String(query.projectId)}`;
    else if (query.mapId) key = `mapId:${String(query.mapId)}`;

    if (!key) return this.source.getProject(query);
    return this.getOrCreate(this.projectByKey, key, () => this.source.getProject(query));
  }

  getMap(mapId: string): Promise<any> {
    const key = String(mapId);
    return this.getOrCreate(this.mapById, key, () => this.source.getMap(mapId));
  }

  getMedia(mediaId: string): Promise<any> {
    const key = String(mediaId);
    return this.getOrCreate(this.mediaById, key, () => this.source.getMedia(mediaId));
  }

  /** Set once the source refused a batch (a server without the route): the next ones ask one by one. */
  private mediaBatchRefused = false;

  prefetchMedia(mediaIds: string[]): void {
    const source = this.source;
    if (this.mediaBatchRefused || typeof source.getMediaMany !== 'function') return;
    const missing = [...new Set(mediaIds.map(String).filter(Boolean))].filter((id) => !this.mediaById.has(id));
    if (missing.length === 0) return;

    const batch = source.getMediaMany(missing);
    batch.catch(() => {
      this.mediaBatchRefused = true;
    });
    batch.then((list) => this.prefetchMediaGroups(list), () => undefined);
    for (const id of missing) {
      const media = batch
        // A batch that failed, or a media it did not return: ask for this one alone, as before.
        .then((list) => list.find((item) => String(item?._id) === id), () => undefined)
        .then((found) => found ?? source.getMedia(id))
        .catch((error) => {
          this.mediaById.delete(id);
          throw error;
        });
      media.catch(() => undefined);
      this.mediaById.set(id, media);
    }
  }

  /** Set once the source refused a group batch: the groups are asked one by one. */
  private mediaGroupBatchRefused = false;

  /** Asks in one request for the animations of the idle characters of a list of media. */
  private prefetchMediaGroups(media: any[]): void {
    const source = this.source;
    if (this.mediaGroupBatchRefused || typeof source.getMediaGroupMany !== 'function') return;
    const ids = media
      .filter((item) => item?.metadata?.generationMode === 'idle' && item._id)
      .map((item) => String(item._id))
      .filter((id) => !this.mediaGroupById.has(id));
    if (ids.length === 0) return;

    const batch = source.getMediaGroupMany(ids);
    batch.catch(() => {
      this.mediaGroupBatchRefused = true;
    });
    for (const id of ids) {
      const group = batch
        .then((answer) => answer[id], () => undefined)
        .then((found) => found ?? source.getMediaGroup?.(id) ?? [])
        .catch((error) => {
          this.mediaGroupById.delete(id);
          throw error;
        });
      group.catch(() => undefined);
      this.mediaGroupById.set(id, group);
    }
  }

  getMediaGroup(mediaId: string): Promise<any[]> {
    return this.getOrCreate(this.mediaGroupById, mediaId, () => this.source.getMediaGroup?.(mediaId) ?? Promise.resolve([]));
  }

  getDatabase(projectId?: string): Promise<any[]> {
    const key = String(projectId ?? '');
    return this.getOrCreate(this.databaseByProjectId, key, () => this.source.getDatabase(projectId));
  }

  getPlugins(projectId?: string): Promise<StudioPlugin[]> {
    const key = String(projectId ?? '');
    return this.getOrCreate(this.pluginsByProjectId, key, () => this.source.getPlugins?.(projectId) ?? Promise.resolve([]));
  }

  getPlayerStartConfig?(query: PlayerStartConfigQuery): Promise<any> {
    return this.source.getPlayerStartConfig?.(query) ?? Promise.resolve(null);
  }

  private getOrCreate<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> {
    const cached = cache.get(key);
    if (cached) return cached;

    const promise = load().catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, promise);
    return promise;
  }
}

export const createCachedGameDataProvider = (source: GameDataProvider): GameDataProvider => {
  return new CachedGameDataProvider(source);
};

let providerInstance: GameDataProvider | null = null;
type StudioGameRuntimeConfig = {
  projectId: string | null;
  runtimeMode?: GameRuntimeMode;
  apiBaseUrl?: string;
  bundleBasePath?: string;
  /** Token a draft request (`?editor` / `?preview`) sends in the `x-studio-preview-token` header. */
  previewToken?: string;
};

let runtimeConfig: StudioGameRuntimeConfig = {
  projectId: null,
};

/**
 * The runtime mode the data is really read with. A game configured for the published snapshot reads the draft instead when the
 * page asks for it (`?editor` or `?preview`), so the iframe of the Studio edits and tests the draft while every other URL plays
 * the published bundle, without a rebuild.
 */
export const resolveEffectiveRuntimeMode = (): GameRuntimeMode => {
  const mode = resolveRuntimeModeFromConfig();
  if (mode === 'published' && resolveStudioDraftRequestFromPage().draft) return 'online';
  return mode;
};

/**
 * Whether the events of a map are read from the `events.json` of a bundle instead of being embedded in the map. A published
 * snapshot always does, whatever the project id (a published game needs its project id for accounts, saves and start); a
 * bundle without a project id does too. The draft (`online`) never does.
 */
export const shouldReadEventsFromBundle = (options: { runtimeMode?: string | null; hasProjectId: boolean }): boolean => {
  const mode = options.runtimeMode === 'published' && resolveStudioDraftRequestFromPage().draft ? 'online' : options.runtimeMode;
  if (mode === 'published') return true;
  return mode !== 'online' && !options.hasProjectId;
};

const resolveRuntimeModeFromConfig = (): GameRuntimeMode => {
  if (runtimeConfig.runtimeMode) {
    return runtimeConfig.runtimeMode;
  }

  const runtimeMode = resolveRuntimeModeOrNull();
  if (runtimeMode) {
    return runtimeMode;
  }

  const hasProjectId = Boolean(runtimeConfig.projectId && runtimeConfig.projectId.trim().length > 0);
  if (hasProjectId) return 'online';
  return 'offline';
};

const resolveProviderConfig = (): ProviderConfig => {
  const defaultConfig = getDefaultConfig();
  const draft = resolveStudioDraftRequestFromPage();
  const previewToken = draft.token ?? runtimeConfig.previewToken;
  return {
    apiBaseUrl: runtimeConfig.apiBaseUrl || defaultConfig.apiBaseUrl,
    bundleBasePath: runtimeConfig.bundleBasePath || defaultConfig.bundleBasePath,
    ...(draft.draft && previewToken ? { requestHeaders: { [STUDIO_PREVIEW_TOKEN_HEADER]: previewToken } } : {}),
  };
};

export const createGameDataProvider = (
  mode: GameRuntimeMode,
  config: ProviderConfig = getDefaultConfig()
): GameDataProvider => {
  const httpProvider = new HttpGameDataProvider(config);
  const localProvider = new LocalBundleGameDataProvider(config, mode === 'published' ? 'published' : 'offline');

  if (mode === 'online') return httpProvider;
  if (mode === 'offline' || mode === 'published') return localProvider;
  return new AutoFallbackGameDataProvider(localProvider, httpProvider);
};

export const configureGameDataProvider = (provider: GameDataProvider): void => {
  providerInstance = provider;
};

export const configureStudioGameRuntime = (config: Partial<StudioGameRuntimeConfig>): void => {
  runtimeConfig = {
    ...runtimeConfig,
    ...config,
  };
  resetGameDataProvider();
};

export const getStudioGameRuntimeConfig = (): StudioGameRuntimeConfig => {
  return runtimeConfig;
};

export const resetGameDataProvider = (): void => {
  providerInstance = null;
};

export const invalidateGameDataProviderProject = (projectId: string): void => {
  if (providerInstance instanceof CachedGameDataProvider) {
    providerInstance.invalidateProject(projectId);
  }
};

export const getGameDataProvider = (): GameDataProvider => {
  if (providerInstance) return providerInstance;
  const mode = resolveEffectiveRuntimeMode();
  providerInstance = createCachedGameDataProvider(
    createGameDataProvider(mode, resolveProviderConfig())
  );
  return providerInstance;
};
