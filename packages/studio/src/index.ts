import server from "./server";
import client from "./client";
import { createModule, type RpgProvider } from "@rpgjs/common";
import { createStudioMapClientProviders } from "./client-provider";
import { configureStudioGameRuntime } from "./data-provider";
import { configureStudioConstants } from "./constants";
import type { GameRuntimeMode, StudioPlugin } from "./data-provider/types";
import type { StudioMapPlugin } from "./studio-map-plugins";
import type { StudioStartupResolver } from "./startup";
import type { StudioScriptHost } from "./plugins";
import { configureStudioBlockExecutors } from "./block-executor";
import { configureStudioEnemyInteraction, type StudioEnemyInteractionResolver } from "./enemy-interaction";
import type { CustomBlockExecutors } from "@common/blocks";
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
export type { StudioEnemyInteraction, StudioEnemyInteractionResolver } from "./enemy-interaction";
export { runStudioEvent } from "./run-event";
export { loadStudioPlugins } from "./server";
export { studioPluginScriptId, syncStudioPluginsToScripts } from "./plugins";
export type { StudioPluginSyncReport, StudioScriptHost, StudioScriptInstall } from "./plugins";
export type { StudioPlugin, StudioPluginScript } from "./data-provider/types";
export { runStudioSkillTrigger } from "./skill-workflow";
export type {
  StudioItemWorkflowHooks,
  StudioItemWorkflowPhase,
  StudioItemWorkflowTrigger,
} from "./item-workflow";

export interface StudioGameModuleConfig {
  projectId?: string | null;
  /**
   * Where the game reads its data: `online` (the draft of the project), `offline` (a local bundle, no project id),
   * `published` (the bundle of a published snapshot, with the project id) or `auto`.
   *
   * With `published`, the data comes from `bundleBasePath` (for example `<api>/published/<projectId>`), the events from its
   * `events.json`, and a page opened with `?editor` or `?preview` still reads the draft online, so the Studio iframe edits
   * the draft while every other URL plays the published snapshot.
   */
  runtimeMode?: GameRuntimeMode;
  apiBaseUrl?: string;
  /** Base path or complete URL of the bundle read by `offline` and `published`. Defaults to `/game-data`. */
  bundleBasePath?: string;
  /**
   * Token a draft request (`?editor` or `?preview`) sends in the `x-studio-preview-token` header, for a Studio whose draft
   * routes are private. The URL can also carry it (`?preview=<token>`): it is then kept for the tab and taken off the address.
   */
  previewToken?: string;
  /**
   * The `ScriptService` of `@rpgjs/script` (the one given to `provideScripts`). The enabled plugins of the project are
   * installed in it when the server starts, each script under the id `<pluginId>/<scriptName>`, and kept in step with the
   * data: when the data of the project is invalidated the plugins are read again, the scripts of a plugin whose version
   * changed are replaced, and the ones of a plugin that is gone or disabled are uninstalled. The scripts the game installed
   * itself are left alone. A shared runtime (`resolveStartup`) has no single project: its host installs the plugins itself.
   */
  scripts?: StudioScriptHost;
  /**
   * Receives the enabled plugins of the project (their parsed scripts) when the server starts, to install them in the script
   * interpreter of the game when `scripts` does not fit. Read from the bundle (`plugins.json`) or the API (`/game/plugins`),
   * and again when the data of the project is invalidated.
   */
  installPlugins?: (plugins: StudioPlugin[]) => void | Promise<void>;
  isProduction?: boolean;
  isPreprod?: boolean;
  baseUrl?: string;
  assetsUrl?: string;
  apiUrl?: string;
  /** Set false to skip the title screen and start immediately in RPG and MMORPG modes. */
  displayTitleScreen?: boolean;
  /**
   * Start the player as soon as the server connection is established.
   *
   * The server initializes the default player stats and transfers the player
   * to `startMapId`, or to the starting map resolved from the Studio project.
   * Defaults to `false`. `displayTitleScreen: false` also enables immediate
   * startup, even when project metadata cannot be loaded.
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
  /**
   * Block executors of the game. They run in every Studio workflow (events, maps,
   * items, skills). A key may be a block type the framework does not know, or a
   * default block type to replace.
   *
   * @example
   * ```ts
   * provideStudioGame({
   *   blockExecutors: {
   *     call_battle: async (context, params) => {
   *       await context.player.callBattle(params.troopId);
   *     },
   *   },
   * })
   * ```
   */
  blockExecutors?: CustomBlockExecutors;
  /**
   * Chooses how an enemy event reacts, evaluated when the event is initialized
   * (the host can read `map.globalConfig`). Returns `"action"` (default, real-time
   * `BattleAi`), `"none"` (no AI) or `{ onTouch(player) }` (no AI; called when a
   * player touches the event, the host may `event.remove()`).
   */
  enemyInteraction?: StudioEnemyInteractionResolver;
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

  configureStudioBlockExecutors(config.blockExecutors);
  configureStudioEnemyInteraction(config.enemyInteraction);

  configureStudioGameRuntime({
    projectId: config.projectId ?? null,
    runtimeMode: config.runtimeMode ?? (config.resolveStartup ? "online" : undefined),
    apiBaseUrl: config.apiBaseUrl ?? resolvedApiUrl,
    bundleBasePath: config.bundleBasePath ?? "/game-data",
    previewToken: config.previewToken,
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

export type { StudioElementSubmersion } from "./map-renderer/element-submersion";
