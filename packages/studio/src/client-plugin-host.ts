import * as canvasengine from "canvasengine";
import * as rpgjs from "@rpgjs/client";
import { buildStudioPluginClientModules, type StudioPluginClientModule, type StudioPluginHost, type StudioPluginLoadReport } from "./client-plugins";
import { getGameDataProvider } from "./data-provider";

/**
 * What a client file of a plugin can use of the game, as `host`: the runtime of CanvasEngine (`import { h } from 'canvasengine'`) and the
 * whole client API of RPGJS (`import { defineModule, inject, RpgClientEngine, RpgGui, hoverPopover } from '@rpgjs/client'`), as the guides of
 * RPGJS write it. A plugin never brings its own copy, so `inject` finds the engine of the game.
 */
export const studioPluginHost = (): StudioPluginHost => ({
  canvasengine,
  rpgjs,
});

/**
 * The client modules of the plugins of a project, to give to `provideClientModules` before the engine starts (the entries of the game
 * do it, as RPGJS reads its modules once). It never throws: a game whose plugins cannot be read starts without them.
 */
export const loadStudioPluginClientModules = async (projectId: string | undefined): Promise<{ modules: StudioPluginClientModule[]; report: StudioPluginLoadReport }> => {
  const empty = { modules: [], report: { loaded: [], failed: [] } };
  if (!projectId) return empty;
  try {
    const plugins = (await getGameDataProvider().getPlugins?.(projectId)) ?? [];
    return await buildStudioPluginClientModules({ plugins, host: studioPluginHost() });
  } catch (error) {
    console.warn("[StudioGame] the plugins of the project could not be read", error);
    return empty;
  }
};
