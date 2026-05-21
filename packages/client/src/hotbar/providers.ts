import { Context, inject as diInject, type Provider } from "@signe/di";
import { WebSocketToken } from "../services/AbstractSocket";
import { RpgGui } from "../Gui/Gui";
import HotbarComponent from "./components/hotbar.ce";
import HotbarAssignMenuComponent from "./components/hotbar-assign-menu.ce";
import { HotbarManager } from "./HotbarManager";
import { resolveHotbarOptions } from "./options";
import { HotbarEntrySourceToken, HotbarGuiInstallerToken, HotbarOptionsToken } from "./tokens";
import type { HotbarEntryResolver, HotbarEntrySource, HotbarOptions } from "./types";

export function provideHotbar(options: HotbarOptions = {}): Provider[] {
  const resolvedOptions = resolveHotbarOptions(options);
  return [
    {
      provide: HotbarOptionsToken,
      useValue: resolvedOptions,
    },
    {
      provide: HotbarManager,
      deps: [HotbarOptionsToken, HotbarEntrySourceToken],
      useFactory: (context: Context) => new HotbarManager(context),
    },
    {
      provide: HotbarGuiInstallerToken,
      deps: [WebSocketToken, RpgGui, HotbarManager],
      useFactory: (context: Context) => {
        const hotbar = diInject<HotbarManager>(context, HotbarManager);
        const gui = diInject<RpgGui>(context, RpgGui);
        hotbar.installGui(
          gui,
          resolvedOptions.component ?? HotbarComponent,
          resolvedOptions.assignComponent ?? HotbarAssignMenuComponent,
        );
        return true;
      },
    },
  ];
}

export function provideHotbarEntries(id: string, resolve: HotbarEntryResolver): Provider {
  const source: HotbarEntrySource = {
    id,
    resolve,
  };
  return {
    provide: HotbarEntrySourceToken,
    useValue: source,
    multi: true,
    name: id,
  };
}

export const withHotbar = provideHotbar;
