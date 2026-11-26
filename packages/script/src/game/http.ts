/**
 * `$http`: requests of the scripts to outside services, through the connections the host declares.
 *
 * The package never does networking. The host gives a transport (`HttpTransport` on the server, fake answers in a simulation) and owns
 * every network rule: the base URL of each connection, its secrets and headers, the hosts it refuses, redirects, quotas, logs. This
 * module checks what a script asks before the transport sees it, bounds how many requests a handler makes and how long it waits, and
 * turns what comes back into script data.
 *
 * Without connections there is no `$http`: it is not described, and a script that uses it is refused when it is compiled.
 */
import type { ApiDescription, ApiImpl, HandleDesc, HandleImpl } from "../core/api";
import type { ScriptWorld } from "./impl";

/** The methods a connection may allow. */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export const HTTP_METHODS: readonly HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

/** A connection the host declares: its name is all a script knows of it. */
export interface HttpConnectionOptions {
  /** The methods scripts may use with it. `["GET"]` when not given. */
  methods?: HttpMethod[];
}

/** A request of a script, checked: what the transport receives. The host resolves `connection` to its base URL and secrets. */
export interface HttpRequest {
  connection: string;
  method: HttpMethod;
  /** Starts with `/`, without `//`, `..`, `?` or `#`: it is appended to the base URL of the connection. */
  path: string;
  /** A flat object of texts, numbers and true/false. */
  query?: Record<string, string | number | boolean>;
  /** Plain data, to send as JSON. */
  body?: unknown;
}

/** The codes of an answer that failed. A transport may give `refused`, `quota`, `timeout` or `network`; any other becomes `network`. */
export type HttpErrorCode = "network" | "timeout" | "refused" | "quota" | "too_large" | "budget";
const HOST_ERRORS = new Set<HttpErrorCode>(["network", "timeout", "refused", "quota"]);

/** What a transport answers: the status and the body as text, or an error code of its own (`{ error: "quota" }`). */
export type HttpHostAnswer = { status: number; body?: string; contentType?: string } | { status?: number; error: string };

/** What a script gets: data, never the headers or the URL. `ok` is a status in 200–299. */
export interface HttpAnswer { ok: boolean; status: number; json?: unknown; text?: string; error?: HttpErrorCode }

/**
 * The network of a world, as `$http` uses it: the connections, the budget, and how to send a checked request. The game builds one per
 * listener run over the transport of the host; a simulation over fake answers.
 */
export interface HttpPort {
  connections: Record<string, HttpConnectionOptions>;
  /**
   * Sends a checked request. It gives `{ error: "timeout" }` (and aborts the request) once `timeout` seconds have passed, and need not
   * read the body beyond `maxBytes` characters. The port owns the clock: this module uses no API of the host.
   */
  send(request: HttpRequest, options: { timeout: number; maxBytes: number }): Promise<HttpHostAnswer>;
  /** The signal the world runs for: a request is refused during the signals of `HTTP_NOT_IN`. */
  signal?: string;
  limits?: HttpLimits;
}

/** The budget of `$http`, part of the `limits` of a service or a simulation. */
export interface HttpLimits {
  /** Requests a handler run may make. 3 by default. */
  httpPerHandler?: number;
  /** Characters of an answer (and of the JSON of a body) at most. 256 000 by default. */
  httpBodyMax?: number;
  /** Seconds a request is waited for, 60 at most. 10 by default. */
  httpTimeout?: number;
}
export const HTTP_DEFAULTS = { httpPerHandler: 3, httpBodyMax: 256_000, httpTimeout: 10 } as const;
const MAX_TIMEOUT = 60;

/** The signals whose listeners may not wait for the network: they run for every player many times a second. */
export const HTTP_NOT_IN = ["map.tick"];
/** The kind of reference of a connection name, in the catalog given to the compiler. */
export const HTTP_CONNECTION_REF = "http connection";

const ERROR_TYPE = '"network" | "timeout" | "refused" | "quota" | "too_large" | "budget"';

/**
 * The description of `$http` for the given connections, to add to the API of a game.
 *
 * @param connections - The names the host declares, with their methods.
 * @returns The handle `$http`.
 */
export function httpHandle(connections: Record<string, HttpConnectionOptions>): HandleDesc {
  const names = Object.entries(connections).map(([name, c]) => `${name} (${(c.methods ?? ["GET"]).join(", ")})`).join(", ");
  return {
    doc: `Requests to outside services, through the connections of the game: ${names}. A script names a connection, never a URL: the game keeps its address and secrets.`,
    methods: {
      request: {
        sig: `(connection: string, options?: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; path?: string; query?: Record<string, string | number | boolean>; body?: any }): { ok: boolean; status: number; json?: any; text?: string; error?: ${ERROR_TYPE} }`,
        doc: `Sends a request through a connection and waits for its answer: $http.request("meteo_api", { path: "/v1/forecast", query: { city: "Paris" } }). path starts with / (no //, .., ? or #: the query goes in query); method is GET unless the connection allows another; body is plain data sent as JSON. The answer is data: ok (status 200–299), status, json (a JSON answer) or text. It never throws for the network: error is "network", "timeout", "refused", "quota", "too_large" (an answer above the limit) or "budget" (a handler makes ${HTTP_DEFAULTS.httpPerHandler} requests at most). Not in a listener of map.tick.`,
        ref: HTTP_CONNECTION_REF,
        notIn: HTTP_NOT_IN,
      },
    },
  };
}

/**
 * The API of a game with `$http` for the given connections, and the catalog that lets the compiler check a literal connection name.
 * Without connections, the API is given back as it is.
 */
export function withHttpDescription(desc: ApiDescription, connections?: Record<string, HttpConnectionOptions>): ApiDescription {
  if (!connections || Object.keys(connections).length === 0) return desc;
  return { ...desc, handles: { ...desc.handles, $http: httpHandle(connections) } };
}

/** The catalog of the connections, to merge into the one given to `apiInfo`. */
export const httpCatalog = (connections?: Record<string, HttpConnectionOptions>): Record<string, string[]> =>
  connections && Object.keys(connections).length > 0 ? { [HTTP_CONNECTION_REF]: Object.keys(connections) } : {};

/** The implementation of the game with `$http`. */
export const withHttpImpl = (impl: ApiImpl<ScriptWorld>): ApiImpl<ScriptWorld> => ({ ...impl, handles: { ...impl.handles, $http: HTTP_IMPL } });

// ---------------------------------------------------------------------------------------------------------------- checks

function refuse(message: string): never { throw new Error(`$http.request: ${message}`); }
const isPlainObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const PATH = /^\/[A-Za-z0-9\-._~!$&'()*+,;=:@%/]*$/;

function checkedPath(value: unknown): string {
  const path = value === undefined ? "/" : value;
  if (typeof path !== "string" || path.length > 2000 || !PATH.test(path) || path.includes("//") || path.split("/").some((part) => part === "..")) {
    refuse(`the path ${JSON.stringify(path)} must start with / and hold no //, .., ? or #: the query goes in query`);
  }
  return path as string;
}

function checkedQuery(value: unknown): HttpRequest["query"] {
  if (value === undefined) return undefined;
  const flat = isPlainObject(value) && Object.keys(value).length <= 50 && Object.values(value).every((v) =>
    (typeof v === "string" && v.length <= 2000) || (typeof v === "number" && Number.isFinite(v)) || typeof v === "boolean");
  if (!flat) refuse("query must be a flat object of texts, numbers and true/false (50 keys at most)");
  return { ...(value as Record<string, string | number | boolean>) };
}

/** Plain data within a depth and a size: what a body may be, and what a JSON answer is turned into. */
function fits(value: unknown, depth = 0): boolean {
  if (depth > 20) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 1000 && value.every((v) => fits(v, depth + 1));
  if (isPlainObject(value)) return Object.keys(value).length <= 1000 && Object.values(value).every((v) => fits(v, depth + 1));
  return false;
}

function checkedBody(value: unknown, max: number): unknown {
  if (value === undefined) return undefined;
  if (!fits(value) || JSON.stringify(value).length > max) refuse(`body must be plain data of ${max} characters at most as JSON`);
  return JSON.parse(JSON.stringify(value));
}

/** The answer of the transport, as a script reads it. */
function answerOf(answer: HttpHostAnswer, max: number): HttpAnswer {
  if (!answer || typeof answer !== "object") return { ok: false, status: 0, error: "network" };
  if ("error" in answer && answer.error !== undefined) {
    const code = HOST_ERRORS.has(answer.error as HttpErrorCode) ? (answer.error as HttpErrorCode) : "network";
    return { ok: false, status: Number.isInteger(answer.status) ? Number(answer.status) : 0, error: code };
  }
  const { status, body = "", contentType = "" } = answer as { status: number; body?: string; contentType?: string };
  if (!Number.isInteger(status) || status < 100 || status > 599 || typeof body !== "string") return { ok: false, status: 0, error: "network" };
  const ok = status >= 200 && status < 300;
  if (body.length > max) return { ok: false, status, error: "too_large" };
  if (/\bjson\b/i.test(contentType)) {
    let json: unknown;
    try { json = JSON.parse(body); } catch { return { ok: false, status, error: "network" }; }
    if (!fits(json)) return { ok: false, status, error: "too_large" };
    return { ok, status, json };
  }
  return { ok, status, text: body };
}

// ---------------------------------------------------------------------------------------------------------------- run

/** The requests each handler run made: a world is built for each run of a listener. */
const made = new WeakMap<object, number>();

/**
 * Checks a request of a script and sends it through the port of its world. Throws for a mistake of the script (an unknown connection,
 * a path that leaves the connection, a method it does not allow); gives `{ ok: false, error }` for the budget and the network.
 */
export async function httpRequest(world: ScriptWorld, connectionName: unknown, options: unknown): Promise<HttpAnswer> {
  const port = world.http;
  if (!port) refuse("this game gives scripts no connections");
  if (port.signal && HTTP_NOT_IN.includes(port.signal)) refuse(`it cannot be called during ${port.signal}: it waits, and ${port.signal} runs for every player many times a second`);
  const connection = String(connectionName);
  const declared = Object.prototype.hasOwnProperty.call(port.connections, connection) ? port.connections[connection] : undefined;
  if (!declared) refuse(`unknown http connection ${JSON.stringify(connection)}. Available: ${Object.keys(port.connections).join(", ") || "none"}`);
  if (options !== undefined && !isPlainObject(options)) refuse("options must be an object: { method, path, query, body }");
  const o = (options ?? {}) as Record<string, unknown>;
  const method = o.method === undefined ? "GET" : o.method;
  if (!HTTP_METHODS.includes(method as HttpMethod)) refuse(`unknown method ${JSON.stringify(method)} (${HTTP_METHODS.join(", ")})`);
  const allowed = declared.methods ?? ["GET"];
  if (!allowed.includes(method as HttpMethod)) refuse(`${JSON.stringify(connection)} does not allow ${method as string} (allowed: ${allowed.join(", ")})`);

  const limits = { ...HTTP_DEFAULTS, ...port.limits };
  const request: HttpRequest = { connection, method: method as HttpMethod, path: checkedPath(o.path) };
  const query = checkedQuery(o.query);
  if (query) request.query = query;
  const body = checkedBody(o.body, limits.httpBodyMax);
  if (body !== undefined) request.body = body;

  const count = made.get(world) ?? 0;
  if (count >= limits.httpPerHandler) return { ok: false, status: 0, error: "budget" };
  made.set(world, count + 1);

  const timeout = Math.min(Math.max(Number(limits.httpTimeout) || 0, 0), MAX_TIMEOUT);
  try {
    return answerOf(await port.send(request, { timeout, maxBytes: limits.httpBodyMax }), limits.httpBodyMax);
  } catch {
    return { ok: false, status: 0, error: "network" };
  }
}

/** What `$http` does, over a world. */
export const HTTP_IMPL: HandleImpl<ScriptWorld> = {
  methods: {
    request: (w, [connection, options]) => httpRequest(w, connection, options),
  },
};
