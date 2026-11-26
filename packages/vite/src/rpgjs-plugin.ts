import canvasengine from "@canvasengine/compiler";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { replaceConfigImport } from "./replace-config-import";
import { serverPlugin, type RpgjsDevServerOptions } from "./server-plugin";
import { entryPointPlugin } from "./entry-point-plugin";
import { mmorpgBuildPlugin } from "./mmorpg-build-plugin";
import { devBannerPlugin } from "./dev-banner";

const runtimeDedupe = ["@canvasengine/presets", "canvasengine", "pixi.js"];
/**
 * The reactive runtime must have one copy in the application: signals of two copies of `@signe/reactive` do not track
 * each other. The RPGJS packages and canvasengine import it instead of bundling it, so the package manager already
 * installs one copy when the versions match. It is deduped as well when the application can resolve it from its root
 * (a direct dependency, or a hoisted `node_modules`): Vite resolves a deduped package from the root only, so a package
 * that the root cannot resolve must be left to the normal resolution.
 */
const reactiveRuntime = ["@signe/reactive"];

/** The packages of `names` that a `node_modules` folder of `root`, or of one of its parents, contains. */
export function resolvableFromRoot(root: string, names: string[]): string[] {
  return names.filter((name) => {
    let dir = path.resolve(root);
    while (true) {
      if (existsSync(path.join(dir, "node_modules", name, "package.json"))) return true;
      const parent = path.dirname(dir);
      if (parent === dir) return false;
      dir = parent;
    }
  });
}
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
  const rpgType = process.env.RPG_TYPE || "rpg";
  const rpgEntryPoint = entryPoints?.rpg ?? './src/standalone.ts';

  return [
    {
      name: "rpgjs:runtime-dedupe",
      config(userConfig?: { root?: string }) {
        return {
          resolve: {
            dedupe: [...runtimeDedupe, ...resolvableFromRoot(userConfig?.root ?? process.cwd(), reactiveRuntime)],
          },
          optimizeDeps: {
            exclude: runtimeOptimizeDepsExclude,
            // pixi.js is excluded, so its CommonJS dependencies must be pre-bundled explicitly to get named exports.
            include: ["pixi.js > eventemitter3", "pixi.js > @xmldom/xmldom"],
          },
        };
      },
    },
    canvasengine(),
    replaceConfigImport(),
    serverPlugin(server, devServer),
    mmorpgBuildPlugin({
      rpgType,
      serverEntry: mmorpgEntryPoints.server,
      adapterEntries: mmorpgEntryPoints.adapters,
    }),
    entryPointPlugin({
      entryPoints: {
        rpg: rpgEntryPoint,
        mmorpg: mmorpgEntryPoints.client,
      }
    }),
    devBannerPlugin({
      rpgType,
      clientEntry: rpgType === "mmorpg" ? mmorpgEntryPoints.client : rpgEntryPoint,
      serverEntry: mmorpgEntryPoints.server,
      remoteTarget: devServer?.target,
      remoteMapIds: devServer?.mapIds,
    }),
  ]
}
