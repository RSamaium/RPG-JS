import { defineModule } from "@rpgjs/common";
import type { RpgPlayerHooks, RpgServer } from "@rpgjs/server";
import { Components, RpgPlayer } from "@rpgjs/server";

const player: RpgPlayerHooks = {
  onConnected(player: RpgPlayer) {
    player.name = "Pixel Hero";
    player.changeMap("chat-plaza", { x: 360, y: 240 });
  },

  onJoinMap(player: RpgPlayer) {
    player.setComponentsTop([
      Components.text("{name}"),
      Components.text("Map chat is server-authoritative"),
    ]);
  },
};

export default defineModule<RpgServer>({
  player,
  maps: [
    {
      id: "chat-plaza",
      width: 720,
      height: 480,
      hitboxes: [
        { id: "top-wall", x: 16, y: 16, width: 688, height: 16 },
        { id: "bottom-wall", x: 16, y: 448, width: 688, height: 16 },
        { id: "left-wall", x: 16, y: 16, width: 16, height: 448 },
        { id: "right-wall", x: 688, y: 16, width: 16, height: 448 },
      ],
    },
  ],
});
