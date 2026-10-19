import type {
  GameDataProvider,
  PlayerStartConfigQuery,
  ProviderConfig,
  ProjectQuery,
} from './types';

/**
 * Requests on their way. The client and the server of a standalone game ask for the same map, project
 * or media at the same time: one request answers them all. Only requests in flight are shared, never
 * an answer kept for later, so a republished project is always read again.
 */
const inflightRequests = new Map<string, Promise<any>>();

const fetchJson = async (url: string, label: string): Promise<any> => {
  let request = inflightRequests.get(url);
  if (!request) {
    request = (async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`[HttpGameDataProvider] ${label} failed (${response.status}) for ${url}`);
      }
      return response.json();
    })();
    inflightRequests.set(url, request);
    const forget = () => {
      if (inflightRequests.get(url) === request) inflightRequests.delete(url);
    };
    request.then(forget, forget);
  }
  // Every caller gets its own copy: they change what they receive (resolved media, normalized events).
  return structuredClone(await request);
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
