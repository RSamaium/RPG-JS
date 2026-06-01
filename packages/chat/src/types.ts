export type ChatPosition =
  | "bottom-left"
  | "bottom-right"
  | "top-left"
  | "top-right";

export interface ChatPlayerLike {
  id: string;
  name?: string;
  getCurrentMap(): any;
}

export interface ChatMessage {
  id: string;
  text: string;
  author: string;
  playerId: string;
  mapId: string;
  createdAt: number;
  scope: "map";
}

export interface ChatMessagePayload {
  text?: unknown;
}

export interface ChatClientOptions {
  guiId?: string;
  autoOpen?: boolean;
  position?: ChatPosition;
  maxMessages?: number;
  placeholder?: string;
}

export interface ChatServerOptions {
  maxLength?: number;
  sanitize?: (
    text: string,
    player: ChatPlayerLike
  ) => string | false | Promise<string | false>;
  formatAuthor?: (player: ChatPlayerLike) => string;
}

export interface ChatOptions extends ChatClientOptions, ChatServerOptions {}

export interface ResolvedChatOptions {
  guiId: string;
  autoOpen: boolean;
  position: ChatPosition;
  maxMessages: number;
  maxLength: number;
  placeholder: string;
  sanitize?: ChatServerOptions["sanitize"];
  formatAuthor: (player: ChatPlayerLike) => string;
}
