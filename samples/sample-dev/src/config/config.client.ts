import {
  BoxComponent,
  inject,
  KeyboardControls,
  LightHalo,
  Presets,
  provideClientGlobalConfig,
  provideClientModules,
  provideLoadMap,
  RpgClientEngine,
  RpgGui,
  Sound,
  TitleScreenComponent,
  
} from "@rpgjs/client";
import Map from "../components/map.ce";
import Shadow from "../components/shadow.ce";
import WoodComponent from "../components/wood.ce";
import WoodUiComponent from "../components/wood-ui.ce";
import VueComponent from "../vue-component-with-injections.vue";
import FadeComponent from "../components/fade.ce";
import PlayerStatsComponent from "../components/player-stats.ce";
import MobileControlsComponent from "../components/mobile-controls.ce";
import { signal, effect } from 'canvasengine'
import { provideVueGui } from "@rpgjs/vue";
import { provideTiledMap } from "@rpgjs/tiledmap/client";
import { provideMain } from "../modules/main";
import TooltipComponent from "../components/tooltip.ce";
import { RpgClientObject } from "@rpgjs/client";
import { withMobile } from "@rpgjs/client";
import { provideActionBattle } from "@rpgjs/action-battle/client";
import { HudComponent } from "@rpgjs/client";


export default {
  providers: [
    provideLoadMap((id: string) => {
      const colorMap = {
        "center-map": "red",
        "left-map": "blue",
        "right-map": "green",
        "top-map": "yellow",
        "bottom-map": "purple",
      }
       return {
          id,
          component: Map,
          width: 500,
          height: 500,
          data: {
            color: colorMap[id]
          },
          hitboxes: [],
       }
    }),
    // provideTiledMap({
    //   basePath: "map"
    // }),
    provideVueGui(),
    provideClientGlobalConfig(),
    provideMain(),
    provideActionBattle({
      ui: {
        actionBar: {
          enabled: false,
          autoOpen: false,
          mode: "both" // "items" | "skills" | "both"
        }
      }
    }),
    provideClientModules([
      withMobile(),
      {
        spritesheetResolver: async (id: string) => {
          if (id === "potion" || id == 'wood') {
            return Presets.IconPreset({
              image: `${id}.png`,
              framesWidth: 1,
              framesHeight: 1,
              id,
            })
          }
          if (id === "hero") {
            return Presets.LPCSpritesheetPreset({
              id: "hero",
              imageSource: "hero.png",
              width: 1728,
              height: 5568,
              ratio: 1.5,
            })
          }
          else if (id === "monster") {
            return Presets.LPCSpritesheetPreset({
              id: "monster",
              imageSource: "monster.png",
              width: 1728,
              height: 5568,
              ratio: 1.5,
            })
          }
          else if (id === "facesetId") {
            return  Presets.FacesetPreset({
              id: "facesetId",
              image: "faceset.png",
              width: 1024,
              height: 1024,
            }, 3, 4, {
              happy: [0, 0],
              sad: [1, 0],
            })
          }
          return undefined;
        },
        sprite: {
          componentsBehind: [Shadow],
         // componentsInFront: [LightHalo],
          onInit: (sprite) => {
           
          }
        },
        sceneMap: { 
          onBeforeLoading: (scene) => {
            const gui = inject(RpgGui)
            gui.display('fade', {
              fadeIn: true,
              duration: 800
            })
          },
          onAfterLoading: async (scene) => {
            const gui = inject(RpgGui)
            await new Promise(resolve => setTimeout(resolve, 1200))
            gui.display('fade', {
              fadeIn: false,
              duration: 800
            })
            await new Promise(resolve => setTimeout(resolve, 900))
            gui.hide('fade')
          },
        },
        sounds: [
          {
            id: "typewriter",
            src: "typewriter.wav",
          },
          {
            id: "cursor",
            src: "cursor.wav",
          },
          {
            id: "bgm",
            src: "music.mp3"
          }
        ],
        spritesheets: [
        
          {
            id: "animation",
            width: 1024,
            height: 1024,
            image: "exp.png",
            ...Presets.AnimationSpritesheetPreset(4, 4),
          }
        ],
        gui: [
          {
            id: "rpg-title-screen",
            component: TitleScreenComponent,
            autoDisplay: true,
            data: {
              title: "Chronicles",
              subtitle: "of the Ancients",
              version: "v1.0.0",
              localActions: true,
              saveLoad: {
                mode: "load",
                slots: [null, null, null]
              },
              entries: [
                { id: "start", label: "Start" },
                { id: "load", label: "Load" },
                { id: "credits", label: "Credits", disabled: true }
              ]
            }
          },
          {
            id: "wood-ui",
            component: WoodUiComponent,
            autoDisplay: true,
            dependencies: () => {
              const engine = inject(RpgClientEngine)
              return [engine.scene.currentPlayer]
            }
          },
          VueComponent,
          {
            id: "my-tooltip",
            component: TooltipComponent,
            attachToSprite: true
          },
          {
            id: "fade",
            component: FadeComponent,
          },
          {
            id: "hud",
            component: HudComponent,
            autoDisplay: true,
            dependencies: () => {
              const engine = inject(RpgClientEngine)
              return [engine.scene.currentPlayer]
            },
            data: {
              faceset: {
                id: 'facesetId',
                expression: 'happy'
              }
            }
          },
          {
            id: "mobile-controls",
            component: MobileControlsComponent,
            autoDisplay: true
          }
        ],
        componentAnimations: [
          {
            id: "wood",
            component: WoodComponent,
          },
        ],
      },
    ]),
  ],
};
