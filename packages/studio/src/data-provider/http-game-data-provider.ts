import type {
  GameDataProvider,
  PlayerStartConfigQuery,
  ProviderConfig,
  ProjectQuery,
} from './types';

/**
 * Answers of the API, shared by every copy of this module in the page. In a standalone game the server
 * and the client are bundled apart but run together, and both ask for the same project, database,
 * map and media. A request is shared while it is on its way and, where the client has asked for it with
 * `keepStudioApiAnswers()`, for a few seconds after its answer, then forgotten: the cache never outlives the
 * start-up, and a new page always reads the API again. A server process lives for long and re-reads a project
 * that was published, so it keeps nothing after an answer.
 */
const SHARED_ANSWER_MS = 10_000;
type SharedAnswer = { promise: Promise<any>; expiresAt: number };
const KEEP_ANSWERS = Symbol.for("rpgjs.studio.keep-api-answers");

/** Called by the client of a page: its answers may be reused for a few seconds, whichever copy of the module asks. */
export const keepStudioApiAnswers = (enabled = true): void => {
  (globalThis as any)[KEEP_ANSWERS] = enabled;
};

const sharedAnswers: Map<string, SharedAnswer> = ((globalThis as any)[Symbol.for("rpgjs.studio.api-answers")] ??= new Map());

const fetchJson = async (url: string, label: string): Promise<any> => {
  let shared = sharedAnswers.get(url);
  if (shared && shared.expiresAt <= Date.now()) {
    sharedAnswers.delete(url);
    shared = undefined;
  }
  if (!shared) {
    const entry: SharedAnswer = {
      promise: (async () => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`[HttpGameDataProvider] ${label} failed (${response.status}) for ${url}`);
        }
        return response.json();
      })(),
      expiresAt: Infinity,
    };
    sharedAnswers.set(url, entry);
    entry.promise.then(
      () => { entry.expiresAt = Date.now() + ((globalThis as any)[KEEP_ANSWERS] ? SHARED_ANSWER_MS : 0); },
      () => { if (sharedAnswers.get(url) === entry) sharedAnswers.delete(url); },
    );
    shared = entry;
  }
  // Every caller gets its own copy: they change what they receive (resolved media, normalized events).
  return structuredClone(await shared.promise);
};

const getStudioApiKey = (): string | null => {
  const apiKey = (globalThis as { process?: { env?: Record<string, string> } })
    .process?.env?.RPGSTUDIO_API_KEY;
  return typeof apiKey === 'string' && apiKey.trim() ? apiKey : null;
};

const fetchStudioProject = async (
  apiBaseUrl: string,
  projectId: string,
): Promise<any> => {
  const apiKey = getStudioApiKey();
  if (!apiKey) return null;

  const response = await fetch(`${apiBaseUrl}/projects/${projectId}`, {
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('[HttpGameDataProvider] invalid RPGSTUDIO_API_KEY for project start config');
  }

  if (!response.ok) {
    throw new Error(
      `[HttpGameDataProvider] project start config failed (${response.status}) for ${projectId}`,
    );
  }

  return response.json();
};

export class HttpGameDataProvider implements GameDataProvider {
  readonly kind = 'online' as const;

  constructor(private readonly config: ProviderConfig) {}

  async getProject(query: ProjectQuery): Promise<any> {
    if (query.projectId) {
      return fetchJson(
        `${this.config.apiBaseUrl}/game/project?projectId=${query.projectId}`,
        'project query by projectId'
      );
    }

    if (query.mapId) {
      return fetchJson(
        `${this.config.apiBaseUrl}/game/project?mapId=${query.mapId}`,
        'project query by mapId'
      );
    }

    throw new Error('[HttpGameDataProvider] getProject requires projectId or mapId');
  }

  getMap(mapId: string): Promise<any> {
    return fetchJson(`${this.config.apiBaseUrl}/game/maps/${mapId}`, 'map query');
  }

  getMedia(mediaId: string): Promise<any> {
    return fetchJson(`${this.config.apiBaseUrl}/game/media/${mediaId}`, 'media query');
  }

  /** The most media the API answers in one request (`/game/media?ids=`); a longer list is asked in several. */
  static readonly MEDIA_BATCH_SIZE = 100;

  async getMediaMany(mediaIds: string[]): Promise<any[]> {
    const ids = [...new Set(mediaIds.filter(Boolean))];
    const slices: string[][] = [];
    for (let start = 0; start < ids.length; start += HttpGameDataProvider.MEDIA_BATCH_SIZE) {
      slices.push(ids.slice(start, start + HttpGameDataProvider.MEDIA_BATCH_SIZE));
    }
    const answers = await Promise.all(
      slices.map((slice) =>
        fetchJson(
          `${this.config.apiBaseUrl}/game/media?ids=${slice.map(encodeURIComponent).join(',')}`,
          'media batch query',
        ),
      ),
    );
    return answers.flat().filter((media) => media && typeof media === 'object');
  }

  async getMediaGroupMany(mediaIds: string[]): Promise<Record<string, any[]>> {
    const ids = [...new Set(mediaIds.filter(Boolean))];
    const slices: string[][] = [];
    for (let start = 0; start < ids.length; start += HttpGameDataProvider.MEDIA_BATCH_SIZE) {
      slices.push(ids.slice(start, start + HttpGameDataProvider.MEDIA_BATCH_SIZE));
    }
    const answers = await Promise.all(
      slices.map((slice) =>
        fetchJson(
          `${this.config.apiBaseUrl}/game/animations?ids=${slice.map(encodeURIComponent).join(',')}`,
          'character animations batch query',
        ),
      ),
    );
    return Object.assign({}, ...answers.filter((answer) => answer && typeof answer === 'object' && !Array.isArray(answer)));
  }

  getMediaGroup(mediaId: string): Promise<any[]> {
    return fetchJson(`${this.config.apiBaseUrl}/game/media/${mediaId}/animations`, 'character animations query');
  }

  async getDatabase(projectId?: string): Promise<any[]> {
    if (!projectId) {
      throw new Error('[HttpGameDataProvider] getDatabase requires projectId');
    }

    const value = await fetchJson(
      `${this.config.apiBaseUrl}/game/database/all?projectId=${projectId}`,
      'database query'
    );

    return Array.isArray(value) ? value : [];
  }

  async getPlayerStartConfig(query: PlayerStartConfigQuery): Promise<any> {
    if (!query.projectId) return null;
    return fetchStudioProject(this.config.apiBaseUrl, query.projectId);
  }
}
