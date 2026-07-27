import { LocalStorageSaveStorageStrategy, provideSaveStorage, provideServerModules, RpgPlayer } from "@rpgjs/server";
import { configCommon, studio } from "./config.common";
import { provideActionBattle } from "@rpgjs/action-battle/server";
import { createStudioActionBattlePreset, provideStudioGame } from "@rpgjs/studio/server";

export const configServer = {
  providers: [
    ...configCommon.providers,
    provideStudioGame(studio),
    provideServerModules([{
      player: {
        onJoinMap(player: RpgPlayer, map) {
        
        }
      }
    }]),
    provideSaveStorage(new LocalStorageSaveStorageStrategy({ key: "rpgjs-studio" })),
    provideActionBattle({
      ...createStudioActionBattlePreset(),
      attack: {
        lockMovement: true,
        lockDurationMs: 350
      },
      ui: {
        actionBar: {
          enabled: true,
          autoOpen: true
        }
      }
    })
  ],
};
