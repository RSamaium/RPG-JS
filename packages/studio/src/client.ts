import {
  HudComponent,
  RpgClient,
  RpgClientEngine,
  RpgGui,
  RpgSound,
  TitleScreenComponent,
  inject,
} from "@rpgjs/client";
import { defineModule } from "@rpgjs/common";
import Shadow from "./components/shadow.ce";
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
import { StudioGameModuleConfig } from ".";

interface GlobalConfig {
  projectId?: string;
  startMapId?: string;
  hero?: {
    graphic?: any;
    faceset?: any;
  };
}

interface RpgClientEngineWithConfig extends RpgClientEngine {
  globalConfig: GlobalConfig;
}

const fadeTrigger = trigger();

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

        if (response.keyboardControls) {
          response.keyboardControls.escape = response.keyboardControls.back;
        }

        (window as any).gameConfig = response;

        const engineWithConfig = engine as RpgClientEngineWithConfig;
        engineWithConfig.globalConfig = {
          ...engineWithConfig.globalConfig,
          ...response,
          projectId: response._id || engineWithConfig.globalConfig?.projectId,
          startMapId: config.startMapId !== undefined ? config.startMapId : (response.startMapId || engineWithConfig.globalConfig?.startMapId),
        };

        const heroMediaRefs = [
          engineWithConfig.globalConfig.hero?.graphic,
          engineWithConfig.globalConfig.hero?.faceset,
        ].filter(Boolean);

        // Load hero spritesheets from either direct media objects or media IDs.
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
      componentsBehind: [Shadow],
    },
    sceneMap: {
      onBeforeLoading: (scene) => {
        const gui = inject(RpgGui);
        gui.display("fade", {
          fadeTrigger,
        });
      },
      onAfterLoading: async (scene) => {
        const gui = inject(RpgGui);
        const engine = inject(RpgClientEngine) as RpgClientEngineWithConfig;
        engine.scene.clearLocalWeather?.();
        fadeTrigger.start();
        gui.display("hud", {
          faceset: {
            id: resolveMediaId(engine.globalConfig?.hero?.faceset),
            expression: "happy",
          },
        });
      },
    },
    gui: [
      {
        id: "rpg-title-screen",
        component: TitleScreenComponent,
      },
      {
        id: "fade",
        component: FadeComponent,
      },
      {
        id: "hud",
        component: HudComponent,
        dependencies: () => {
          const engine = inject(RpgClientEngine);
          return [engine.scene.currentPlayer];
        },
      },
    ],
    spritesheetResolver: async (id: string) => {
      return resolveSpritesheet(id);
    },
    soundResolver: async (id: string) => {
      RpgSound.global.stop();
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
