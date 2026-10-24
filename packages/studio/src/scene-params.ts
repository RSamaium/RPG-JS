/** The params the scene itself reads (the music and the ambient sound), apart from the params of the map data. */
const SCENE_PARAM_KEYS = ["backgroundMusic", "backgroundAmbientSound"] as const;

/**
 * The scene a map extension changes the params of: `params` is what the client plays the music from, `data.params` is what the
 * map is drawn from (scale, size, weather…). A key that is `undefined` is taken off.
 */
export function applySceneParams<T extends { params?: Record<string, unknown>; data?: { params?: Record<string, unknown> } }>(
  scene: T,
  patch: Readonly<Record<string, unknown>>
): T {
  const merge = (params: Record<string, unknown> | undefined, keys: readonly string[] | null): Record<string, unknown> => {
    const next = { ...(params ?? {}) };
    for (const [key, value] of Object.entries(patch)) {
      if (keys && !keys.includes(key)) continue;
      if (value === undefined) delete next[key];
      else next[key] = value;
    }
    return next;
  };
  return {
    ...scene,
    params: merge(scene.params, SCENE_PARAM_KEYS),
    ...(scene.data ? { data: { ...scene.data, params: merge(scene.data.params, null) } } : {}),
  };
}
