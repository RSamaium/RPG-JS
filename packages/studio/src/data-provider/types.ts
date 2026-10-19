import type { RpgPlayer } from "@rpgjs/server";
import type { ProjectBasic } from "@common/types/project";

export type GameRuntimeMode = 'online' | 'offline' | 'auto';

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
  getPlayerStartConfig?(query: PlayerStartConfigQuery): Promise<Partial<ProjectBasic> | null | undefined>;
}

export interface ProviderConfig {
  apiBaseUrl: string;
  bundleBasePath: string;
}
