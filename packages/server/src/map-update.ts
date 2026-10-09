export type MapUpdateHeadersInit =
  | HeadersInit
  | Record<string, string | string[] | undefined>
  | Map<string, string | undefined>;

export const MAP_UPDATE_TOKEN_HEADER = "x-rpgjs-map-update-token";
export const MAP_UPDATE_TOKEN_ENV = "RPGJS_MAP_UPDATE_TOKEN";

export function resolveMapUpdateToken(explicitToken?: string): string {
  const processToken = (globalThis as {
    process?: { env?: Record<string, string | undefined> };
  }).process?.env?.[MAP_UPDATE_TOKEN_ENV];
  return explicitToken ?? processToken ?? "";
}

function normalizeMapUpdateHeaders(init?: MapUpdateHeadersInit): HeadersInit | undefined {
  if (!init) return undefined;
  if (init instanceof Headers || Array.isArray(init)) return init;
  if (init instanceof Map) {
    return Array.from(init.entries()).filter((entry): entry is [string, string] => entry[1] !== undefined);
  }
  return Object.entries(init).flatMap(([key, value]) => {
    if (value === undefined) return [];
    return Array.isArray(value)
      ? value.map((item): [string, string] => [key, item])
      : [[key, value] as [string, string]];
  });
}

export function createMapUpdateHeaders(
  token?: string,
  init?: MapUpdateHeadersInit,
): Headers {
  const headers = new Headers(normalizeMapUpdateHeaders(init));
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const resolvedToken = resolveMapUpdateToken(token);
  if (resolvedToken) {
    headers.set(MAP_UPDATE_TOKEN_HEADER, resolvedToken);
  }
  return headers;
}

export function readMapUpdateToken(headers: Headers): string {
  const directToken = headers.get(MAP_UPDATE_TOKEN_HEADER);
  if (directToken) return directToken;
  const authorization = headers.get("authorization");
  if (!authorization) return "";
  const [scheme, value] = authorization.split(/\s+/, 2);
  return scheme?.toLowerCase() === "bearer" && value ? value.trim() : "";
}

export function isMapUpdateAuthorized(headers: Headers, expectedToken?: string): boolean {
  const requiredToken = resolveMapUpdateToken(expectedToken);
  return !requiredToken || readMapUpdateToken(headers) === requiredToken;
}
