/**
 * The id of a channel. `map` and `global` are built in; a game can declare more with `defineChatChannel`.
 */
export type ChatChannel = "map" | "global" | (string & {});

/**
 * Who receives a message. The server decides it from the channel; the client never chooses it.
 */
export type ChatAudience =
  | { type: "map" }
  | { type: "global" }
  | { type: "group"; id: string };

export interface ChatMessagePayload {
  text?: unknown;
  channel?: unknown;
}

export interface ChatMessage {
  id: string;
  text: string;
  author: string;
  playerId: string;
  channel: ChatChannel;
  mapId?: string;
  createdAt: number;
}

export interface ChatErrorPayload {
  key: string;
  params?: Record<string, unknown>;
}
