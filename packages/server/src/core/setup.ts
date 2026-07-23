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
      await injector(context as any, options.providers as Providers);
      return super.onStart();
    }
  };
}
