import { AbstractWebsocket, WebSocketToken } from "./AbstractSocket";
import { ClientIo, ServerIo } from "@signe/room";
import { Context } from "@signe/di";
import { RpgClientEngine } from "../RpgClientEngine";
import { UpdateMapService, UpdateMapToken } from "@rpgjs/common";
import { LoadMapToken } from "./loadMap";
import { RpgGui } from "../Gui/Gui";

type ServerIo = any;
type ClientIo = any;

class BridgeWebsocket extends AbstractWebsocket {
  private room: ServerIo;
  private socket: ClientIo;
  private serverInstance: any;

  constructor(protected context: Context, private server: any) {
    super(context);
    // fake room
    this.room = new ServerIo("lobby-1");
  }

  async connection(listeners?: (data: any) => void) {
    this.serverInstance = new this.server(this.room);
    await this.serverInstance.onStart();
    this.context.set('server', this.serverInstance)
    this.socket = new ClientIo(this.serverInstance);
    const url = new URL('http://localhost')
    const request = new Request(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    listeners?.(this.socket)
    await this.serverInstance.onConnect(this.socket.conn as any, { request } as any);
    this.room.clients.set(this.socket.id, this.socket);
    return this.socket
  }

  on(key: string, callback: (data: any) => void) {
    this.socket.addEventListener("message", (event) => {
      const object = JSON.parse(event);
      if (object.type === key) {
        callback(object.value);
      }
    });
  }

  off(event: string, callback: (data: any) => void) {
    this.socket.removeEventListener(event, callback);
  }

  emit(event: string, data: any) {
    this.socket.send({
      action: event,
      value: data,
    });
  }

  updateProperties({ room }: { room: any }) {
    this.room = new ServerIo(room);
  }

  async reconnect(listeners?: (data: any) => void) {
    await this.connection((socket) => {
      listeners?.(socket)
    })
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

  async update(mapId: string, map: any) {
    this.server = this.context.get('server')
    const req = {
      url: `http://localhost/parties/main/${mapId}/map/update`,
      method: 'POST',
      headers: new Headers({}),
      json: async () => {
        return map;
      }
    };
    await this.server.onRequest(req)
  }
}

export function provideRpg(server: any) {
  return [
    {
      provide: WebSocketToken,
      useFactory: (context: Context) => new BridgeWebsocket(context, server),
    },
    {
      provide: UpdateMapToken,
      useClass: UpdateMapStandaloneService,
    },
    RpgGui,
    RpgClientEngine,
  ];
}
