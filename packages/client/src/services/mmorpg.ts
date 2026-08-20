import { connectionRoom } from "@signe/sync/client";
import { RpgGui } from "../Gui/Gui";
import { RpgClientEngine } from "../RpgClientEngine";
import { AbstractWebsocket, SocketQuery, SocketUpdateProperties, WebSocketToken } from "./AbstractSocket";
import { UpdateMapService, UpdateMapToken, type RpgContext, type RpgProvider } from "@rpgjs/common";
import { provideKeyboardControls } from "./keyboardControls";
import { provideSaveClient } from "./save";
import { isNativeSocketEvent, waitForRpgjsConnected } from "./mmorpg-connection";

export interface MmorpgOptions {
    host?: string;
    /** Initial lobby room used before the first map transfer. */
    room?: string;
    connectionId?: string;
    connectionIdScope?: "local" | "session" | "ephemeral";
    query?: SocketQuery | (() => SocketQuery | undefined);
    socketOptions?: Record<string, any>;
    /**
     * Time allowed for a room to restore and send the RPGJS acceptance packet.
     * Increase this for cold edge rooms or local Durable Object startup.
     * Defaults to 10 seconds.
     */
    connectionAcceptanceTimeoutMs?: number;
}

export class BridgeWebsocket extends AbstractWebsocket {
  readonly mode = "mmorpg" as const;

  private socket: any;
  private privateId: string;
  private pendingOn: Array<{ event: string; callback: (data: any) => void }> = [];
  private acceptedOpenListeners = new Set<(data: any) => void>();
  private targetRoom: string;

  constructor(protected context: RpgContext, private options: MmorpgOptions = {}) {
    super(context);
    this.targetRoom = options.room ?? "lobby-1";
    this.privateId = this.resolveConnectionId();
  }

  private resolveConnectionId(): string {
    if (this.options.connectionId) {
      return this.options.connectionId;
    }

    const scope = this.options.connectionIdScope ?? "local";
    const key = "rpgjs-user-id";

    if (scope === "ephemeral") {
      return crypto.randomUUID();
    }

    const storage =
      scope === "session"
        ? window.sessionStorage
        : window.localStorage;

    const existing = storage.getItem(key);
    if (existing) {
      return existing;
    }

    const id = crypto.randomUUID();
    storage.setItem(key, id);
    return id;
  }

  private resolveQuery(): SocketQuery {
    const query = typeof this.options.query === "function"
      ? this.options.query()
      : this.options.query;

    return query ?? {};
  }

  async connection(listeners?: (data: any) => void) {
    // tmp
    class Room {
        
    }
    const instance = new Room()
    const host = this.options.host || window.location.host;
    this.socket = await connectionRoom({
        maxRetries: 0,
        ...this.options.socketOptions,
        host,
        room: this.targetRoom,
        id: this.privateId,
        query: {
          ...this.resolveQuery(),
          id: this.privateId,
        },
    }, instance)

    const pendingOn = this.pendingOn;
    this.pendingOn = [];
    pendingOn
      .filter(({ event }) => !this.isNativeSocketEvent(event))
      .forEach(({ event, callback }) => this.attachEvent(event, callback));
    await waitForRpgjsConnected(
      this.socket.conn,
      this.options.connectionAcceptanceTimeoutMs ?? 10_000,
    );
    pendingOn
      .filter(({ event }) => this.isNativeSocketEvent(event))
      .forEach(({ event, callback }) => this.attachEvent(event, callback));
    this.emitAcceptedOpen();
    listeners?.(this.socket)
  }

  on(key: string, callback: (data: any) => void) {
    if (!this.socket) {
      this.pendingOn.push({ event: key, callback });
      return;
    }
    this.attachEvent(key, callback);
  }

  off(event: string, callback: (data: any) => void) {
    if (!this.socket) return;
    if (event === "open") {
      this.acceptedOpenListeners.delete(callback);
      return;
    }
    if (this.isNativeSocketEvent(event)) {
      this.socket.conn.removeEventListener(event, callback);
      return;
    }
    this.socket.off(event, callback);
  }

  emit(event: string, data: any) {
    this.socket.emit(event, data);
  }

  private attachEvent(event: string, callback: (data: any) => void) {
    if (event === "open") {
      this.acceptedOpenListeners.add(callback);
      return;
    }
    if (this.isNativeSocketEvent(event)) {
      this.socket.conn.addEventListener(event, callback);
      return;
    }
    this.socket.on(event, callback);
  }

  private emitAcceptedOpen() {
    const event = new Event("open");
    this.acceptedOpenListeners.forEach((callback) => callback(event));
  }

  updateProperties({ room, host, query }: SocketUpdateProperties) {
    if (!this.socket?.conn) return;
    this.targetRoom = room;
    this.socket.conn.updateProperties({
      room,
      id: this.privateId,
      host: host || this.options.host || window.location.host,
      query: {
        ...this.resolveQuery(),
        ...query,
        id: this.privateId,
      },
    })
  }

  private isNativeSocketEvent(event: string) {
    return isNativeSocketEvent(event);
  }

  async reconnect(_listeners?: (data: any) => void): Promise<void> {
    if (!this.socket?.conn) return;
    const conn = this.socket.conn;
    const connected = waitForRpgjsConnected(
      conn,
      this.options.connectionAcceptanceTimeoutMs ?? 10_000,
      { ignoreCleanClose: true },
    );
    conn.reconnect();
    await connected;
    this.emitAcceptedOpen();
  }

  getCurrentRoom(): string {
    return this.targetRoom || this.socket?.conn?.room || "lobby-1";
  }
}

class UpdateMapStandaloneService extends UpdateMapService {
  constructor(protected context: RpgContext, private _options: MmorpgOptions) {
    super(context);
  }

  async update(_map: any) {
    // In MMORPG mode, clients are untrusted and must not push map definitions.
    // Map bootstrap/update is handled server-side by @rpgjs/vite.
    return;
  }
}

export function provideMmorpg(options: MmorpgOptions): RpgProvider[] {
  return [
    {
      provide: WebSocketToken,
      useFactory: (context: RpgContext) => new BridgeWebsocket(context, options),
    },
    {
      provide: UpdateMapToken,
      useFactory: (context: RpgContext) => new UpdateMapStandaloneService(context, options),
    },
    provideKeyboardControls(),
    provideSaveClient(),
    RpgGui,
    RpgClientEngine,
  ];
}
