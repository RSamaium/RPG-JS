import server from "./server";
import client from "./client";
import { createModule, type RpgProvider } from "@rpgjs/common";
import { createStudioMapClientProviders } from "./client-provider";
import { configureStudioGameRuntime } from "./data-provider";
import { configureStudioConstants } from "./constants";
import type { GameRuntimeMode } from "./data-provider/types";
import type { StudioMapPlugin } from "./studio-map-plugins";
export { collectStudioMapPluginPixiChildren, composeStudioMapPluginOptions, createStudioEventCollisionDebugOverlay, createStudioMapPlugins, studioDebugCollisionsPlugin } from "./studio-map-plugins";
export type { CreateStudioMapPluginsOptions, StudioDebugCollisionsOptions, StudioMapPlugin, StudioMapPluginContext, StudioMapPluginPixiChild, StudioTerrainRenderOptions } from "./studio-map-plugins";
export { createStudioActionBattleAnimations } from "./action-battle-animations";
export type { StudioCombatAnimationIds, StudioCombatAnimationOptions } from "./action-battle-animations";
export {
  createStudioActionBattleAudio,
  createStudioActionBattlePreset,
} from "./action-battle-audio";
export type { StudioCombatAudioConfig } from "./action-battle-audio";

export interface StudioGameModuleConfig {
  projectId?: string | null;
  runtimeMode?: GameRuntimeMode;
  apiBaseUrl?: string;
  bundleBasePath?: string;
  isProduction?: boolean;
  isPreprod?: boolean;
  baseUrl?: string;
  assetsUrl?: string;
  apiUrl?: string;
  displayTitleScreen?: boolean;
  startMapId?: string;
  debugCollisions?: boolean;
  studioPlugins?: StudioMapPlugin[];
  /** Authoritative Studio v2 map streaming, or `false` to disable it. */
  streaming?:
    | false
    | {
        /** Width and height of a chunk in Studio cells. Defaults to 16. */
        chunkSize?: number;
        /** Chunk radius disclosed around the authoritative player. Defaults to 2. */
        loadRadius?: number;
        /** Chunk radius retained by clients to reduce boundary churn. Defaults to 3. */
        retainRadius?: number;
      };
}

export function provideStudioGame(config: StudioGameModuleConfig = {}): RpgProvider[] {
  const hasProjectId = Boolean(config.projectId && config.projectId.trim().length > 0);

  const resolvedBaseUrl = config.baseUrl ?? "https://rpgjs.studio";
  const resolvedApiUrl = config.apiUrl ?? `${resolvedBaseUrl}/api`;
  const resolvedAssetsUrl = config.assetsUrl ?? (hasProjectId ? "https://assets.rpgjs.studio" : "/assets");

  configureStudioConstants({
    isProduction: config.isProduction,
    isPreprod: config.isPreprod,
    baseUrl: resolvedBaseUrl,
    assetsUrl: resolvedAssetsUrl,
    apiUrl: resolvedApiUrl,
  });

  configureStudioGameRuntime({
    projectId: config.projectId ?? null,
    runtimeMode: config.runtimeMode,
    apiBaseUrl: config.apiBaseUrl ?? resolvedApiUrl,
    bundleBasePath: config.bundleBasePath ?? "/game-data",
  });

  const clientProviders = createStudioMapClientProviders?.() ?? [];
  return createModule("StudioGame", [
    {
      server: server?.(config),
      client: client?.(config),
    },
    ...clientProviders,
  ]);
}
