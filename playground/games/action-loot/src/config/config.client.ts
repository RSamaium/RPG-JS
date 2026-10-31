import {
  Presets,
  provideClientGlobalConfig,
  provideClientModules,
  provideLoadMap,
} from "@rpgjs/client";
import { provideActionBattle } from "@rpgjs/action-battle/client";
import MapComponent from "../components/map.ce";

const MAP_WIDTH = 1024;
const MAP_HEIGHT = 768;

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
    provideActionBattle(),
    provideClientGlobalConfig(),
    provideClientModules([
      {
        spritesheetResolver: async (id: string) => {
          if (id === "hero" || id === "monster") {
            return Presets.LPCSpritesheetPreset({
              id,
              imageSource: `${id}.png`,
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
      },
    ]),
  ],
};
