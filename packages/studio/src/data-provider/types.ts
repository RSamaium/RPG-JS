import type { RpgPlayer } from "@rpgjs/server";
import type { ProjectBasic } from "@common/types/project";

/**
 * Where the game reads its data:
 * - `online`: the Studio API, so the draft of the project;
 * - `offline`: a local bundle (`bundleBasePath`) of a game that has no project id;
 * - `published`: the bundle of a published snapshot (`bundleBasePath`, for example `<api>/published/<projectId>`),
 *   the project id is kept (accounts, saves, start) and the events come from the bundle;
 * - `auto`: the local bundle, then the API.
 */
export type GameRuntimeMode = 'online' | 'offline' | 'published' | 'auto';

/** A script of a plugin, as a snapshot publishes it: the parsed tree, never the source. */
export interface StudioPluginScript {
  name: string;
  tree: unknown;
}

/** A plugin installed in a project (`plugins.json` of a bundle, `/game/plugins` of the API). */
export interface StudioPlugin {
  pluginId: string;
  version: number;
  scripts: StudioPluginScript[];
}

export interface ProjectQuery {
  projectId?: string | null;
  mapId?: string | null;
}

export interface PlayerStartConfigQuery extends ProjectQuery {
  player: RpgPlayer;
  heroConfig: ProjectBasic;
  gameConfig?: any;
}

export interface GameDataProvider {
  readonly kind: GameRuntimeMode | 'auto-fallback';
  getProject(query: ProjectQuery): Promise<any>;
  getMap(mapId: string): Promise<any>;
  getMedia(mediaId: string): Promise<any>;
  getMediaGroup?(mediaId: string): Promise<any[]>;
  /** The animations of several idle characters at once, by character id. */
  getMediaGroupMany?(mediaIds: string[]): Promise<Record<string, any[]>>;
  /** Several media in one request. Absent where the source has no such route. */
  getMediaMany?(mediaIds: string[]): Promise<any[]>;
  /**
   * Starts fetching media together, so the `getMedia` calls that follow find them already on their way
   * instead of asking one by one.
   */
  prefetchMedia?(mediaIds: string[]): void;
  getDatabase(projectId?: string): Promise<any[]>;
  /** The enabled plugins of the project, with their scripts. Absent where the source has no plugins. */
  getPlugins?(projectId?: string): Promise<StudioPlugin[]>;
  getPlayerStartConfig?(query: PlayerStartConfigQuery): Promise<Partial<ProjectBasic> | null | undefined>;
}

export interface ProviderConfig {
  apiBaseUrl: string;
  bundleBasePath: string;
  /** Headers sent with every request of the API (for example the preview token of a draft). */
  requestHeaders?: Record<string, string>;
}
