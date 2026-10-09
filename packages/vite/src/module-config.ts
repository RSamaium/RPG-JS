import { defineConfig, build, type PluginOption } from "vite";
import canvasengine from "@canvasengine/compiler";
import dts from "vite-plugin-dts";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { directivePlugin, removeImportsPlugin } from "./index";

/**
 * Creates a build configuration for client or server side
 * 
 * This function generates a standardized Vite build configuration that can be used
 * for both client and server builds with different plugins and output directories.
 * 
 * @param {Object} options - Build configuration options
 * @param {string} options.side - The build side ('client' or 'server')
 * @param {boolean} options.watch - Whether to enable watch mode
 * @returns {Object} Vite build configuration object
 * 
 * @example
 * ```typescript
 * const clientConfig = createBuildConfig({ side: 'client', watch: false });
 * const serverConfig = createBuildConfig({ side: 'server', watch: true });
 * ```
 */
export interface RpgjsModuleViteConfigOptions {
  entries?: Partial<Record<'client' | 'server', string>>;
  copyDtsFiles?: boolean;
  declarationIncludes?: Partial<Record<'client' | 'server', string[]>>;
}

function createBuildConfig({
  side,
  watch,
  options,
}: {
  side: 'client' | 'server';
  watch: boolean;
  options: RpgjsModuleViteConfigOptions;
}) {
  const isClient = side === 'client';
  const runtimeDir = resolve(process.cwd(), "runtime");
  const resolveOptions = existsSync(runtimeDir)
    ? {
        alias: {
          "@common": runtimeDir,
        },
      }
    : undefined;
  
  const plugins: PluginOption[] = isClient
    ? [
        canvasengine(),
        removeImportsPlugin({ patterns: [/server/] }),
        directivePlugin({ side: "client" }),
      ]
    : [
        removeImportsPlugin({ patterns: [/\.ce$/, /client/] }),
        directivePlugin({ side: "server" }),
      ];

  return {
    configFile: false as const, // Prevent using this config file
    resolve: resolveOptions,
    plugins: [
      ...plugins,
      dts({ 
        include: options.declarationIncludes?.[side] || ['src/**/*.ts'],
        copyDtsFiles: options.copyDtsFiles,
        afterDiagnostic(diagnostics) {
          if (diagnostics.length > 0) throw new Error(`Declaration generation failed with ${diagnostics.length} TypeScript diagnostic(s)`)
        }
      })
    ],
    build: {
      watch: watch ? {} : undefined,
      outDir: `dist/${side}`,
      minify: false,
      lib: {
        entry: {
          index: options.entries?.[side] || "src/index.ts",
        },
        fileName: "index",
        formats: ["es" as const],
      },
      rollupOptions: {
        external: [
          /@rpgjs/,
          /@signestack/,
          "canvasengine",
          "pixi.js",
          "esbuild",
          "@canvasengine/presets",
          "rxjs",
        ],
        output: {
          preserveModules: true,
          preserveModulesRoot: "src",
        },
      },
    },
  };
}

/**
 * Builds both client and server configurations in parallel
 * 
 * This function creates and executes build configurations for both client and server
 * sides simultaneously using Promise.all for better performance.
 * 
 * @param {boolean} watch - Whether to enable watch mode for both builds
 * @returns {Promise<void[]>} Promise that resolves when both builds are complete
 * 
 * @example
 * ```typescript
 * // Build once
 * await buildClientAndServer(false);
 * 
 * // Build with watch mode
 * await buildClientAndServer(true);
 * ```
 */
async function buildClientAndServer(
  watch: boolean = false,
  options: RpgjsModuleViteConfigOptions = {},
) {
  const clientBuild = build(createBuildConfig({ side: 'client', watch, options }));
  const serverBuild = build(createBuildConfig({ side: 'server', watch, options }));

  await Promise.all([clientBuild, serverBuild]);

  console.log("✅ Build complete");
}

const isWatchMode = process.argv.includes("--watch");
const isBuildCommand = process.argv.includes("build");
const isManualControl = isWatchMode && isBuildCommand;

export const rpgjsModuleViteConfig = (
  options: RpgjsModuleViteConfigOptions = {},
) => {
  return defineConfig(async ({ command }) => {
    if (isManualControl) {
      buildClientAndServer(true, options);
      return {};
    }
    if (command === "build") {
      console.log("👀 Building...");
      await buildClientAndServer(false, options);
      // Return empty config to prevent default build
      process.exit(0);
    } else {
      return {
        plugins: [],
      };
    }
  });
};
