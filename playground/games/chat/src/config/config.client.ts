import { provideChat } from "@rpgjs/chat/client";
import {
  provideClientGlobalConfig,
  provideClientModules,
  provideLoadMap,
} from "@rpgjs/client";
import MapComponent from "../components/map.ce";
import { provideMain } from "../modules/main";

export default {
  providers: [
    provideLoadMap((id: string) => ({
      id,
      component: MapComponent,
      width: 720,
      height: 480,
      data: {},
      hitboxes: [
        { id: "top-wall", x: 16, y: 16, width: 688, height: 16 },
        { id: "bottom-wall", x: 16, y: 448, width: 688, height: 16 },
        { id: "left-wall", x: 16, y: 16, width: 16, height: 448 },
        { id: "right-wall", x: 688, y: 16, width: 16, height: 448 },
      ],
    })),
    provideClientGlobalConfig(),
    provideMain(),
    provideChat({
      client: {
        position: "bottom-left",
        maxMessages: 50,
      },
    }),
    provideClientModules([]),
  ],
};
