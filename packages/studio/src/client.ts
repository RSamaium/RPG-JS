import {
  HudComponent,
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
  getGameDataProvider,
  getStudioGameRuntimeConfig,
} from "./data-provider";
import type { StudioGameModuleConfig } from ".";
import { createStudioMapPlugins, type StudioMapPlugin } from "./studio-map-plugins";
import { bindInitialStudioEventHitboxes } from "./initial-event-hitboxes-client";
import { bindStudioCombatAnimationsToEntity } from "./action-battle-animations";

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

const getMediaRefKey = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const key =
    candidate.id ?? candidate._id ?? candidate.mediaId ?? candidate.fileName;
  return typeof key === "string" && key.trim().length > 0 ? key : null;
};

const collectStudioCombatAnimationRefs = (database: any[] = []): unknown[] => {
  const refs: unknown[] = [];
  const seen = new Set<string>();
  const add = (value: unknown) => {
    const key = getMediaRefKey(value);
    if (!key || seen.has(key)) return;
    seen.add(key);
    refs.push(value);
  };

  for (const entry of database) {
    const animations = entry?.animations ?? entry?.combatAnimations;
    if (!animations || typeof animations !== "object") continue;
    Object.values(animations).forEach(add);
  }

  return refs;
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

export default (config: StudioGameModuleConfig) => {
  return defineModule<RpgClient>({
    engine: {
      async onStart(engine: RpgClientEngine<any>) {
        const gui = inject(RpgGui);

        await new Promise((resolve) => setTimeout(resolve, 20));

        const gameParam = config.projectId;
        const configuredProjectId = getStudioGameRuntimeConfig().projectId;

        let response: any = {};
        const provider = getGameDataProvider();

        // Configuration projectId takes precedence over URL mode.
        if (configuredProjectId) {
          response = await provider.getProject({
            projectId: configuredProjectId,
          });
        }
        // If ?game parameter is present, fetch project by projectId
        // gameParam should contain the projectId (e.g., ?game=projectId)
        else if (gameParam !== null) {
          const projectId = gameParam;
          response = await provider.getProject({ projectId });
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
          collectStudioCombatAnimationRefs(database);

        const heroMediaRefs = [
          engine.globalConfig.hero?.graphic,
          engine.globalConfig.hero?.faceset,
          ...animationMediaRefs,
          ...databaseAnimationMediaRefs,
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

        if (config.displayTitleScreen !== false) {
          gui.display("rpg-title-screen", {
            title: response.name,
            subtitle: response.subtitle,
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
        gui.hide("hud");
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
              gui.display("hud", {
                faceset: {
                  id: resolveMediaId(engine.globalConfig?.hero?.faceset),
                  expression: "happy",
                },
              });
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
        id: "up",
        component: UpComponent,
      },
    ],
  });
};
/// <reference path="./types/canvas-engine.d.ts" />
