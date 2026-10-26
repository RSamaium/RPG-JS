import type { StudioPlugin } from "./data-provider/types";

/** A script as `ScriptService.install` of `@rpgjs/script` takes it: an id, a version and the tree Studio parsed. */
export interface StudioScriptInstall {
  id: string;
  version?: number;
  tree: any;
}

/**
 * What the plugins of a project are installed in: the `ScriptService` of `@rpgjs/script` (or anything with the same
 * two methods). `install` replaces the script with the same id and says whether it was accepted.
 */
export interface StudioScriptHost {
  install(script: StudioScriptInstall): boolean | void;
  uninstall(id: string): void;
}

/** What a synchronisation did, by script id. */
export interface StudioPluginSyncReport {
  installed: string[];
  removed: string[];
  /** Scripts the host refused (it reports why itself). */
  refused: string[];
}

/** The id a script of a plugin is installed under: the plugin id prefixes it, a script name is unique in its plugin. */
export const studioPluginScriptId = (pluginId: string, scriptName: string): string => `${pluginId}/${scriptName}`;

const installedByHost = new WeakMap<StudioScriptHost, Map<string, number | undefined>>();

/**
 * Makes the scripts of a host the ones of `plugins`: installs the scripts that are new or whose plugin version changed,
 * and uninstalls the ones of a plugin that is gone, disabled or no longer has the script. A script the host refused is
 * left out and tried again at the next synchronisation. The scripts the host got from elsewhere are not touched.
 */
export const syncStudioPluginsToScripts = (host: StudioScriptHost, plugins: readonly StudioPlugin[]): StudioPluginSyncReport => {
  const installed = installedByHost.get(host) ?? new Map<string, number | undefined>();
  installedByHost.set(host, installed);
  const report: StudioPluginSyncReport = { installed: [], removed: [], refused: [] };
  const wanted = new Set<string>();

  for (const plugin of plugins) {
    for (const script of plugin.scripts ?? []) {
      const id = studioPluginScriptId(plugin.pluginId, script.name);
      wanted.add(id);
      if (installed.has(id) && installed.get(id) === plugin.version) continue;
      if (host.install({ id, version: plugin.version, tree: script.tree }) === false) {
        report.refused.push(id);
        continue;
      }
      installed.set(id, plugin.version);
      report.installed.push(id);
    }
  }

  for (const id of [...installed.keys()]) {
    if (wanted.has(id)) continue;
    host.uninstall(id);
    installed.delete(id);
    report.removed.push(id);
  }
  return report;
};
