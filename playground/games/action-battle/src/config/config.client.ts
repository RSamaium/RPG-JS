import {
  Presets,
  provideClientGlobalConfig,
  provideClientModules,
  provideLoadMap,
} from "@rpgjs/client";
import {
  createActionBattleUi,
  createActionBattleVisual,
  provideActionBattle,
} from "@rpgjs/action-battle/client";
import MapComponent from "../components/map.ce";
import EnemyDragLayerComponent from "../components/enemy-drag-layer.ce";
import LabPanelComponent from "../components/lab-panel.ce";
import WoodProjectileComponent from "../components/wood-projectile.ce";
import { provideMain } from "../modules/main";
import { attackAnimation } from "../animations";

const MAP_WIDTH = 2048;
const MAP_HEIGHT = 1536;
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
      animations: { attack: attackAnimation },
      ui: createActionBattleUi({
        hotbar: false,
        targeting: true,
        attackPreview: true,
      }),
    }),
    provideClientModules([
      {
        sprite: {
          componentsInFront: [EnemyDragLayerComponent],
        },
        gui: [
          {
            id: "playground-lab-panel",
            component: LabPanelComponent,
            autoDisplay: true,
          },
        ],
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
          // The server only names the projectile: its look is decided here.
          looks: {
            arrow: {
              shape: "arrow",
              color: "#e5e7eb",
              accentColor: "#f87171",
              trail: { color: "#fde68a", width: 3, length: 10 },
            },
          },
        },
      },
    ]),
  ],
};
