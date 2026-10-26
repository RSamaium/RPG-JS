import type { RpgContext } from "@rpgjs/common";

export const WebSocketToken = "websocket";

export type SocketQueryValue = string | null | undefined;
export type SocketQuery = Record<string, SocketQueryValue>;
export type SocketUpdateProperties = {
  room: string;
  host?: string;
  query?: SocketQuery;
};
/** Why a connection ended, as given to `onConnectionClosed`. */
export interface ConnectionClosedInfo {
  /** WebSocket close code. The server uses 4xxx codes (for example 4401) to end a session on purpose. */
  code: number;
  /** Close reason sent by the server, or an empty string. */
  reason: string;
  /** Whether the transport is going to open the connection again by itself. */
  willReconnect: boolean;
}
export type WebSocketMode = "standalone" | "mmorpg";

export abstract class AbstractWebsocket {
  readonly mode?: WebSocketMode;
  /** Whether the client should render its GUI before opening the first connection. */
  readonly deferConnection?: boolean;
  /** @internal Current negotiated language, evaluated before every connection. */
  locale?: () => string;
  /** @internal Set by the engine: called for every connection that ends outside a deliberate room change. */
  connectionClosedHandler?: (info: ConnectionClosedInfo) => void;

  constructor(protected context: RpgContext) {}

  abstract connection(listeners?: (data: any) => void): Promise<void>;
  abstract emit(event: string, data: any): void;
  abstract on(event: string, callback: (data: any) => void): void;
  abstract off(event: string, callback: (data: any) => void): void;
  abstract updateProperties(params: SocketUpdateProperties): void;
  abstract reconnect(listeners?: (data: any) => void): Promise<void>;
  /** Close the current physical connection when the transport supports it. */
  disconnect(): void {}
}
