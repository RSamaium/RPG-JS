import {
  inject,
  Presets,
  provideClientGlobalConfig,
  provideClientModules,
  provideLoadMap,
  RpgClientEngine,
} from "@rpgjs/client";
import {
  createActionBattleUi,
  createActionBattleVisual,
  provideActionBattle,
} from "@rpgjs/action-battle/client";
import MapComponent from "../components/map.ce";
import EnemyDragLayerComponent from "../components/enemy-drag-layer.ce";
import WoodProjectileComponent from "../components/wood-projectile.ce";
import { provideMain } from "../modules/main";

const MAP_WIDTH = 2048;
const MAP_HEIGHT = 1536;
const PANEL_WIDTH = 240;
const CAMERA_LOCK_ID = "__sample_action_battle_overview__";

let resizeListenerBound = false;

function fitMapToBrowser(engine: RpgClientEngine) {
  if (typeof window === "undefined") {
    return;
  }

  const applyFit = () => {
    const viewport = (engine as any).findViewportInstance?.();
    if (!viewport) {
      return;
    }

    const availableWidth = Math.max(320, window.innerWidth - PANEL_WIDTH);
    const availableHeight = Math.max(240, window.innerHeight);
    const zoom = Math.min(availableWidth / MAP_WIDTH, availableHeight / MAP_HEIGHT);

    viewport.setZoom(zoom, false);
    viewport.x = Math.max(0, (availableWidth - MAP_WIDTH * zoom) / 2);
    viewport.y = Math.max(0, (availableHeight - MAP_HEIGHT * zoom) / 2);
  };

  applyFit();
  window.requestAnimationFrame(applyFit);
}

export default {
  providers: [
    provideLoadMap((id: string) => ({
      id,
      component: MapComponent,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      data: {},
      hitboxes: [
        { id: "top-wall", x: 0, y: 0, width: MAP_WIDTH, height: 4 },
        { id: "bottom-wall", x: 0, y: MAP_HEIGHT - 4, width: MAP_WIDTH, height: 4 },
        { id: "left-wall", x: 0, y: 0, width: 4, height: MAP_HEIGHT },
        { id: "right-wall", x: MAP_WIDTH - 4, y: 0, width: 4, height: MAP_HEIGHT },
      ],
    })),
    provideClientGlobalConfig(),
    provideMain(),
    provideActionBattle({
      visual: createActionBattleVisual("impact"),
      ui: createActionBattleUi({
        actionBar: false,
        targeting: true,
        attackPreview: true,
      }),
    }),
    provideClientModules([
      {
        sprite: {
          componentsInFront: [EnemyDragLayerComponent],
        },
        sceneMap: {
          onAfterLoading() {
            const engine = inject(RpgClientEngine);
            engine.cameraFollowTargetId.set(CAMERA_LOCK_ID);
            fitMapToBrowser(engine);

            if (typeof window !== "undefined" && !resizeListenerBound) {
              resizeListenerBound = true;
              window.addEventListener("resize", () => fitMapToBrowser(engine));
            }
          },
        },
        spritesheetResolver: async (id: string) => {
          if (id === "hero") {
            return Presets.LPCSpritesheetPreset({
              id: "hero",
              imageSource: "hero.png",
              width: 1728,
              height: 5568,
              ratio: 1.5,
            });
          }
          if (id === "monster") {
            return Presets.LPCSpritesheetPreset({
              id: "monster",
              imageSource: "monster.png",
              width: 1728,
              height: 5568,
              ratio: 1.5,
            });
          }
          if (id === "wood") {
            return Presets.IconPreset({
              id,
              image: "wood.png",
              framesWidth: 1,
              framesHeight: 1,
            });
          }
          return undefined;
        },
        spritesheets: [
          {
            id: "fire-impact",
            image: "exp.png",
            width: 1024,
            height: 1024,
            ...Presets.AnimationSpritesheetPreset(4, 4),
          },
        ],
        projectiles: {
          components: {
            wood: WoodProjectileComponent,
          },
        },
      },
    ]),
  ],
};
