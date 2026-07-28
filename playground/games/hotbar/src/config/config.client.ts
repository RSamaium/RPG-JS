import {
  Presets,
  provideClientGlobalConfig,
  provideClientModules,
  provideLoadMap,
} from "@rpgjs/client";
import FarmMap from "../components/farm-map.ce";
import { provideFarm } from "../modules/farm";

const ICONS = new Set([
  "berry-snack",
  "water-crops",
]);

export default {
  providers: [
    provideLoadMap((id: string) => ({
      id,
      component: FarmMap,
      width: 960,
      height: 640,
      data: {},
      hitboxes: [
        { id: "top-fence", x: 24, y: 24, width: 912, height: 12 },
        { id: "bottom-fence", x: 24, y: 604, width: 912, height: 12 },
        { id: "left-fence", x: 24, y: 24, width: 12, height: 592 },
        { id: "right-fence", x: 924, y: 24, width: 12, height: 592 },
      ],
    })),
    provideClientGlobalConfig({
      keyboardControls: {
        up: "up",
        down: "down",
        left: "left",
        right: "right",
        action: "h",
        escape: "m",
      },
    }),
    provideFarm(),
    provideClientModules([
      {
        spritesheetResolver: async (id: string) => {
          if (!ICONS.has(id)) return undefined;
          return Presets.IconPreset({
            id,
            image: `/icons/${id}.svg`,
            framesWidth: 1,
            framesHeight: 1,
          });
        },
      },
    ]),
  ],
};
