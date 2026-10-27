import type { StudioPlugin, StudioPluginClientFile } from "./data-provider/types";

/** What the loader gives a client file: the runtime of the game (`canvasengine`, `rpgjs`…), and `require` for the files of its plugin. */
export interface StudioPluginHost {
  [key: string]: unknown;
}

/** A client module as the loader makes it: the module of RPGJS the plugin wrote (`index.js`), plus the GUIs of its `.ce` files. */
export interface StudioPluginClientModule {
  gui?: Array<{ name?: string; id?: string; component: unknown }>;
  [hook: string]: unknown;
}

export interface StudioPluginLoadReport {
  loaded: string[];
  failed: string[];
}

type Exports = Record<string, unknown>;
type ModuleLoader = (code: string) => Promise<{ default: (host: StudioPluginHost) => Exports }>;

/** The id of the GUI a `.ce` file registers: the plugin id prefixes it, the path of the file gives the rest (`quests_panel`). */
export const studioPluginGuiId = (pluginId: string, fileName: string): string =>
  `${pluginId}_${fileName.replace(/\.[^./]+$/, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`;

/** A module is text: the browser imports it through a `blob:` URL, so no bundler and no server round trip is involved. */
const importFromBlob: ModuleLoader = async (code) => {
  const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  try {
    return await import(/* @vite-ignore */ url);
  } finally {
    URL.revokeObjectURL(url);
  }
};

/** The entry of a plugin: the file whose default export is its module of RPGJS. */
const ENTRY = "index.js";

/**
 * Builds the client modules of the plugins: each plugin gives one module of RPGJS (for `provideClientModules`), made of the default
 * export of its `index.js` (what `defineModule` gives) and of one GUI per `.ce` file, named `<pluginId>_<file>`.
 *
 * Every file of a plugin is `(host) => exports` (what Studio compiles it into). It is built when a file asks for it with
 * `host.require(path)` (or for the entry and the components), once, and a file can only require the files of its own plugin.
 * A plugin that fails (a file that throws, files that import each other in a circle) is reported and left out; the others load.
 */
export const buildStudioPluginClientModules = async ({ plugins, host, importModule = importFromBlob }: {
  plugins: readonly StudioPlugin[];
  host: StudioPluginHost;
  importModule?: ModuleLoader;
}): Promise<{ modules: StudioPluginClientModule[]; report: StudioPluginLoadReport }> => {
  const modules: StudioPluginClientModule[] = [];
  const report: StudioPluginLoadReport = { loaded: [], failed: [] };

  for (const plugin of plugins) {
    const files: StudioPluginClientFile[] = plugin.client ?? [];
    if (files.length === 0) continue;
    try {
      const factories = new Map<string, (host: StudioPluginHost) => Exports>();
      for (const file of files) factories.set(file.name, (await importModule(file.code)).default);

      const built = new Map<string, Exports>();
      const building = new Set<string>();
      const require = (path: string): Exports => {
        const done = built.get(path);
        if (done) return done;
        const factory = factories.get(path);
        if (!factory) throw new Error(`"${path}" is not a file of the plugin "${plugin.pluginId}"`);
        if (building.has(path)) throw new Error(`"${path}" imports itself through other files of the plugin "${plugin.pluginId}"`);
        building.add(path);
        try {
          const exports = factory({ ...host, require });
          built.set(path, exports);
          return exports;
        } finally {
          building.delete(path);
        }
      };

      const entry = factories.has(ENTRY) ? (require(ENTRY).default as StudioPluginClientModule | undefined) : undefined;
      const guis = files
        .filter((file) => file.name.endsWith(".ce"))
        .map((file) => ({ name: studioPluginGuiId(plugin.pluginId, file.name), component: require(file.name).default }));
      if (!entry && guis.length === 0) continue;
      modules.push({ ...entry, gui: [...(entry?.gui ?? []), ...guis] });
      report.loaded.push(plugin.pluginId);
    } catch (error) {
      console.error(`[StudioGame] plugin "${plugin.pluginId}": its client files were not loaded`, error);
      report.failed.push(plugin.pluginId);
    }
  }
  return { modules, report };
};
