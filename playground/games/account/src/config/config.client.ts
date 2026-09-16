import {
  provideClientGlobalConfig,
  provideClientModules,
  provideLoadMap,
} from "@rpgjs/client";
import MapComponent from "../components/map.ce";
import { signIn, signUp, forgotPassword, resetPassword } from "../account-api";
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
        { id: "top", x: 16, y: 16, width: 688, height: 16 },
        { id: "bottom", x: 16, y: 448, width: 688, height: 16 },
        { id: "left", x: 16, y: 16, width: 16, height: 448 },
        { id: "right", x: 688, y: 16, width: 16, height: 448 },
      ],
    })),
    provideClientGlobalConfig(),
    provideMain(),
    provideAccount({ client: {
      signIn, signUp, forgotPassword, resetPassword,
      title: "Crystal Chronicles",
      subtitle: "Your next adventure awaits.",
      backgroundImage: new URL("../../../../../packages/ui-css/stories/assets/celestial-sanctuary.webp", import.meta.url).href,
    } }),
    provideClientModules([]),
  ],
};
import { provideAccount } from "@rpgjs/account/client";
