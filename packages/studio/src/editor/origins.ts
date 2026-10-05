/** Where the Studio that edits a game may come from (and nowhere else). */
export const STUDIO_DEV_ORIGIN = "http://localhost:4200";

const originOf = (url: unknown): string | undefined => {
  if (typeof url !== "string" || url.length === 0) return undefined;
  try {
    const parsed = new URL(url, "http://invalid.local");
    return parsed.origin === "http://invalid.local" ? undefined : parsed.origin;
  } catch {
    return undefined;
  }
};

/**
 * The game's own configuration wins (`studioEditorOrigins`). Otherwise the Studio is where the API is
 * (`apiBaseUrl`, on the same origin as the app in production), and, while developing, the local Studio.
 */
export function resolveStudioEditorOrigins(config: Record<string, unknown>, apiBaseUrl?: string, dev = false): string[] {
  const configured = config.studioEditorOrigins;
  if (Array.isArray(configured)) return configured.filter((origin): origin is string => typeof origin === "string");
  const origins = new Set<string>();
  const api = originOf(apiBaseUrl);
  if (api) origins.add(api);
  if (dev) origins.add(STUDIO_DEV_ORIGIN);
  return [...origins];
}
