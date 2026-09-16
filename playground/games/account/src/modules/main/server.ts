import { defineModule } from "@rpgjs/common";
import {
  Components,
  type RpgAuthContext,
  type RpgPlayer,
  type RpgPlayerHooks,
  type RpgServer,
} from "@rpgjs/server";

interface MockAuthData {
  identifier: string;
  provider: "local-mock";
}

const player: RpgPlayerHooks<MockAuthData> = {
  canAuth(_player, auth) {
    return auth.data?.provider === "local-mock";
  },

  onAuthSuccess(player, auth: RpgAuthContext<MockAuthData>) {
    player.name = auth.data?.identifier.split("@")[0] || "Authenticated hero";
  },

  onConnected(player: RpgPlayer) {
    player.gui("rpg-title-screen").open();
  },

  onStart(player: RpgPlayer) {
    player.changeMap("account-demo", { x: 360, y: 240 });
  },

  onJoinMap(player: RpgPlayer) {
    player.setComponentsTop([
      Components.text("{name}"),
      Components.text("Authenticated with the local mock"),
    ]);
  },
};

export default defineModule<RpgServer>({
  player,
  maps: [{
    id: "account-demo",
    width: 720,
    height: 480,
    hitboxes: [
      { id: "top", x: 16, y: 16, width: 688, height: 16 },
      { id: "bottom", x: 16, y: 448, width: 688, height: 16 },
      { id: "left", x: 16, y: 16, width: 16, height: 448 },
      { id: "right", x: 688, y: 16, width: 16, height: 448 },
    ],
  }],
});
