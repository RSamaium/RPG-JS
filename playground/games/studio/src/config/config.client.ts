import { provideGlobalConfig, Presets } from "@rpgjs/client";
import { provideClientModules, withMobile } from "@rpgjs/client";
import { configCommon, studio } from "./config.common";
import { provideActionBattle } from "@rpgjs/action-battle/client";
import { createStudioActionBattlePreset, provideStudioGame } from "@rpgjs/studio/client";

export const configClient = {
  providers: [
    provideStudioGame(studio),
    provideActionBattle({
      ...createStudioActionBattlePreset()
    }),
    provideGlobalConfig({
      // Temporary (MAP_BUILDER.md, step 6): open the game with `?mapBuilder` to draw the simple elements with @rpgjs/map-builder.
      mapBuilderRenderer: typeof location !== 'undefined' && new URLSearchParams(location.search).has('mapBuilder'),
      keyboardControls: {
        up: 'up',
        down: 'down',
        left: 'left',
        right: 'right',
        action: 'space',
        dash: 'shift',
        escape: 'escape'
      }
    }),
    ...configCommon.providers,
    provideClientModules([
      withMobile({
        buttons: {
          dash: true,
          heavy: true
        }
      })
    ]),
  ],
};
