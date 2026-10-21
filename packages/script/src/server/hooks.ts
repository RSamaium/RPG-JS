/**
 * Binds the hooks of RPGJS to the signals of the game: each hook emits its signal, with the player the script acts for. This is a
 * module like any other (`player`, `event` hooks), so it sees every player and every event without changing any of them.
 */
import type { RpgServer } from "@rpgjs/server";
import type { ScriptService } from "./service";

const read = <T>(value: unknown): T => (typeof value === "function" ? (value as () => T)() : (value as T));
const eventOf = (event: any) => ({ id: String(event.id ?? ""), name: String(read(event.name) ?? "") });

export function scriptHooks(service: ScriptService): RpgServer {
  return {
    player: {
      onJoinMap: (player, map) => void service.emit("player.joinMap", { map: String(map.id) }, { player, map }),
      onLeaveMap: (player, map) => void service.emit("player.leaveMap", { map: String(map.id) }, { player, map }),
      onLevelUp: async (player, gained) => {
        const map = player.getCurrentMap();
        if (map) await service.emit("player.levelUp", { gained }, { player, map });
      },
      onDead: async (player) => {
        const map = player.getCurrentMap();
        if (map) await service.emit("player.dead", {}, { player, map });
      },
    },
    event: {
      onAction: async (event, player) => {
        const map = player.getCurrentMap();
        if (map) await service.emit("event.action", { event: eventOf(event) }, { player, map, event });
      },
      onPlayerTouch: async (event, player) => {
        const map = player.getCurrentMap();
        if (map) await service.emit("event.touch", { event: eventOf(event) }, { player, map, event });
      },
    },
  };
}
