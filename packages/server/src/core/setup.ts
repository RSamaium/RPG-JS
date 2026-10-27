import { injector, type Providers } from "@signe/di";
import { Hooks, ModulesToken, type RpgProviders } from "@rpgjs/common";
import { lastValueFrom } from "rxjs";
import { RpgServerEngine } from "../RpgServerEngine";
import { context } from "./context";
import { inject, setInject } from "./inject";
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
      // The `engine.onStart` hook of the modules, once the providers are in place. A failing hook never stops the server.
      try {
        const hooks = inject<Hooks>(ModulesToken, context);
        await lastValueFrom(hooks.callHooks("server-engine-onStart", this));
      } catch (error) {
        console.error("[RPGJS] Error during engine onStart hooks:", error);
      }
      return super.onStart();
    }
  };
}
