import fs from "fs";
import path from "path";
import type { Plugin, ViteDevServer } from "vite";
import sizeOf from "image-size";
import { createRpgServerTransport, logNetworkSimulationStatus } from "@rpgjs/server/node";
import type { RpgWebSocketServer } from "@rpgjs/server/node";
import { flagTransform } from "./flag-transform";
import vitePluginRequire from "./require-transform";
import { loadConfigFileSync } from "./load-config-file";
import {
  assetsFolder,
  ClientBuildConfigOptions,
  Config,
  dedent,
  formatVariableName,
  getAllFiles,
  ImportObject,
  importPathForFile,
  importString,
  resolveModuleImport,
  searchFolderAndTransformToImportString,
  toPosix,
  transformPathIfModule,
  warn,
} from "./utils";

const MODULE_NAME = "virtual:rpgjs-v4-modules";
const CLIENT_CONFIG = "virtual:rpgjs-v4-client-config";
const SERVER_ENTRY = "virtual:rpgjs-v4-server-entry";
const CLIENT_ENTRY = "virtual:rpgjs-v4-client-entry";
const STANDALONE_ENTRY = "virtual:rpgjs-v4-standalone-entry";
const LEGACY_MOBILE_GUI = "virtual:rpgjs-v4-legacy-mobile-gui";
const LEGACY_DEFAULT_GUI = "virtual:rpgjs-v4-legacy-default-gui";
const LEGACY_GAMEPAD = "virtual:rpgjs-v4-legacy-gamepad";
const LEGACY_MODULES: Record<string, string> = {
  "@rpgjs/mobile-gui": LEGACY_MOBILE_GUI,
  "@rpgjs/default-gui": LEGACY_DEFAULT_GUI,
  "@rpgjs/gamepad": LEGACY_GAMEPAD,
};
const TILED_EXTENSIONS = [".tmx", ".tsx", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];

type ImportImageObject = ImportObject & { propImagesString: string };
type TiledAssetRoot = {
  root: string;
  moduleRoot: string;
};

async function importWebSocketServer(): Promise<any> {
  if (typeof process === "undefined" || !process.versions?.node) return null;
  try {
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    const ws = require("ws");
    return ws.WebSocketServer || ws.default?.WebSocketServer || ws;
  } catch {
    return null;
  }
}

function verifyDefaultExport(importObject: ImportObject) {
  if (!importObject.variablesString) return "[]";
  return dedent`
    [${importObject.variablesString}].map((value) => {
      if (!value) throw new Error('Missing default export in ${importObject.relativePath}')
      return value
    })
  `;
}

function normalizeDatabase(variableList: string) {
  if (!variableList) return "{}";
  return dedent`
    Object.assign({}, ...[${variableList}].map((value) => {
      if (!value) return {}
      if (typeof value === 'function') {
        return { [value.id || value.name]: value }
      }
      return value
    }))
  `;
}

function stripQuery(url: string) {
  return url.split("?", 1)[0].split("#", 1)[0];
}

function normalizePublicBasePath(basePath = "map") {
  const trimmed = basePath.trim().replace(/^\/+|\/+$/g, "");
  return trimmed || "map";
}

function getMimeType(file: string) {
  switch (path.extname(file).toLowerCase()) {
    case ".tmx":
    case ".tsx":
    case ".world":
      return "application/xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function isTiledAsset(file: string) {
  return TILED_EXTENSIONS.includes(path.extname(file).toLowerCase());
}

function moduleRootPath(modulePath: string, projectRoot = process.cwd()) {
  return path.resolve(projectRoot, transformPathIfModule(modulePath));
}

function hasTiledAssets(directory: string) {
  return fs.existsSync(directory) && getAllFiles(directory).some(isTiledAsset);
}

function getTiledAssetRoots(modulePath: string, projectRoot = process.cwd()): TiledAssetRoot[] {
  const moduleRoot = moduleRootPath(modulePath, projectRoot);
  const roots: TiledAssetRoot[] = [];
  const mapsRoot = path.join(moduleRoot, "maps");
  const worldsRoot = path.join(moduleRoot, "worlds");

  if (hasTiledAssets(mapsRoot)) {
    roots.push({ root: mapsRoot, moduleRoot });
  }

  if (fs.existsSync(worldsRoot)) {
    for (const dirent of fs.readdirSync(worldsRoot, { withFileTypes: true })) {
      if (!dirent.isDirectory()) continue;
      const root = path.join(worldsRoot, dirent.name);
      if (hasTiledAssets(root)) {
        roots.push({ root, moduleRoot });
      }
    }
  }

  return roots;
}

function getAllTiledAssetRoots(modules: string[], projectRoot = process.cwd()) {
  return modules
    .filter((module) => module.startsWith("."))
    .flatMap((module) => getTiledAssetRoots(module, projectRoot));
}

function mapIdFromTmx(file: string, assetRoot: string) {
  return toPosix(path.relative(assetRoot, file)).replace(/\.tmx$/i, "");
}

function publicTiledFilePath(file: string, assetRoot: string, basePath = "map") {
  return `/${normalizePublicBasePath(basePath)}/${toPosix(path.relative(assetRoot, file))}`;
}

function hasSiblingMapScript(file: string) {
  return fs.existsSync(file.replace(/\.tmx$/i, ".ts"));
}

export function createTiledMapEntries(modulePath: string, options: ClientBuildConfigOptions, projectRoot = process.cwd()) {
  return getTiledAssetRoots(modulePath, projectRoot)
    .flatMap(({ root }) => getAllFiles(root)
      .filter((file) => file.toLowerCase().endsWith(".tmx"))
      .filter((file) => !hasSiblingMapScript(file))
      .map((file) => {
        const id = mapIdFromTmx(file, root);
        const publicPath = publicTiledFilePath(file, root, options.tiledMapBasePath);
        return `{ id: '${id}', file: '${publicPath}' }`;
      }))
    .join(",");
}

function mapIdFromWorldFileName(fileName: string) {
  const withoutExtension = toPosix(fileName).replace(/\.tmx$/i, "");
  const parts = withoutExtension.split("/").filter(Boolean);
  return parts.at(-1) ?? withoutExtension;
}

function loadWorldFile(file: string) {
  const world = JSON.parse(fs.readFileSync(file, "utf8"));
  const maps = Array.isArray(world.maps)
    ? world.maps.map((map: any) => ({
      ...map,
      id: map.id ?? (map.fileName ? mapIdFromWorldFileName(map.fileName) : undefined),
      worldX: map.worldX ?? map.x ?? 0,
      worldY: map.worldY ?? map.y ?? 0,
      width: map.width ?? map.widthPx ?? 0,
      height: map.height ?? map.heightPx ?? 0,
    }))
    : [];

  return {
    ...world,
    id: world.id ?? path.basename(file, ".world"),
    maps,
  };
}

export function createWorldMapEntries(modulePath: string, projectRoot = process.cwd()) {
  const worldsRoot = path.join(moduleRootPath(modulePath, projectRoot), "worlds");
  if (!fs.existsSync(worldsRoot)) return "";

  return getAllFiles(worldsRoot)
    .filter((file) => file.endsWith(".world"))
    .map((file) => JSON.stringify(loadWorldFile(file)))
    .join(",");
}

function copyTiledAssets(assetRoots: TiledAssetRoot[], outputDir: string, basePath = "map") {
  const publicBasePath = normalizePublicBasePath(basePath);
  const copied = new Set<string>();

  for (const { root } of assetRoots) {
    for (const file of getAllFiles(root).filter(isTiledAsset)) {
      const relativePath = toPosix(path.relative(root, file));
      const target = path.join(outputDir, publicBasePath, relativePath);
      if (copied.has(target)) {
        warn(`Tiled asset collision while copying ${relativePath}`);
      }
      copied.add(target);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(file, target);
    }
  }
}

function serveTiledAssets(server: ViteDevServer, assetRoots: TiledAssetRoot[], basePath = "map") {
  const publicBasePath = `/${normalizePublicBasePath(basePath)}`;
  server.middlewares.use((req, res, next) => {
    if (!req.url?.startsWith(publicBasePath)) return next();

    const requestPath = decodeURIComponent(stripQuery(req.url).slice(publicBasePath.length).replace(/^\/+/, ""));
    for (const { root } of assetRoots) {
      const file = path.resolve(root, requestPath);
      if (!file.startsWith(root + path.sep) && file !== root) continue;
      if (!fs.existsSync(file) || !fs.statSync(file).isFile() || !isTiledAsset(file)) continue;

      res.setHeader("Content-Type", getMimeType(file));
      res.setHeader("Cache-Control", "no-cache");
      res.end(fs.readFileSync(file));
      return;
    }

    res.statusCode = 404;
    res.end("Not Found");
  });
}

export function loadServerModuleFiles(modulePath: string, options: ClientBuildConfigOptions & { modulesCreated?: string[] }, config: Config, projectRoot = process.cwd()) {
  const modulesCreated = options.modulesCreated ?? [];
  if (!modulesCreated.includes(modulePath)) modulesCreated.push(modulePath);

  const importPlayer = importString(modulePath, "player", "player", projectRoot);
  const importEngine = importString(modulePath, "server", "server", projectRoot);
  const mapStandaloneFilesString = searchFolderAndTransformToImportString("maps", modulePath, ".ts", undefined, undefined, projectRoot);
  const mapFilesString = createTiledMapEntries(modulePath, options, projectRoot);
  const worldFilesString = createWorldMapEntries(modulePath, projectRoot);
  const eventsFilesString = searchFolderAndTransformToImportString("events", modulePath, ".ts", undefined, undefined, projectRoot);
  const databaseFilesString = searchFolderAndTransformToImportString("database", modulePath, ".ts", undefined, undefined, projectRoot);
  const hasMaps = !!mapFilesString && !!mapStandaloneFilesString.variablesString;
  const hitbox = config.start?.hitbox;

  const startHook = modulesCreated.length === 1 && (config.start?.graphic || hitbox || config.startMap)
    ? dedent`
      const __rpgjsV4Player = player || {}
      const __rpgjsV4LastConnected = __rpgjsV4Player.onConnected
      __rpgjsV4Player.onConnected = async (player) => {
        if (__rpgjsV4LastConnected) await __rpgjsV4LastConnected(player)
        ${config.start?.graphic ? `player.setGraphic('${config.start.graphic}')` : ""}
        ${hitbox ? `player.setHitbox(${hitbox[0]}, ${hitbox[1]})` : ""}
        ${config.startMap ? `await player.changeMap('${config.startMap}')` : ""}
      }
    `
    : "";

  return dedent`
    ${importPlayer || "const player = {}"}
    ${importEngine}
    ${mapStandaloneFilesString.importString}
    ${eventsFilesString.importString}
    ${databaseFilesString.importString}

    ${startHook}

    export default {
      player: ${startHook ? "__rpgjsV4Player" : "player"},
      ${importEngine ? "engine: server," : ""}
      events: ${verifyDefaultExport(eventsFilesString)},
      database: ${normalizeDatabase(databaseFilesString.variablesString)},
      maps: [${mapFilesString}${hasMaps ? "," : ""}${mapStandaloneFilesString.variablesString}],
      worldMaps: [${worldFilesString}]
    }
  `;
}

export function loadServerFiles(modulePath: string, options: ClientBuildConfigOptions & { modulesCreated?: string[] }, config: Config, projectRoot = process.cwd()) {
  const moduleCode = loadServerModuleFiles(modulePath, options, config, projectRoot);

  return dedent`
    import { createServer, provideServerModules } from '@rpgjs/server'
    import { provideTiledMap } from '@rpgjs/tiledmap/server'
    ${moduleCode.replace("export default", "const module =")}

    export default createServer({
      providers: [
        provideServerModules([module]),
        provideTiledMap()
      ]
    })
  `;
}

function createServerEntryLoad() {
  return dedent`
    import { createServer, provideServerModules } from '@rpgjs/server'
    import { provideTiledMap } from '@rpgjs/tiledmap/server'
    import modules from '${MODULE_NAME}'

    export default createServer({
      providers: [
        provideServerModules(modules),
        provideTiledMap()
      ]
    })
  `;
}

export function loadSpriteSheet(directoryName: string, modulePath: string, options: ClientBuildConfigOptions, projectRoot = process.cwd(), warning = false): ImportImageObject {
  const importSprites = searchFolderAndTransformToImportString(directoryName, modulePath, ".ts", undefined, undefined, projectRoot);
  let propImagesString = "";

  if (importSprites.importString) {
    const images = getAllFiles(importSprites.folder).filter((file) => {
      return [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg"].some((ext) => file.toLowerCase().endsWith(ext));
    });

    if (!images.length) {
      warn(`No spritesheet image found in ${directoryName}`);
    } else {
      const objectString = images
        .map((file) => {
          const filename = path.basename(file);
          const basename = filename.replace(path.extname(filename), "");
          if (options.serveMode === false) {
            const outputDir = options.config?.compilerOptions?.build?.outputDir ?? "dist";
            const dest = path.join(projectRoot, outputDir, assetsFolder(options.type === "rpg" ? "" : "client"), filename);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.copyFileSync(file, dest);
          }
          return `"${basename}": "${toPosix(path.relative(importSprites.folder, file))}"`;
        })
        .join(",\n");

      const dimensions = sizeOf(fs.readFileSync(images.at(-1)!)) as { width?: number; height?: number };
      propImagesString = dedent`
        ;[${importSprites.variablesString}].forEach((spritesheet) => {
          spritesheet.images = { ${objectString} }
          spritesheet.prototype ||= {}
          spritesheet.prototype.width = ${dimensions.width ?? 0}
          spritesheet.prototype.height = ${dimensions.height ?? 0}
        })
      `;
    }
  } else if (warning) {
    warn(`No spritesheet folder found in ${directoryName}`);
  }

  return {
    ...importSprites,
    propImagesString,
  };
}

export function loadClientFiles(modulePath: string, options: ClientBuildConfigOptions, config: Config, projectRoot = process.cwd()) {
  const importSpriteString = importString(modulePath, "sprite", "sprite", projectRoot);
  const importSceneMapString = importString(modulePath, "scene-map", "sceneMap", projectRoot);
  const importEngine = importString(modulePath, "client", "engine", projectRoot);
  const guiFilesString = searchFolderAndTransformToImportString("gui", modulePath, [".vue", ".tsx", ".jsx", ".ce"], undefined, undefined, projectRoot);
  const soundStandaloneFilesString = searchFolderAndTransformToImportString("sounds", modulePath, ".ts", undefined, undefined, projectRoot);
  const soundFilesString = searchFolderAndTransformToImportString(
    "sounds",
    modulePath,
    [".mp3", ".ogg"],
    undefined,
    {
      customFilter: (file) => !fs.existsSync(file.replace(/\.(mp3|ogg)$/, ".ts")),
    },
    projectRoot,
  );

  const spritesheets: ImportImageObject[] = [];
  for (const directory of config.spritesheetDirectories ?? []) {
    spritesheets.push(loadSpriteSheet(directory, modulePath, options, projectRoot));
  }
  if (!(config.spritesheetDirectories ?? []).includes("characters")) {
    spritesheets.push(loadSpriteSheet("characters", modulePath, options, projectRoot));
  }

  const spritesheetRoot = path.resolve(projectRoot, transformPathIfModule(modulePath), "spritesheets");
  if (fs.existsSync(spritesheetRoot)) {
    for (const dirent of fs.readdirSync(spritesheetRoot, { withFileTypes: true })) {
      if (dirent.isDirectory()) {
        spritesheets.push(loadSpriteSheet(path.join("spritesheets", dirent.name), modulePath, options, projectRoot, true));
      }
    }
  }

  const activeSpritesheets = spritesheets.filter((spritesheet) => spritesheet.importString);
  const hasSounds = !!soundFilesString.variablesString && !!soundStandaloneFilesString.variablesString;

  return dedent`
    ${importSpriteString || "const sprite = {}"}
    ${importSceneMapString}
    ${importEngine}
    ${activeSpritesheets.map((spritesheet) => spritesheet.importString).join("\n")}
    ${guiFilesString.importString}
    ${soundFilesString.importString}
    ${soundStandaloneFilesString.importString}

    ${activeSpritesheets.map((spritesheet) => spritesheet.propImagesString).join("\n")}

    export default {
      spritesheets: [${activeSpritesheets.map((spritesheet) => spritesheet.variablesString).join(",")}],
      sprite,
      ${importEngine ? "engine," : ""}
      sceneMap: ${importSceneMapString ? "sceneMap" : "{}"},
      gui: [${guiFilesString.variablesString}],
      sounds: [${soundFilesString.variablesString}${hasSounds ? "," : ""}${soundStandaloneFilesString.variablesString}]
    }
  `;
}

export function createModuleLoad(id: string, variableName: string, modulePath: string, options: ClientBuildConfigOptions & { modulesCreated?: string[] }, config: Config, projectRoot = process.cwd()) {
  if (modulePath === LEGACY_MOBILE_GUI) {
    return dedent`
      import { withMobile } from '@rpgjs/client'
      export default { client: withMobile(), server: {} }
    `;
  }
  if (modulePath === LEGACY_DEFAULT_GUI || modulePath === LEGACY_GAMEPAD) {
    return "export default { client: {}, server: {} }";
  }

  const clientFile = `virtual:${variableName}-client`;
  const serverFile = `virtual:${variableName}-server`;

  if (id.startsWith(`${serverFile}?server`)) {
    return loadServerModuleFiles(modulePath, options, config, projectRoot);
  }
  if (id.startsWith(`${clientFile}?client`)) {
    return loadClientFiles(modulePath, options, config, projectRoot);
  }

  const modulePathId = path.resolve(projectRoot, transformPathIfModule(modulePath));
  const packageJson = path.join(modulePathId, "package.json");
  const indexFile = path.join(modulePathId, "index.ts");

  if (fs.existsSync(packageJson)) {
    const { main: entryPoint } = JSON.parse(fs.readFileSync(packageJson, "utf8"));
    if (entryPoint) {
      const entryFile = path.join(modulePathId, entryPoint);
      return dedent`
        import mod from '${modulePath.startsWith(".") ? importPathForFile(entryFile, projectRoot) : resolveModuleImport(toPosix(path.join(modulePath, entryPoint)))}'
        export default mod
      `;
    }
  } else if (fs.existsSync(indexFile)) {
    return dedent`
      import mod from '${importPathForFile(indexFile, projectRoot)}'
      export default mod
    `;
  }

  return dedent`
    import client from 'client!${clientFile}'
    import server from 'server!${serverFile}'
    export default { client, server }
  `;
}

export function createModulesLoad(modules: string[]) {
  const modulesToImport = modules.reduce((acc: Record<string, string>, module) => {
    const resolvedModule = LEGACY_MODULES[module] ?? module;
    acc[formatVariableName(resolvedModule)] = resolvedModule;
    return acc;
  }, {});

  return dedent`
    ${Object.entries(modulesToImport).map(([variableName, module]) => `import ${variableName} from '${resolveModuleImport(module)}'`).join("\n")}
    export default [${Object.keys(modulesToImport).join(",")}]
  `;
}

export function createClientConfigLoad(config: Config, options: Pick<ClientBuildConfigOptions, "tiledMapBasePath"> = {}) {
  return dedent`
    import { provideClientGlobalConfig, provideClientModules } from '@rpgjs/client'
    import { provideTiledMap } from '@rpgjs/tiledmap/client'
    import modules from '${MODULE_NAME}'
    export default {
      providers: [
        provideTiledMap({ basePath: '${normalizePublicBasePath(options.tiledMapBasePath)}' }),
        provideClientGlobalConfig(${JSON.stringify(config)}),
        provideClientModules(modules)
      ]
    }
  `;
}

function createStandaloneEntryLoad() {
  return dedent`
    import { mergeConfig } from '@signe/di'
    import { provideRpg, startGame } from '@rpgjs/client'
    import server from '${SERVER_ENTRY}'
    import configClient from '${CLIENT_CONFIG}'

    startGame(mergeConfig(configClient, {
      providers: [provideRpg(server)]
    }))
  `;
}

function createClientEntryLoad() {
  return dedent`
    import { mergeConfig } from '@signe/di'
    import { provideMmorpg, startGame } from '@rpgjs/client'
    import configClient from '${CLIENT_CONFIG}'

    startGame(mergeConfig(configClient, {
      providers: [provideMmorpg({})]
    }))
  `;
}

function normalizeModules(config: Config) {
  return config.modules?.length ? config.modules : ["./src/modules/main"];
}

function normalizeAliases(aliases: Record<string, string> = {}) {
  return Object.fromEntries(
    Object.entries(aliases).map(([key, value]) => [
      key,
      value.startsWith(".") ? path.resolve(process.cwd(), value) : value,
    ]),
  );
}

export default function compatibilityV4Plugin(options: Partial<ClientBuildConfigOptions> = {}): Plugin[] {
  let viteMode = "development";
  let config = loadConfigFileSync(viteMode);
  let modules = normalizeModules(config);
  let modulesCreated: string[] = [];
  let viteRoot = process.cwd();
  let viteOutputDir = path.resolve(viteRoot, config.compilerOptions?.build?.outputDir ?? "dist");
  let resolvedOptions: ClientBuildConfigOptions = {
    type: options.type ?? config.type ?? (process.env.RPG_TYPE as "rpg" | "mmorpg") ?? "rpg",
    tiledMapBasePath: normalizePublicBasePath(options.tiledMapBasePath),
    serveMode: true,
    side: options.side ?? "client",
    ...options,
    config,
  };
  let wsServer: RpgWebSocketServer | null = null;
  const flagOptions = {
    side: resolvedOptions.side,
    mode: viteMode,
    type: resolvedOptions.type,
  };

  const virtualPlugin: Plugin = {
    name: "rpgjs-v4-compatibility",
    enforce: "pre",
    config() {
      return {
        resolve: {
          alias: {
            "@": path.resolve(process.cwd(), "src"),
            ...normalizeAliases(config.compilerOptions?.alias),
          },
          extensions: [".ts", ".js", ".jsx", ".json", ".vue", ".css", ".scss", ".sass", ".html", ".tmx", ".tsx", ".toml", ".ce"],
        },
        assetsInclude: ["**/*.tmx", "**/*.world", "{!(gui)/**/*}.tsx"],
      };
    },
    configResolved(viteConfig) {
      viteMode = viteConfig.mode || "development";
      viteRoot = viteConfig.root;
      viteOutputDir = path.resolve(viteRoot, viteConfig.build.outDir || "dist");
      config = loadConfigFileSync(viteMode, viteConfig.root);
      modules = normalizeModules(config);
      modulesCreated = [];
      resolvedOptions = {
        ...resolvedOptions,
        type: options.type ?? config.type ?? (process.env.RPG_TYPE as "rpg" | "mmorpg") ?? "rpg",
        serveMode: viteConfig.command === "serve",
        mode: viteMode,
        config,
      };
      flagOptions.side = resolvedOptions.side;
      flagOptions.mode = viteMode;
      flagOptions.type = resolvedOptions.type;
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const entry = resolvedOptions.type === "mmorpg" ? CLIENT_ENTRY : STANDALONE_ENTRY;
        const script = `<script type="module">\nimport '${entry}'\n</script>`;
        if (html.includes('<script type="module"')) {
          return html.replace(/<script\s+type="module"\s+src="[^"]*"[^>]*><\/script>/gi, script);
        }
        return html.replace(/<\/head>/i, `  ${script}\n  </head>`);
      },
    },
    handleHotUpdate() {
      modulesCreated = [];
    },
    resolveId(source) {
      if ([MODULE_NAME, CLIENT_CONFIG, SERVER_ENTRY, CLIENT_ENTRY, STANDALONE_ENTRY, ...Object.values(LEGACY_MODULES)].includes(source)) {
        return source;
      }

      for (const module of modules) {
        const moduleName = resolveModuleImport(module);
        const variableName = formatVariableName(moduleName);
        if (source === moduleName || source === `virtual:${variableName}-client` || source === `virtual:${variableName}-server`) {
          return source;
        }
      }

      return null;
    },
    load(id) {
      if (id === MODULE_NAME) return createModulesLoad(modules);
      if (id === CLIENT_CONFIG) return createClientConfigLoad(config, resolvedOptions);
      if (id === SERVER_ENTRY) return createServerEntryLoad();
      if (id === CLIENT_ENTRY) return createClientEntryLoad();
      if (id === STANDALONE_ENTRY) return createStandaloneEntryLoad();
      if (Object.values(LEGACY_MODULES).includes(id)) {
        return createModuleLoad(id, formatVariableName(id), id, { ...resolvedOptions, modulesCreated }, config);
      }

      for (const module of modules) {
        const moduleName = resolveModuleImport(module);
        const variableName = formatVariableName(moduleName);
        if (id === moduleName || id.startsWith(`virtual:${variableName}-client?client`) || id.startsWith(`virtual:${variableName}-server?server`)) {
          return createModuleLoad(id, variableName, module, { ...resolvedOptions, modulesCreated }, config);
        }
      }

      return null;
    },
    async configureServer(server: ViteDevServer) {
      serveTiledAssets(server, getAllTiledAssetRoots(modules, server.config.root), resolvedOptions.tiledMapBasePath);

      if (resolvedOptions.type !== "mmorpg") return;

      const { default: serverModule } = await server.ssrLoadModule(SERVER_ENTRY);
      const transport = createRpgServerTransport(serverModule);
      const WebSocketServerClass = await importWebSocketServer();
      if (WebSocketServerClass) {
        wsServer = new WebSocketServerClass({ noServer: true });
      }

      logNetworkSimulationStatus();
      server.middlewares.use("/parties", async (req, res, next) => {
        await transport.handleNodeRequest(req, res, next, {
          mountedPath: "/parties",
        });
      });

      if (wsServer) {
        server.httpServer?.on("upgrade", (request, socket, head) => {
          void transport.handleUpgrade(wsServer!, request, socket, head);
        });
      }
    },
    buildEnd() {
      wsServer?.close();
    },
    generateBundle() {
      copyTiledAssets(getAllTiledAssetRoots(modules, viteRoot), viteOutputDir, resolvedOptions.tiledMapBasePath);
    },
  };

  return [
    flagTransform(flagOptions),
    vitePluginRequire(),
    virtualPlugin,
  ];
}
