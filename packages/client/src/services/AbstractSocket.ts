import type { RpgContext } from "@rpgjs/common";

export const WebSocketToken = "websocket";

export type SocketQueryValue = string | null | undefined;
export type SocketQuery = Record<string, SocketQueryValue>;
export type SocketUpdateProperties = {
  room: string;
  host?: string;
  query?: SocketQuery;
};
export type WebSocketMode = "standalone" | "mmorpg";

export abstract class AbstractWebsocket {
  readonly mode?: WebSocketMode;

  constructor(protected context: RpgContext) {}

  abstract connection(listeners?: (data: any) => void): Promise<void>;
  abstract emit(event: string, data: any): void;
  abstract on(event: string, callback: (data: any) => void): void;
  abstract off(event: string, callback: (data: any) => void): void;
  abstract updateProperties(params: SocketUpdateProperties): void;
  abstract reconnect(listeners?: (data: any) => void): Promise<void>;
}
