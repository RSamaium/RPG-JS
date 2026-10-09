import {
  provideClientGlobalConfig,
  provideClientModules,
  provideMmorpg,
  Presets,
  startGame,
} from "@rpgjs/client";
import { provideTiledMap } from "@rpgjs/tiledmap/client";

startGame({
  providers: [
    provideTiledMap({ basePath: "map" }),
    provideClientGlobalConfig(),
    provideClientModules([
      {
        spritesheets: [
          {
            id: "hero",
            image: "spritesheets/hero.png",
            ...Presets.RMSpritesheet(3, 4),
          },
        ],
      },
    ]),
    provideMmorpg({
      connectionIdScope: "session",
      connectionAcceptanceTimeoutMs: 30_000,
      socketOptions: { connectionTimeout: 30_000 },
    }),
  ],
});
