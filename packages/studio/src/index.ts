import server from "./server";
import client from "./client";
import { createModule, type RpgProvider } from "@rpgjs/common";
import { createStudioMapClientProviders } from "./client-provider";
import { configureStudioGameRuntime } from "./data-provider";
import { configureStudioConstants } from "./constants";
import type { GameRuntimeMode } from "./data-provider/types";
import type { StudioMapPlugin } from "./studio-map-plugins";
import type { StudioStartupResolver } from "./startup";
export {
  StudioStartupError,
  type StudioDirectStartup,
  type StudioPlayerStartup,
  type StudioStartupErrorCode,
  type StudioStartupResolver,
  type StudioStartupResolverContext,
  type StudioTitleStartup,
} from "./startup";
export { collectStudioMapPluginPixiChildren, composeStudioMapPluginOptions, createStudioEventCollisionDebugOverlay, createStudioMapPlugins, studioDebugCollisionsPlugin } from "./studio-map-plugins";
export type { CreateStudioMapPluginsOptions, StudioDebugCollisionsOptions, StudioMapPlugin, StudioMapPluginContext, StudioMapPluginPixiChild, StudioTerrainRenderOptions } from "./studio-map-plugins";
export { createStudioActionBattleAnimations } from "./action-battle-animations";
export type { StudioCombatAnimationIds, StudioCombatAnimationOptions } from "./action-battle-animations";
export {
  createStudioActionBattleAudio,
  createStudioActionBattlePreset,
} from "./action-battle-audio";
export type { StudioCombatAudioConfig } from "./action-battle-audio";
export type {
  StudioGuiBinding,
  StudioHotbarContent,
  StudioHotbarBinding,
  StudioHotbarSettings,
  StudioCharacterSelectBinding,
  StudioCharacterSelectSettings,
  StudioMenusSettings,
} from "./action-battle-audio";
export {
  normalizeStudioHotbarSettings,
  normalizeStudioCharacterSelectSettings,
  resolveStudioHotbarSettings,
} from "./action-battle-audio";
export {
  createStudioItemWorkflowHooks,
  normalizeStudioItemWorkflowTriggers,
} from "./item-workflow";
export type {
  StudioItemWorkflowHooks,
  StudioItemWorkflowPhase,
  StudioItemWorkflowTrigger,
} from "./item-workflow";

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
  /**
   * Start the player as soon as the server connection is established.
   *
   * The server initializes the default player stats and transfers the player
   * to `startMapId`, or to the starting map resolved from the Studio project.
   * Defaults to `false`. Set `displayTitleScreen: false` separately when the
   * client should also skip the Studio title screen.
   */
  autoStart?: boolean;
  startMapId?: string;
  /** Skip character selection for an explicit direct-map startup. */
  skipCharacterSelect?: boolean;
  /**
   * Resolve one player-specific startup flow after MMORPG connection acceptance.
   * Static startup options remain supported when this resolver is omitted.
   *
   * The resolver runs only on the server and exactly once for the accepted
   * lobby connection. RPGJS validates the returned project/map relationship
   * before running its built-in title or direct-map sequence.
   *
   * @example
   * ```ts
   * provideStudioGame({
   *   resolveStartup: ({ query }) => query.map
   *     ? { projectId: query.game, flow: "direct", mapId: query.map }
   *     : { projectId: query.game, flow: "title" },
   * })
   * ```
   */
  resolveStartup?: StudioStartupResolver;
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
    runtimeMode: config.runtimeMode ?? (config.resolveStartup ? "online" : undefined),
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
