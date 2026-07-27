import { provideGlobalConfig, Presets } from "@rpgjs/client";
import { provideClientModules, withMobile } from "@rpgjs/client";
import { configCommon, studio } from "./config.common";
import { provideActionBattle } from "@rpgjs/action-battle/client";
import { createStudioActionBattlePreset, provideStudioGame } from "@rpgjs/studio/client";

export const configClient = {
  providers: [
    provideStudioGame(studio),
    provideActionBattle({
      ...createStudioActionBattlePreset(),
      ui: {
        actionBar: {
          enabled: true,
          autoOpen: true
        }
      }
    }),
    provideGlobalConfig({
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
