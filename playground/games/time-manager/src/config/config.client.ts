import {
  Presets,
  provideClientGlobalConfig,
  provideClientModules,
  provideLoadMap,
} from "@rpgjs/client";
import { Animation } from "@rpgjs/common";
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
const cropSeasons = ["spring", "summer", "autumn", "winter"];
const cropSpritesheets = cropSeasons.flatMap((season) => (
  Array.from({ length: 4 }, (_, stage) => ({
    id: `crop-${season}-${stage}`,
    image: `assets/crops/crop-${season}-${stage}.png`,
    width: 64,
    height: 64,
    rectWidth: 64,
    rectHeight: 64,
    framesWidth: 1,
    framesHeight: 1,
    spriteRealSize: {
      width: 44,
      height: 44,
    },
    textures: {
      [Animation.Stand]: {
        animations: () => [[{ time: 0, frameX: 0, frameY: 0 }]],
      },
      [Animation.Walk]: {
        animations: () => [[{ time: 0, frameX: 0, frameY: 0 }]],
      },
    },
  }))
));

export default {
  providers: [
    provideLoadMap((id: string) => ({
      id,
      component: MapComponent,
      width: 960,
      height: 640,
      tileWidth: 32,
      tileHeight: 32,
      data: {},
      hitboxes: [
        { id: "top-wall", x: 32, y: 32, width: 896, height: 2 },
        { id: "bottom-wall", x: 32, y: 606, width: 896, height: 2 },
        { id: "left-wall", x: 32, y: 32, width: 2, height: 576 },
        { id: "right-wall", x: 926, y: 32, width: 2, height: 576 },
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
          ...cropSpritesheets,
        ],
      },
    ]),
  ],
};
