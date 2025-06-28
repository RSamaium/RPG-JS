import { createServer, Move, provideServerModules, RpgPlayer } from "@rpgjs/server";
import { provideTiledMap } from "@rpgjs/tiledmap/server";
import { provideLoadMap } from "@rpgjs/client";
import { provideActionBattle, BattleAi } from "@rpgjs/action-battle/server"; 

export function Event() {
  return {
    name: "EV-1",
    onInit() {
      this.setGraphic("female");
      this.addItem("sword");
      this.equip("sword");
      new BattleAi(this, {
        attackCooldown: 1000,
        visionRange: 100,
        attackRange: 50,
      });
    },
    async onAction(player: RpgPlayer) {
      
    },
  };
}

export default createServer({
  providers: [
    provideTiledMap({
      basePath: "map",
    }),
    provideActionBattle(),
    provideServerModules([
      {
        player: {
          onConnected: (player: RpgPlayer) => {
            player.changeMap("simplemap");
            console.log("player connected", player.id)
          },
          onJoinMap: (player: RpgPlayer) => {
            player.teleport({
              x: 250,
              y: 250,
            });
            player.setGraphic("hero");
          },
        },
        maps: [
          {
            id: "simplemap",
            events: [Event()],
          },
        ],
        database: {
          sword: {
            name: "Sword",
            description: "A sword",
            price: 100,
            atk: 10,
            pdef: 10, 
          }
        }
      },
    ]),
    provideLoadMap(() => {})
  ],
});
