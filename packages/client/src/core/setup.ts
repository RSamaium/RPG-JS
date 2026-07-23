import { Context, inject, injector, type Providers } from "@signe/di";
import type { RpgContext, RpgProviders } from "@rpgjs/common";
import { RpgClientEngine } from "../RpgClientEngine";
import { setInject } from "./inject";

interface SetupOptions {
  providers: RpgProviders;
}


export async function startGame(options: SetupOptions): Promise<RpgContext> {
  const context = new Context();
  context['side'] = 'client'
  setInject(context as unknown as RpgContext);

  const providers = (options.providers as unknown[]).flat(Infinity) as Providers;
  await injector(context, providers);

  const engine = inject<RpgClientEngine>(context, RpgClientEngine);
  await engine.start();
  return context as unknown as RpgContext;
}
