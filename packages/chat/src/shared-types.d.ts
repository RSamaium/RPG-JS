export type ChatChannel = "map" | "global";

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
