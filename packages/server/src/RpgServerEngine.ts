import { Server } from "@signe/room";
import { createStatesSnapshotDeep } from "@signe/sync";
import { Hooks, ModulesToken } from "@rpgjs/common";
import { RpgMap } from "./rooms/map";
import { LobbyRoom } from "./rooms/lobby";
import { inject } from "./core/inject";
import { context } from "./core/context";
import { lastValueFrom } from "rxjs";
import type { RpgServerStepMetrics } from "./RpgServer";
import { registerServerStepEmitter } from "./server-step";

/** Persistent storage available to the RPGJS server runtime. */
export interface RpgServerRuntimeStorage {
  /** Read one value from room storage. */
  get<T = unknown>(key: string): Promise<T | undefined>;
  /** Store one value in room storage. */
  put<T = unknown>(key: string, value: T): Promise<void>;
  /** Delete one or several values from room storage. */
  delete(key: string | string[]): Promise<unknown>;
}

/** Low-level room handle owned by an RPGJS server runtime. */
export interface RpgServerRuntimeRoom {
  /** Stable low-level room identifier. */
  readonly id?: string;
  /** Storage scoped to the room. */
  readonly storage: RpgServerRuntimeStorage;
}

/**
 * RPGJS-owned structural contract for the room server inherited by
 * {@link RpgServerEngine}.
 */
export interface RpgRoomServer {
  /** Current low-level room handle. */
  readonly room: RpgServerRuntimeRoom;
  /** Current initialized gameplay sub-room. */
  subRoom: unknown | null;
  /** Gameplay room classes available to this server. */
  rooms: unknown[];
  /** Whether the low-level room runtime is hibernating. */
  readonly isHibernate: boolean;
  /** Storage scoped to the current room. */
  readonly roomStorage: RpgServerRuntimeStorage;
  /** Send a packet to one low-level connection. */
  send(connection: unknown, payload: unknown, subRoom: unknown): Promise<void>;
  /** Send a packet to every low-level connection. */
  broadcast(payload: unknown, subRoom: unknown): void;
  /** Initialize the current room. */
  onStart(): Promise<void>;
  /** Run session garbage collection immediately. */
  runGarbageCollector(): Promise<void>;
  /** Resolve one persisted session. */
  getSession(privateId: string): Promise<unknown | null>;
  /** Delete one persisted session. */
  deleteSession(privateId: string): Promise<void>;
  /** Connect a client to the current gameplay room. */
  onConnectClient(connection: unknown, context: unknown): Promise<void>;
  /** Handle an incoming low-level connection. */
  onConnect(connection: unknown, context: unknown): Promise<void>;
  /** Handle an incoming packet. */
  onMessage(message: string, sender: unknown): Promise<void>;
  /** Handle a closed connection. */
  onClose(connection: unknown): Promise<void>;
  /** Handle a room alarm. */
  onAlarm(): Promise<void>;
  /** Handle a connection error. */
  onError(connection: unknown, error: Error): Promise<void>;
  /** Handle an HTTP request routed to the room. */
  onRequest(request: Request): Promise<Response>;
}

const RpgRoomServerBase = Server as unknown as new (
  room: RpgServerRuntimeRoom,
) => RpgRoomServer;

export type RpgServerRoomKind = "lobby" | "map" | "unknown";

export interface RpgServerRoomInfo {
  /** Full low-level room id, for example `lobby-1` or `map-town`. */
  id: string;
  /** RPGJS room category inferred from the room id. */
  kind: RpgServerRoomKind;
  /** Room name without the RPGJS prefix, for example `1` or `town`. */
  name: string;
  /** Runtime class name of the RPGJS room instance. */
  className: string;
  /** Number of players currently present when the room exposes a players signal. */
  playersCount: number;
  /** Whether the current RPGJS room is configured for automatic sync. */
  autoSync: boolean;
  /** Whether the current RPGJS room exposes a database signal. */
  hasDatabase: boolean;
}

export type RpgServerCompatibilityApp = unknown;
export type RpgServerCompatibilityIo = unknown;

export class RpgServerEngine extends RpgRoomServerBase {
  rooms = [RpgMap, LobbyRoom];
  private _globalConfig: any = {};

  constructor(room: RpgServerRuntimeRoom) {
    super(room);
    registerServerStepEmitter(room, (metrics) => this.emitServerStep(metrics));
  }

  private async emitServerStep(metrics: RpgServerStepMetrics): Promise<void> {
    let hooks: Hooks;

    try {
      hooks = inject<Hooks>(ModulesToken, context);
    }
    catch {
      return;
    }

    await lastValueFrom(
      hooks.callHooks("server-engine-onStep", this, metrics),
    );
  }

  /**
   * Optional compatibility handle for integrations that still expose an
   * application object, such as an Express app in a custom Node entry.
   *
   * RPGJS v5 does not create Express automatically. Assign this property from
   * your host integration when you need to keep v4-style code that reads
   * `engine.app`.
   *
   * @example
   * ```ts
   * const app = express()
   * engine.app = app
   * ```
   */
  app?: RpgServerCompatibilityApp;

  /**
   * Optional compatibility handle for integrations that still expose a realtime
   * transport object.
   *
   * RPGJS v5 uses Signe rooms instead of socket.io by default. Assign this
   * property from your host integration when v4-style code still reads
   * `engine.io`.
   *
   * @example
   * ```ts
   * const wsServer = new WebSocketServer({ noServer: true })
   * engine.io = wsServer
   * ```
   */
  io?: RpgServerCompatibilityIo;

  /**
   * Current global RPGJS configuration.
   *
   * When the current room is a map room, this returns the map's `globalConfig`.
   * For lobby rooms or not-yet-initialized engines, it returns the last value
   * assigned to `engine.globalConfig`, or an empty object by default.
   *
   * @example
   * ```ts
   * const engine = {
   *   onStart(server: RpgServerEngine) {
   *     const globalConfig = server.globalConfig
   *     console.log(globalConfig.startMapId)
   *   }
   * }
   * ```
   */
  get globalConfig(): any {
    const currentRoom = this.getCurrentRoom<any>();
    return currentRoom?.globalConfig ?? this._globalConfig;
  }

  set globalConfig(value: any) {
    this._globalConfig = value ?? {};
    const currentRoom = this.getCurrentRoom<any>();
    if (currentRoom && "globalConfig" in currentRoom) {
      currentRoom.globalConfig = this._globalConfig;
    }
  }

  /**
   * Returns the current RPGJS room instance.
   *
   * This is the RPGJS sub-room (`LobbyRoom`, `RpgMap`, or a future custom room),
   * not the low-level Signe/Party room wrapper available as `server.room`.
   *
   * @returns The current RPGJS room instance, or `null` before the room is initialized.
   *
   * @example
   * ```ts
   * const room = server.getCurrentRoom<RpgMap>()
   * if (room) {
   *   console.log(room.database())
   * }
   * ```
   */
  getCurrentRoom<T = LobbyRoom | RpgMap>(): T | null {
    return (this.subRoom as T | null) ?? null;
  }

  /**
   * Returns the low-level id of the current room, such as `lobby-1` or
   * `map-town`.
   *
   * @returns The current room id, or `null` when unavailable.
   */
  getCurrentRoomId(): string | null {
    const id = this.room?.id;
    return typeof id === "string" ? id : null;
  }

  /**
   * Returns the RPGJS kind of the current room.
   *
   * @returns `"lobby"`, `"map"`, or `"unknown"`.
   */
  getCurrentRoomKind(): RpgServerRoomKind {
    return this.getRoomKind(this.getCurrentRoomId());
  }

  /**
   * Returns stable metadata for the current RPGJS room.
   *
   * Use this method when you need room diagnostics without depending on Signe
   * internals such as `subRoom` or the raw `room` wrapper.
   *
   * @returns Current room metadata, or `null` before the room is initialized.
   *
   * @example
   * ```ts
   * const info = server.getCurrentRoomInfo()
   * console.log(info?.id, info?.kind, info?.playersCount)
   * ```
   */
  getCurrentRoomInfo(): RpgServerRoomInfo | null {
    const id = this.getCurrentRoomId();
    const currentRoom = this.getCurrentRoom<any>();

    if (!id || !currentRoom) {
      return null;
    }

    const players = typeof currentRoom.players === "function"
      ? currentRoom.players()
      : undefined;
    const database = typeof currentRoom.database === "function"
      ? currentRoom.database()
      : undefined;

    return {
      id,
      kind: this.getRoomKind(id),
      name: this.getRoomName(id),
      className: currentRoom.constructor?.name ?? "UnknownRoom",
      playersCount: players && typeof players === "object" ? Object.keys(players).length : 0,
      autoSync: Boolean(currentRoom.autoSync ?? currentRoom.$autoSync),
      hasDatabase: Boolean(database && typeof database === "object"),
    };
  }

  async onConnectClient(conn: any, ctx: any) {
    const publicId = await this.authenticateConnection(conn, ctx);

    if (typeof publicId === "string") {
      await this.prepareAuthenticatedSession(publicId, conn, ctx);
    }

    return super.onConnectClient(conn, ctx);
  }

  protected async authenticateConnection(conn: any, ctx: any): Promise<string | undefined> {
    let hooks: Hooks;

    try {
      hooks = inject<Hooks>(ModulesToken, context);
    }
    catch {
      return undefined;
    }

    const results = await lastValueFrom(
      hooks.callHooks("server-engine-auth", this, this.createAuthSocket(conn, ctx))
    );
    const publicIds = results.filter((result) => typeof result === "string");

    if (publicIds.length === 0) {
      return undefined;
    }

    const publicId = publicIds[publicIds.length - 1].trim();
    if (!publicId) {
      throw new Error("Authentication failed: auth() returned an empty player id");
    }

    return publicId;
  }

  private createAuthSocket(conn: any, ctx: any) {
    const url = ctx?.request?.url
      ? new URL(ctx.request.url)
      : new URL("http://localhost");
    const query = Object.fromEntries(url.searchParams.entries());
    const headers = Object.fromEntries(ctx?.request?.headers?.entries?.() ?? []);

    return {
      conn,
      request: ctx?.request,
      handshake: {
        query,
        headers,
      },
    };
  }

  private async prepareAuthenticatedSession(publicId: string, conn: any, ctx: any) {
    const subRoom = await (this as any).getSubRoom?.({ getMemoryAll: true });
    if (!subRoom) {
      return;
    }

    const privateIds = await this.resolveAuthenticatedPrivateIds(conn, ctx);

    for (const privateId of privateIds) {
      await this.saveAuthenticatedSession(privateId, publicId);
    }

    await this.ensureAuthenticatedUser(subRoom, publicId, conn, ctx);
  }

  private async resolveAuthenticatedPrivateIds(conn: any, ctx: any): Promise<string[]> {
    const privateIds = new Set<string>();
    const requestedPrivateId = conn?.state?.privateId || conn?.sessionId || conn?.id;

    if (requestedPrivateId) {
      privateIds.add(requestedPrivateId);
    }

    if (ctx?.request?.url) {
      const transferToken = new URL(ctx.request.url).searchParams.get("transferToken");
      if (transferToken) {
        const transferData = await this.room.storage.get(`transfer:${transferToken}`) as any;
        if (transferData?.privateId) {
          privateIds.add(transferData.privateId);
        }
      }
    }

    return Array.from(privateIds);
  }

  private async saveAuthenticatedSession(privateId: string, publicId: string) {
    const sessionKey = `session:${privateId}`;
    const existingSession = await this.room.storage.get(sessionKey) as any;

    if (existingSession?.publicId && existingSession.publicId !== publicId) {
      await this.removePrivateIdFromPublicIndex(privateId, existingSession.publicId);
    }

    await this.room.storage.put(sessionKey, {
      ...existingSession,
      publicId,
    });

    await this.addPrivateIdToPublicIndex(privateId, publicId);
  }

  private async addPrivateIdToPublicIndex(privateId: string, publicId: string) {
    const key = `session-public:${publicId}`;
    const privateIds = await this.room.storage.get(key) as string[] | undefined;

    if (Array.isArray(privateIds) && privateIds.includes(privateId)) {
      return;
    }

    await this.room.storage.put(key, [...(Array.isArray(privateIds) ? privateIds : []), privateId]);
  }

  private async removePrivateIdFromPublicIndex(privateId: string, publicId: string) {
    const key = `session-public:${publicId}`;
    const privateIds = await this.room.storage.get(key) as string[] | undefined;

    if (!Array.isArray(privateIds)) {
      return;
    }

    const nextPrivateIds = privateIds.filter((id) => id !== privateId);
    if (nextPrivateIds.length === 0) {
      await this.room.storage.delete(key);
      return;
    }

    await this.room.storage.put(key, nextPrivateIds);
  }

  private async ensureAuthenticatedUser(subRoom: any, publicId: string, conn: any, ctx: any) {
    const signal = (this as any).getUsersProperty?.(subRoom);
    const usersPropName = (this as any).getUsersPropName?.(subRoom);
    const classType = signal?.options?.classType;

    if (!signal || !usersPropName || !classType || signal()[publicId]) {
      return;
    }

    const user = (this as any).createUserFromClassType(classType, conn, ctx);
    signal()[publicId] = user;
    await (this as any).saveStatePath?.(`${usersPropName}.${publicId}`, createStatesSnapshotDeep(user));
  }

  private getRoomKind(id: string | null): RpgServerRoomKind {
    if (id?.startsWith("lobby-")) {
      return "lobby";
    }
    if (id?.startsWith("map-")) {
      return "map";
    }
    return "unknown";
  }

  private getRoomName(id: string): string {
    if (id.startsWith("lobby-")) {
      return id.slice("lobby-".length);
    }
    if (id.startsWith("map-")) {
      return id.slice("map-".length);
    }
    return id;
  }
}
