import {
  Presets,
  provideClientGlobalConfig,
  provideClientModules,
  provideLoadMap,
} from "@rpgjs/client";
import MapComponent from "../components/map.ce";
import ProjectileComponent from "../components/projectile.ce";
import { provideMain } from "../modules/main";

export default {
  providers: [
    provideLoadMap((id: string) => ({
      id,
      component: MapComponent,
      width: 640,
      height: 420,
      data: {},
      hitboxes: [
        { id: "top-wall", x: 24, y: 24, width: 592, height: 2 },
        { id: "bottom-wall", x: 24, y: 394, width: 592, height: 2 },
        { id: "left-wall", x: 24, y: 24, width: 2, height: 372 },
        { id: "right-wall", x: 614, y: 24, width: 2, height: 372 },
      ],
    })),
    provideClientGlobalConfig(),
    provideMain(),
    provideClientModules([
      {
        spritesheets: [
          {
            id: "hero",
            image: "hero.png",
            ...Presets.LPCSpritesheetPreset({
              id: "hero",
              imageSource: "hero.png",
              width: 1728,
              height: 5568,
              ratio: 1.5,
            }),
          },
          {
            id: "monster",
            image: "monster.png",
            ...Presets.LPCSpritesheetPreset({
              id: "monster",
              imageSource: "monster.png",
              width: 1728,
              height: 5568,
              ratio: 1.5,
            }),
          },
        ],
        projectiles: {
          components: {
            bolt: ProjectileComponent,
          },
          // The server only names the projectile: its look is decided here.
          looks: {
            arrow: {
              shape: "arrow",
              color: "#e5e7eb",
              accentColor: "#f87171",
              trail: { color: "#fde68a", width: 3, length: 10 },
            },
            bomb: {
              shape: "bomb",
              color: "#f97316",
              accentColor: "#fde68a",
              rotate: false,
              scale: 1.2,
              shake: 6,
              impactDuration: 450,
            },
          },
        },
      },
    ]),
  ],
};
