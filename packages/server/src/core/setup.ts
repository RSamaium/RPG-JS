import { injector, type Providers } from "@signe/di";
import type { RpgProviders } from "@rpgjs/common";
import { RpgServerEngine } from "../RpgServerEngine";
import { context } from "./context";
import { setInject } from "./inject";
import { LobbyRoom } from "../rooms/lobby";
import { RpgMap } from "../rooms/map";
import {
  collectProvidedServerRooms,
  RpgRoomRegistry,
} from "../rooms/registry";

interface SetupOptions {
  providers: RpgProviders;
}

export function createServer(options: SetupOptions): any {
  return class extends RpgServerEngine {
    config = options;
    
    async onStart() {
      setInject(context);
      const roomRegistry = new RpgRoomRegistry([
        RpgMap,
        LobbyRoom,
        ...collectProvidedServerRooms(options.providers),
      ]);
      const providers = (options.providers as unknown[]).flat(
        Infinity,
      ) as Providers;
      await injector(context as any, [
        { provide: RpgRoomRegistry, useValue: roomRegistry },
        ...providers,
      ]);
      this.setRoomRegistry(roomRegistry);
      return super.onStart();
    }
  };
}
