import type { IncomingHttpHeaders, IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import type { RpgServerEngine } from "../RpgServerEngine";

/** Filters and limits supported when listing keys from RPGJS room storage. */
export interface RpgRoomStorageListOptions {
  /** Return only keys beginning with this prefix. */
  prefix?: string;
  /** Include keys beginning at this value. */
  start?: string;
  /** Include keys strictly after this value. */
  startAfter?: string;
  /** Stop before this key. */
  end?: string;
  /** Return keys in descending order. */
  reverse?: boolean;
  /** Maximum number of entries returned. */
  limit?: number;
}

/** Persistent key-value contract exposed to hosted RPGJS rooms. */
export interface RpgRoomStorage {
  /** Read one value. */
  get<T = unknown>(key: string): Promise<T | undefined>;
  /** Store one value. */
  put<T = unknown>(key: string, value: T): Promise<void>;
  /** Store several values atomically when supported by the adapter. */
  put<T = unknown>(entries: Record<string, T>): Promise<void>;
  /** Delete one key or a collection of keys. */
  delete(key: string | string[]): Promise<void | boolean | number>;
  /** List values in key order with optional filtering. */
  list<T = unknown>(options?: RpgRoomStorageListOptions): Promise<Map<string, T>>;
}

/** Factory that opens storage for one room namespace and identifier. */
export type RpgRoomStorageFactory = (
  namespace: string,
  roomId: string,
) => RpgRoomStorage | Promise<RpgRoomStorage>;

/** Provider capable of opening RPGJS room storage on demand. */
export interface RpgRoomStorageProvider {
  /** Open storage for a room namespace and identifier. */
  getStorage(namespace: string, roomId: string): RpgRoomStorage | Promise<RpgRoomStorage>;
}

/** Serializable snapshot produced by the in-memory Node.js storage adapter. */
export type RpgRoomMemorySnapshot = Record<string, [string, unknown][]>;

/** Options used to initialize in-memory RPGJS room storage. */
export interface RpgMemoryStorageOptions {
  /** Previous snapshot restored when the provider is created. */
  snapshot?: RpgRoomMemorySnapshot;
}

/** In-memory room storage provider with explicit snapshot lifecycle methods. */
export interface RpgMemoryRoomStorageProvider extends RpgRoomStorageProvider {
  /** Export all in-memory room values. */
  snapshot(): RpgRoomMemorySnapshot;
  /** Replace current values with a previous snapshot. */
  restore(snapshot: RpgRoomMemorySnapshot): void;
  /** Remove all values owned by this provider. */
  clear(): void;
}

/** Minimal SQLite database contract accepted by the Node.js storage adapter. */
export interface RpgSqliteDatabase {
  /** Execute one or more SQL statements. */
  exec(sql: string): unknown;
  /** Prepare a statement for reads or writes. */
  prepare(sql: string): {
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): { changes: number | bigint };
    all(...params: unknown[]): unknown[];
  };
}

/** SQLite journal modes supported by the Node.js room storage adapter. */
export type RpgSqliteJournalMode =
  | "DELETE" | "TRUNCATE" | "PERSIST" | "MEMORY" | "WAL" | "OFF"
  | "delete" | "truncate" | "persist" | "memory" | "wal" | "off";

interface RpgSqliteStorageTuningOptions {
  /** Table used to store room values. */
  tableName?: string;
  /** SQLite busy timeout in milliseconds. */
  busyTimeoutMs?: number;
  /** Journal mode configured when the adapter starts. */
  journalMode?: RpgSqliteJournalMode;
  /** Number of retries after a transient busy response. */
  busyRetries?: number;
}

/**
 * Configuration for persistent SQLite-backed RPGJS room storage.
 *
 * Provide exactly one database source: either an existing compatible
 * connection or a filesystem path opened by the Node.js adapter.
 */
export type RpgSqliteStorageOptions = RpgSqliteStorageTuningOptions & (
  | {
    /** Existing compatible SQLite database connection. */
    database: RpgSqliteDatabase;
    /** A path cannot be combined with an existing database connection. */
    databasePath?: never;
  }
  | {
    /** An existing connection cannot be combined with a database path. */
    database?: never;
    /** Path opened by the Node.js adapter. */
    databasePath: string;
  }
);

/** Network connection exposed to an RPGJS hosted room. */
export interface RpgHostedRoomConnection<TState = unknown> {
  /** Stable connection identifier. */
  readonly id: string;
  /** Session identifier retained across supported reconnect flows. */
  readonly sessionId?: string;
  /** Current application-owned state. Use `setState()` to replace it. */
  readonly state: Readonly<TState> | null;
  /** Replace the application-owned connection state. */
  setState(
    state: TState | ((previous: Readonly<TState> | null) => TState) | null,
  ): Readonly<TState> | null;
  /** Send data to this connection. */
  send(data: string | ArrayBuffer | ArrayBufferView): void | Promise<void>;
  /** Close this connection. */
  close(code?: number, reason?: string): void;
}

/** Runtime room object passed to an RPGJS Node.js server instance. */
export interface RpgHostedRoom {
  /** Stable room identifier. */
  readonly id: string;
  /** Environment values configured on the transport. */
  readonly env: Record<string, unknown>;
  /** Storage scoped to this room. */
  readonly storage: RpgRoomStorage;
  /** Resolve one active connection. */
  getConnection<TState = unknown>(id: string): RpgHostedRoomConnection<TState> | undefined;
  /** Iterate over all active connections. */
  getConnections<TState = unknown>(): Iterable<RpgHostedRoomConnection<TState>>;
}

export interface RpgWebSocketConnection {
  readyState: number;
  send(data: string): void;
  close(): void;
  on(event: string, callback: (...args: any[]) => void): void;
}

export interface RpgWebSocketServer {
  handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer, callback: (ws: RpgWebSocketConnection) => void): void;
  close(): void;
}

export interface RpgTransportRequestLike {
  url: string;
  method?: string;
  headers?: Headers | HeadersInit | IncomingHttpHeaders | Map<string, string | undefined>;
  text(): Promise<string>;
  json(): Promise<any>;
}

export interface RpgWebSocketRequestLike {
  url?: string;
  method?: string;
  headers?: Headers | HeadersInit | IncomingHttpHeaders | Map<string, string | undefined>;
}

export type RpgTransportServer = RpgServerEngine & {
  onStart?(): void | Promise<void>;
  onRequest?(req: RpgTransportRequestLike): any | Promise<any>;
  onMessage?(message: string, connection: any): void | Promise<void>;
  onClose?(connection: any): void | Promise<void>;
  onConnect?(connection: any, context: any): void | Promise<void>;
  maps?: any[];
};

export type RpgTransportServerConstructor = new (room: any) => RpgTransportServer;

/** Options used to create the RPGJS Node.js room transport. */
export interface CreateRpgServerTransportOptions {
  /** Runtime values exposed through `room.env`. */
  env?: Record<string, unknown>;
  /** Initialize maps during transport startup. */
  initializeMaps?: boolean;
  /** Secret required by remote map administration requests. */
  mapUpdateToken?: string;
  /** URL prefix used for room routes. */
  partiesPath?: string;
  /** Filesystem roots from which Tiled assets may be served. */
  tiledBasePaths?: string[];
  /** Room persistence provider. Memory is used when omitted. */
  storage?: RpgRoomStorageFactory | RpgRoomStorageProvider;
}

export interface HandleNodeRequestOptions {
  mountedPath?: string;
}

export interface SendMapUpdateOptions {
  headers?: HeadersInit | IncomingHttpHeaders | Map<string, string | undefined>;
  host?: string;
}

export interface PublishMapOptions extends SendMapUpdateOptions {
  /** Base URL of the trusted RPGJS server, for example `http://127.0.0.1:8787`. */
  target: string;
  /** Optional trusted transformation applied before the payload is sent remotely. */
  transformPayload?: (payload: unknown, mapId: string) => unknown | Promise<unknown>;
}
