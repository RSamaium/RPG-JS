import { injector, type Providers } from "@signe/di";
import type { RpgProviders } from "@rpgjs/common";
import { RpgServerEngine } from "../RpgServerEngine";
import { context } from "./context";
import { setInject } from "./inject";

interface SetupOptions {
  providers: RpgProviders;
}

export function createServer(options: SetupOptions): any {
  return class extends RpgServerEngine {
    config = options;
    
    async onStart() {
      setInject(context);
      const providers = (options.providers as unknown[]).flat(
        Infinity,
      ) as Providers;
      await injector(context as any, providers);
      return super.onStart();
    }
  };
}
