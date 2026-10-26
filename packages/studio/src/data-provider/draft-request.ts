/** Key under which a preview token is kept for the tab, so a reload of the page still reads the draft. */
export const STUDIO_PREVIEW_TOKEN_STORAGE_KEY = 'rpgjs.studio.previewToken';

/** Header the preview token is sent in; it is never put in the URL of a request. */
export const STUDIO_PREVIEW_TOKEN_HEADER = 'x-studio-preview-token';

export interface StudioDraftRequest {
  /** The page asks for the draft of the project (`?editor` or `?preview`), not for the published snapshot. */
  draft: boolean;
  /** The preview token given in the URL (`?preview=<token>` or `?editor=<token>`), when there is one. */
  token?: string;
}

/** Reads `?editor` / `?preview` (with an optional token as their value) from a query string. */
export const parseStudioDraftRequest = (search: string): StudioDraftRequest => {
  const params = new URLSearchParams(search);
  const names = ['editor', 'preview'] as const;
  const present = names.filter((name) => params.has(name));
  if (present.length === 0) return { draft: false };
  const token = present.map((name) => params.get(name)?.trim()).find((value) => value && value !== 'true' && value !== '1');
  return { draft: true, ...(token ? { token } : {}) };
};

const readStoredToken = (): string | undefined => {
  try {
    return window.sessionStorage.getItem(STUDIO_PREVIEW_TOKEN_STORAGE_KEY) || undefined;
  } catch {
    return undefined;
  }
};

/**
 * The draft request of the current page, and its preview token. A token found in the URL is kept for the tab
 * and taken off the address bar, so it is not left in the history or shared by copying the link.
 */
export const resolveStudioDraftRequestFromPage = (): StudioDraftRequest => {
  if (typeof window === 'undefined') return { draft: false };
  const request = parseStudioDraftRequest(window.location.search);
  if (!request.draft) return request;

  if (request.token) {
    try {
      window.sessionStorage.setItem(STUDIO_PREVIEW_TOKEN_STORAGE_KEY, request.token);
    } catch {
      // The token is still used for this load.
    }
    try {
      const url = new URL(window.location.href);
      for (const name of ['editor', 'preview']) {
        if (url.searchParams.has(name)) url.searchParams.set(name, '1');
      }
      window.history.replaceState(window.history.state, '', url);
    } catch {
      // Not in a browser that can rewrite the address.
    }
    return request;
  }

  const stored = readStoredToken();
  return { draft: true, ...(stored ? { token: stored } : {}) };
};
