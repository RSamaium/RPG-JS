import {
  createServer,
  provideServerModules,
  type EventDefinition,
  type RpgPlayer,
} from "@rpgjs/server";
import { provideTiledMap } from "@rpgjs/tiledmap/server";

function TestNpc(): EventDefinition {
  return {
    onInit() {
      this.name = "Cloudflare NPC";
      this.setGraphic("hero");
    },
    onAction(player: RpgPlayer) {
      player.showText('Hello')
    }
  };
}

export default createServer({
  providers: [
    ...provideTiledMap({
      basePath: "/map",
      streaming: {
        chunkSize: 16,
        loadRadius: 2,
        retainRadius: 3,
      },
    }),
    provideServerModules([
      {
        player: {
          async onConnected(player: RpgPlayer) {
            player.initializeDefaultStats();
            player.name = "Cloudflare Hero";
            await player.changeMap("demo", { x: 400, y: 300 });
          },
        },
        maps: [
          {
            id: "demo",
            file: "src/tiled/demo.tmx",
            onJoin(player: RpgPlayer) {
              player.setGraphic("hero");
            },
            events: [
              {
                id: "EV-1",
                x: 520,
                y: 320,
                event: TestNpc(),
              },
            ],
          },
        ],
      },
    ]),
  ],
});
