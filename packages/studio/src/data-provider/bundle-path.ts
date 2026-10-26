const DEFAULT_BUNDLE_PATH = '/game-data';

/**
 * The base path or URL a bundle is read from: `/game-data`, `game-data` (given a leading slash), or the complete URL of a
 * published snapshot such as `https://studio.example/api/published/<projectId>`. A trailing slash is removed.
 */
export const normalizeBundleBasePath = (value?: string | null): string => {
  const raw = (value || '').trim() || DEFAULT_BUNDLE_PATH;
  const withRoot = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) || raw.startsWith('/') ? raw : `/${raw}`;
  return withRoot.length > 1 && withRoot.endsWith('/') ? withRoot.slice(0, -1) : withRoot;
};
