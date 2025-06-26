import {
  Presets,
  provideClientGlobalConfig,
  provideClientModules,
} from "@rpgjs/client";
import { provideTiledMap } from "@rpgjs/tiledmap/client";
import Tooltip from "../components/tooltip.ce";
import { provideActionBattle } from "@rpgjs/action-battle/client";

export default {
  providers: [
    provideTiledMap({
      basePath: "map",
    }),
    provideActionBattle(),
    provideClientGlobalConfig(),
    provideClientModules([
      {
        spritesheets: [
          {
            id: "hero",
            width: 96,
            height: 128,
            image: "male.png",
            ...Presets.RMSpritesheet(3, 4),
          },
          {
            id: "female",
            width: 96,
            height: 128,
            image: "female.png",
            ...Presets.RMSpritesheet(3, 4),
          },
        ],
      },
    ]),
  ],
};
