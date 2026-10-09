import { defineModule, RpgPlayer, RpgServer } from "@rpgjs/server";

export default defineModule<RpgServer>({
    player: {
      onConnected(player: RpgPlayer) {
        console.log('Player connected', player.id);
      }
    }
  });
