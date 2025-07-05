import { createServer, Move, provideServerModules, RpgMap, RpgPlayer, effect } from "@rpgjs/server";

export function Event() {
  return {
    name: "EV-1",
    onInit() {
      this.setGraphic("hero");
    },
    async onAction(player: RpgPlayer) {
      player.gold = 100;
      player.showText("Hello World", {
        talkWith: this
      });
    },
  };
}

export default createServer({
  providers: [
    provideServerModules([
      {
        player: {
          props: {
            wood: Number
          },
          onConnected: (player: RpgPlayer) => {
            player.changeMap("simplemap");
          },
          onJoinMap: (player: RpgPlayer, map: RpgMap) => {
            player.teleport({
              x: 1000,
              y: 400,
            });
           
            player.setGraphic("hero");
          },
          onInput(player: RpgPlayer, input: any) {
            // if (input.action) {
            //  player.wood.update(wood => wood + 1)
            //  player.showComponentAnimation('wood')
            // }
            if (input.action) {
              player.gui("RpgComponentExample").open()
            }
          }
        },
        maps: [
          {
            id: "simplemap",
            events: [{x: 1000, y: 600, event: Event()}],
          },
        ],
      },
    ])
  ],
});
