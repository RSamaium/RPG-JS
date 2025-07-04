import {
  inject,
  Presets,
  provideClientGlobalConfig,
  provideClientModules,
  provideLoadMap,
  RpgClientEngine,
  RpgGui,
} from "@rpgjs/client";
import Map from "../components/map.ce";
import Shadow from "../components/shadow.ce";
import WoodComponent from "../components/wood.ce";
import WoodUiComponent from "../components/wood-ui.ce";
import VueComponent from "../vue-component-with-injections.vue";
import { signal, effect } from 'canvasengine'

export default {
  providers: [
    provideLoadMap((id: string) => {
       return {
          id,
          component: Map,
          width: 2048,
          height: 1536,
       }
    }),
    provideClientGlobalConfig(),
    provideClientModules([
      {
        sprite: {
          componentsBehind: [Shadow],
          onInit: (sprite) => {
            sprite.wood = signal(0)
          }
        },
        sceneMap: {
          onAfterLoading: (scene) => {
            // No need to manually display GUI with dependencies anymore
            // The GUI will auto-display when dependencies are resolved
          },
        },
        spritesheets: [
          Presets.LPCSpritesheetPreset({
            id: "hero",
            imageSource: "hero.png",
            width: 1728,
            height: 5568,
            ratio: 1.5,
          }),
          Presets.LPCSpritesheetPreset({
            id: "monster",
            imageSource: "monster.png",
            width: 1728,
            height: 5568,
            ratio: 1.5,
          }),
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
            id: "wood-ui",
            component: WoodUiComponent,
            autoDisplay: true,
            dependencies: () => {
              const engine = inject(RpgClientEngine)
              return [engine.scene.currentPlayer]
            }
          },
          VueComponent
        ],
        componentAnimations: [
          {
            id: "wood",
            component: WoodComponent,
          },
        ],
      },
    ])
  ],
};
