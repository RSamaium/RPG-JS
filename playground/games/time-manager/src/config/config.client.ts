import {
  Presets,
  provideClientGlobalConfig,
  provideClientModules,
  provideLoadMap,
} from "@rpgjs/client";
import MapComponent from "../components/map.ce";
import { provideMain } from "../modules/main";
import { timeManagerModule } from "../modules/time";

const heroPreset = Presets.LPCSpritesheetPreset({
  id: "hero",
  imageSource: "hero.png",
  width: 1728,
  height: 5568,
  ratio: 1.5,
});

export default {
  providers: [
    provideLoadMap((id: string) => ({
      id,
      component: MapComponent,
      width: 720,
      height: 480,
      tileWidth: 32,
      tileHeight: 32,
      data: {},
      hitboxes: [
        { id: "top-wall", x: 32, y: 32, width: 656, height: 2 },
        { id: "bottom-wall", x: 32, y: 446, width: 656, height: 2 },
        { id: "left-wall", x: 32, y: 32, width: 2, height: 416 },
        { id: "right-wall", x: 686, y: 32, width: 2, height: 416 },
      ],
    })),
    provideClientGlobalConfig({
      keyboardControls: {
        up: "up",
        down: "down",
        left: "left",
        right: "right",
        action: "space",
        dash: "shift",
        escape: "escape",
      },
    }),
    provideMain(),
    provideClientModules([
      timeManagerModule,
      {
        spritesheets: [
          {
            ...heroPreset,
            id: "hero",
            image: "hero.png",
          },
        ],
      },
    ]),
  ],
};
