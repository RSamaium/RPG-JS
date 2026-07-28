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
import VueTooltipComponent from "../tooltip.vue";
import FadeComponent from "../components/fade.ce";
import PlayerStatsComponent from "../components/player-stats.ce";
import ProjectileComponent from "../components/projectile.ce";
import { signal, effect } from 'canvasengine'
import { provideVueGui } from "@rpgjs/vue";
import { provideTiledMap } from "@rpgjs/tiledmap/client";
import mainClientModule from "../modules/client";
import TooltipComponent from "../components/tooltip.ce";
import { withMobile } from "@rpgjs/client";
import MobileButton from "../components/mobile-button.ce";
import MobileJoystick from "../components/mobile-joystick.ce";
import {
  createActionBattleUi,
  createActionBattleVisual,
  provideActionBattle,
} from "@rpgjs/action-battle/client";
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
          width: 5000,
          height: 5000,
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
    provideActionBattle({
      visual: createActionBattleVisual("fx"),
      ai: {
        visuals: {
          bubble({ object, visual }, fx) {
            fx.showHit(object, String(visual.text ?? "!"));
          },
          rage({ object, visual }, fx) {
            fx.flash(object, {
              type: "tint",
              tint: "red",
              duration: Number(visual.durationMs ?? 900),
              cycles: 3,
            });
          },
        },
      },
      ui: createActionBattleUi({
        hotbar: false,
        targeting: true,
        attackPreview: true,
      }),
    }),
    provideClientModules([
      mainClientModule,
      withMobile({
        enabled: "auto",
        layout: {
          joystickSide: "right",
          joystickMargin: [30, 68, 30, 30],
          buttonsMargin: 50,
          gap: 16,
        },
        components: {
          joystick: MobileJoystick,
          buttons: {
            action: MobileButton,
            dash: MobileButton,
          },
        },
        joystick: {
          outerColor: "#d7e7ff",
          innerColor: "#ffffff",
          scale: 0.82,
          moveInterval: 40,
          threshold: 0.05,
        },
        buttons: {
          action: {
            enabled: true,
            width: 70,
            height: 70,
          },
          back: false,
          dash: {
            enabled: true,
            width: 58,
            height: 58,
          },
        },
      }),
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
           
          },
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
          }
        },
        sceneMap: { 
          onBeforeLoading: (scene) => {
            console.log(scene)
            const gui = inject(RpgGui)
            gui.display('fade', {
              fadeIn: false,
              duration: 5000
            })
          },
          onAfterLoading: async (scene) => {
            const gui = inject(RpgGui)
            await new Promise(resolve => setTimeout(resolve, 5000))
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
        projectiles: {
          components: {
            "elite-bolt": ProjectileComponent,
          },
        },
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
            id: "vue-tooltip",
            component: VueTooltipComponent,
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
