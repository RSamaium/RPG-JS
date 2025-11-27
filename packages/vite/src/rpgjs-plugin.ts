import canvasengine from "@canvasengine/compiler";
import { replaceConfigImport } from "./replace-config-import";
import { serverPlugin } from "./server-plugin";
import { entryPointPlugin } from "./entry-point-plugin";

interface RpgjsPluginOptions {
  server?: any;
  entryPoints?: {
    rpg: string;
    mmorpg: string;
  };
}

export function rpgjs({
  server,
  entryPoints
}: RpgjsPluginOptions = {}) {
  return [
    canvasengine(),
    replaceConfigImport(),
    serverPlugin(server),
    entryPointPlugin({
      entryPoints: {
        rpg: entryPoints?.rpg ?? './src/standalone.ts',
        mmorpg: entryPoints?.mmorpg ?? './src/client.ts'
      }
    })
  ]
}