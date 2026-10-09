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
  getDatabase(projectId?: string): Promise<any[]>;
  getPlayerStartConfig?(query: PlayerStartConfigQuery): Promise<Partial<ProjectBasic> | null | undefined>;
}

export interface ProviderConfig {
  apiBaseUrl: string;
  bundleBasePath: string;
}
