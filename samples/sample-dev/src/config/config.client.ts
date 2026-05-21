import {
  BoxComponent,
  inject,
  KeyboardControls,
  LightHalo,
  Presets,
  provideClientGlobalConfig,
  provideHotbar,
  provideHotbarEntries,
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
import { signal, effect } from 'canvasengine'
import { provideVueGui } from "@rpgjs/vue";
import { provideTiledMap } from "@rpgjs/tiledmap/client";
import { provideMain } from "../modules/main";
import TooltipComponent from "../components/tooltip.ce";
import { withMobile } from "@rpgjs/client";
import { provideActionBattle } from "@rpgjs/action-battle/client";
import { HudComponent } from "@rpgjs/client";

const readValue = (value: any) => typeof value === "function" ? value() : value;

const findEntry = (entries: any[] = [], id: string) => {
  return entries.find((entry) => readValue(entry?.id) === id);
};

const getItemQuantity = (player: any, id: string) => {
  const item = findEntry(readValue(player?.items) || [], id);
  return readValue(item?.quantity) ?? 0;
};

const hasSkill = (player: any, id: string) => {
  return Boolean(findEntry(readValue(player?.skills) || [], id));
};

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
    provideHotbar({
      slots: 5,
      bindings: ["1", "2", "3", "4", "5"],
      storageKey: "sample-dev",
      autoDisplay: false,
      initialRefs: [
        { type: "item", id: "basic-potion" },
        { type: "skill", id: "fire-skill" },
        { type: "action", id: "rain" },
        { type: "action", id: "notify" },
        null,
      ],
    }),
    provideHotbarEntries("sample-dev", ({ client }) => {
      const player = client?.scene.currentPlayer?.();
      return [
        {
          ref: { type: "item", id: "basic-potion" },
          label: "Potion",
          description: "Use a Basic Potion from the current inventory.",
          icon: "potion",
          quantity: player ? getItemQuantity(player, "basic-potion") : 0,
          rarity: "rare",
          disabled: player ? getItemQuantity(player, "basic-potion") <= 0 : true,
          action: {
            type: "input",
            input: "sample-dev:use-item",
            data: { id: "basic-potion" },
          },
        },
        {
          ref: { type: "skill", id: "fire-skill" },
          label: "Fire",
          description: "Cast the existing Fire Skill learned on player start.",
          rarity: "epic",
          disabled: player ? !hasSkill(player, "fire-skill") : true,
          action: {
            type: "input",
            input: "sample-dev:use-skill",
            data: { id: "fire-skill" },
          },
        },
        {
          ref: { type: "action", id: "rain" },
          label: "Rain",
          description: "Trigger the existing rain weather sample action.",
          icon: "wood",
          rarity: "common",
          action: {
            type: "input",
            input: "sample-dev:rain",
          },
        },
        {
          ref: { type: "action", id: "notify" },
          label: "Ping",
          description: "Send a generic hotbar action to the server.",
          rarity: "legendary",
          action: {
            type: "input",
            input: "sample-dev:notify",
            data: { message: "Hotbar action received" },
          },
        },
      ];
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
