/**
 * The maps the game is running, so that the editor can pause them. In a standalone game the server and the client
 * share the page: the server side registers its maps here, the editor asks for the pause.
 */
interface PausableMap {
  setAutoTick(enabled: boolean): void;
}

const maps = new Set<PausableMap>();
let paused = false;

export function registerStudioEditorMap(map: PausableMap): void {
  maps.add(map);
  // A map that opens while the game is paused stays paused.
  if (paused) map.setAutoTick(false);
}

export function unregisterStudioEditorMap(map: PausableMap): void {
  maps.delete(map);
}

/** Stops (or resumes) the loop of every map: inputs, physics, projectiles. */
export function setStudioMapsPaused(next: boolean): void {
  paused = next;
  for (const map of maps) map.setAutoTick(!next);
}
