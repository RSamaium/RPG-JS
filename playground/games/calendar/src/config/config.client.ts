import {
  provideClientGlobalConfig,
  provideClientModules,
  provideLoadMap,
} from "@rpgjs/client";
import { provideCalendar } from "@rpgjs/calendar/client";
import TownMap from "../components/town-map.ce";

export default {
  providers: [
    provideLoadMap((id: string) => ({
      id,
      component: TownMap,
      width: 960,
      height: 640,
      data: {},
      hitboxes: [
        { id: "top", x: 0, y: 0, width: 960, height: 8 },
        { id: "bottom", x: 0, y: 632, width: 960, height: 8 },
        { id: "left", x: 0, y: 0, width: 8, height: 640 },
        { id: "right", x: 952, y: 0, width: 8, height: 640 },
      ],
    })),
    provideClientGlobalConfig(),
    // Before provideClientModules, which collects the modules registered so far.
    provideCalendar(),
    provideClientModules([]),
  ],
};
