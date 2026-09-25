import canvasengine from "@canvasengine/compiler";
import type { Plugin } from "vite";
import { replaceConfigImport } from "./replace-config-import";
import { serverPlugin, type RpgjsDevServerOptions } from "./server-plugin";
import { entryPointPlugin } from "./entry-point-plugin";
import { mmorpgBuildPlugin } from "./mmorpg-build-plugin";

const runtimeDedupe = ["@canvasengine/presets", "canvasengine", "pixi.js"];
const runtimeOptimizeDepsExclude = [
  ...runtimeDedupe,
  "@rpgjs/client",
  "@rpgjs/common",
  "@rpgjs/server",
  "@rpgjs/tiledmap/client",
  "@rpgjs/tiledmap/server",
];

type MmorpgEntryPoints =
  | string
  | {
      client?: string;
      server?: string;
      adapters?: Record<string, string>;
    };

export interface RpgjsPluginOptions {
  server: any;
  devServer?: RpgjsDevServerOptions;
  entryPoints?: {
    rpg?: string;
    mmorpg?: MmorpgEntryPoints;
  };
}

function normalizeMmorpgEntryPoints(entryPoints?: MmorpgEntryPoints) {
  if (!entryPoints || typeof entryPoints === "string") {
    return {
      client: entryPoints ?? "./src/client.ts",
      server: "./src/server.ts",
      adapters: {},
    };
  }

  return {
    client: entryPoints.client ?? "./src/client.ts",
    server: entryPoints.server ?? "./src/server.ts",
    adapters: entryPoints.adapters ?? {},
  };
}

export function rpgjs({
  server,
  devServer,
  entryPoints
}: RpgjsPluginOptions): Plugin[] {
  const mmorpgEntryPoints = normalizeMmorpgEntryPoints(entryPoints?.mmorpg);

  return [
    {
      name: "rpgjs:runtime-dedupe",
      config() {
        return {
          resolve: {
            dedupe: runtimeDedupe,
          },
          optimizeDeps: {
            exclude: runtimeOptimizeDepsExclude,
            include: ["pixi.js > eventemitter3"],
          },
        };
      },
    },
    canvasengine(),
    replaceConfigImport(),
    serverPlugin(server, devServer),
    mmorpgBuildPlugin({
      rpgType: process.env.RPG_TYPE || "rpg",
      serverEntry: mmorpgEntryPoints.server,
      adapterEntries: mmorpgEntryPoints.adapters,
    }),
    entryPointPlugin({
      entryPoints: {
        rpg: entryPoints?.rpg ?? './src/standalone.ts',
        mmorpg: mmorpgEntryPoints.client,
      }
    })
  ]
}
