import type {
  ChatChannel,
  ChatMessage,
  ChatMessagePayload,
} from "./shared-types";

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

export interface ResolvedChatServerOptions {
  channels: ChatChannel[];
  maxLength: number;
  rateLimit: Required<ChatRateLimitOptions> | false;
  formatAuthor: (player: ChatPlayerLike) => string;
  beforeSend?: ChatServerOptions["beforeSend"];
  afterSend?: ChatServerOptions["afterSend"];
  broadcastGlobal?: ChatServerOptions["broadcastGlobal"];
}
