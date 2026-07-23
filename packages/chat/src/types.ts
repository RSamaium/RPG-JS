import type { GuiComponent, GuiRenderer } from "@rpgjs/client";

export type ChatChannel = "map" | "global";
export type ChatPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

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

export interface ChatMapLike {
  id?: string | (() => string);
  broadcast(type: string, value: unknown): void;
}

export interface ChatPlayerLike {
  id: string;
  name?: string | (() => string);
  getCurrentMap(): ChatMapLike | undefined;
  emit(type: string, value: unknown): void;
  on(type: string, callback: (payload: ChatMessagePayload) => void | Promise<void>): void;
}

export interface ChatModerationContext {
  player: ChatPlayerLike;
  channel: ChatChannel;
  text: string;
}

export interface ChatRateLimitOptions {
  maxMessages?: number;
  windowMs?: number;
}

export interface ChatServerOptions {
  channels?: ChatChannel[];
  maxLength?: number;
  rateLimit?: ChatRateLimitOptions | false;
  formatAuthor?: (player: ChatPlayerLike) => string;
  beforeSend?: (
    context: ChatModerationContext,
  ) => string | false | Promise<string | false>;
  afterSend?: (
    message: ChatMessage,
    player: ChatPlayerLike,
  ) => void | Promise<void>;
  broadcastGlobal?: (message: ChatMessage, player: ChatPlayerLike) => void | Promise<void>;
}

export interface ChatClientOptions {
  guiId?: string;
  component?: GuiComponent;
  renderer?: GuiRenderer;
  autoOpen?: boolean;
  position?: ChatPosition;
  maxMessages?: number;
}

export interface ChatOptions {
  client?: ChatClientOptions;
  server?: ChatServerOptions;
}

export interface ResolvedChatClientOptions {
  guiId: string;
  component: GuiComponent;
  renderer: GuiRenderer;
  autoOpen: boolean;
  position: ChatPosition;
  maxMessages: number;
}

export interface ResolvedChatServerOptions {
  channels: ChatChannel[];
  maxLength: number;
  rateLimit: Required<ChatRateLimitOptions> | false;
  formatAuthor: (player: ChatPlayerLike) => string;
  beforeSend?: ChatServerOptions["beforeSend"];
  afterSend?: ChatServerOptions["afterSend"];
  broadcastGlobal?: ChatServerOptions["broadcastGlobal"];
}
