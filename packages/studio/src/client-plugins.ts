import type { StudioPlugin } from "./data-provider/types";

/** What the loader needs of `RpgGui`. */
export interface StudioGuiHost {
  add(gui: { name: string; component: unknown; autoDisplay?: boolean }): unknown;
}

/** What a plugin module is given: the runtime of the game, so a plugin never brings its own copy of CanvasEngine. */
export interface StudioPluginHost {
  canvasengine?: unknown;
  [key: string]: unknown;
}

export interface StudioPluginGuiReport {
  loaded: string[];
  failed: string[];
}

type ModuleLoader = (code: string) => Promise<{ default: (host: StudioPluginHost) => unknown }>;

/** The id of the GUI a client file registers: the plugin id prefixes it, the path of the file gives the rest (`quests_panel`). */
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

const loadedVersions = new WeakMap<object, Map<string, number>>();

/**
 * Registers the client files of the plugins as GUIs of the game: each module is `(host) => component` (what Studio compiles
 * a `.ce` into), the GUI is named `<pluginId>_<file>` and shows itself. A file that fails is reported and does not stop the
 * others. A GUI already registered for the same plugin version is left alone.
 */
export const loadStudioPluginGuis = async ({ gui, host, plugins, importModule = importFromBlob }: {
  gui: StudioGuiHost;
  host: StudioPluginHost;
  plugins: readonly StudioPlugin[];
  importModule?: ModuleLoader;
}): Promise<StudioPluginGuiReport> => {
  const known = loadedVersions.get(gui) ?? new Map<string, number>();
  loadedVersions.set(gui, known);
  const report: StudioPluginGuiReport = { loaded: [], failed: [] };
  for (const plugin of plugins) {
    for (const file of plugin.client ?? []) {
      const name = studioPluginGuiId(plugin.pluginId, file.name);
      if (known.get(name) === plugin.version) continue;
      try {
        const module = await importModule(file.code);
        gui.add({ name, component: module.default(host), autoDisplay: true });
        known.set(name, plugin.version);
        report.loaded.push(name);
      } catch (error) {
        console.error(`[StudioGame] plugin "${plugin.pluginId}": client file "${file.name}" was not loaded`, error);
        report.failed.push(name);
      }
    }
  }
  return report;
};
