import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";
import type { Duplex } from "node:stream";
import { injector } from "@signe/di";
import { createMemoryNodeRoomStorage, createNodeRoomTransport } from "@signe/room/node";
import { context as serverContext } from "../core/context";
import { setInject } from "../core/inject";
import { provideServerModules } from "../module";
import { createMapUpdateHeaders, createMapUpdatePayload, MAP_UPDATE_TOKEN_ENV, resolveMapUpdateToken, updateMap } from "./map";
import type {
  CreateRpgServerTransportOptions,
  HandleNodeRequestOptions,
  RpgTransportRequestLike,
  RpgTransportServer,
  RpgTransportServerConstructor,
  RpgHostedRoom,
  RpgWebSocketConnection,
  RpgWebSocketRequestLike,
  RpgWebSocketServer,
  SendMapUpdateOptions,
  PublishMapOptions,
} from "./types";

function normalizePathPrefix(path: string, fallback: string): string {
  const trimmed = (path || fallback).trim();
  if (!trimmed) {
    return fallback;
  }
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return prefixed !== "/" ? prefixed.replace(/\/+$/, "") : prefixed;
}

function hasPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function prependMountedPath(pathname: string, mountedPath?: string): string {
  if (!mountedPath) {
    return pathname;
  }
  const normalizedMountedPath = normalizePathPrefix(mountedPath, "/");
  if (hasPathPrefix(pathname, normalizedMountedPath)) {
    return pathname;
  }
  if (pathname === "/") {
    return normalizedMountedPath;
  }
  return `${normalizedMountedPath}${pathname.startsWith("/") ? pathname : `/${pathname}`}`.replace(/\/{2,}/g, "/");
}

function parseHttpRoute(pathname: string, partiesPath: string): { roomId: string; requestPath: string } | null {
  if (!hasPathPrefix(pathname, partiesPath)) {
    return null;
  }

  const remainder = pathname.slice(partiesPath.length);
  const segments = remainder.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  return {
    roomId: segments[0],
    requestPath: `/${segments.slice(1).join("/")}`,
  };
}

function parseSocketRoute(pathname: string, partiesPath: string): { roomId: string } | null {
  if (!hasPathPrefix(pathname, partiesPath)) {
    return null;
  }

  const remainder = pathname.slice(partiesPath.length);
  const segments = remainder.split("/").filter(Boolean);
  if (segments.length < 1) {
    return null;
  }

  return { roomId: segments[0] };
}

function toHeaders(input?: Headers | HeadersInit | IncomingHttpHeaders | Map<string, string | undefined>): Headers {
  if (!input) {
    return new Headers();
  }
  if (input instanceof Headers) {
    return new Headers(input);
  }
  if (Array.isArray(input)) {
    return new Headers(input);
  }
  if (input instanceof Map) {
    const headers = new Headers();
    for (const [key, value] of input) {
      if (typeof value !== "undefined") {
        headers.set(key, value);
      }
    }
    return headers;
  }

  const headers = new Headers();
  Object.entries(input).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (typeof value[0] !== "undefined") {
        headers.set(key, value[0]);
      }
      return;
    }
    if (typeof value !== "undefined") {
      headers.set(key, String(value));
    }
  });
  return headers;
}

function createRequestLike(url: string, method: string, headers: Headers, bodyText: string): RpgTransportRequestLike {
  return {
    url,
    method,
    headers,
    json: async () => {
      if (!bodyText) {
        return undefined;
      }
      return JSON.parse(bodyText);
    },
    text: async () => bodyText,
  };
}

async function normalizeEngineResponse(result: any): Promise<Response> {
  if (result instanceof Response) {
    return result;
  }
  if (typeof result === "string") {
    return new Response(result, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  return new Response(JSON.stringify(result ?? {}), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

async function sendNodeResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.end(await response.text());
}

async function readNodeBody(req: IncomingMessage): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

function resolveUrlFromSocketRequest(request: RpgWebSocketRequestLike): {
  headers: Headers;
  method?: string;
  rawUrl: string;
  url: URL;
} {
  const headers = toHeaders(request.headers);
  const host = headers.get("host") || "localhost";
  const rawUrl = request.url || "/";
  const url = new URL(rawUrl, `http://${host}`);
  return {
    headers,
    method: request.method,
    rawUrl,
    url,
  };
}

function ensureNodeSessionIdQuery(url: URL): URL {
  if (!url.searchParams.has("id")) {
    const partySocketId = url.searchParams.get("_pk");
    if (partySocketId) {
      url.searchParams.set("id", partySocketId);
    }
  }
  return url;
}

export class RpgServerTransport {
  private serverContextInitialized = false;
  private partiesPath: string;
  private readonly initializeMaps: boolean;
  private readonly mapUpdateToken: string;
  private readonly tiledBasePaths?: string[];
  private readonly rooms = new Map<string, RpgHostedRoom>();
  private readonly servers = new Map<string, RpgTransportServer>();
  private readonly transport: any;
  private lastKnownHost = "";

  constructor(private readonly serverModule: RpgTransportServerConstructor, options: CreateRpgServerTransportOptions = {}) {
    this.initializeMaps = options.initializeMaps ?? true;
    this.mapUpdateToken = resolveMapUpdateToken(options.mapUpdateToken);
    this.partiesPath = normalizePathPrefix(options.partiesPath || "/parties/main", "/parties/main");
    this.tiledBasePaths = options.tiledBasePaths;

    const owner = this;
    class RpgNodeServer extends serverModule {
      constructor(room: RpgHostedRoom) {
        super(room);
        owner.rooms.set(room.id, room);
        owner.servers.set(room.id, this as RpgTransportServer);
        console.log(`Created new server instance for room: ${room.id}`);
      }

      async onStart() {
        await owner.ensureServerContext();
        await super.onStart?.();
        const roomId = (this as any).room?.id;
        console.log(`Server started for room: ${roomId}`);

        if (owner.initializeMaps && roomId) {
          await updateMap(roomId, this as RpgTransportServer, {
            host: owner.lastKnownHost,
            mapUpdateToken: owner.mapUpdateToken,
            tiledBasePaths: owner.tiledBasePaths,
          });
        }
      }
    }

    this.transport = createNodeRoomTransport(RpgNodeServer as any, {
      partiesPath: this.partiesPath,
      env: {
        ...(options.env ?? {}),
        ...(this.mapUpdateToken ? { [MAP_UPDATE_TOKEN_ENV]: this.mapUpdateToken } : {}),
      },
      storage: options.storage ?? createMemoryNodeRoomStorage(),
    });
  }

  private async ensureServerContext(): Promise<void> {
    if (this.serverContextInitialized) {
      return;
    }

    setInject(serverContext);
    await injector(serverContext as any, [provideServerModules([])] as any);
    this.serverContextInitialized = true;
  }

  getRoom(roomId: string): RpgHostedRoom | undefined {
    return this.rooms.get(roomId);
  }

  getServer(roomId: string): RpgTransportServer | undefined {
    return this.servers.get(roomId);
  }

  private async ensureRoomAndServer(roomId: string, host?: string): Promise<{ room: RpgHostedRoom; rpgServer: RpgTransportServer }> {
    if (host) {
      this.lastKnownHost = host;
    }

    await this.transport.getRoom("main", roomId);
    const room = this.rooms.get(roomId);
    const rpgServer = this.servers.get(roomId);
    if (!room || !rpgServer) {
      throw new Error(`Unable to initialize room: ${roomId}`);
    }
    return { room, rpgServer };
  }

  private async dispatchRoomRequest(roomId: string, requestLike: RpgTransportRequestLike, host?: string): Promise<Response> {
    const { rpgServer } = await this.ensureRoomAndServer(roomId, host);
    const result = await rpgServer.onRequest?.(requestLike);
    return normalizeEngineResponse(result);
  }

  async fetch(request: Request | string | URL, init?: RequestInit): Promise<Response> {
    const webRequest = request instanceof Request ? request : new Request(String(request), init);
    const url = new URL(webRequest.url);
    const route = parseHttpRoute(url.pathname, this.partiesPath);
    if (!route) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    const bodyText = await webRequest.text();
    return this.dispatchRoomRequest(route.roomId, createRequestLike(webRequest.url, webRequest.method.toUpperCase(), toHeaders(webRequest.headers), bodyText), url.host);
  }

  async updateMap(mapId: string, payload: any, options: SendMapUpdateOptions = {}): Promise<Response> {
    const roomId = mapId.startsWith("map-") ? mapId : `map-${mapId}`;
    const headers = createMapUpdateHeaders(this.mapUpdateToken, options.headers);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    return this.dispatchRoomRequest(
      roomId,
      createRequestLike(`http://localhost${this.partiesPath}/${roomId}/map/update`, "POST", headers, JSON.stringify(payload)),
      options.host ?? this.lastKnownHost,
    );
  }

  /** Build and publish a trusted map payload to another RPGJS runtime. */
  async publishMap(mapId: string, options: PublishMapOptions): Promise<Response> {
    const roomId = mapId.startsWith("map-") ? mapId : `map-${mapId}`;
    const { rpgServer } = await this.ensureRoomAndServer(roomId, options.host);
    const defaultPayload = await createMapUpdatePayload(roomId, rpgServer, {
      host: options.host ?? this.lastKnownHost,
      mapUpdateToken: this.mapUpdateToken,
      tiledBasePaths: this.tiledBasePaths,
    });
    const payload = options.transformPayload ? await options.transformPayload(defaultPayload, mapId.replace(/^map-/, "")) : defaultPayload;
    const target = options.target.replace(/\/+$/, "");
    const mapResponse = await fetch(`${target}${this.partiesPath}/${roomId}/map/update`, {
      method: "POST",
      headers: createMapUpdateHeaders(this.mapUpdateToken, options.headers),
      body: JSON.stringify(payload),
    });
    if (!mapResponse.ok) return mapResponse;

    const worldUpdates = Array.isArray((payload as any)?.worldUpdates)
      ? (payload as any).worldUpdates
      : [];
    for (const world of worldUpdates) {
      if (!world?.id || !Array.isArray(world.maps)) continue;
      const responses = await Promise.all(
        world.maps.map((map: any) => {
          const targetMapId = String(map?.id ?? "").replace(/^map-/, "");
          if (!targetMapId) return Promise.resolve(new Response(null, { status: 204 }));
          return fetch(
            `${target}${this.partiesPath}/map-${targetMapId}/world/${encodeURIComponent(String(world.id))}/update`,
            {
              method: "POST",
              headers: createMapUpdateHeaders(this.mapUpdateToken, options.headers),
              body: JSON.stringify({ id: world.id, maps: world.maps }),
            },
          );
        }),
      );
      const failedResponse = responses.find((response) => !response.ok);
      if (failedResponse) return failedResponse;
    }

    return mapResponse;
  }

  async handleNodeRequest(req: IncomingMessage, res: ServerResponse, next?: () => void, options: HandleNodeRequestOptions = {}): Promise<boolean> {
    try {
      const headers = toHeaders(req.headers);
      const host = headers.get("host") || "localhost";
      const url = new URL(req.url || "/", `http://${host}`);
      const normalizedPathname = prependMountedPath(url.pathname, options.mountedPath);
      const normalizedUrl = new URL(url.toString());
      normalizedUrl.pathname = normalizedPathname;

      const route = parseHttpRoute(normalizedUrl.pathname, this.partiesPath);
      if (!route) {
        next?.();
        return false;
      }

      const response = await this.dispatchRoomRequest(route.roomId, createRequestLike(normalizedUrl.toString(), (req.method || "GET").toUpperCase(), headers, await readNodeBody(req)), host);

      await sendNodeResponse(res, response);
      return true;
    } catch (error) {
      console.error("Error handling RPG-JS request:", error);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal server error" }));
      return true;
    }
  }

  async acceptWebSocket(ws: RpgWebSocketConnection, request: RpgWebSocketRequestLike): Promise<boolean> {
    const normalizedRequest = resolveUrlFromSocketRequest(request);
    const route = parseSocketRoute(normalizedRequest.url.pathname, this.partiesPath);
    if (!route) {
      return false;
    }

    try {
      console.log(`WebSocket upgrade request: ${normalizedRequest.url.pathname}`);

      const queryParams = Object.fromEntries(normalizedRequest.url.searchParams.entries());
      console.log(`Room: ${route.roomId}, Query params:`, queryParams);
      this.lastKnownHost = normalizedRequest.url.host;
      ensureNodeSessionIdQuery(normalizedRequest.url);
      const connection = await this.transport.acceptWebSocket(
        ws as any,
        new Request(normalizedRequest.url.toString(), {
          headers: normalizedRequest.headers,
          method: normalizedRequest.method || "GET",
        }),
      );

      await connection.send(
        JSON.stringify({
          type: "connected",
          id: connection.id,
          message: "Connected to RPG-JS server",
        }),
      );

      const rpgServer = this.servers.get(route.roomId);
      await rpgServer?.onConnectionAccepted(connection, {
        request: new Request(normalizedRequest.url.toString(), {
          headers: normalizedRequest.headers,
          method: normalizedRequest.method || "GET",
        }),
      });

      return true;
    } catch (error) {
      console.error("Error establishing WebSocket connection:", error);
      ws.close();
      return true;
    }
  }

  async handleUpgrade(wsServer: RpgWebSocketServer, request: IncomingMessage, socket: Duplex, head: Buffer): Promise<boolean> {
    const headers = toHeaders(request.headers);
    const host = headers.get("host") || "localhost";
    const url = new URL(request.url || "/", `http://${host}`);
    if (!parseSocketRoute(url.pathname, this.partiesPath)) {
      return false;
    }

    ensureNodeSessionIdQuery(url);
    request.url = `${url.pathname}${url.search}`;
    this.lastKnownHost = host;
    wsServer.handleUpgrade(request, socket, head, (ws) => {
      void this.acceptWebSocket(ws as any, request);
    });

    return true;
  }
}

export function createRpgServerTransport(serverModule: RpgTransportServerConstructor, options?: CreateRpgServerTransportOptions): RpgServerTransport {
  return new RpgServerTransport(serverModule, options);
}
