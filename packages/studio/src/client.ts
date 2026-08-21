import {
  HudComponent,
  PrebuiltComponentAnimations,
  RpgClient,
  RpgClientEngine,
  RpgGui,
  TitleScreenComponent,
  inject,
} from "@rpgjs/client";
import { defineModule } from "@rpgjs/common";
import {
  createSpriteSheetObject,
  resolveAssetSource,
  resolveSpritesheet,
} from "./spritesheet-utils";
import FadeComponent from "./components/fade.ce";
import { trigger } from "canvasengine";
import UpComponent from "./components/up.ce";
import {
  configureStudioGameRuntime,
  getGameDataProvider,
  getStudioGameRuntimeConfig,
} from "./data-provider";
import type { StudioGameModuleConfig } from ".";
import { createStudioMapPlugins, type StudioMapPlugin } from "./studio-map-plugins";
import { bindInitialStudioEventHitboxes } from "./initial-event-hitboxes-client";
import { bindStudioCombatAnimationsToEntity } from "./action-battle-animations";
import { collectStudioActionBattleMediaRefs } from "./action-battle-animation-preload";
import { beginStudioMapLoading, waitForStudioMapReady } from "./studio-map-readiness";

interface GlobalConfig {
  projectId?: string;
  startMapId?: string;
  debugCollisions?: boolean;
  studioPlugins?: StudioMapPlugin[];
  keyboardControls?: Record<string, any>;
  hero?: {
    graphic?: any;
    faceset?: any;
  };
  animations?: Record<string, any>;
  database?: any[];
  audio?: {
    ui?: Record<string, any>;
  };
  menus?: {
    titleScreen?: {
      enabled: boolean;
      settings?: {
        backgroundMusic?: string | null;
        backgroundImage?: string | null;
      };
    };
    hud?: { enabled: boolean };
  };
}

interface RpgClientEngineWithConfig extends RpgClientEngine {
  globalConfig: GlobalConfig;
}

const fadeTrigger = trigger();

const DEFAULT_STUDIO_KEYBOARD_CONTROLS = {
  up: "up",
  down: "down",
  left: "left",
  right: "right",
  action: "space",
  dash: "shift",
  escape: "escape",
  hotbar1: "n1",
  hotbar2: "n2",
  hotbar3: "n3",
  hotbar4: "n4",
  hotbar5: "n5",
  hotbar6: "n6",
  hotbar7: "n7",
  hotbar8: "n8",
  hotbar9: "n9",
  hotbar0: "n0",
};

const normalizeStudioKeyboardControls = (
  current?: Record<string, any>,
  incoming?: Record<string, any>,
) => {
  const merged = {
    ...DEFAULT_STUDIO_KEYBOARD_CONTROLS,
    ...(current ?? {}),
    ...(incoming ?? {}),
  };
  for (const key of Object.keys(DEFAULT_STUDIO_KEYBOARD_CONTROLS)) {
    if (key.startsWith("hotbar") && /^[0-9]$/.test(merged[key])) {
      merged[key] = `n${merged[key]}`;
    }
  }

  if (incoming?.back && !incoming.escape) {
    merged.escape = incoming.back;
  }

  return merged;
};

const resolveMediaId = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    const id = candidate.id ?? candidate._id ?? candidate.mediaId;
    if (typeof id === "string" && id.trim().length > 0) {
      return id;
    }
  }
  return null;
};

const resolveStudioMediaSource = async (value: unknown): Promise<string> => {
  if (value && typeof value === "object") {
    const fileName = (value as Record<string, unknown>).fileName;
    if (typeof fileName === "string" && fileName.trim()) {
      return resolveAssetSource(fileName);
    }
  }
  const id = resolveMediaId(value);
  if (!id) return "";
  try {
    const media = await getGameDataProvider().getMedia(id);
    return resolveAssetSource(media?.fileName);
  } catch {
    return "";
  }
};

export const displayStudioHudOnce = (
  gui: Pick<RpgGui, "display" | "get" | "isDisplaying">,
  engine: RpgClientEngineWithConfig,
): void => {
  if (gui.isDisplaying("hud")) return;

  const currentData = gui.get("hud")?.data();
  const facesetId = resolveMediaId(engine.globalConfig?.hero?.faceset);
  const nextData: Record<string, any> = currentData && typeof currentData === "object"
    ? { ...currentData }
    : {};

  if (facesetId) {
    nextData.faceset = {
      id: facesetId,
      expression: "happy",
    };
  }

  gui.display("hud", nextData);
};

const resolveHeroMediaSpritesheet = async (value: unknown): Promise<any | null> => {
  if (!value) return null;

  if (typeof value === "string") {
    return resolveSpritesheet(value);
  }

  if (typeof value === "object") {
    const media = value as Record<string, any>;
    const mediaId = resolveMediaId(media) ?? undefined;

    if (!media.fileName && mediaId) {
      return resolveSpritesheet(mediaId);
    }

    return createSpriteSheetObject(media, mediaId);
  }

  return null;
};

const resolveStudioDatabaseForPreload = async (
  projectId?: string,
): Promise<any[]> => {
  if (!projectId) return [];
  try {
    const database = await getGameDataProvider().getDatabase(projectId);
    return Array.isArray(database) ? database : [];
  } catch (error) {
    console.warn("[StudioGame] combat animation preload database fetch failed", error);
    return [];
  }
};

const resolveActorIllustrationRefs = async (
  database: any[],
): Promise<unknown[]> => {
  const provider = getGameDataProvider();
  const actors = database.filter((record) => (record?.type ?? record?._type) === "actor");
  const refs = await Promise.all(actors.map(async (actor) => {
    const direct = actor.illustration ?? actor.graphic?.metadata?.illustration;
    if (direct) return direct;
    const graphicId = resolveMediaId(actor.graphic);
    if (!graphicId) return null;
    try {
      const graphicMedia = await provider.getMedia(graphicId);
      return graphicMedia?.metadata?.illustration ?? null;
    } catch {
      return null;
    }
  }));
  return refs.filter(Boolean);
};

export const resolveStudioClientStartupQuery = (search: string): {
  projectId?: string;
  directMapId?: string;
} => {
  const params = new URLSearchParams(search);
  const projectId = params.get("game")?.trim() || undefined;
  const directMapId = params.get("map")?.trim() || undefined;
  return { projectId, directMapId };
};

export const configureStudioClientStartupProject = (
  projectId: string | undefined,
  config: StudioGameModuleConfig,
): void => {
  const runtimeConfig = getStudioGameRuntimeConfig();
  if (!projectId || runtimeConfig.projectId || config.projectId !== undefined) return;
  configureStudioGameRuntime({
    projectId,
    runtimeMode: config.runtimeMode ?? "online",
  });
};

export default (config: StudioGameModuleConfig) => {
  return defineModule<RpgClient>({
    engine: {
      async onStart(engine: RpgClientEngine<any>) {
        const gui = inject(RpgGui);

        await new Promise((resolve) => setTimeout(resolve, 20));

        const configuredProjectId = getStudioGameRuntimeConfig().projectId;
        const startupQuery = resolveStudioClientStartupQuery(window.location.search);
        const projectId = configuredProjectId
          ?? (config.projectId === undefined ? startupQuery.projectId : config.projectId);
        configureStudioClientStartupProject(projectId ?? undefined, config);

        let response: any = {};
        const provider = getGameDataProvider();

        // Configuration projectId takes precedence over URL mode.
        if (projectId) {
          response = await provider.getProject({
            projectId,
          });
        }

        window.gameConfig = response;

        const debugCollisions = config.debugCollisions === true || response.debugCollisions === true || engine.globalConfig?.debugCollisions === true;

        engine.globalConfig = {
          ...engine.globalConfig,
          ...response,
          keyboardControls: normalizeStudioKeyboardControls(
            engine.globalConfig?.keyboardControls,
            response.keyboardControls,
          ),
          projectId: response._id || engine.globalConfig?.projectId,
          startMapId: config.startMapId !== undefined ? config.startMapId : (response.startMapId || engine.globalConfig?.startMapId),
          debugCollisions,
          studioPlugins: createStudioMapPlugins({
            plugins: [
              ...(engine.globalConfig?.studioPlugins ?? []),
              ...(config.studioPlugins ?? []),
            ],
            debugCollisions,
          }),
        };
        (engine as any).configureSound?.({
          projectId: engine.globalConfig.projectId,
          ui: engine.globalConfig.audio?.ui,
        });

        const animationMediaRefs = Object.values(
          engine.globalConfig.animations ?? {},
        ).filter(Boolean);
        const database = await resolveStudioDatabaseForPreload(
          engine.globalConfig.projectId,
        );
        if (database.length > 0) {
          engine.globalConfig.database = database;
        }
        const databaseAnimationMediaRefs =
          collectStudioActionBattleMediaRefs(database);
        const actorMediaRefs = database
          .filter((record) => (record?.type ?? record?._type) === "actor")
          .flatMap((actor) => [actor.graphic, actor.faceset])
          .filter(Boolean);
        const actorIllustrationRefs = await resolveActorIllustrationRefs(database);

        const heroMediaRefs = [
          engine.globalConfig.hero?.graphic,
          engine.globalConfig.hero?.faceset,
          ...animationMediaRefs,
          ...databaseAnimationMediaRefs,
          ...actorMediaRefs,
          ...actorIllustrationRefs,
        ].filter(Boolean);

        // Load hero and combat animation spritesheets from either direct media objects or media IDs.
        // Preloading database combat animations avoids lazy-load races when a temporary
        // attack/hurt graphic is restored while Pixi is still resolving the spritesheet.
        const heroSpritesheets = await Promise.all(
          heroMediaRefs.map((mediaRef) => resolveHeroMediaSpritesheet(mediaRef)),
        );

        heroSpritesheets
          .filter((value) => value && typeof value === "object")
          .forEach((spritesheet) => {
            engine.addSpriteSheet(spritesheet);
          });

        const displayTitleScreen = startupQuery.directMapId
          ? false
          : config.displayTitleScreen
          ?? response.menus?.titleScreen?.enabled
          ?? true;
        if (displayTitleScreen) {
          const backgroundImage = await resolveStudioMediaSource(
            response.menus?.titleScreen?.settings?.backgroundImage,
          );
          if (backgroundImage && engine.globalConfig.menus?.titleScreen?.settings) {
            engine.globalConfig.menus.titleScreen.settings.backgroundImage = backgroundImage;
          }
          gui.display("rpg-title-screen", {
            title: response.name,
            subtitle: response.subtitle,
            backgroundMusic: response.menus?.titleScreen?.settings?.backgroundMusic,
            backgroundImage,
            version: "v1.0.0",
            localActions: true,
            saveLoad: {
              mode: "load",
              slots: [null, null, null],
            },
            entries: [
              { id: "start", label: "Start" },
              { id: "load", label: "Load" },
            ],
          });
        }
      },
    },
    sprite: {
      async onBeforeRemove(sprite, context) {
        const transition = context.transition;
        if (!transition?.animation) return;
        const timeoutMs = context.timeoutMs ?? transition.duration ?? 700;

        if (transition.graphic !== undefined) {
          await sprite.setAnimation(transition.animation, transition.graphic, 1, {
            timeoutMs,
          });
        } else {
          await sprite.setAnimation(transition.animation, 1, {
            timeoutMs,
          });
        }
      },
    },
    sceneMap: {
      onBeforeLoading: async (scene) => {
        const gui = inject(RpgGui);
        const engine = inject(RpgClientEngine) as RpgClientEngineWithConfig;
        const hasPreviousMap = Boolean(engine.scene.data?.());
        beginStudioMapLoading();
        await new Promise<void>((resolve) => {
          let completed = false;
          const complete = () => {
            if (completed) return;
            completed = true;
            clearTimeout(fallbackTimer);
            resolve();
          };
          const fallbackTimer = setTimeout(complete, hasPreviousMap ? 500 : 100);
          gui.display("fade", {
            fadeTrigger,
            coverDuration: hasPreviousMap ? 120 : 0,
            duration: 180,
            loaderDelay: 250,
            maxAssetWait: 1_200,
            loadingText: engine.t("rpg.transition.loading"),
            onCovered: complete,
            onRevealed: () => {
              if (engine.globalConfig.menus?.hud?.enabled !== false) {
                displayStudioHudOnce(gui, engine);
              }
            },
          });
        });
      },
      onAfterLoading: async (scene) => {
        const engine = inject(RpgClientEngine) as RpgClientEngineWithConfig;
        engine.scene.clearLocalWeather?.();
        bindStudioCombatAnimationsToEntity(
          engine.scene.getCurrentPlayer?.(),
          engine.globalConfig.animations,
        );
        bindInitialStudioEventHitboxes(scene);
        const loadedScene = engine.scene.data?.();
        await waitForStudioMapReady(loadedScene?.data ?? loadedScene);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        fadeTrigger.start();
      },
    },
    gui: [
      {
        id: "rpg-title-screen",
        component: TitleScreenComponent,
      },
      {
        id: "hud",
        component: HudComponent,
        dependencies: () => {
          const engine = inject(RpgClientEngine) as RpgClientEngineWithConfig;
          return [engine.scene.currentPlayer];
        },
      },
      {
        id: "fade",
        component: FadeComponent,
      },
    ],
    spritesheetResolver: async (id: string) => {
      return resolveSpritesheet(id);
    },
    soundResolver: async (id: string) => {
      try {
        const media = await getGameDataProvider().getMedia(id);
        return {
          id,
          src: resolveAssetSource(media.fileName),
        };
      } catch (error) {
        console.error(`Error resolving sound ${id}:`, error);
      }
    },

    componentAnimations: [
      {
        id: "studio-item-use-fx",
        component: PrebuiltComponentAnimations.Fx,
      },
      {
        id: "up",
        component: UpComponent,
      },
    ],
  });
};
/// <reference path="./types/canvas-engine.d.ts" />
