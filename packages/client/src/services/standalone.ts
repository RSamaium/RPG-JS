import { AbstractWebsocket, SocketUpdateProperties, WebSocketToken } from "./AbstractSocket";
import { ClientIo, ServerIo } from "@signe/room";
import { RpgClientEngine } from "../RpgClientEngine";
import { UpdateMapService, UpdateMapToken, type RpgContext, type RpgProvider } from "@rpgjs/common";
import { LoadMapToken } from "./loadMap";
import { RpgGui } from "../Gui/Gui";
import { provideKeyboardControls } from "./keyboardControls";
import { provideSaveClient } from "./save";
import { normalizeStandaloneMessage } from "./standalone-message";
import type { SocketQuery } from "./AbstractSocket";

type ServerIo = any;
type ClientIo = any;

interface StandaloneOptions {
  env?: Record<string, any>;
}

class BridgeWebsocket extends AbstractWebsocket {
  readonly mode = "standalone" as const;

  private room: ServerIo;
  private socket: ClientIo;
  private socketRoom?: ServerIo;
  private roomId = "lobby-1";
  private query?: SocketQuery;
  private readonly privateId = "player-client-id";
  private listeners: Array<{
    event: string;
    callback: (data: any) => void;
    handler: (event: any) => void;
  }> = [];
  private rooms = {
    partyFn: async (roomId: string) => {
      const room = new ServerIo(roomId, this.rooms);
      const server = new this.server(room)
      await server.onStart();
      await server.subRoom.onStart()
      return server
    },
    env: {}
  }
  private serverInstance: any;

  constructor(protected context: RpgContext, private server: any, options: StandaloneOptions = {}) {
    super(context);
    // fake room
    this.rooms.env = options.env || {};
    this.room = new ServerIo("lobby-1", this.rooms);
  }

  async connection(listeners?: (data: any) => void) {
    this.serverInstance = new this.server(this.room);
    await this.serverInstance.onStart();
    await this.serverInstance.subRoom.onStart()
    this.context.set('server', this.serverInstance)
    return this._connection(listeners)
  }

  private async _connection(listeners?: (data: any) => void) {
    this.detachCurrentSocket();
    await this.connectToRoom();
    listeners?.(this.socket)
    return this.socket
  }

  on(key: string, callback: (data: any) => void) {
    if (
      this.listeners.some(
        (listener) => listener.event === key && listener.callback === callback
      )
    ) {
      return;
    }
    const handler = (event) => {
      const object = normalizeStandaloneMessage(event);
      if (object.type === key) {
        callback(object.value);
      }
    };
    this.listeners.push({ event: key, callback, handler });
    this.socket?.addEventListener("message", handler);
  }

  off(event: string, callback: (data: any) => void) {
    const remaining: typeof this.listeners = [];
    for (const listener of this.listeners) {
      if (listener.event === event && listener.callback === callback) {
        this.socket?.removeEventListener("message", listener.handler);
        continue;
      }
      remaining.push(listener);
    }
    this.listeners = remaining;
  }

  emit(event: string, data: any) {
    this.socket.send({
      action: event,
      value: data,
    });
  }

  /**
   * Update underlying connection properties before a reconnect
   *
   * Design
   * - Dynamically register a factory for the requested room to ensure a fresh server instance
   * - Swap the internal ServerIo to target the new room
   *
   * @param params - Properties to update
   * @param params.room - The target room id (e.g. `map-simplemap2`)
   *
   * @example
   * ```ts
   * websocket.updateProperties({ room: 'map-simplemap2' })
   * await websocket.reconnect()
   * ```
   */
  updateProperties({ room, query }: SocketUpdateProperties) {
    this.roomId = room;
    this.query = query;
  }

  /**
   * Reconnect the client to the current Party room
   *
   * Design
   * - Must be called after `updateProperties()` when switching rooms
   * - Rebuilds the client <-> server bridge and re-triggers connection listeners
   *
   * @param listeners - Optional callback to re-bind event handlers on the new socket
   *
   * @example
   * ```ts
   * websocket.updateProperties({ room: 'map-dungeon' })
   * await websocket.reconnect((socket) => {
   *   // re-bind events here
   * })
   * ```
   */
  async reconnect(listeners?: (data: any) => void): Promise<void> {
    await this._connection((socket) => {
      listeners?.(socket)
    })
  }

  private async connectToRoom() {
    if (this.serverInstance?.room?.id !== this.roomId) {
      const party = await this.room.context.parties.main.get(this.roomId);
      this.serverInstance = party.server;
      this.context.set('server', this.serverInstance);
      this.room = this.serverInstance.room;
    }
    else {
      this.serverInstance = this.context.get('server');
    }

    this.socket = new ClientIo(this.serverInstance, this.privateId);
    const url = new URL('http://localhost');
    const query = this.normalizeQuery(this.query);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }
    }
    const request = new Request(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    this.room.clients.set(this.socket.id, this.socket);
    this.socketRoom = this.room;
    this.listeners.forEach(({ handler }) => {
      this.socket.addEventListener("message", handler);
    });
    await this.serverInstance.onConnect(this.socket.conn as any, { request } as any);
    await this.serverInstance.onConnectionAccepted?.(this.socket.conn as any, { request } as any);
  }

  private normalizeQuery(query?: SocketQuery): Record<string, string> | undefined {
    if (!query) {
      return undefined;
    }
    return Object.fromEntries(
      Object.entries(query)
        .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    );
  }

  private detachCurrentSocket() {
    if (!this.socket) return;
    this.listeners.forEach(({ handler }) => {
      this.socket.removeEventListener("message", handler);
    });
    this.socketRoom?.clients?.delete?.(this.socket.id);
    this.socket = undefined as any;
    this.socketRoom = undefined;
  }

  getServer() {
    return this.serverInstance
  }

  getSocket() {
    return this.socket
  }
}

class UpdateMapStandaloneService extends UpdateMapService {
  private server: any;

  /**
   * Update the current room map data on the server side
   *
   * Design
   * - Uses the in-memory server instance stored in context (standalone mode)
   * - Builds a local HTTP-like request to the current Party room endpoint
   *
   * @param map - The map payload to apply on the server
   *
   * @example
   * ```ts
   * await updateMapService.update({ width: 1024, height: 768, events: [] })
   * ```
   */
  async update(map: any) {
    this.server = this.context.get('server')
    const roomId = this.server?.room?.id ?? 'lobby-1'
    const req = {
      url: `http://localhost/parties/main/${roomId}/map/update`,
      method: 'POST',
      headers: new Headers({}),
      json: async () => {
        return map;
      }
    };
    await this.server.onRequest(req)
  }
}

export function provideRpg(server: any, options: StandaloneOptions = {}): RpgProvider[] {
  return [
    {
      provide: WebSocketToken,
      useFactory: (context: RpgContext) => new BridgeWebsocket(context, server, options),
    },
    {
      provide: UpdateMapToken,
      useClass: UpdateMapStandaloneService,
    },
    provideKeyboardControls(),
    provideSaveClient(),
    RpgGui,
    RpgClientEngine,
  ];
}
